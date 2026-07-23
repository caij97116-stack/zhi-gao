import { Client, GatewayIntentBits, REST, Routes, TextChannel, Events as DiscordEvents } from 'discord.js';
import { EventEmitter } from 'events';
import { getDatabase } from '../db/database.js';
import { decryptToken } from './crypto.js';
import type { BotRow, CommandRow, EventRow, Command, EventConfig, MemberJoinConfig, MessageCreateConfig, ReplyConfig } from '../models/types.js';

export interface LogEntry {
  botId: string;
  timestamp: string;
  type: 'info' | 'command' | 'event' | 'error' | 'start' | 'stop';
  message: string;
  commandName?: string;
  eventType?: string;
}

class BotManager {
  private clients: Map<string, Client> = new Map();
  public events: EventEmitter = new EventEmitter();

  private log(entry: Omit<LogEntry, 'timestamp'>) {
    const full: LogEntry = { ...entry, timestamp: new Date().toISOString() };
    console.log(`[${full.type.toUpperCase()}] ${full.botId}: ${full.message}`);
    this.events.emit('log', full);
  }

  async startBot(botId: string): Promise<void> {
    if (this.clients.has(botId)) {
      return;
    }

    const db = getDatabase();
    const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(botId) as BotRow | undefined;
    if (!bot) throw new Error('Bot not found');

    db.prepare('UPDATE bots SET status = ? WHERE id = ?').run('starting', botId);

    let client: Client | undefined;
    try {
      const token = decryptToken(bot.token);
      client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildMembers,
        ],
      });

      client.once(DiscordEvents.ClientReady, async (readyClient) => {
        console.log(`Bot ${bot.name} (${botId}) is online`);
        db.prepare('UPDATE bots SET status = ?, client_id = ? WHERE id = ?').run('online', readyClient.user.id, botId);
        this.log({ botId, type: 'start', message: `${bot.name} 已上线`, eventType: 'start' });

        if (readyClient.guilds.cache.size > 0) {
          const guildId = readyClient.guilds.cache.first()!.id;
          db.prepare('UPDATE bots SET guild_id = ? WHERE id = ?').run(guildId, botId);
          console.log(`Bot ${bot.name} 已在 ${readyClient.guilds.cache.size} 个服务器中`);
        } else {
          console.log(`Bot ${bot.name} 尚未加入任何服务器`);
        }

        this.registerCommands(botId, client!);
        this.registerEvents(botId, client!);
      });

      // 监听加入新服务器
      client.on(DiscordEvents.GuildCreate, (guild) => {
        console.log(`Bot ${bot.name} (${botId}) 加入了服务器: ${guild.name} (${guild.id})`);
        this.log({ botId, type: 'info', message: `加入了服务器: ${guild.name}`, eventType: 'guildCreate' });
        db.prepare('UPDATE bots SET guild_id = ?, updated_at = ? WHERE id = ?').run(guild.id, new Date().toISOString(), botId);
      });

      client.on(DiscordEvents.Error, (error) => {
        console.error(`Bot ${botId} error:`, error.message);
        db.prepare('UPDATE bots SET status = ? WHERE id = ?').run('error', botId);
        this.log({ botId, type: 'error', message: error.message });
      });

      await client.login(token);
      this.clients.set(botId, client);
    } catch (err) {
      db.prepare('UPDATE bots SET status = ? WHERE id = ?').run('error', botId);
      // 清理失败启动的 client，防止内存泄漏
      if (client) { try { client.destroy(); } catch { /* ignore */ } }
      throw err;
    }
  }

  stopBot(botId: string): void {
    const client = this.clients.get(botId);
    if (client) {
      client.destroy();
      this.clients.delete(botId);
      const db = getDatabase();
      db.prepare('UPDATE bots SET status = ? WHERE id = ?').run('offline', botId);
      this.log({ botId, type: 'stop', message: 'Bot 已停止', eventType: 'stop' });
      console.log(`Bot ${botId} stopped`);
    }
  }

  async restartBot(botId: string): Promise<void> {
    this.stopBot(botId);
    await new Promise((r) => setTimeout(r, 1000));
    await this.startBot(botId);
  }

  getStatus(botId: string): string {
    const client = this.clients.get(botId);
    if (!client) return 'offline';
    if (client.isReady()) return 'online';
    return 'starting';
  }

  getClient(botId: string): Client | undefined {
    return this.clients.get(botId);
  }

  stopAll(): void {
    for (const [id] of this.clients) {
      this.stopBot(id);
    }
  }

  async restoreAll(): Promise<number> {
    const db = getDatabase();
    const bots = db.prepare("SELECT * FROM bots WHERE status = 'online'").all() as BotRow[];
    let count = 0;

    for (const bot of bots) {
      try {
        await this.startBot(bot.id);
        count++;
      } catch (err) {
        console.error(`Failed to restore bot ${bot.id}:`, err);
      }
    }

    return count;
  }

  private async registerCommands(botId: string, client: Client): Promise<void> {
    const db = getDatabase();
    const commands = db.prepare('SELECT * FROM commands WHERE bot_id = ?').all(botId) as CommandRow[];

    if (commands.length === 0) return;

    const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(botId) as BotRow | undefined;
    if (!bot) return;

    try {
      const token = decryptToken(bot.token);
      const rest = new REST({ version: '10' }).setToken(token);

      const commandData = commands.map((cmd) => {
        const options = JSON.parse(cmd.options_json);
        return {
          name: cmd.name,
          description: cmd.description || cmd.name,
          options: options.map((opt: Record<string, unknown>) => ({
            name: opt.name,
            description: opt.description,
            type: this.mapOptionType(opt.type as string),
            required: Boolean(opt.required),
          })),
        };
      });

      await rest.put(Routes.applicationCommands(client.user!.id), { body: commandData });
      console.log(`Registered ${commands.length} commands for bot ${botId}`);
      this.log({ botId, type: 'info', message: `已注册 ${commands.length} 个命令`, eventType: 'command' });
    } catch (err) {
      console.error(`Failed to register commands for bot ${botId}:`, err);
      this.log({ botId, type: 'error', message: `命令注册失败: ${err}` });
    }
  }

  private mapOptionType(type: string): number {
    const map: Record<string, number> = {
      STRING: 3,
      INTEGER: 4,
      BOOLEAN: 5,
      USER: 6,
      CHANNEL: 7,
      ROLE: 8,
    };
    return map[type] || 3;
  }

  private registerEvents(botId: string, client: Client): void {
    const db = getDatabase();
    const events = db.prepare('SELECT * FROM events WHERE bot_id = ? AND enabled = 1').all(botId) as EventRow[];

    for (const event of events) {
      const config = JSON.parse(event.config_json);

      if (event.type === 'memberJoin') {
        const joinConfig = config as MemberJoinConfig;
        client.on(DiscordEvents.GuildMemberAdd, async (member) => {
          try {
            this.log({ botId, type: 'event', message: `新成员加入: ${member.user.username}`, eventType: 'memberJoin' });
            const channel = member.guild.channels.cache.get(joinConfig.channelId) as TextChannel | undefined;
            if (channel) {
              const msg = joinConfig.message.replace(/\{user\}/g, `<@${member.user.id}>`);
              await channel.send(msg);
            }
          } catch (err) {
            console.error(`memberJoin event error for bot ${botId}:`, err);
          }
        });
      }

      if (event.type === 'memberLeave') {
        client.on(DiscordEvents.GuildMemberRemove, async (member) => {
          try {
            this.log({ botId, type: 'event', message: `成员离开: ${member.user.username}`, eventType: 'memberLeave' });
            const leaveConfig = config as MemberJoinConfig;
            const channel = member.guild.channels.cache.get(leaveConfig.channelId) as TextChannel | undefined;
            if (channel) {
              const msg = leaveConfig.message.replace(/\{user\}/g, `**${member.user.username}**`);
              await channel.send(msg);
            }
          } catch (err) {
            console.error(`memberLeave event error for bot ${botId}:`, err);
          }
        });
      }

      if (event.type === 'messageCreate') {
        const msgConfig = config as MessageCreateConfig;
        client.on(DiscordEvents.MessageCreate, async (message) => {
          if (message.author.bot) return;
          for (const kw of msgConfig.keywords || []) {
            try {
              const regex = new RegExp(kw.pattern, 'i');
              if (regex.test(message.content)) {
                this.log({ botId, type: 'event', message: `关键词匹配: "${kw.pattern}" from ${message.author.username}`, eventType: 'messageCreate' });
                await message.reply(kw.reply);
                break;
              }
            } catch {
              if (message.content.toLowerCase().includes(kw.pattern.toLowerCase())) {
                this.log({ botId, type: 'event', message: `关键词匹配: "${kw.pattern}" from ${message.author.username}`, eventType: 'messageCreate' });
                await message.reply(kw.reply);
                break;
              }
            }
          }
        });
      }
    }
  }
}

export const botManager = new BotManager();

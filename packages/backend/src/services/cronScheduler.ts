import { schedule, validate } from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { getDatabase } from '../db/database.js';
import { botManager } from './botManager.js';
import { decryptToken } from './crypto.js';
import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import type { ScheduleRow, CommandRow, BotRow } from '../models/types.js';

class CronScheduler {
  private jobs: Map<string, ScheduledTask> = new Map();

  startAll(): void {
    const db = getDatabase();
    const schedules = db.prepare("SELECT * FROM schedules WHERE enabled = 1").all() as ScheduleRow[];

    for (const s of schedules) {
      this.addJob(s.id, s.bot_id, s.command_name, s.cron_expression, s.channel_id);
    }
  }

  addJob(id: string, botId: string, commandName: string, cronExpression: string, channelId: string): void {
    if (!validate(cronExpression)) {
      console.error(`Invalid cron expression: ${cronExpression}`);
      return;
    }

    const task = schedule(cronExpression, () => this.executeJob(botId, commandName, channelId), {
      timezone: 'Asia/Shanghai',
    });
    task.start();
    this.jobs.set(id, task);
  }

  removeJob(id: string): void {
    const task = this.jobs.get(id);
    if (task) {
      task.stop();
      this.jobs.delete(id);
    }
  }

  private async executeJob(botId: string, commandName: string, channelId: string): Promise<void> {
    const db = getDatabase();

    const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(botId) as BotRow | undefined;
    if (!bot || bot.status !== 'online') {
      console.error(`Scheduled job failed: bot ${botId} is not online`);
      botManager.events.emit('log', { botId, timestamp: new Date().toISOString(), type: 'error', message: `定时任务执行失败: Bot 未在线` });
      return;
    }

    const cmd = db.prepare('SELECT * FROM commands WHERE bot_id = ? AND name = ?').get(botId, commandName) as CommandRow | undefined;
    if (!cmd) {
      botManager.events.emit('log', { botId, timestamp: new Date().toISOString(), type: 'error', message: `定时任务失败: 命令 /${commandName} 不存在` });
      return;
    }

    try {
      const token = decryptToken(bot.token);
      const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
      await client.login(token);

      const channel = await client.channels.fetch(channelId) as TextChannel;
      if (!channel) {
        botManager.events.emit('log', { botId, timestamp: new Date().toISOString(), type: 'error', message: `定时任务失败: 频道 ${channelId} 不可用` });
        client.destroy();
        return;
      }

      const reply = JSON.parse(cmd.reply_json);
      if (reply.type === 'text') {
        await channel.send(reply.content || '定时任务执行');
      } else if (reply.type === 'embed' && reply.embeds?.length) {
        await channel.send({ embeds: reply.embeds });
      }

      const now = new Date().toISOString();
      db.prepare('UPDATE schedules SET last_run = ? WHERE bot_id = ? AND command_name = ?').run(now, botId, commandName);

      botManager.events.emit('log', {
        botId,
        timestamp: now,
        type: 'command',
        message: `定时任务执行: /${commandName} → ${channel.name || channelId}`,
        commandName,
      });

      client.destroy();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      botManager.events.emit('log', { botId, timestamp: new Date().toISOString(), type: 'error', message: `定时任务执行错误: ${msg}` });
    }
  }
}

export const cronScheduler = new CronScheduler();

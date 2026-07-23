import { Router, Request, Response } from 'express';
import { REST, Routes, Client, GatewayIntentBits } from 'discord.js';
import { getDatabase } from '../db/database.js';
import { decryptToken } from '../services/crypto.js';
import { botManager } from '../services/botManager.js';
import type { BotRow } from '../models/types.js';

export const botControlRouter = Router({ mergeParams: true });

// 诊断端点：验证 bot 的 client_id 是否正确
botControlRouter.get('/:id/diagnose', async (req: Request, res: Response) => {
  const db = getDatabase();
  const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(req.params.id) as BotRow | undefined;
  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const result: Record<string, unknown> = {
    botId: bot.id,
    botName: bot.name,
    storedClientId: bot.client_id,
    status: bot.status,
  };

  try {
    const token = decryptToken(bot.token);

    // 方式1: 通过 Discord.js Client 获取 user ID
    const testClient = new Client({ intents: [GatewayIntentBits.Guilds] });
    await testClient.login(token);
    const jsClientId = testClient.user?.id;
    const jsUsername = testClient.user?.username;
    await testClient.destroy();

    // 方式2: 通过 REST API 获取 application ID
    const rest = new REST({ version: '10' }).setToken(token);
    const appInfo = await rest.get(Routes.oauth2CurrentApplication()) as Record<string, unknown>;

    result.discordJsClientId = jsClientId || null;
    result.discordJsUsername = jsUsername || null;
    result.restApiApplicationId = appInfo.id || null;
    result.restApiApplicationName = appInfo.name || null;
    result.match = (jsClientId === appInfo.id && bot.client_id === appInfo.id);
    result.inviteUrl = `https://discord.com/oauth2/authorize?client_id=${appInfo.id}&permissions=8&scope=bot%20applications.commands`;

    if (!result.match) {
      result.warning = 'Client ID 不匹配！邀请链接可能使用了错误的 ID。';
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    result.error = message;
    result.match = false;
    result.warning = `无法验证 Token: ${message}。请检查 Token 是否有效。`;
  }

  res.json(result);
});

botControlRouter.post('/:id/start', async (req: Request, res: Response) => {
  try {
    await botManager.startBot(req.params.id);
    res.json({ status: 'online' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

botControlRouter.post('/:id/stop', (req: Request, res: Response) => {
  botManager.stopBot(req.params.id);
  res.json({ status: 'offline' });
});

botControlRouter.post('/:id/restart', async (req: Request, res: Response) => {
  try {
    await botManager.restartBot(req.params.id);
    res.json({ status: 'online' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

botControlRouter.get('/:id/info', async (req: Request, res: Response) => {
  const db = getDatabase();
  const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(req.params.id) as BotRow | undefined;
  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  try {
    const token = decryptToken(bot.token);
    const rest = new REST({ version: '10' }).setToken(token);
    const appInfo = await rest.get(Routes.oauth2CurrentApplication()) as Record<string, unknown>;
    const flags = (appInfo.flags as number) || 0;

    const GATEWAY_PRESENCE = 1 << 12;
    const GATEWAY_GUILD_MEMBERS = 1 << 1;
    const GATEWAY_MESSAGE_CONTENT = 1 << 15;
    const GATEWAY_GUILD_MESSAGES = 1 << 9;
    const GATEWAY_GUILD_MESSAGE_REACTIONS = 1 << 10;

    res.json({
      clientId: appInfo.id,
      name: appInfo.name,
      description: appInfo.description || '',
      icon: appInfo.icon || null,
      botPublic: !!(appInfo.bot_public),
      botRequireCodeGrant: !!(appInfo.bot_require_code_grant),
      flags,
      intents: {
        presence: !!(flags & GATEWAY_PRESENCE),
        serverMembers: !!(flags & GATEWAY_GUILD_MEMBERS),
        messageContent: !!(flags & GATEWAY_MESSAGE_CONTENT),
        guildMessages: !!(flags & GATEWAY_GUILD_MESSAGES),
        guildMessageReactions: !!(flags & GATEWAY_GUILD_MESSAGE_REACTIONS),
      },
      owner: (appInfo.owner as Record<string, unknown>)?.username || 'Unknown',
      approximateGuildCount: bot.guild_id ? 1 : 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Request failed';
    res.status(500).json({ error: message });
  }
});

botControlRouter.put('/:id/profile', async (req: Request, res: Response) => {
  const db = getDatabase();
  const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(req.params.id) as BotRow | undefined;
  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const { username, avatar } = req.body;
  if (!username && !avatar) {
    res.status(400).json({ error: 'username or avatar is required' });
    return;
  }

  try {
    const token = decryptToken(bot.token);
    const rest = new REST({ version: '10' }).setToken(token);
    const me = await rest.get(Routes.user('@me')) as { id: string; username: string; avatar: string };

    const body: Record<string, string> = {};
    if (username) body.username = username;

    if (avatar) {
      try {
        const resp = await fetch(avatar);
        const buffer = Buffer.from(await resp.arrayBuffer());
        body.avatar = `data:image/png;base64,${buffer.toString('base64')}`;
      } catch {
        res.status(400).json({ error: 'Invalid avatar URL' });
        return;
      }
    }

    await rest.patch(Routes.user('@me'), { body });

    res.json({ success: true, username: username || me.username, avatar: avatar || me.avatar });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Request failed';
    res.status(500).json({ error: message });
  }
});

botControlRouter.put('/:id/presence', async (req: Request, res: Response) => {
  const db = getDatabase();
  const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(req.params.id) as BotRow | undefined;
  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const { status, type, name, url } = req.body;

  try {
    const client = botManager.getClient(req.params.id);
    if (!client || !client.user) {
      res.status(400).json({ error: 'Bot is not online' });
      return;
    }

    const activityTypeMap: Record<string, number> = { PLAYING: 0, STREAMING: 1, LISTENING: 2, WATCHING: 3, COMPETING: 5 };
    const activityType = activityTypeMap[type] || 0;

    const activities = name ? [{ name, type: activityType, url: type === 'STREAMING' ? url : undefined }] : [];

    client.user.setPresence({
      status: status || 'online',
      activities: activities.length ? activities as never[] : [],
    });

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Request failed';
    res.status(500).json({ error: message });
  }
});

botControlRouter.get('/:id/permissions', (req: Request, res: Response) => {
  const db = getDatabase();
  const bot = db.prepare('SELECT permissions FROM bots WHERE id = ?').get(req.params.id) as { permissions: string } | undefined;
  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }
  res.json({ permissions: bot.permissions || '0' });
});

botControlRouter.put('/:id/permissions', (req: Request, res: Response) => {
  const db = getDatabase();
  const { permissions } = req.body;
  if (permissions === undefined) {
    res.status(400).json({ error: 'permissions is required' });
    return;
  }
  const result = db.prepare(`UPDATE bots SET permissions = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(String(permissions), req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }
  res.json({ permissions: String(permissions) });
});

// 检查 Bot 加入了哪些服务器
botControlRouter.get('/:id/guilds', async (req: Request, res: Response) => {
  const db = getDatabase();
  const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(req.params.id) as BotRow | undefined;
  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  try {
    // 优先使用已运行的 client
    const runningClient = botManager.getClient(req.params.id);
    if (runningClient && runningClient.isReady()) {
      const guilds = runningClient.guilds.cache.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        memberCount: g.memberCount,
      }));
      res.json({ guilds, online: true });
      return;
    }

    // Bot 未运行，临时连接检查
    const token = decryptToken(bot.token);
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    await client.login(token);
    const guilds = client.guilds.cache.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      memberCount: g.memberCount,
    }));
    await client.destroy();

    res.json({ guilds, online: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

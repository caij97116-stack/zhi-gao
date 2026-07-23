import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database.js';
import { encryptToken } from '../services/crypto.js';
import { botManager } from '../services/botManager.js';
import { backupNow } from '../services/githubStorage.js';
import { templates } from './templates.js';
import type { BotRow, CommandRow, EventRow, Command, EventConfig } from '../models/types.js';

export const botsRouter = Router();

botsRouter.get('/', (_req: Request, res: Response) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM bots ORDER BY created_at DESC').all() as BotRow[];
  const bots = rows.map((row) => ({
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    status: row.status,
    clientId: row.client_id,
    guildId: row.guild_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  res.json(bots);
});

botsRouter.post('/', async (req: Request, res: Response) => {
  const { name, token, avatar, templateId, guildId } = req.body;

  if (!name || !token) {
    res.status(400).json({ error: 'name and token are required' });
    return;
  }

  try {
    // 验证 Token 有效性
    const { Client, GatewayIntentBits } = await import('discord.js');
    const testClient = new Client({ intents: [GatewayIntentBits.Guilds] });
    await testClient.login(token);
    const clientId = testClient.user?.id;
    await testClient.destroy();

    if (!clientId) {
      res.status(400).json({ error: 'Token 验证失败：无法获取 Bot 用户信息，请确认 Token 正确' });
      return;
    }

    const db = getDatabase();
    const botId = uuidv4();
    const now = new Date().toISOString();
    const encryptedToken = encryptToken(token);

    db.prepare(
      'INSERT INTO bots (id, name, avatar, token, status, client_id, guild_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(botId, name, avatar || null, encryptedToken, 'offline', clientId, guildId || null, now, now);

    const tpl = templateId ? templates.find((t) => t.id === templateId) : null;
    if (tpl) {
      for (const cmd of tpl.commands) {
        db.prepare(
          'INSERT INTO commands (id, bot_id, name, description, options_json, reply_json) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(
          uuidv4(),
          botId,
          cmd.name,
          cmd.description,
          JSON.stringify(cmd.options || []),
          JSON.stringify(cmd.reply)
        );
      }
      for (const ev of tpl.events) {
        db.prepare(
          'INSERT INTO events (id, bot_id, type, enabled, config_json) VALUES (?, ?, ?, ?, ?)'
        ).run(
          uuidv4(),
          botId,
          ev.type,
          ev.enabled ? 1 : 0,
          JSON.stringify(ev.config)
        );
      }
    }

    res.status(201).json({
      id: botId,
      name,
      avatar: avatar || null,
      status: 'offline',
      clientId: clientId,
      templateApplied: !!tpl,
      createdAt: now,
      updatedAt: now,
    });
    backupNow();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const code = (err as Record<string, unknown>)?.code;
    console.error('[创建Bot] 验证 Token 失败:', message, 'code:', code);
    // 所有 token 验证阶段的错误都是 400（用户输入问题）
    if (message.includes('ENCRYPTION_KEY')) {
      res.status(500).json({ error: '服务器未配置加密密钥 (ENCRYPTION_KEY)，请在环境变量中设置' });
      return;
    }
    res.status(400).json({ error: `Token 无效，请检查 Discord Developer Portal 中 Bot 的 Token 是否正确。错误详情: ${message}` });
  }
});

botsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(req.params.id) as BotRow | undefined;

    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    const commands = db.prepare('SELECT * FROM commands WHERE bot_id = ?').all(req.params.id) as CommandRow[];
    const events = db.prepare('SELECT * FROM events WHERE bot_id = ?').all(req.params.id) as EventRow[];

    res.json({
      id: bot.id,
      name: bot.name,
      avatar: bot.avatar,
      status: bot.status,
      clientId: bot.client_id,
      guildId: bot.guild_id,
      commands: commands.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        options: JSON.parse(c.options_json),
        reply: JSON.parse(c.reply_json),
      })) as Command[],
      events: events.map((e) => ({
        type: e.type,
        enabled: Boolean(e.enabled),
        config: JSON.parse(e.config_json),
      })) as EventConfig[],
      createdAt: bot.created_at,
      updatedAt: bot.updated_at,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: `读取 Bot 数据失败: ${message}` });
  }
});

botsRouter.put('/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(req.params.id) as BotRow | undefined;

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const { name, avatar } = req.body;
  const now = new Date().toISOString();

  db.prepare('UPDATE bots SET name = ?, avatar = ?, updated_at = ? WHERE id = ?').run(
    name || bot.name,
    avatar !== undefined ? avatar : bot.avatar,
    now,
    req.params.id
  );

  res.json({ ...bot, name: name || bot.name, avatar: avatar !== undefined ? avatar : bot.avatar, updated_at: now });
  backupNow();
});

botsRouter.delete('/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(req.params.id) as BotRow | undefined;

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  botManager.stopBot(req.params.id);
  db.prepare('DELETE FROM bots WHERE id = ?').run(req.params.id);
  res.json({ success: true });
  backupNow();
});

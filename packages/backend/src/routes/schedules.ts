import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database.js';
import { scheduleBackup } from '../services/githubStorage.js';

export const scheduleRouter = Router();

interface ScheduleRow {
  id: string;
  bot_id: string;
  command_name: string;
  cron_expression: string;
  channel_id: string;
  enabled: number;
  last_run: string | null;
  created_at: string;
  updated_at: string;
}

scheduleRouter.get('/:botId/schedules', (req: Request, res: Response) => {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM schedules WHERE bot_id = ? ORDER BY created_at DESC').all(req.params.botId) as ScheduleRow[];
  res.json(rows.map((r) => ({
    id: r.id,
    botId: r.bot_id,
    commandName: r.command_name,
    cronExpression: r.cron_expression,
    channelId: r.channel_id,
    enabled: !!r.enabled,
    lastRun: r.last_run,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  })));
});

scheduleRouter.post('/:botId/schedules', (req: Request, res: Response) => {
  const { commandName, cronExpression, channelId } = req.body;
  if (!commandName || !cronExpression || !channelId) {
    res.status(400).json({ error: 'commandName, cronExpression, channelId are required' });
    return;
  }

  const db = getDatabase();
  const bot = db.prepare('SELECT id FROM bots WHERE id = ?').get(req.params.botId);
  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO schedules (id, bot_id, command_name, cron_expression, channel_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.params.botId, commandName, cronExpression, channelId, now, now);

  res.status(201).json({
    id,
    botId: req.params.botId,
    commandName,
    cronExpression,
    channelId,
    enabled: true,
    lastRun: null,
    createdAt: now,
    updatedAt: now,
  });
  scheduleBackup();
});

scheduleRouter.put('/:botId/schedules/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ? AND bot_id = ?').get(req.params.id, req.params.botId) as ScheduleRow | undefined;
  if (!schedule) {
    res.status(404).json({ error: 'Schedule not found' });
    return;
  }

  const { enabled, cronExpression } = req.body;
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE schedules SET enabled = ?, cron_expression = ?, updated_at = ? WHERE id = ?'
  ).run(enabled !== undefined ? (enabled ? 1 : 0) : schedule.enabled, cronExpression || schedule.cron_expression, now, req.params.id);

  res.json({ ...schedule, enabled: enabled !== undefined ? enabled : !!schedule.enabled, updated_at: now });
  scheduleBackup();
});

scheduleRouter.delete('/:botId/schedules/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  db.prepare('DELETE FROM schedules WHERE id = ? AND bot_id = ?').run(req.params.id, req.params.botId);
  res.json({ success: true });
  scheduleBackup();
});

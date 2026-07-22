import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database.js';
import type { CommandRow } from '../models/types.js';

export const commandsRouter = Router({ mergeParams: true });

commandsRouter.get('/:botId/commands', (req: Request, res: Response) => {
  const db = getDatabase();
  const bot = db.prepare('SELECT id FROM bots WHERE id = ?').get(req.params.botId);

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const rows = db.prepare('SELECT * FROM commands WHERE bot_id = ?').all(req.params.botId) as CommandRow[];
  const commands = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    options: JSON.parse(row.options_json),
    reply: JSON.parse(row.reply_json),
  }));
  res.json(commands);
});

commandsRouter.post('/:botId/commands', (req: Request, res: Response) => {
  const db = getDatabase();
  const bot = db.prepare('SELECT id FROM bots WHERE id = ?').get(req.params.botId);

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const { name, description, options, reply } = req.body;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const id = uuidv4();
  const optionsJson = JSON.stringify(options || []);
  const replyJson = JSON.stringify(reply || { type: 'text', content: '' });

  db.prepare('INSERT INTO commands (id, bot_id, name, description, options_json, reply_json) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, req.params.botId, name, description || '', optionsJson, replyJson
  );

  db.prepare('UPDATE bots SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), req.params.botId);

  res.status(201).json({ id, name, description: description || '', options: options || [], reply: reply || { type: 'text', content: '' } });
});

commandsRouter.put('/:botId/commands/:cmdId', (req: Request, res: Response) => {
  const db = getDatabase();
  const cmd = db.prepare('SELECT * FROM commands WHERE id = ? AND bot_id = ?').get(req.params.cmdId, req.params.botId) as CommandRow | undefined;

  if (!cmd) {
    res.status(404).json({ error: 'Command not found' });
    return;
  }

  const { name, description, options, reply } = req.body;
  const optionsJson = options ? JSON.stringify(options) : cmd.options_json;
  const replyJson = reply ? JSON.stringify(reply) : cmd.reply_json;

  db.prepare('UPDATE commands SET name = ?, description = ?, options_json = ?, reply_json = ? WHERE id = ?').run(
    name || cmd.name,
    description !== undefined ? description : cmd.description,
    optionsJson,
    replyJson,
    req.params.cmdId
  );

  db.prepare('UPDATE bots SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), req.params.botId);

  res.json({
    id: cmd.id,
    name: name || cmd.name,
    description: description !== undefined ? description : cmd.description,
    options: options || JSON.parse(cmd.options_json),
    reply: reply || JSON.parse(cmd.reply_json),
  });
});

commandsRouter.delete('/:botId/commands/:cmdId', (req: Request, res: Response) => {
  const db = getDatabase();
  const cmd = db.prepare('SELECT id FROM commands WHERE id = ? AND bot_id = ?').get(req.params.cmdId, req.params.botId);

  if (!cmd) {
    res.status(404).json({ error: 'Command not found' });
    return;
  }

  db.prepare('DELETE FROM commands WHERE id = ?').run(req.params.cmdId);
  db.prepare('UPDATE bots SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), req.params.botId);

  res.json({ success: true });
});

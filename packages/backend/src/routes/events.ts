import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import type { EventRow } from '../models/types.js';

export const eventsRouter = Router({ mergeParams: true });

eventsRouter.get('/:botId/events', (req: Request, res: Response) => {
  const db = getDatabase();
  const bot = db.prepare('SELECT id FROM bots WHERE id = ?').get(req.params.botId);

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const rows = db.prepare('SELECT * FROM events WHERE bot_id = ?').all(req.params.botId) as EventRow[];
  const events = rows.map((row) => ({
    type: row.type,
    enabled: Boolean(row.enabled),
    config: JSON.parse(row.config_json),
  }));
  res.json(events);
});

eventsRouter.put('/:botId/events', (req: Request, res: Response) => {
  const db = getDatabase();
  const bot = db.prepare('SELECT id FROM bots WHERE id = ?').get(req.params.botId);

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  const { events } = req.body;

  if (!events || !Array.isArray(events)) {
    res.status(400).json({ error: 'events array is required' });
    return;
  }

  const upsert = db.prepare(
    'INSERT INTO events (id, bot_id, type, enabled, config_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(bot_id, type) DO UPDATE SET enabled = ?, config_json = ?'
  );

  const transaction = db.transaction(() => {
    for (const event of events) {
      const id = `${req.params.botId}_${event.type}`;
      upsert.run(
        id,
        req.params.botId,
        event.type,
        event.enabled ? 1 : 0,
        JSON.stringify(event.config || {}),
        event.enabled ? 1 : 0,
        JSON.stringify(event.config || {})
      );
    }
  });

  transaction();
  db.prepare('UPDATE bots SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), req.params.botId);

  res.json({ success: true });
});

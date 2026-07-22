import { Router, Request, Response } from 'express';
import { botManager } from '../services/botManager.js';

export const logRouter = Router();

logRouter.get('/:id/logs', (req: Request, res: Response) => {
  const botId = req.params.id;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', botId })}\n\n`);

  const handler = (entry: { botId: string }) => {
    if (entry.botId !== botId) return;
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  };

  botManager.events.on('log', handler);

  req.on('close', () => {
    botManager.events.off('log', handler);
  });
});

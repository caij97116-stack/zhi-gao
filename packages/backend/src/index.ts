import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './db/database.js';
import { botsRouter } from './routes/bots.js';
import { commandsRouter } from './routes/commands.js';
import { eventsRouter } from './routes/events.js';
import { searchRouter } from './routes/search.js';
import { serverRouter } from './routes/server.js';
import { botControlRouter } from './routes/botControl.js';
import { authRouter } from './routes/auth.js';
import { templatesRouter } from './routes/templates.js';
import { logRouter } from './routes/logs.js';
import { scheduleRouter } from './routes/schedules.js';
import { botManager } from './services/botManager.js';
import { cronScheduler } from './services/cronScheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

initializeDatabase();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/bots', logRouter);
app.use('/api/bots', botsRouter);
app.use('/api/bots', commandsRouter);
app.use('/api/bots', eventsRouter);
app.use('/api/bots', botControlRouter);
app.use('/api/bots', scheduleRouter);
app.use('/api/search', searchRouter);
app.use('/api/server', serverRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  const count = botManager.restoreAll();
  console.log(`Restored ${count} bots`);
  cronScheduler.startAll();
  console.log('Cron scheduler started');
});

process.on('SIGTERM', () => {
  botManager.stopAll();
  process.exit(0);
});

process.on('SIGINT', () => {
  botManager.stopAll();
  process.exit(0);
});

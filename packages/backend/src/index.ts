import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeDatabase, getDatabase } from './db/database.js';
import { getDataDir } from './utils/dataDir.js';
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
import { restoreFromGitHub, backupNow } from './services/githubStorage.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

// 从 GitHub 恢复数据库（在初始化数据库之前）
await restoreFromGitHub();

initializeDatabase();

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_req, res) => {
  try {
    const db = getDatabase();
    db.prepare('SELECT 1').get();
    const gitHubTokenSet = !!process.env.GITHUB_TOKEN;
    const encryptionKeySet = !!process.env.ENCRYPTION_KEY;
    const repo = process.env.GITHUB_REPOSITORY || 'caij97116-stack/zhi-gao';
    res.json({
      status: 'ok',
      database: 'connected',
      encryptionKey: encryptionKeySet ? 'set' : 'not set',
      githubToken: gitHubTokenSet ? 'set' : 'not set',
      githubRepo: repo,
      dataDir: getDataDir(),
      nodeEnv: process.env.NODE_ENV || 'not set',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', error: message });
  }
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

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 全局错误处理中间件
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message, err.stack);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`数据目录: ${getDataDir()}`);
  try {
    const count = await botManager.restoreAll();
    console.log(`Restored ${count} bots`);
  } catch (err) {
    console.error('Failed to restore bots:', err);
  }
  try {
    cronScheduler.startAll();
    console.log('Cron scheduler started');
  } catch (err) {
    console.error('Failed to start cron scheduler:', err);
  }
});

process.on('SIGTERM', async () => {
  console.log('[Shutdown] 正在备份数据到 GitHub...');
  await backupNow();
  botManager.stopAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Shutdown] 正在备份数据到 GitHub...');
  await backupNow();
  botManager.stopAll();
  process.exit(0);
});

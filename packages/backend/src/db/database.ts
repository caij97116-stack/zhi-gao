import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initializeDatabase(): void {
  const database = getDatabase();

  try { database.exec("ALTER TABLE bots ADD COLUMN permissions TEXT NOT NULL DEFAULT '0'"); } catch (_e: unknown) { /* column already exists */ }

  database.exec(`
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      token TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'offline',
      client_id TEXT,
      guild_id TEXT,
      permissions TEXT NOT NULL DEFAULT '0',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS commands (
      id TEXT PRIMARY KEY,
      bot_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      options_json TEXT NOT NULL DEFAULT '[]',
      reply_json TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      bot_id TEXT NOT NULL,
      type TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      config_json TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
      UNIQUE(bot_id, type)
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      bot_id TEXT NOT NULL,
      command_name TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
    );
  `);
}

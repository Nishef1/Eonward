import type { SQLiteDatabase } from 'expo-sqlite';

const INITIAL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    horizon TEXT NOT NULL CHECK (horizon IN ('day', 'week', 'month', 'quarter', 'year', 'decade', 'life')),
    period_key TEXT NOT NULL,
    parent_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS goals_horizon_period
    ON goals (horizon, period_key, completed, created_at);
  CREATE INDEX IF NOT EXISTS goals_parent ON goals (parent_id);
`;

const V2_SCHEMA = `
  ALTER TABLE goals ADD COLUMN archived_at TEXT;
  ALTER TABLE goals ADD COLUMN sort_rank INTEGER NOT NULL DEFAULT 0;
  CREATE INDEX IF NOT EXISTS goals_archive ON goals (archived_at);
`;

const V3_SCHEMA = `
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS board_goals (
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    added_at TEXT NOT NULL,
    PRIMARY KEY (board_id, goal_id)
  );
  CREATE INDEX IF NOT EXISTS board_goals_by_goal ON board_goals(goal_id);
`;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = result?.user_version ?? 0;
  if (version > 3) throw new Error('This app version cannot read a newer Eonward database.');
  if (version === 3) return;

  // Startup migration runs before app queries begin. Keep it on the opened connection;
  // Expo Go's second connection for withExclusiveTransactionAsync can report a lock here.
  await db.withTransactionAsync(async () => {
    if (version === 0) await db.execAsync(INITIAL_SCHEMA);
    if (version <= 1) await db.execAsync(V2_SCHEMA);
    if (version <= 2) await db.execAsync(V3_SCHEMA);
    await db.execAsync('PRAGMA user_version = 3;');
  });
}

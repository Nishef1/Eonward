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

const V4_SCHEMA = `
  CREATE TABLE IF NOT EXISTS time_blocks (
    id TEXT PRIMARY KEY NOT NULL,
    goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'block' CHECK (kind IN ('block', 'box')),
    intention TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (end_at > start_at)
  );
  CREATE INDEX IF NOT EXISTS time_blocks_by_start ON time_blocks(start_at, end_at);
  CREATE INDEX IF NOT EXISTS time_blocks_by_goal ON time_blocks(goal_id, start_at);
`;

const V5_SCHEMA = `
  CREATE TABLE IF NOT EXISTS focus_session (
    id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
    block_id TEXT NOT NULL REFERENCES time_blocks(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('running', 'paused')),
    duration_ms INTEGER NOT NULL CHECK (duration_ms > 0),
    remaining_ms INTEGER NOT NULL CHECK (remaining_ms >= 0),
    deadline_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
  );
`;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = result?.user_version ?? 0;
  if (version > 5) throw new Error('This app version cannot read a newer Eonward database.');
  if (version === 5) return;

  await db.withExclusiveTransactionAsync(async (tx) => {
    if (version === 0) await tx.execAsync(INITIAL_SCHEMA);
    if (version <= 1) await tx.execAsync(V2_SCHEMA);
    if (version <= 2) await tx.execAsync(V3_SCHEMA);
    if (version <= 3) await tx.execAsync(V4_SCHEMA);
    if (version <= 4) await tx.execAsync(V5_SCHEMA);
    await tx.execAsync('PRAGMA user_version = 5;');
  });
}

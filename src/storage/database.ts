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

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = result?.user_version ?? 0;
  if (version > 2) throw new Error('This app version cannot read a newer Eonward database.');
  if (version === 2) return;

  await db.withExclusiveTransactionAsync(async (tx) => {
    if (version === 0) await tx.execAsync(INITIAL_SCHEMA);
    if (version <= 1) await tx.execAsync(V2_SCHEMA);
    await tx.execAsync('PRAGMA user_version = 2;');
  });
}

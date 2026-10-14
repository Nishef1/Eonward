import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { migrateDatabase } from '../src/storage/database.ts';

function fakeDatabase(version) {
  const queries = [];
  let transactionCalls = 0;
  const db = {
    execAsync: async (sql) => { queries.push(sql); },
    getFirstAsync: async () => ({ user_version: version }),
    withExclusiveTransactionAsync: async (callback) => {
      transactionCalls++;
      await callback({ execAsync: db.execAsync });
    },
  };
  return { db, queries, get transactionCalls() { return transactionCalls; } };
}

test('new database installs goal, board, calendar, focus and history schemas atomically', async () => {
  const fake = fakeDatabase(0);
  await migrateDatabase(fake.db);
  assert.equal(fake.transactionCalls, 1);
  assert.ok(fake.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS goals')));
  assert.ok(fake.queries.some((sql) => sql.includes('ADD COLUMN archived_at TEXT')));
  assert.ok(fake.queries.some((sql) => sql.includes('ADD COLUMN sort_rank INTEGER NOT NULL DEFAULT 0')));
  assert.ok(fake.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS boards')));
  assert.ok(fake.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS board_goals')));
  assert.ok(fake.queries.some((sql) => sql.includes('PRIMARY KEY (board_id, goal_id)')));
  assert.ok(fake.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS time_blocks')));
  assert.ok(fake.queries.some((sql) => sql.includes('REFERENCES goals(id) ON DELETE CASCADE')));
  assert.ok(fake.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS focus_session')));
  assert.ok(fake.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS focus_history')));
  assert.ok(fake.queries.some((sql) => sql.includes('PRAGMA user_version = 6')));
});

test('existing v1–v5 data upgrades to v6 without recreating goals', async () => {
  const old = fakeDatabase(1);
  await migrateDatabase(old.db);
  assert.equal(old.transactionCalls, 1);
  assert.ok(old.queries.some((sql) => sql.includes('ALTER TABLE goals ADD COLUMN archived_at')));
  assert.equal(old.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS goals')), false);
  assert.ok(old.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS boards')));
  const v2 = fakeDatabase(2);
  await migrateDatabase(v2.db);
  assert.equal(v2.transactionCalls, 1);
  assert.equal(v2.queries.some((sql) => sql.includes('ALTER TABLE goals')), false);
  assert.ok(v2.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS board_goals')));

  const v3 = fakeDatabase(3);
  await migrateDatabase(v3.db);
  assert.equal(v3.transactionCalls, 1);
  assert.ok(v3.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS time_blocks')));
  assert.equal(v3.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS boards')), false);

  const v4 = fakeDatabase(4);
  await migrateDatabase(v4.db);
  assert.equal(v4.transactionCalls, 1);
  assert.ok(v4.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS focus_session')));
  assert.equal(v4.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS time_blocks')), false);

  const v5 = fakeDatabase(5);
  await migrateDatabase(v5.db);
  assert.equal(v5.transactionCalls, 1);
  assert.ok(v5.queries.some((sql) => sql.includes('ALTER TABLE focus_session ADD COLUMN elapsed_ms')));
  assert.ok(v5.queries.some((sql) => sql.includes('elapsed_ms = MAX(0, duration_ms - remaining_ms)')));
  assert.ok(v5.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS focus_history')));
  assert.equal(v5.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS focus_session')), false);

  const upgraded = fakeDatabase(6);
  await migrateDatabase(upgraded.db);
  assert.equal(upgraded.transactionCalls, 0);
});

test('newer database is rejected rather than overwritten', async () => {
  const fake = fakeDatabase(7);
  await assert.rejects(() => migrateDatabase(fake.db), /newer Eonward database/);
  assert.equal(fake.transactionCalls, 0);
});

test('real SQLite migrates populated v5 data to v6 without losing goals, boards or timer state', async () => {
  const sqlite = new DatabaseSync(':memory:');
  const db = {
    execAsync: async (sql) => { sqlite.exec(sql); },
    getFirstAsync: async (sql) => sqlite.prepare(sql).get() ?? null,
    withExclusiveTransactionAsync: async (callback) => {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        await callback({ execAsync: async (sql) => { sqlite.exec(sql); } });
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  try {
    await migrateDatabase(db);
    assert.equal(sqlite.prepare('PRAGMA user_version').get().user_version, 6);
    const stamp = '2026-10-14T21:00:00.000Z';
    sqlite.prepare(`INSERT INTO goals
      (id, title, notes, horizon, period_key, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run('g1', 'Study', 'Keep this note', 'day', '2026-10-14', stamp, stamp);
    sqlite.prepare(`INSERT INTO boards (id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?)`).run('b1', 'Work', stamp, stamp);
    sqlite.prepare(`INSERT INTO board_goals (board_id, goal_id, added_at)
      VALUES (?, ?, ?)`).run('b1', 'g1', stamp);
    sqlite.prepare(`INSERT INTO time_blocks
      (id, goal_id, start_at, end_at, kind, intention, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      't1', 'g1', '2026-10-14T22:30:00.000Z', '2026-10-15T00:30:00.000Z',
      'box', 'Deep work', stamp, stamp,
    );
    // Emulate the exact structural difference from v5 (not a fresh v6 database).
    sqlite.exec(`
      DROP TABLE focus_history;
      ALTER TABLE focus_session DROP COLUMN started_at_ms;
      ALTER TABLE focus_session DROP COLUMN elapsed_ms;
      PRAGMA user_version = 5;
    `);
    sqlite.prepare(`INSERT INTO focus_session
      (id, block_id, status, duration_ms, remaining_ms, deadline_ms, updated_at_ms)
      VALUES (1, ?, 'paused', ?, ?, ?, ?)`).run('t1', 1200000, 720000, 1500000, 1500000);
    await migrateDatabase(db);
    assert.equal(sqlite.prepare('PRAGMA user_version').get().user_version, 6);
    assert.equal(sqlite.prepare('SELECT notes FROM goals WHERE id = ?').get('g1').notes, 'Keep this note');
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM board_goals').get().n, 1);
    assert.equal(sqlite.prepare('SELECT intention FROM time_blocks WHERE id = ?').get('t1').intention, 'Deep work');
    const focus = sqlite.prepare('SELECT status, started_at_ms, elapsed_ms FROM focus_session').get();
    assert.equal(focus.status, 'paused');
    assert.equal(focus.elapsed_ms, 480000);
    assert.equal(focus.started_at_ms, 1020000);
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM focus_history').get().n, 0);
    assert.equal(sqlite.prepare('PRAGMA foreign_key_check').all().length, 0);
    await migrateDatabase(db); // Idempotent: opening again must not create extra rows.
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM goals').get().n, 1);
  } finally {
    sqlite.close();
  }
});

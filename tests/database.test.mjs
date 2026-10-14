import assert from 'node:assert/strict';
import test from 'node:test';
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

test('new database installs all goal, board, calendar and focus schemas atomically', async () => {
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
  assert.ok(fake.queries.some((sql) => sql.includes('PRAGMA user_version = 5')));
});

test('existing v1–v4 data upgrades to v5 without recreating goals', async () => {
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

  const upgraded = fakeDatabase(5);
  await migrateDatabase(upgraded.db);
  assert.equal(upgraded.transactionCalls, 0);
});

test('newer database is rejected rather than overwritten', async () => {
  const fake = fakeDatabase(6);
  await assert.rejects(() => migrateDatabase(fake.db), /newer Eonward database/);
  assert.equal(fake.transactionCalls, 0);
});

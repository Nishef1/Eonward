import assert from 'node:assert/strict';
import test from 'node:test';
import { migrateDatabase } from '../src/storage/database.ts';

function fakeDatabase(version) {
  const queries = [];
  let transactionCalls = 0;
  const db = {
    execAsync: async (sql) => { queries.push(sql); },
    getFirstAsync: async () => ({ user_version: version }),
    withTransactionAsync: async (callback) => {
      transactionCalls++;
      await callback();
    },
  };
  return { db, queries, get transactionCalls() { return transactionCalls; } };
}

test('new database installs goals and board schema in one migration', async () => {
  const fake = fakeDatabase(0);
  await migrateDatabase(fake.db);
  assert.equal(fake.transactionCalls, 1);
  assert.ok(fake.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS goals')));
  assert.ok(fake.queries.some((sql) => sql.includes('ADD COLUMN archived_at TEXT')));
  assert.ok(fake.queries.some((sql) => sql.includes('ADD COLUMN sort_rank INTEGER NOT NULL DEFAULT 0')));
  assert.ok(fake.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS boards')));
  assert.ok(fake.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS board_goals')));
  assert.ok(fake.queries.some((sql) => sql.includes('PRIMARY KEY (board_id, goal_id)')));
  assert.ok(fake.queries.some((sql) => sql.includes('PRAGMA user_version = 3')));
});

test('existing v1 and v2 data upgrades to v3 without recreating goals', async () => {
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

  const upgraded = fakeDatabase(3);
  await migrateDatabase(upgraded.db);
  assert.equal(upgraded.transactionCalls, 0);
});

test('newer database is rejected rather than overwritten', async () => {
  const fake = fakeDatabase(4);
  await assert.rejects(() => migrateDatabase(fake.db), /newer Eonward database/);
  assert.equal(fake.transactionCalls, 0);
});

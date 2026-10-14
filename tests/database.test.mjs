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

test('new database installs goals schema and version-two fields atomically', async () => {
  const fake = fakeDatabase(0);
  await migrateDatabase(fake.db);
  assert.equal(fake.transactionCalls, 1);
  assert.ok(fake.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS goals')));
  assert.ok(fake.queries.some((sql) => sql.includes('ADD COLUMN archived_at TEXT')));
  assert.ok(fake.queries.some((sql) => sql.includes('ADD COLUMN sort_rank INTEGER NOT NULL DEFAULT 0')));
  assert.ok(fake.queries.some((sql) => sql.includes('PRAGMA user_version = 2')));
});

test('existing version-one data upgrades without recreating the goals table', async () => {
  const old = fakeDatabase(1);
  await migrateDatabase(old.db);
  assert.equal(old.transactionCalls, 1);
  assert.ok(old.queries.some((sql) => sql.includes('ALTER TABLE goals ADD COLUMN archived_at')));
  assert.equal(old.queries.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS goals')), false);

  const upgraded = fakeDatabase(2);
  await migrateDatabase(upgraded.db);
  assert.equal(upgraded.transactionCalls, 0);
});

test('newer database is rejected rather than overwritten', async () => {
  const fake = fakeDatabase(3);
  await assert.rejects(() => migrateDatabase(fake.db), /newer Eonward database/);
  assert.equal(fake.transactionCalls, 0);
});

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

test('new database installs versioned goals schema', async () => {
  const fake = fakeDatabase(0);
  await migrateDatabase(fake.db);
  assert.equal(fake.transactionCalls, 1);
  assert.ok(fake.queries.some((q) => q.includes('CREATE TABLE IF NOT EXISTS goals')));
  assert.ok(fake.queries.some((q) => q.includes('PRAGMA user_version = 1')));
  assert.ok(fake.queries.some((q) => q.includes('PRAGMA foreign_keys = ON')));
});

test('existing database is not recreated', async () => {
  const fake = fakeDatabase(1);
  await migrateDatabase(fake.db);
  assert.equal(fake.transactionCalls, 0);
});

test('newer database is rejected rather than overwritten', async () => {
  const fake = fakeDatabase(2);
  await assert.rejects(() => migrateDatabase(fake.db), /newer Eonward database/);
  assert.equal(fake.transactionCalls, 0);
});

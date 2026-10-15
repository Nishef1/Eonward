import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { migrateDatabase } from '../src/storage/database.ts';
import { createGoal, editGoal, planGoal, setGoalCompleted, getGoal, listInboxGoals, completedGoalsSince, archiveGoal, restoreGoal, reviewPastGoal } from '../src/storage/goals.ts';
import { exportBackup, restoreBackup } from '../src/storage/backup.ts';
import { nextOccurrence } from '../src/domain/planning.ts';
import { createBoard, addGoalToBoard, listBoardGoals } from '../src/storage/boards.ts';
import { beginQuickFocus, getFocusSession, pauseFocusSession, resumeFocusSession, stopFocusSession, listFocusHistory } from '../src/storage/focus.ts';
import { safeNativePath } from '../src/domain/links.ts';

function realDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  const query = {
    execAsync: async (sql) => { sqlite.exec(sql); },
    getFirstAsync: async (sql, values = []) => sqlite.prepare(sql).get(...values) ?? null,
    getAllAsync: async (sql, values = []) => sqlite.prepare(sql).all(...values),
    runAsync: async (sql, values = []) => sqlite.prepare(sql).run(...values),
  };
  const db = { ...query, withExclusiveTransactionAsync: async (callback) => {
    sqlite.exec('BEGIN IMMEDIATE');
    try { await callback(query); sqlite.exec('COMMIT'); }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  }};
  db.withTransactionAsync = async (callback) => db.withExclusiveTransactionAsync(() => callback());
  return { sqlite, db };
}


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

test('native links reject malformed and oversized input before tolerant URI decoding', () => {
  const valid = 'eonward://calendar?goalId=abc-123';
  assert.equal(safeNativePath(valid), valid);
  const persian = '/?goalId=' + encodeURIComponent('قدم بعدی');
  assert.equal(safeNativePath(persian), persian);
  assert.equal(safeNativePath('/?goalId=%FF'.repeat(40)), '/');
  assert.equal(safeNativePath('/?goalId=%E0%A4%A'), '/');
  assert.equal(safeNativePath('/?goalId=' + '%41'.repeat(3000)), '/');
  assert.equal(safeNativePath('/?goalId=%25literal'), '/?goalId=%25literal');
});

test('newer database is rejected rather than overwritten', async () => {
  const fake = fakeDatabase(8);
  await assert.rejects(() => migrateDatabase(fake.db), /newer Eonward database/);
  assert.equal(fake.transactionCalls, 0);
});

test('real SQLite migrates populated v5 data to v7 without losing goals, boards or timer state', async () => {
  const { sqlite, db } = realDatabase();
  try {
    await migrateDatabase(db);
    assert.equal(sqlite.prepare('PRAGMA user_version').get().user_version, 7);
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
      DROP TABLE goal_activity;
      DROP INDEX goals_recurrence_source;
      DROP INDEX goals_inbox;
      ALTER TABLE goals DROP COLUMN in_inbox;
      ALTER TABLE goals DROP COLUMN due_date;
      ALTER TABLE goals DROP COLUMN repeat_rule;
      ALTER TABLE goals DROP COLUMN repeat_anchor;
      ALTER TABLE goals DROP COLUMN recurrence_from_id;
      ALTER TABLE goals DROP COLUMN reviewed_period;
      DROP TABLE focus_history;
      ALTER TABLE focus_session DROP COLUMN started_at_ms;
      ALTER TABLE focus_session DROP COLUMN elapsed_ms;
      PRAGMA user_version = 5;
    `);
    sqlite.prepare(`INSERT INTO focus_session
      (id, block_id, status, duration_ms, remaining_ms, deadline_ms, updated_at_ms)
      VALUES (1, ?, 'paused', ?, ?, ?, ?)`).run('t1', 1200000, 720000, 1500000, 1500000);
    await migrateDatabase(db);
    assert.equal(sqlite.prepare('PRAGMA user_version').get().user_version, 7);
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


test('offline planning lifecycle preserves identity, recurrence, completion history and recoverable backup graphs', async () => {
  const source = realDatabase(), target = realDatabase();
  try {
    await migrateDatabase(source.db); await migrateDatabase(target.db);
    const parent = await createGoal(source.db, { title: 'My direction', notes: '', horizon: 'year', periodKey: '2026' });
    const step = await createGoal(source.db, { title: '  Read   a chapter ', notes: 'Keep this note', horizon: 'day',
      periodKey: '2026-01-31', parentId: parent, dueDate: '2026-02-02', repeatRule: 'monthly' });
    const inbox = await createGoal(source.db, { title: 'A later idea', notes: '', horizon: 'day', periodKey: '', inbox: true });
    assert.equal((await listInboxGoals(source.db))[0].id, inbox);
    assert.equal((await getGoal(source.db, inbox)).periodKey, '');
    await assert.rejects(() => editGoal(source.db, parent, { title: 'Cycle', notes: '', horizon: 'year', periodKey: '2026', parentId: step }), /own next steps/);
    const board = await createBoard(source.db, 'Reading', 'A personal project');
    await addGoalToBoard(source.db, board, step);
    const quick = await beginQuickFocus(source.db, step, 25);
    assert.equal(quick.durationMs, 25 * 60000);
    const blockCount = source.sqlite.prepare('SELECT count(*) AS n FROM time_blocks').get().n;
    const beforePlan = await getGoal(source.db, step);
    const reservations = source.sqlite.prepare('SELECT * FROM time_blocks WHERE goal_id = ?').all(step);
    await planGoal(source.db, step, { horizon: 'day', periodKey: '2026-02-01' });
    assert.deepEqual(await getGoal(source.db, step), { ...beforePlan, periodKey: '2026-02-01',
      updatedAt: (await getGoal(source.db, step)).updatedAt });
    assert.deepEqual(source.sqlite.prepare('SELECT * FROM time_blocks WHERE goal_id = ?').all(step), reservations);
    assert.equal(source.sqlite.prepare('SELECT repeat_anchor FROM goals WHERE id = ?').get(step).repeat_anchor, '2026-01-31');
    await assert.rejects(() => planGoal(source.db, step, { horizon: 'week', periodKey: '2026-W06' }), /daily planning date/);
    await assert.rejects(() => planGoal(source.db, step, { horizon: 'day', periodKey: '', inbox: true }), /before repeating/);
    await planGoal(source.db, inbox, { horizon: 'week', periodKey: '2026-W06' });
    assert.equal((await listInboxGoals(source.db)).length, 0);
    await planGoal(source.db, inbox, { horizon: 'week', periodKey: '', inbox: true });
    assert.equal((await listInboxGoals(source.db))[0].id, inbox);
    await assert.rejects(() => planGoal(source.db, inbox, { horizon: 'day', periodKey: '2026-02-30' }), /valid planning period/);
    await assert.rejects(() => beginQuickFocus(source.db, inbox, 15), /already active/);
    assert.equal(source.sqlite.prepare('SELECT count(*) AS n FROM time_blocks').get().n, blockCount);
    await pauseFocusSession(source.db);
    assert.equal((await getFocusSession(source.db)).status, 'paused');
    await resumeFocusSession(source.db);
    await beginQuickFocus(source.db, inbox, 15, true);
    assert.equal((await listFocusHistory(source.db))[0].outcome, 'replaced');
    await stopFocusSession(source.db);
    await beginQuickFocus(source.db, step, 50);
    await archiveGoal(source.db, parent);
    await assert.rejects(() => planGoal(source.db, step, { horizon: 'day', periodKey: '2026-02-02' }), /open goal/);
    assert.equal(await getFocusSession(source.db), null);
    assert.equal((await listFocusHistory(source.db)).length, 3);
    await restoreGoal(source.db, parent);
    await setGoalCompleted(source.db, step, true);
    await assert.rejects(() => planGoal(source.db, step, { horizon: 'day', periodKey: '2026-02-02' }), /open goal/);
    await setGoalCompleted(source.db, step, true); // Double delivery is idempotent.
    assert.equal(await completedGoalsSince(source.db, '2000-01-01T00:00:00.000Z'), 1);
    assert.equal((await listBoardGoals(source.db, board)).find((goal) => goal.id === step).completed, true);
    assert.equal(source.sqlite.prepare('SELECT count(*) AS n FROM goal_activity').get().n, 1);
    const next = source.sqlite.prepare('SELECT * FROM goals WHERE recurrence_from_id = ?').get(step);
    // Postponing the January occurrence into February keeps the original 31st anchor.
    assert.equal(next.period_key, '2026-03-31');
    assert.equal(next.parent_id, parent); assert.equal(next.due_date, null);
    assert.equal(next.notes, 'Keep this note');
    assert.equal(nextOccurrence('2026-02-28', 'monthly', '2026-01-31'), '2026-03-31');
    assert.equal(nextOccurrence('2025-02-28', 'yearly', '2024-02-29'), '2026-02-28');
    assert.equal(nextOccurrence('2027-02-28', 'yearly', '2024-02-29'), '2028-02-29');
    await setGoalCompleted(source.db, step, false);
    assert.equal(await completedGoalsSince(source.db, '2000-01-01T00:00:00.000Z'), 0);
    await setGoalCompleted(source.db, step, true);
    assert.equal(source.sqlite.prepare('SELECT count(*) AS n FROM goals WHERE recurrence_from_id = ?').get(step).n, 1);
    await reviewPastGoal(source.db, next.id, true);
    assert.equal((await getGoal(source.db, step)).dueDate, '2026-02-02');
    await archiveGoal(source.db, parent); await restoreGoal(source.db, parent);
    const snapshot = await exportBackup(source.db), text = JSON.stringify(snapshot);
    assert.ok(await restoreBackup(target.db, text) > 0);
    assert.equal(await restoreBackup(target.db, text), 0);
    const restored = await exportBackup(target.db);
    for (const table of Object.keys(snapshot.tables)) {
      assert.deepEqual(restored.tables[table].map(JSON.stringify).sort(), snapshot.tables[table].map(JSON.stringify).sort());
    }
    const before = target.sqlite.prepare('SELECT count(*) AS n FROM goals').get().n;
    const broken = structuredClone(snapshot);
    broken.tables.goals[0].parent_id = broken.tables.goals[0].id;
    await assert.rejects(() => restoreBackup(target.db, JSON.stringify(broken)), /cycle/);
    assert.equal(target.sqlite.prepare('SELECT count(*) AS n FROM goals').get().n, before);
    // A valid standalone snapshot can conflict with a local recurrence source.
    // Even rows inserted before that SQL conflict must roll back.
    const conflicting = structuredClone(snapshot);
    conflicting.tables.goals.find((row) => row.id === next.id).id = 'conflicting-occurrence';
    for (const row of conflicting.tables.board_goals) {
      if (row.goal_id === next.id) row.goal_id = 'conflicting-occurrence';
    }
    conflicting.tables.goals.unshift({ ...snapshot.tables.goals.find((row) => row.id === inbox), id: 'must-roll-back' });
    await assert.rejects(() => restoreBackup(target.db, JSON.stringify(conflicting)), /UNIQUE constraint/);
    assert.equal(target.sqlite.prepare('SELECT count(*) AS n FROM goals').get().n, before);
    assert.equal(target.sqlite.prepare('SELECT id FROM goals WHERE id = ?').get('must-roll-back'), undefined);
    const localTitle = (await getGoal(target.db, step)).title;
    snapshot.tables.goals.find((row) => row.id === step).title = 'Do not overwrite local edits';
    await restoreBackup(target.db, JSON.stringify(snapshot));
    assert.equal((await getGoal(target.db, step)).title, localTitle);
    assert.equal(target.sqlite.prepare('PRAGMA foreign_key_check').all().length, 0);
  } finally { source.sqlite.close(); target.sqlite.close(); }
});

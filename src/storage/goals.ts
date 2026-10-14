import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { normalizeGoalTitle, type Goal, type GoalInput } from '../domain/goals';
import { HORIZONS, periodKey } from '../domain/horizons';

interface GoalRow {
  id: string;
  title: string;
  notes: string;
  horizon: Goal['horizon'];
  period_key: string;
  parent_id: string | null;
  completed: number;
  children_count: number;
  created_at: string;
  updated_at: string;
}

const SELECT_GOALS = `
  SELECT g.*, (SELECT count(*) FROM goals children WHERE children.parent_id = g.id) AS children_count
  FROM goals g
`;

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    horizon: row.horizon,
    periodKey: row.period_key,
    parentId: row.parent_id,
    completed: row.completed === 1,
    childrenCount: row.children_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listGoals(db: SQLiteDatabase, horizon: Goal['horizon'], key: string): Promise<Goal[]> {
  const rows = await db.getAllAsync<GoalRow>(
    `${SELECT_GOALS} WHERE g.horizon = ? AND g.period_key = ? ORDER BY g.completed ASC, g.created_at DESC`,
    [horizon, key],
  );
  return rows.map(toGoal);
}

/** All seven period snapshots in a single parameterized read; no duplicate item records. */
export async function listPerspectiveGoals(db: SQLiteDatabase, date: Date): Promise<Goal[]> {
  const filters = HORIZONS.map(() => '(g.horizon = ? AND g.period_key = ?)').join(' OR ');
  const values = HORIZONS.flatMap((horizon) => [horizon, periodKey(horizon, date)]);
  const rows = await db.getAllAsync<GoalRow>(
    `${SELECT_GOALS} WHERE ${filters} ORDER BY g.completed ASC, g.created_at DESC`,
    values,
  );
  return rows.map(toGoal);
}

export async function listChildGoals(db: SQLiteDatabase, parentId: string): Promise<Goal[]> {
  const rows = await db.getAllAsync<GoalRow>(
    `${SELECT_GOALS} WHERE g.parent_id = ? ORDER BY g.completed ASC, g.created_at DESC`,
    [parentId],
  );
  return rows.map(toGoal);
}

export async function createGoal(db: SQLiteDatabase, input: GoalInput): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO goals (id, title, notes, horizon, period_key, parent_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, normalizeGoalTitle(input.title), input.notes.trim(), input.horizon, input.periodKey, input.parentId ?? null, now, now],
  );
  return id;
}

export async function editGoal(db: SQLiteDatabase, id: string, input: GoalInput): Promise<void> {
  const title = normalizeGoalTitle(input.title);
  const parentId = input.parentId ?? null;
  if (id === parentId) throw new Error('A goal cannot be its own parent.');
  await db.withExclusiveTransactionAsync(async (tx) => {
    const existing = await tx.getFirstAsync<{ id: string }>('SELECT id FROM goals WHERE id = ?', [id]);
    if (!existing) throw new Error('The goal no longer exists.');
    if (parentId) {
      const parent = await tx.getFirstAsync<{ id: string }>('SELECT id FROM goals WHERE id = ?', [parentId]);
      if (!parent) throw new Error('The selected parent no longer exists.');
      const cycle = await tx.getFirstAsync<{ id: string }>(
        `WITH RECURSIVE descendants(id) AS (
          SELECT id FROM goals WHERE id = ?
          UNION
          SELECT g.id FROM goals g INNER JOIN descendants d ON g.parent_id = d.id
        ) SELECT id FROM descendants WHERE id = ? LIMIT 1`,
        [id, parentId],
      );
      if (cycle) throw new Error('A goal cannot belong to one of its own next steps.');
    }
    await tx.runAsync(
      'UPDATE goals SET title = ?, notes = ?, horizon = ?, period_key = ?, parent_id = ?, updated_at = ? WHERE id = ?',
      [title, input.notes.trim(), input.horizon, input.periodKey, parentId, new Date().toISOString(), id],
    );
  });
}

export async function setGoalCompleted(db: SQLiteDatabase, id: string, completed: boolean): Promise<void> {
  await db.runAsync(
    'UPDATE goals SET completed = ?, updated_at = ? WHERE id = ?',
    [completed ? 1 : 0, new Date().toISOString(), id],
  );
}

export async function removeGoal(db: SQLiteDatabase, id: string): Promise<void> {
  // Descendants become independent goals; ON DELETE SET NULL avoids destroying their history.
  await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
}

/** Query a single goal independently of its current horizon. */
export async function getGoal(db: SQLiteDatabase, id: string): Promise<Goal | null> {
  const row = await db.getFirstAsync<GoalRow>(
    `${SELECT_GOALS} WHERE g.id = ?`,
    [id],
  );
  return row ? toGoal(row) : null;
}

/** Parent picker can display any saved goal, across horizons. */
export async function listAllGoals(db: SQLiteDatabase): Promise<Goal[]> {
  const rows = await db.getAllAsync<GoalRow>(
    `${SELECT_GOALS} ORDER BY g.created_at DESC`,
  );
  return rows.map(toGoal);
}



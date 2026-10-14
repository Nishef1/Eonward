import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { normalizeGoalTitle, type Goal, type GoalInput } from '../domain/goals';

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
  await db.runAsync(
    `UPDATE goals SET title = ?, notes = ?, horizon = ?, period_key = ?, updated_at = ? WHERE id = ?`,
    [normalizeGoalTitle(input.title), input.notes.trim(), input.horizon, input.periodKey, new Date().toISOString(), id],
  );
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

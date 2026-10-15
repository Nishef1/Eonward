import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { normalizeGoalTitle } from '../domain/goals';
import { periodKey } from '../domain/horizons';
import { getGuidedPlan } from '../domain/guided-plans';

/** A canonical parent and independently editable Inbox steps, or nothing. */
export async function createGuidedPlan(db: SQLiteDatabase, templateId: string, title: string, now = new Date()): Promise<string> {
  const template = getGuidedPlan(templateId);
  const rootTitle = normalizeGoalTitle(title);
  if (!Number.isFinite(now.getTime())) throw new Error('Choose a valid planning date.');
  const timestamp = now.toISOString(), anchor = periodKey(template.horizon, now);
  const parentId = randomUUID();
  const children = template.steps.map((step) => ({
    id: randomUUID(), title: normalizeGoalTitle(step.title), notes: step.hint,
  }));
  await db.withExclusiveTransactionAsync(async (tx) => {
    const top = await tx.getFirstAsync<{ rank: number }>(`
      SELECT COALESCE(MAX(sort_rank), -1) AS rank FROM goals
      WHERE horizon = ? AND period_key = ? AND archived_at IS NULL`,
      [template.horizon, anchor]);
    await tx.runAsync(`INSERT INTO goals (
      id, title, notes, horizon, period_key, parent_id, created_at, updated_at, sort_rank, in_inbox
    ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, 0)`,
      [parentId, rootTitle, template.outcome, template.horizon, anchor,
        timestamp, timestamp, (top?.rank ?? -1) + 1]);
    const lower = await tx.getFirstAsync<{ rank: number }>(`
      SELECT COALESCE(MAX(sort_rank), -1) AS rank FROM goals
      WHERE horizon = 'day' AND period_key = '' AND archived_at IS NULL`);
    for (let i = 0; i < children.length; i++) {
      const step = children[i];
      await tx.runAsync(`INSERT INTO goals (
        id, title, notes, horizon, period_key, parent_id, created_at, updated_at, sort_rank, in_inbox
      ) VALUES (?, ?, ?, 'day', '', ?, ?, ?, ?, 1)`,
        [step.id, step.title, step.notes, parentId, timestamp, timestamp, (lower?.rank ?? -1) + i + 1]);
    }
  });
  return parentId;
}

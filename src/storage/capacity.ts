import type { SQLiteDatabase } from 'expo-sqlite';
import { localDayBounds, shiftLocalDay } from '../domain/timeblocks';

export interface WeeklyCapacity {
  goalId: string; title: string; weeklyMinutes: number; plannedMinutes: number; focusedMinutes: number;
}
export async function setWeeklyCapacity(db: SQLiteDatabase, goalId: string, minutes: number): Promise<void> {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 10080 || (minutes !== 0 && minutes < 30))
    throw new Error('Choose a weekly allocation between 30 minutes and 168 hours.');
  await db.withExclusiveTransactionAsync(async (tx) => {
    if (!await tx.getFirstAsync('SELECT id FROM goals WHERE id = ? AND archived_at IS NULL', [goalId]))
      throw new Error('The goal is no longer available.');
    if (minutes === 0) await tx.runAsync('DELETE FROM time_budgets WHERE goal_id = ?', [goalId]);
    else await tx.runAsync(`INSERT INTO time_budgets (goal_id, weekly_minutes) VALUES (?, ?)
      ON CONFLICT(goal_id) DO UPDATE SET weekly_minutes = excluded.weekly_minutes`, [goalId, minutes]);
  });
}
/** Present-day parent path is used for rollups; legacy focus without goal ID remains unassigned. */
export async function listWeeklyCapacity(db: SQLiteDatabase, monday: Date): Promise<WeeklyCapacity[]> {
  const { from } = localDayBounds(monday);
  const { from: to } = localDayBounds(shiftLocalDay(monday, 7));
  const [budgets, goals, blocks, history] = await Promise.all([
    db.getAllAsync<{ goal_id: string; title: string; weekly_minutes: number }>(`
      SELECT b.goal_id, b.weekly_minutes, g.title FROM time_budgets b JOIN goals g ON g.id = b.goal_id
      WHERE g.archived_at IS NULL ORDER BY g.title`),
    db.getAllAsync<{ id: string; parent_id: string | null }>('SELECT id, parent_id FROM goals'),
    db.getAllAsync<{ goal_id: string; start_at: string; end_at: string }>(`
      SELECT t.goal_id, t.start_at, t.end_at FROM time_blocks t JOIN goals g ON g.id = t.goal_id
      WHERE g.archived_at IS NULL AND t.start_at < ? AND t.end_at > ?`, [to, from]),
    db.getAllAsync<{ goal_id: string | null; focused_ms: number }>(`
      SELECT goal_id, focused_ms FROM focus_history WHERE ended_at_ms >= ? AND ended_at_ms < ?
      AND goal_id IS NOT NULL`, [Date.parse(from), Date.parse(to)]),
  ]);
  const byId = new Map(goals.map((g) => [g.id, g.parent_id]));
  const idsFor = (id: string): string[] => {
    const result: string[] = [], visited = new Set<string>();
    let cursor: string | null | undefined = id;
    while (cursor && !visited.has(cursor)) {
      visited.add(cursor); result.push(cursor); cursor = byId.get(cursor);
    }
    return result;
  };
  const output = new Map(budgets.map((b) => [b.goal_id, { goalId: b.goal_id, title: b.title,
    weeklyMinutes: b.weekly_minutes, plannedMinutes: 0, focusedMinutes: 0 }]));
  const fromMs = Date.parse(from), toMs = Date.parse(to);
  for (const b of blocks) {
    const minutes = Math.max(0, (Math.min(Date.parse(b.end_at), toMs) - Math.max(Date.parse(b.start_at), fromMs)) / 60000);
    for (const id of idsFor(b.goal_id)) { const target = output.get(id); if (target) target.plannedMinutes += minutes; }
  }
  for (const event of history) if (event.goal_id) for (const id of idsFor(event.goal_id)) {
    const target = output.get(id); if (target) target.focusedMinutes += event.focused_ms / 60000;
  }
  return [...output.values()];
}

import type { SQLiteDatabase } from 'expo-sqlite';
import { getFocusDurationMs, getFocusRemainingMs, type FocusSession, type FocusStatus } from '../domain/focus';

interface SessionRow {
  block_id: string;
  goal_id: string;
  goal_title: string;
  status: FocusStatus;
  duration_ms: number;
  remaining_ms: number;
  deadline_ms: number;
}
const SESSION_QUERY = `
  SELECT f.block_id, f.status, f.duration_ms, f.remaining_ms, f.deadline_ms,
    b.goal_id, g.title AS goal_title
  FROM focus_session f
  JOIN time_blocks b ON b.id = f.block_id
  JOIN goals g ON g.id = b.goal_id
  WHERE f.id = 1
`;
function convert(row: SessionRow): FocusSession {
  return {
    blockId: row.block_id, goalId: row.goal_id, goalTitle: row.goal_title,
    status: row.status, durationMs: row.duration_ms,
    remainingMs: row.remaining_ms, deadlineMs: row.deadline_ms,
  };
}

export async function getFocusSession(db: SQLiteDatabase): Promise<FocusSession | null> {
  const row = await db.getFirstAsync<SessionRow>(SESSION_QUERY);
  return row ? convert(row) : null;
}

export async function beginFocusSession(db: SQLiteDatabase, blockId: string, replace = false): Promise<FocusSession> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const existing = await tx.getFirstAsync<{ block_id: string }>(
      'SELECT block_id FROM focus_session WHERE id = 1',
    );
    if (existing && !replace) throw new Error('A focus session is already active.');
    const block = await tx.getFirstAsync<{ kind: string; start_at: string; end_at: string }>(
      `SELECT tb.kind, tb.start_at, tb.end_at FROM time_blocks tb
       JOIN goals g ON g.id = tb.goal_id
       WHERE tb.id = ? AND g.archived_at IS NULL`, [blockId],
    );
    if (!block) throw new Error('This timebox is unavailable.');
    if (block.kind !== 'box') throw new Error('Only a Timebox can start a focus session.');
    const duration = getFocusDurationMs(block.start_at, block.end_at);
    const now = Date.now();
    await tx.runAsync(
      `INSERT INTO focus_session
        (id, block_id, status, duration_ms, remaining_ms, deadline_ms, updated_at_ms)
       VALUES (1, ?, 'running', ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET block_id = excluded.block_id,
         status = excluded.status, duration_ms = excluded.duration_ms,
         remaining_ms = excluded.remaining_ms, deadline_ms = excluded.deadline_ms,
         updated_at_ms = excluded.updated_at_ms`,
      [blockId, duration, duration, now + duration, now],
    );
  });
  const session = await getFocusSession(db);
  if (!session) throw new Error('Could not recover the started focus session.');
  return session;
}

export async function pauseFocusSession(db: SQLiteDatabase): Promise<FocusSession | null> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const row = await tx.getFirstAsync<{
      status: FocusStatus; deadline_ms: number; remaining_ms: number;
    }>('SELECT status, deadline_ms, remaining_ms FROM focus_session WHERE id = 1');
    if (!row || row.status !== 'running') return;
    const now = Date.now();
    await tx.runAsync(
      "UPDATE focus_session SET status = 'paused', remaining_ms = ?, updated_at_ms = ? WHERE id = 1",
      [getFocusRemainingMs({ status: row.status, deadlineMs: row.deadline_ms, remainingMs: row.remaining_ms }, now), now],
    );
  });
  return getFocusSession(db);
}

export async function resumeFocusSession(db: SQLiteDatabase): Promise<FocusSession | null> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const row = await tx.getFirstAsync<{ status: FocusStatus; remaining_ms: number }>(
      'SELECT status, remaining_ms FROM focus_session WHERE id = 1',
    );
    if (!row || row.status !== 'paused' || row.remaining_ms === 0) return;
    const now = Date.now();
    await tx.runAsync(
      "UPDATE focus_session SET status = 'running', deadline_ms = ?, updated_at_ms = ? WHERE id = 1",
      [now + row.remaining_ms, now],
    );
  });
  return getFocusSession(db);
}

export async function stopFocusSession(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM focus_session WHERE id = 1');
}

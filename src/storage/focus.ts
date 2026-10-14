import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  getFocusDurationMs, getFocusElapsedMs, getFocusRemainingMs,
  type FocusSession, type FocusStatus, type FocusHistory, type FocusOutcome, type FocusSummary,
} from '../domain/focus';

type FocusDb = Pick<SQLiteDatabase, 'getFirstAsync' | 'runAsync'>;
interface SessionRow {
  block_id: string;
  goal_id: string;
  goal_title: string;
  status: FocusStatus;
  duration_ms: number;
  remaining_ms: number;
  deadline_ms: number;
  started_at_ms: number;
  elapsed_ms: number;
}
interface HistoryRow {
  id: string;
  goal_title: string;
  started_at_ms: number;
  ended_at_ms: number;
  planned_ms: number;
  focused_ms: number;
  outcome: FocusOutcome;
}
const SESSION_QUERY = `
  SELECT f.block_id, f.status, f.duration_ms, f.remaining_ms, f.deadline_ms,
    f.started_at_ms, f.elapsed_ms, b.goal_id, g.title AS goal_title
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
    startedAtMs: row.started_at_ms, elapsedMs: row.elapsed_ms,
  };
}
function convertHistory(row: HistoryRow): FocusHistory {
  return {
    id: row.id, goalTitle: row.goal_title, startedAtMs: row.started_at_ms,
    endedAtMs: row.ended_at_ms, plannedMs: row.planned_ms,
    focusedMs: row.focused_ms, outcome: row.outcome,
  };
}
export async function getFocusSession(db: SQLiteDatabase): Promise<FocusSession | null> {
  const row = await db.getFirstAsync<SessionRow>(SESSION_QUERY);
  return row ? convert(row) : null;
}

/** Snapshot a session atomically before replacing or deleting its Timebox. */
export async function closeFocusInTransaction(
  tx: FocusDb, now: number, reason: Exclude<FocusOutcome, 'completed'>,
): Promise<void> {
  const row = await tx.getFirstAsync<SessionRow>(SESSION_QUERY);
  if (!row) return;
  const session = convert(row);
  const focusedMs = getFocusElapsedMs(session, now);
  const outcome: FocusOutcome = getFocusRemainingMs(session, now) === 0 ? 'completed' : reason;
  await tx.runAsync(
    `INSERT INTO focus_history
      (id, goal_title, started_at_ms, ended_at_ms, planned_ms, focused_ms, outcome)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), session.goalTitle, session.startedAtMs, now, session.durationMs, focusedMs, outcome],
  );
  await tx.runAsync('DELETE FROM focus_session WHERE id = 1');
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
    if (existing) await closeFocusInTransaction(tx, now, 'replaced');
    await tx.runAsync(
      `INSERT INTO focus_session
        (id, block_id, status, duration_ms, remaining_ms, deadline_ms,
         started_at_ms, elapsed_ms, updated_at_ms)
       VALUES (1, ?, 'running', ?, ?, ?, ?, 0, ?)`,
      [blockId, duration, duration, now + duration, now, now],
    );
  });
  const session = await getFocusSession(db);
  if (!session) throw new Error('Could not recover the started focus session.');
  return session;
}

export async function pauseFocusSession(db: SQLiteDatabase): Promise<FocusSession | null> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const row = await tx.getFirstAsync<{
      status: FocusStatus; deadline_ms: number; remaining_ms: number; elapsed_ms: number;
    }>('SELECT status, deadline_ms, remaining_ms, elapsed_ms FROM focus_session WHERE id = 1');
    if (!row || row.status !== 'running') return;
    const now = Date.now();
    const remaining = getFocusRemainingMs({
      status: row.status, deadlineMs: row.deadline_ms, remainingMs: row.remaining_ms,
    }, now);
    const segment = Math.max(0, row.remaining_ms - remaining);
    await tx.runAsync(
      "UPDATE focus_session SET status = 'paused', remaining_ms = ?, elapsed_ms = ?, updated_at_ms = ? WHERE id = 1",
      [remaining, row.elapsed_ms + segment, now],
    );
  });
  return getFocusSession(db);
}

export async function resumeFocusSession(db: SQLiteDatabase): Promise<FocusSession | null> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const row = await tx.getFirstAsync<{ status: FocusStatus; remaining_ms: number }>(
      'SELECT status, remaining_ms FROM focus_session WHERE id = 1',
    );
    if (!row || row.status !== 'paused' || row.remaining_ms <= 0) return;
    const now = Date.now();
    await tx.runAsync(
      "UPDATE focus_session SET status = 'running', deadline_ms = ?, updated_at_ms = ? WHERE id = 1",
      [now + row.remaining_ms, now],
    );
  });
  return getFocusSession(db);
}

export async function stopFocusSession(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await closeFocusInTransaction(tx, Date.now(), 'stopped');
  });
}

export async function listFocusHistory(db: SQLiteDatabase, limit = 12): Promise<FocusHistory[]> {
  const rows = await db.getAllAsync<HistoryRow>(
    'SELECT * FROM focus_history ORDER BY ended_at_ms DESC, id DESC LIMIT ?', [limit],
  );
  return rows.map(convertHistory);
}
export async function listFocusHistorySince(db: SQLiteDatabase, sinceMs: number): Promise<FocusHistory[]> {
  const rows = await db.getAllAsync<HistoryRow>(
    'SELECT * FROM focus_history WHERE ended_at_ms >= ? ORDER BY ended_at_ms DESC', [sinceMs],
  );
  return rows.map(convertHistory);
}
export async function getFocusSummary(db: SQLiteDatabase): Promise<FocusSummary> {
  const row = await db.getFirstAsync<{ sessions: number; completed: number; focused: number }>(
    `SELECT COUNT(*) AS sessions,
       COALESCE(SUM(CASE WHEN outcome = 'completed' THEN 1 ELSE 0 END), 0) AS completed,
       COALESCE(SUM(focused_ms), 0) AS focused FROM focus_history`,
  );
  return { sessions: row?.sessions ?? 0, completed: row?.completed ?? 0, focusedMs: row?.focused ?? 0 };
}

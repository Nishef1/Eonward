import type { SQLiteDatabase } from 'expo-sqlite';
import type { ReplanMove, ReplanPreview } from '../domain/replan';
import { localDayBounds, localDayKey } from '../domain/timeblocks';

type Row = { id: string; start_at: string; end_at: string; flexible: number; kind: string; intention: string; goal_id: string; completed: number };
async function snapshot(db: Pick<SQLiteDatabase, 'getAllAsync'>, day: string): Promise<Row[]> {
  const start = new Date(day + 'T12:00:00');
  const bounds = localDayBounds(start);
  return db.getAllAsync<Row>(`SELECT tb.id, tb.start_at, tb.end_at, tb.flexible, tb.kind, tb.intention, tb.goal_id,
    g.completed FROM time_blocks tb JOIN goals g ON g.id = tb.goal_id
    WHERE g.archived_at IS NULL AND tb.start_at < ? AND tb.end_at > ? ORDER BY tb.id`, [bounds.to, bounds.from]);
}
function same(a: Row[], b: Row[]) {
  // SQLite orders IDs using binary collation; JS localeCompare can differ for
  // imported mixed-case/non-ASCII IDs, rejecting an otherwise unchanged day.
  const byId = (left: Row, right: Row) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  return JSON.stringify([...a].sort(byId)) === JSON.stringify([...b].sort(byId));
}
const UNDO_WINDOW_MS = 5 * 60 * 1000;
/** Only exact previewed states may be written; active Focus blocks are immutable. */
export async function applyReplan(db: SQLiteDatabase, preview: ReplanPreview, expected: readonly {
  id: string; startAt: string; endAt: string; flexible: boolean; kind: string; intention: string; goalId: string; goalCompleted: boolean;
}[], nowMs?: number | (() => number)): Promise<void> {
  const previewIsCurrent = () => {
    // Only automated fixtures inject a fixed timestamp. Production evaluates the
    // actual clock again after entering SQLite's exclusive transaction.
    const current = typeof nowMs === 'function' ? nowMs() : nowMs ?? Date.now();
    return current >= preview.atMs - 2000 && current - preview.atMs <= 120000 &&
      localDayKey(new Date(current)) === preview.day;
  };
  if (!previewIsCurrent())
    throw new Error('Recovery preview expired. Reopen it to use the current time.');
  if (!preview.moves.length) throw new Error('There are no changes to apply.');
  const ids = new Set(preview.moves.map((m) => m.id));
  if (ids.size !== preview.moves.length) throw new Error('Duplicate change.');
  const original: Row[] = [...expected].map((b) =>
    ({ id: b.id, start_at: b.startAt, end_at: b.endAt, flexible: b.flexible ? 1 : 0,
      kind: b.kind, intention: b.intention, goal_id: b.goalId, completed: b.goalCompleted ? 1 : 0 }))
    .sort((a, b) => a.id.localeCompare(b.id));
  await db.withExclusiveTransactionAsync(async (tx) => {
    if (!previewIsCurrent()) throw new Error('Recovery preview expired while waiting to save. Reopen it.');
    if (!same(await snapshot(tx, preview.day), original)) throw new Error('Calendar changed. Review a fresh preview.');
    const running = await tx.getFirstAsync<{ block_id: string }>('SELECT block_id FROM focus_session WHERE id = 1');
    if (running && ids.has(running.block_id)) throw new Error('End the active Focus session before moving its time.');
    const changes: (ReplanMove & {
      appliedAt: string; goalId: string; kind: string; intention: string;
    })[] = [];
    for (const move of preview.moves) {
      const from = original.find((row) => row.id === move.id);
      if (!from || from.flexible !== 1 || from.completed === 1 ||
        from.start_at !== move.fromStart || from.end_at !== move.fromEnd ||
        !(Date.parse(move.toEnd) > Date.parse(move.toStart))) throw new Error('Preview no longer matches the source.');
      const appliedAt = new Date().toISOString();
      const result = await tx.runAsync(`UPDATE time_blocks SET start_at = ?, end_at = ?, updated_at = ?
        WHERE id = ? AND flexible = 1 AND start_at = ? AND end_at = ?`,
        [move.toStart, move.toEnd, appliedAt, move.id, move.fromStart, move.fromEnd]);
      if (result.changes !== 1) throw new Error('A block changed while replanning.');
      changes.push({ ...move, appliedAt, goalId: from.goal_id, kind: from.kind, intention: from.intention });
    }
    const stamp = new Date().toISOString();
    await tx.runAsync(`INSERT INTO replan_checkpoint (id, before_json, after_json, created_at)
      VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET before_json = excluded.before_json,
      after_json = excluded.after_json, created_at = excluded.created_at`,
      [JSON.stringify(changes.map((m) => ({ id: m.id, start: m.fromStart, end: m.fromEnd }))),
        JSON.stringify(changes.map((m) => ({ id: m.id, start: m.toStart, end: m.toEnd,
          appliedAt: m.appliedAt, goalId: m.goalId, kind: m.kind, intention: m.intention }))), stamp]);
  });
}
export async function canUndoReplan(db: SQLiteDatabase): Promise<boolean> {
  const record = await db.getFirstAsync<{ created_at: string; before_json: string; after_json: string }>(
    'SELECT created_at, before_json, after_json FROM replan_checkpoint WHERE id = 1');
  if (!record) return false;
  const age = Date.now() - Date.parse(record.created_at);
  if (!Number.isFinite(age) || age < 0 || age > UNDO_WINDOW_MS) return false;
  type Pending = { id: string; start: string; end: string; appliedAt: string;
    goalId: string; kind: string; intention: string };
  let before: { id: string; start: string; end: string }[], after: Pending[];
  try {
    before = JSON.parse(record.before_json) as typeof before;
    after = JSON.parse(record.after_json) as Pending[];
  } catch { return false; }
  if (!Array.isArray(before) || !Array.isArray(after) || !after.length || after.length > 900 ||
    before.length !== after.length ||
    before.some((item, index) => !item || item.id !== after[index]?.id ||
      typeof item.start !== 'string' || typeof item.end !== 'string') ||
    new Set(after.map((item) => item?.id)).size !== after.length ||
    after.some((item) => !item || !item.id || !item.appliedAt || !item.goalId ||
      !item.kind || typeof item.intention !== 'string')) return false;
  const rows = await db.getAllAsync<{
    id: string; start_at: string; end_at: string; updated_at: string;
    goal_id: string; kind: string; intention: string; flexible: number;
  }>(`SELECT tb.id, tb.start_at, tb.end_at, tb.updated_at, tb.goal_id, tb.kind,
    tb.intention, tb.flexible FROM time_blocks tb
    JOIN goals g ON g.id = tb.goal_id AND g.completed = 0 AND g.archived_at IS NULL
    WHERE tb.id IN (${after.map(() => '?').join(', ')})`, after.map((item) => item.id));
  if (rows.length !== after.length) return false;
  const active = await db.getFirstAsync<{ block_id: string }>('SELECT block_id FROM focus_session WHERE id = 1');
  if (active && after.some((item) => item.id === active.block_id)) return false;
  const current = new Map(rows.map((row) => [row.id, row]));
  return after.every((item) => {
    const row = current.get(item.id);
    return !!row && row.flexible === 1 && row.start_at === item.start && row.end_at === item.end &&
      row.updated_at === item.appliedAt && row.goal_id === item.goalId &&
      row.kind === item.kind && row.intention === item.intention;
  });
}
export async function undoReplan(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const record = await tx.getFirstAsync<{ before_json: string; after_json: string; created_at: string }>(
      'SELECT before_json, after_json, created_at FROM replan_checkpoint WHERE id = 1');
    if (!record) throw new Error('No replan to undo.');
    const age = Date.now() - Date.parse(record.created_at);
    if (!Number.isFinite(age) || age < 0 || age > UNDO_WINDOW_MS)
      throw new Error('Undo is available for five minutes. Reopen the block editor for older changes.');
    const before = JSON.parse(record.before_json) as { id: string; start: string; end: string }[];
    const after = JSON.parse(record.after_json) as (typeof before[number] & {
      appliedAt?: string; goalId?: string; kind?: string; intention?: string;
    })[];
    if (before.length !== after.length || !after.length ||
      after.some((item, index) => item.id !== before[index]?.id || !item.appliedAt ||
        !item.goalId || !item.kind || typeof item.intention !== 'string')) {
      throw new Error('This undo checkpoint is no longer compatible. No reservations were changed.');
    }
    const active = await tx.getFirstAsync<{ block_id: string }>('SELECT block_id FROM focus_session WHERE id = 1');
    if (active && after.some((row) => row.id === active.block_id)) throw new Error('End Focus before undoing this replan.');
    for (let i = 0; i < after.length; i++) {
      const item = after[i], original = before[i];
      const result = await tx.runAsync(`UPDATE time_blocks SET start_at = ?, end_at = ?, updated_at = ?
        WHERE id = ? AND flexible = 1 AND start_at = ? AND end_at = ?
          AND updated_at = ? AND goal_id = ? AND kind = ? AND intention = ?
          AND EXISTS (SELECT 1 FROM goals WHERE goals.id = time_blocks.goal_id
            AND goals.completed = 0 AND goals.archived_at IS NULL)`,
        [original.start, original.end, new Date().toISOString(), item.id, item.start, item.end,
          item.appliedAt!, item.goalId!, item.kind!, item.intention!]);
      if (result.changes !== 1) throw new Error('Calendar changed since replanning. Undo is no longer safe.');
    }
    await tx.runAsync('DELETE FROM replan_checkpoint WHERE id = 1');
  });
}

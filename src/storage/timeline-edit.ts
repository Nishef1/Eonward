import type { SQLiteDatabase } from 'expo-sqlite';
import { localDayBounds } from '../domain/timeblocks';
import type { TimelineEditPreview } from '../domain/timeline-edit';

/** A stale drag preview must never overwrite a manual edit or an active Focus session. */
export async function applyTimelineEdit(db: SQLiteDatabase, preview: TimelineEditPreview): Promise<void> {
  if (preview.toStart === preview.fromStart && preview.toEnd === preview.fromEnd)
    throw new Error('There are no changes to apply.');
  const selected = new Date(preview.day + 'T12:00:00');
  const { from, to } = localDayBounds(selected);
  const start = Date.parse(preview.toStart), end = Date.parse(preview.toEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start ||
    end - start < 15 * 60000 || start < Date.parse(from) || end > Date.parse(to) ||
    Date.parse(to) - Date.parse(from) !== 86400000) {
    throw new Error('The proposed time is outside the supported day.');
  }
  await db.withExclusiveTransactionAsync(async (tx) => {
    const row = await tx.getFirstAsync<{ id: string; goal_id: string; completed: number }>(`
      SELECT tb.id, tb.goal_id, g.completed FROM time_blocks tb
      JOIN goals g ON g.id = tb.goal_id
      WHERE tb.id = ? AND tb.start_at = ? AND tb.end_at = ? AND g.archived_at IS NULL
    `, [preview.blockId, preview.fromStart, preview.fromEnd]);
    if (!row || row.completed) throw new Error('Reservation changed. Review a new preview.');
    const focus = await tx.getFirstAsync('SELECT id FROM focus_session WHERE id = 1 AND block_id = ?', [preview.blockId]);
    if (focus) throw new Error('End the active Focus session before changing its reservation.');
    const result = await tx.runAsync(`
      UPDATE time_blocks SET start_at = ?, end_at = ?, updated_at = ?
      WHERE id = ? AND start_at = ? AND end_at = ?
    `, [preview.toStart, preview.toEnd, new Date().toISOString(),
      preview.blockId, preview.fromStart, preview.fromEnd]);
    if (result.changes !== 1) throw new Error('Reservation changed before save.');
    // A manual change invalidates the one-step Recovery checkpoint. Never offer a stale Undo.
    await tx.runAsync('DELETE FROM replan_checkpoint WHERE id = 1');
  });
}

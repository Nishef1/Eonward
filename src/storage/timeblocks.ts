import { randomUUID } from 'expo-crypto';
import { closeFocusInTransaction } from './focus';
import type { SQLiteDatabase } from 'expo-sqlite';
import { localDayBounds, timeRangeFromInput, type BlockInput, type BlockKind, type TimeBlock } from '../domain/timeblocks';

interface TimeBlockRow {
  id: string;
  goal_id: string;
  goal_title: string;
  goal_completed: number;
  start_at: string;
  end_at: string;
  kind: BlockKind;
  intention: string;
}
const SELECT = `SELECT tb.*, g.title AS goal_title, g.completed AS goal_completed
  FROM time_blocks tb JOIN goals g ON g.id = tb.goal_id
  WHERE g.archived_at IS NULL`;
function map(row: TimeBlockRow): TimeBlock {
  return {
    id: row.id, goalId: row.goal_id, goalTitle: row.goal_title,
    goalCompleted: row.goal_completed === 1, startAt: row.start_at, endAt: row.end_at,
    kind: row.kind, intention: row.intention,
  };
}
export async function listRangeBlocks(db: SQLiteDatabase, from: string, to: string): Promise<TimeBlock[]> {
  const rows = await db.getAllAsync<TimeBlockRow>(
    `${SELECT} AND tb.start_at < ? AND tb.end_at > ?
      ORDER BY tb.start_at ASC, tb.end_at ASC, tb.id ASC`, [to, from],
  );
  return rows.map(map);
}
export async function listDayBlocks(db: SQLiteDatabase, date: Date): Promise<TimeBlock[]> {
  const { from, to } = localDayBounds(date);
  return listRangeBlocks(db, from, to);
}
export async function listGoalBlocks(db: SQLiteDatabase, goalId: string): Promise<TimeBlock[]> {
  const rows = await db.getAllAsync<TimeBlockRow>(
    `${SELECT} AND tb.goal_id = ? ORDER BY tb.start_at ASC, tb.id ASC`, [goalId],
  );
  return rows.map(map);
}
export async function getBlock(db: SQLiteDatabase, id: string): Promise<TimeBlock | null> {
  const row = await db.getFirstAsync<TimeBlockRow>(`${SELECT} AND tb.id = ?`, [id]);
  return row ? map(row) : null;
}
export async function saveBlock(db: SQLiteDatabase, input: BlockInput, id?: string): Promise<string> {
  const { startAt, endAt } = timeRangeFromInput(input);
  if (input.kind !== 'block' && input.kind !== 'box') throw new Error('Invalid time planning mode.');
  const now = new Date().toISOString();
  const newId = id ?? randomUUID();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const goal = await tx.getFirstAsync<{ id: string }>(
      'SELECT id FROM goals WHERE id = ? AND archived_at IS NULL', [input.goalId],
    );
    if (!goal) throw new Error('Select an active goal.');
    if (id) {
      const existing = await tx.getFirstAsync<{ goal_id: string }>(
        'SELECT goal_id FROM time_blocks WHERE id = ?', [id],
      );
      if (!existing) throw new Error('The scheduled block no longer exists.');
      const focusing = await tx.getFirstAsync<{ block_id: string }>(
        'SELECT block_id FROM focus_session WHERE id = 1 AND block_id = ?', [id],
      );
      if (focusing) throw new Error('End the active focus session before editing this Timebox.');
      await tx.runAsync(
        `UPDATE time_blocks SET goal_id = ?, start_at = ?, end_at = ?, kind = ?, intention = ?, updated_at = ?
          WHERE id = ?`,
        [input.goalId, startAt, endAt, input.kind, input.intention.trim(), now, id],
      );
    } else {
      await tx.runAsync(
        `INSERT INTO time_blocks (id, goal_id, start_at, end_at, kind, intention, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, input.goalId, startAt, endAt, input.kind, input.intention.trim(), now, now],
      );
    }
  });
  return newId;
}
export async function removeBlock(db: SQLiteDatabase, blockId: string): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const focusing = await tx.getFirstAsync<{ block_id: string }>(
      'SELECT block_id FROM focus_session WHERE id = 1 AND block_id = ?', [blockId],
    );
    if (focusing) await closeFocusInTransaction(tx, Date.now(), 'stopped');
    await tx.runAsync('DELETE FROM time_blocks WHERE id = ?', [blockId]);
  });
}

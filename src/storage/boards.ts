import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Horizon } from '../domain/horizons';

export interface Board {
  id: string;
  title: string;
  description: string;
  goalCount: number;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardGoal {
  id: string;
  title: string;
  horizon: Horizon;
  periodKey: string;
  completed: boolean;
  parentTitle: string | null;
  nextBlockAt: string | null;
}

interface BoardRow {
  id: string;
  title: string;
  description: string;
  goal_count: number;
  completed_count: number;
  created_at: string;
  updated_at: string;
}
interface BoardGoalRow {
  id: string;
  title: string;
  horizon: Horizon;
  period_key: string;
  completed: number;
  parent_title: string | null;
  next_block_at: string | null;
}

function cleanTitle(title: string): string {
  const value = title.trim().replace(/\s+/g, ' ');
  if (!value || value.length > 100) throw new Error('Board title must be between 1 and 100 characters.');
  return value;
}

function boardFromRow(row: BoardRow): Board {
  return {
    id: row.id, title: row.title, description: row.description,
    goalCount: row.goal_count, completedCount: row.completed_count,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

const SELECT_BOARDS = `
  SELECT b.*,
    (SELECT COUNT(*) FROM board_goals bg
       JOIN goals g ON g.id = bg.goal_id
       WHERE bg.board_id = b.id AND g.archived_at IS NULL) AS goal_count,
    (SELECT COUNT(*) FROM board_goals bg
       JOIN goals g ON g.id = bg.goal_id
       WHERE bg.board_id = b.id AND g.archived_at IS NULL AND g.completed = 1) AS completed_count
  FROM boards b
`;

export async function listBoards(db: SQLiteDatabase): Promise<Board[]> {
  const rows = await db.getAllAsync<BoardRow>(`${SELECT_BOARDS} ORDER BY b.updated_at DESC, b.id ASC`);
  return rows.map(boardFromRow);
}

export async function getBoard(db: SQLiteDatabase, boardId: string): Promise<Board | null> {
  const row = await db.getFirstAsync<BoardRow>(`${SELECT_BOARDS} WHERE b.id = ?`, [boardId]);
  return row ? boardFromRow(row) : null;
}

export async function createBoard(db: SQLiteDatabase, title: string, description: string): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  await db.runAsync('INSERT INTO boards (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, cleanTitle(title), description.trim(), now, now]);
  return id;
}

export async function editBoard(db: SQLiteDatabase, boardId: string, title: string, description: string): Promise<void> {
  const result = await db.runAsync(
    'UPDATE boards SET title = ?, description = ?, updated_at = ? WHERE id = ?',
    [cleanTitle(title), description.trim(), new Date().toISOString(), boardId],
  );
  if (!result.changes) throw new Error('Board no longer exists.');
}

export async function deleteBoard(db: SQLiteDatabase, boardId: string): Promise<void> {
  // Foreign keys remove only memberships; the underlying goals remain untouched.
  await db.runAsync('DELETE FROM boards WHERE id = ?', [boardId]);
}

export async function listBoardGoals(db: SQLiteDatabase, boardId: string): Promise<BoardGoal[]> {
  const rows = await db.getAllAsync<BoardGoalRow>(`
    SELECT g.id, g.title, g.horizon, g.period_key, g.completed,
      parent.title AS parent_title,
      (SELECT tb.start_at FROM time_blocks tb
        WHERE tb.goal_id = g.id AND tb.end_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        ORDER BY tb.start_at ASC LIMIT 1) AS next_block_at
    FROM board_goals bg
    JOIN goals g ON g.id = bg.goal_id
    LEFT JOIN goals parent ON parent.id = g.parent_id
    WHERE bg.board_id = ? AND g.archived_at IS NULL
    ORDER BY g.completed ASC, bg.added_at DESC, g.id ASC
  `, [boardId]);
  return rows.map((row) => ({
    id: row.id, title: row.title, horizon: row.horizon,
    periodKey: row.period_key, completed: row.completed === 1, parentTitle: row.parent_title,
    nextBlockAt: row.next_block_at,
  }));
}

export async function addGoalToBoard(db: SQLiteDatabase, boardId: string, goalId: string): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const board = await tx.getFirstAsync<{ id: string }>('SELECT id FROM boards WHERE id = ?', [boardId]);
    const goal = await tx.getFirstAsync<{ id: string }>(
      'SELECT id FROM goals WHERE id = ? AND archived_at IS NULL', [goalId]);
    if (!board || !goal) throw new Error('Board or active goal no longer exists.');
    await tx.runAsync('INSERT OR IGNORE INTO board_goals (board_id, goal_id, added_at) VALUES (?, ?, ?)',
      [boardId, goalId, new Date().toISOString()]);
    await tx.runAsync('UPDATE boards SET updated_at = ? WHERE id = ?', [new Date().toISOString(), boardId]);
  });
}

export async function removeGoalFromBoard(db: SQLiteDatabase, boardId: string, goalId: string): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('DELETE FROM board_goals WHERE board_id = ? AND goal_id = ?', [boardId, goalId]);
    await tx.runAsync('UPDATE boards SET updated_at = ? WHERE id = ?', [new Date().toISOString(), boardId]);
  });
}

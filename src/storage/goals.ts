import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { normalizeGoalTitle, type Goal, type GoalInput } from '../domain/goals';
import { HORIZONS, periodKey } from '../domain/horizons';
import { nextOccurrence, validatePlanning, type RepeatRule } from '../domain/planning';
import { closeFocusInTransaction } from './focus';

interface GoalRow {
  id: string;
  title: string;
  notes: string;
  horizon: Goal['horizon'];
  period_key: string;
  parent_id: string | null;
  parent_title: string | null;
  next_block_at: string | null;
  completed: number;
  archived_at: string | null;
  sort_rank: number;
  children_count: number;
  created_at: string;
  updated_at: string;
  in_inbox: number;
  due_date: string | null;
  repeat_rule: RepeatRule;
}

const SELECT_GOALS = `
  SELECT g.*,
    (SELECT count(*) FROM goals children WHERE children.parent_id = g.id AND children.archived_at IS NULL) AS children_count,
    parent.title AS parent_title,
    (SELECT tb.start_at FROM time_blocks tb
      WHERE tb.goal_id = g.id AND tb.end_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      ORDER BY tb.start_at ASC LIMIT 1) AS next_block_at
  FROM goals g LEFT JOIN goals parent ON parent.id = g.parent_id
`;

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    horizon: row.horizon,
    periodKey: row.period_key,
    parentId: row.parent_id,
    parentTitle: row.parent_title,
    nextBlockAt: row.next_block_at ?? null,
    completed: row.completed === 1,
    archivedAt: row.archived_at,
    sortRank: row.sort_rank,
    childrenCount: row.children_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    inbox: row.in_inbox === 1,
    dueDate: row.due_date,
    repeatRule: row.repeat_rule,
  };
}

export async function listGoals(db: SQLiteDatabase, horizon: Goal['horizon'], key: string): Promise<Goal[]> {
  const rows = await db.getAllAsync<GoalRow>(
    `${SELECT_GOALS} WHERE g.in_inbox = 0 AND g.horizon = ? AND g.period_key = ? AND g.archived_at IS NULL ORDER BY g.completed ASC, g.sort_rank ASC, g.created_at DESC, g.id ASC`,
    [horizon, key],
  );
  return rows.map(toGoal);
}

/** All seven period snapshots in a single parameterized read; no duplicate item records. */
export async function listPerspectiveGoals(db: SQLiteDatabase, date: Date): Promise<Goal[]> {
  const filters = HORIZONS.map(() => '(g.horizon = ? AND g.period_key = ?)').join(' OR ');
  const values = HORIZONS.flatMap((horizon) => [horizon, periodKey(horizon, date)]);
  const rows = await db.getAllAsync<GoalRow>(
    `${SELECT_GOALS} WHERE (${filters}) AND g.in_inbox = 0 AND g.archived_at IS NULL ORDER BY g.completed ASC, g.sort_rank ASC, g.created_at DESC, g.id ASC`,
    values,
  );
  return rows.map(toGoal);
}

export async function listChildGoals(db: SQLiteDatabase, parentId: string): Promise<Goal[]> {
  const rows = await db.getAllAsync<GoalRow>(
    `${SELECT_GOALS} WHERE g.parent_id = ? AND g.archived_at IS NULL ORDER BY g.completed ASC, g.sort_rank ASC, g.created_at DESC, g.id ASC`,
    [parentId],
  );
  return rows.map(toGoal);
}

export async function createGoal(db: SQLiteDatabase, input: GoalInput, boardId?: string): Promise<string> {
  validatePlanning(input);
  const id = randomUUID();
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (tx) => {
    if (input.parentId) {
      const parent = await tx.getFirstAsync<{ archived_at: string | null }>(
        'SELECT archived_at FROM goals WHERE id = ?', [input.parentId],
      );
      if (!parent || parent.archived_at !== null) throw new Error('Select an active parent goal.');
    }
    if (boardId) {
      const board = await tx.getFirstAsync<{ id: string }>('SELECT id FROM boards WHERE id = ?', [boardId]);
      if (!board) throw new Error('Board no longer exists.');
    }
    await tx.runAsync(
      `INSERT INTO goals (id, title, notes, horizon, period_key, parent_id, created_at, updated_at,
         in_inbox, due_date, repeat_rule, repeat_anchor, sort_rank)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (
         SELECT COALESCE(MAX(sort_rank), -1) + 1 FROM goals
         WHERE horizon = ? AND period_key = ? AND archived_at IS NULL
       ))`,
      [id, normalizeGoalTitle(input.title), input.notes.trim(), input.horizon, input.inbox ? '' : input.periodKey,
        input.parentId ?? null, now, now, input.inbox ? 1 : 0, input.dueDate?.trim() || null,
        input.repeatRule ?? 'none', input.repeatRule && input.repeatRule !== 'none' ? input.periodKey : null,
        input.horizon, input.inbox ? '' : input.periodKey],
    );
    if (boardId) {
      await tx.runAsync(
        'INSERT INTO board_goals (board_id, goal_id, added_at) VALUES (?, ?, ?)',
        [boardId, id, now],
      );
      await tx.runAsync('UPDATE boards SET updated_at = ? WHERE id = ?', [now, boardId]);
    }
  });
  return id;
}

export async function editGoal(db: SQLiteDatabase, id: string, input: GoalInput): Promise<void> {
  validatePlanning(input);
  const title = normalizeGoalTitle(input.title);
  const parentId = input.parentId ?? null;
  if (id === parentId) throw new Error('A goal cannot be its own parent.');
  await db.withExclusiveTransactionAsync(async (tx) => {
    const existing = await tx.getFirstAsync<{ id: string; archived_at: string | null }>('SELECT id, archived_at FROM goals WHERE id = ?', [id]);
    if (!existing || existing.archived_at !== null) throw new Error('The active goal no longer exists.');
    if (parentId) {
      const parent = await tx.getFirstAsync<{ id: string; archived_at: string | null }>('SELECT id, archived_at FROM goals WHERE id = ?', [parentId]);
      if (!parent || parent.archived_at !== null) throw new Error('The selected parent is unavailable.');
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
      `UPDATE goals SET title = ?, notes = ?, horizon = ?, period_key = ?, parent_id = ?,
         in_inbox = ?, due_date = ?, repeat_rule = ?,
         repeat_anchor = CASE WHEN repeat_rule = ? AND period_key = ? THEN repeat_anchor ELSE ? END,
         reviewed_period = NULL,
         sort_rank = CASE WHEN horizon = ? AND period_key = ? THEN sort_rank
           ELSE (SELECT COALESCE(MAX(other.sort_rank), -1) + 1 FROM goals other
             WHERE other.horizon = ? AND other.period_key = ? AND other.archived_at IS NULL) END,
         updated_at = ? WHERE id = ? AND archived_at IS NULL`,
      [title, input.notes.trim(), input.horizon, input.inbox ? '' : input.periodKey, parentId,
        input.inbox ? 1 : 0, input.dueDate?.trim() || null, input.repeatRule ?? 'none', input.repeatRule ?? 'none',
        input.periodKey, input.repeatRule && input.repeatRule !== 'none' ? input.periodKey : null,
        input.horizon, input.periodKey, input.horizon, input.periodKey, new Date().toISOString(), id],
    );
  });
}

/** Move only the planning container. Deadlines, reservations and recurrence anchors stay independent. */
export async function planGoal(db: SQLiteDatabase, id: string,
  destination: { horizon: Goal['horizon']; periodKey: string; inbox?: boolean }): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const goal = await tx.getFirstAsync<GoalRow>(
      'SELECT * FROM goals WHERE id = ? AND completed = 0 AND archived_at IS NULL', [id]);
    if (!goal) throw new Error('This open goal is no longer available.');
    validatePlanning({ ...destination, repeatRule: goal.repeat_rule });
    const key = destination.inbox ? '' : destination.periodKey;
    const inbox = destination.inbox ? 1 : 0;
    if (goal.horizon === destination.horizon && goal.period_key === key && goal.in_inbox === inbox) return;
    await tx.runAsync(`UPDATE goals SET horizon = ?, period_key = ?, in_inbox = ?, reviewed_period = NULL,
      sort_rank = (SELECT COALESCE(MAX(other.sort_rank), -1) + 1 FROM goals other
        WHERE other.horizon = ? AND other.period_key = ? AND other.archived_at IS NULL), updated_at = ? WHERE id = ?`,
      [destination.horizon, key, inbox, destination.horizon, key, new Date().toISOString(), id]);
  });
}

export async function setGoalCompleted(db: SQLiteDatabase, id: string, completed: boolean): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const goal = await tx.getFirstAsync<GoalRow & { repeat_anchor: string | null }>(
      'SELECT * FROM goals WHERE id = ? AND archived_at IS NULL', [id]);
    if (!goal) throw new Error('The active goal no longer exists.');
    if ((goal.completed === 1) === completed) return;
    const now = new Date().toISOString();
    await tx.runAsync('UPDATE goals SET completed = ?, updated_at = ? WHERE id = ?', [completed ? 1 : 0, now, id]);
    await tx.runAsync('INSERT INTO goal_activity (id, goal_id, kind, occurred_at) VALUES (?, ?, ?, ?)',
      [randomUUID(), id, completed ? 'completed' : 'reopened', now]);
    if (!completed || goal.repeat_rule === 'none' || goal.in_inbox) return;
    const existing = await tx.getFirstAsync<{ id: string }>('SELECT id FROM goals WHERE recurrence_from_id = ?', [id]);
    if (existing) return;
    const nextId = randomUUID();
    const nextDay = nextOccurrence(goal.period_key, goal.repeat_rule, goal.repeat_anchor ?? goal.period_key);
    // A fresh occurrence gets its own completion state. Never copy children, deadlines or time reservations.
    await tx.runAsync(`INSERT INTO goals
      (id, title, notes, horizon, period_key, parent_id, created_at, updated_at,
       sort_rank, repeat_rule, repeat_anchor, recurrence_from_id)
      VALUES (?, ?, ?, 'day', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nextId, goal.title, goal.notes, nextDay, goal.parent_id, now, now,
        goal.sort_rank, goal.repeat_rule, goal.repeat_anchor ?? goal.period_key, id]);
    await tx.runAsync(`INSERT INTO board_goals (board_id, goal_id, added_at)
      SELECT board_id, ?, ? FROM board_goals WHERE goal_id = ?`, [nextId, now, id]);
  });
}

export async function listInboxGoals(db: SQLiteDatabase): Promise<Goal[]> {
  const rows = await db.getAllAsync<GoalRow>(`${SELECT_GOALS}
    WHERE g.in_inbox = 1 AND g.archived_at IS NULL ORDER BY g.completed, g.sort_rank, g.created_at DESC`);
  return rows.map(toGoal);
}

export async function listOpenPastGoals(db: SQLiteDatabase, now = new Date()): Promise<Goal[]> {
  const rows = await db.getAllAsync<GoalRow & { reviewed_period: string | null }>(`${SELECT_GOALS}
    WHERE g.completed = 0 AND g.in_inbox = 0 AND g.archived_at IS NULL AND g.horizon != 'life'
    ORDER BY g.period_key, g.created_at`);
  return rows.filter((row) => row.period_key < periodKey(row.horizon, now)
    && row.reviewed_period !== periodKey(row.horizon, now)).map(toGoal);
}

export async function reviewPastGoal(db: SQLiteDatabase, id: string, move: boolean): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const goal = await tx.getFirstAsync<GoalRow>('SELECT * FROM goals WHERE id = ? AND completed = 0 AND archived_at IS NULL', [id]);
    if (!goal) throw new Error('This open goal is no longer available.');
    const current = periodKey(goal.horizon, new Date());
    await tx.runAsync(`UPDATE goals SET period_key = ?, reviewed_period = ?, updated_at = ? WHERE id = ?`,
      [move ? current : goal.period_key, current, new Date().toISOString(), id]);
  });
}

export async function completedGoalsSince(db: SQLiteDatabase, since: string): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(`SELECT COUNT(DISTINCT a.goal_id) AS total
    FROM goal_activity a JOIN goals g ON g.id = a.goal_id
    WHERE a.kind = 'completed' AND a.occurred_at >= ? AND g.completed = 1`, [since]);
  return row?.total ?? 0;
}

/** Archive the active subtree as one recoverable unit; pre-archived descendants stay untouched. */
export async function archiveGoal(db: SQLiteDatabase, id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const current = await tx.getFirstAsync<{ id: string }>(
      'SELECT id FROM goals WHERE id = ? AND archived_at IS NULL', [id],
    );
    if (!current) throw new Error('Goal is already archived or missing.');
    const focusing = await tx.getFirstAsync(`WITH RECURSIVE subtree(id) AS (
      SELECT id FROM goals WHERE id = ?
      UNION SELECT child.id FROM goals child JOIN subtree p ON child.parent_id = p.id
      WHERE child.archived_at IS NULL
    ) SELECT 1 FROM focus_session f JOIN time_blocks b ON b.id = f.block_id
      WHERE b.goal_id IN (SELECT id FROM subtree)`, [id]);
    if (focusing) await closeFocusInTransaction(tx, Date.now(), 'stopped');
    await tx.runAsync(
      `WITH RECURSIVE subtree(id) AS (
        SELECT id FROM goals WHERE id = ? AND archived_at IS NULL
        UNION
        SELECT child.id FROM goals child JOIN subtree p ON child.parent_id = p.id
        WHERE child.archived_at IS NULL
      )
      UPDATE goals SET archived_at = ?, updated_at = ?
      WHERE id IN (SELECT id FROM subtree)`,
      [id, now, now],
    );
  });
}

/** Restore the archived unit, without reviving descendants archived earlier. */
export async function restoreGoal(db: SQLiteDatabase, id: string): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    const item = await tx.getFirstAsync<{ parent_id: string | null; archived_at: string | null }>(
      'SELECT parent_id, archived_at FROM goals WHERE id = ?', [id],
    );
    if (!item?.archived_at) throw new Error('Goal is not archived.');
    if (item.parent_id) {
      const parent = await tx.getFirstAsync<{ archived_at: string | null }>(
        'SELECT archived_at FROM goals WHERE id = ?', [item.parent_id],
      );
      if (parent?.archived_at) throw new Error('Restore the parent goal first.');
    }
    await tx.runAsync(
      `WITH RECURSIVE subtree(id) AS (
        SELECT id FROM goals WHERE id = ? AND archived_at = ?
        UNION
        SELECT child.id FROM goals child JOIN subtree p ON child.parent_id = p.id
        WHERE child.archived_at = ?
      )
      UPDATE goals SET archived_at = NULL, updated_at = ?
      WHERE id IN (SELECT id FROM subtree)`,
      [id, item.archived_at, item.archived_at, new Date().toISOString()],
    );
  });
}

export async function listArchivedGoals(db: SQLiteDatabase): Promise<Goal[]> {
  const rows = await db.getAllAsync<GoalRow>(
    `${SELECT_GOALS}
     WHERE g.archived_at IS NOT NULL
       AND (g.parent_id IS NULL OR NOT EXISTS (
         SELECT 1 FROM goals p WHERE p.id = g.parent_id AND p.archived_at = g.archived_at
       ))
     ORDER BY g.archived_at DESC, g.created_at DESC`,
  );
  return rows.map(toGoal);
}

/** Accessible ordering works before optional drag gestures. */
export async function moveGoal(
  db: SQLiteDatabase, goalId: string, direction: -1 | 1,
): Promise<boolean> {
  let moved = false;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const item = await tx.getFirstAsync<{ horizon: string; period_key: string; completed: number }>(
      'SELECT horizon, period_key, completed FROM goals WHERE id = ? AND archived_at IS NULL',
      [goalId],
    );
    if (!item) throw new Error('Goal is not available.');
    const peers = await tx.getAllAsync<{ id: string }>(
      `SELECT id FROM goals WHERE horizon = ? AND period_key = ?
         AND archived_at IS NULL AND completed = ?
         ORDER BY sort_rank ASC, created_at DESC, id ASC`,
      [item.horizon, item.period_key, item.completed],
    );
    const index = peers.findIndex((peer) => peer.id === goalId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= peers.length) return;
    const ids = peers.map((peer) => peer.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    for (const [rank, id] of ids.entries()) {
      await tx.runAsync('UPDATE goals SET sort_rank = ?, updated_at = ? WHERE id = ?',
        [rank, new Date().toISOString(), id]);
    }
    moved = true;
  });
  return moved;
}

/** Query a single goal independently of its current horizon. */
export async function getGoal(db: SQLiteDatabase, id: string): Promise<Goal | null> {
  const row = await db.getFirstAsync<GoalRow>(
    `${SELECT_GOALS} WHERE g.id = ? AND g.archived_at IS NULL`,
    [id],
  );
  return row ? toGoal(row) : null;
}

/** Resolve an item's visible connection to longer-term goals (root first).
 * Cycles are prohibited when saving parents; the depth limit also bounds legacy corruption.
 */
export async function listGoalAncestors(db: SQLiteDatabase, goalId: string): Promise<Goal[]> {
  const rows = await db.getAllAsync<GoalRow>(
    `WITH RECURSIVE chain(id, parent_id, depth) AS (
       SELECT id, parent_id, 0 FROM goals WHERE id = ?
       UNION ALL
       SELECT parent.id, parent.parent_id, chain.depth + 1
       FROM goals parent INNER JOIN chain ON parent.id = chain.parent_id
       WHERE chain.depth < 63 AND parent.archived_at IS NULL
     )
     SELECT g.*,
       (SELECT count(*) FROM goals children WHERE children.parent_id = g.id AND children.archived_at IS NULL) AS children_count,
       parent.title AS parent_title
     FROM chain
     JOIN goals g ON g.id = chain.id
     LEFT JOIN goals parent ON parent.id = g.parent_id
     WHERE chain.depth > 0 AND g.archived_at IS NULL
     ORDER BY chain.depth DESC`,
    [goalId],
  );
  return rows.map(toGoal);
}

/** Parent picker can display any saved goal, across horizons. */
export async function listAllGoals(db: SQLiteDatabase): Promise<Goal[]> {
  const rows = await db.getAllAsync<GoalRow>(
    `${SELECT_GOALS} WHERE g.archived_at IS NULL ORDER BY g.created_at DESC`,
  );
  return rows.map(toGoal);
}



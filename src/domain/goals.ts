import type { Horizon } from './horizons';

export interface Goal {
  id: string;
  title: string;
  notes: string;
  horizon: Horizon;
  periodKey: string;
  parentId: string | null;
  parentTitle: string | null;
  nextBlockAt: string | null;
  archivedAt: string | null;
  sortRank: number;
  completed: boolean;
  childrenCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalInput {
  title: string;
  notes: string;
  horizon: Horizon;
  periodKey: string;
  parentId?: string | null;
}

export function normalizeGoalTitle(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) throw new Error('A goal needs a title.');
  if (trimmed.length > 180) throw new Error('A goal title must be 180 characters or fewer.');
  return trimmed;
}

/** Build a UI-safe choice set. The DB operation separately enforces integrity. */
export function availableGoalParents(goals: Goal[], editingId: string | null): Goal[] {
  if (!editingId) return goals;
  const excluded = new Set<string>([editingId]);
  let previousSize = -1;
  while (excluded.size !== previousSize) {
    previousSize = excluded.size;
    for (const goal of goals) {
      if (goal.parentId && excluded.has(goal.parentId)) excluded.add(goal.id);
    }
  }
  return goals.filter((goal) => !excluded.has(goal.id));
}


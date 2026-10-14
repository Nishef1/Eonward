import type { Horizon } from './horizons';

export interface Goal {
  id: string;
  title: string;
  notes: string;
  horizon: Horizon;
  periodKey: string;
  parentId: string | null;
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

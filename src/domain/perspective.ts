import type { Horizon } from './horizons';
import type { Goal } from './goals';

export interface PerspectivePeriod {
  horizon: Horizon;
  key: string;
  label: string;
}

export interface PerspectiveSection extends PerspectivePeriod {
  total: number;
  completed: number;
  preview: Goal[];
}

/** One goal has one identity; the overview never duplicates records or invents placements. */
export function buildPerspectiveSections(
  periods: readonly PerspectivePeriod[],
  goals: readonly Goal[],
): PerspectiveSection[] {
  return periods.map((period) => {
    const matching = goals
      .filter((goal) => goal.horizon === period.horizon && goal.periodKey === period.key)
      .sort((a, b) => Number(a.completed) - Number(b.completed) || b.createdAt.localeCompare(a.createdAt));
    return {
      ...period,
      total: matching.length,
      completed: matching.filter((goal) => goal.completed).length,
      preview: matching.slice(0, 2),
    };
  });
}

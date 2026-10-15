import { dateFromPeriodKey, parseDateInput, periodKey, type Horizon } from './horizons';

export const REPEAT_RULES = ['none', 'daily', 'weekly', 'monthly', 'yearly'] as const;
export type RepeatRule = (typeof REPEAT_RULES)[number];
export const REPEAT_LABELS: Record<RepeatRule, string> = {
  none: 'Does not repeat', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
};

/** Anchoring to the original day preserves Jan 31 and Feb 29 across short years/months. */
export function nextOccurrence(day: string, rule: RepeatRule, anchor = day): string {
  const date = parseDateInput(day), original = parseDateInput(anchor);
  if (!date || !original || rule === 'none') throw new Error('Choose a real day and repeat interval.');
  const next = new Date(date.getTime());
  if (rule === 'daily' || rule === 'weekly') next.setDate(next.getDate() + (rule === 'daily' ? 1 : 7));
  else {
    const year = date.getFullYear() + (rule === 'yearly' ? 1 : 0);
    const month = rule === 'yearly' ? original.getMonth() : date.getMonth() + 1;
    const last = new Date(year, month + 1, 0, 12).getDate();
    next.setFullYear(year, month, Math.min(original.getDate(), last));
  }
  return periodKey('day', next);
}

export function validatePlanning(input: { horizon: Horizon; periodKey: string; inbox?: boolean;
  dueDate?: string | null; repeatRule?: RepeatRule }): void {
  if (input.dueDate && !parseDateInput(input.dueDate)) throw new Error('Enter a real deadline (YYYY-MM-DD).');
  if (input.repeatRule && !REPEAT_RULES.includes(input.repeatRule)) throw new Error('Choose a supported repeat interval.');
  if (input.inbox) {
    if (input.repeatRule && input.repeatRule !== 'none') throw new Error('Choose a day before repeating this step.');
    return;
  }
  const date = dateFromPeriodKey(input.horizon, input.periodKey, new Date(2000, 0, 1, 12));
  if (periodKey(input.horizon, date) !== input.periodKey) throw new Error('Choose a valid planning period.');
  if (input.repeatRule && input.repeatRule !== 'none' && input.horizon !== 'day') {
    throw new Error('Repeating steps need a daily planning date.');
  }
}

import type { Horizon } from './horizons';

export interface GuidedPlan {
  id: 'project' | 'learning' | 'weekly-reset' | 'routine';
  title: string;
  description: string;
  horizon: Horizon;
  outcome: string;
  steps: readonly { title: string; hint: string }[];
}

/** Intentional starting points, not unchangeable habits or scheduled promises. */
export const GUIDED_PLANS: readonly GuidedPlan[] = [
  { id: 'project', title: 'Ship a personal project', horizon: 'quarter',
    description: 'A clear outcome, a small first version and a concrete release path.',
    outcome: 'Write down who this helps, what the first version must achieve, and what counts as shipped.',
    steps: [
      { title: 'Define one specific outcome', hint: 'Describe what done means in one sentence.' },
      { title: 'Choose the smallest usable version', hint: 'Remove optional features until there is one clear deliverable.' },
      { title: 'Reserve the first focused work session', hint: 'Plan one Timebox in Calendar; no deadline is assumed.' },
      { title: 'Review and share the result', hint: 'Look for real feedback and decide the next step.' },
    ] },
  { id: 'learning', title: 'Learn a useful skill', horizon: 'quarter',
    description: 'Turn learning into a real demonstration rather than a reading list.',
    outcome: 'Choose a practical ability you can demonstrate after deliberate practice.',
    steps: [
      { title: 'Describe what I want to be able to do', hint: 'Prefer a demonstrable outcome to a vague subject.' },
      { title: 'Choose one trustworthy learning resource', hint: 'Keep the source list short and manageable.' },
      { title: 'Practice on a tiny real example', hint: 'Pick a first session, not an unrealistic daily promise.' },
      { title: 'Create a small proof of progress', hint: 'Build, explain, write or demonstrate something tangible.' },
    ] },
  { id: 'weekly-reset', title: 'Reset my week', horizon: 'week',
    description: 'Recover control without filling every available hour.',
    outcome: 'Make this week realistic while preserving important commitments and time to rest.',
    steps: [
      { title: 'Review what is already committed', hint: 'Inspect protected reservations and deadlines.' },
      { title: 'Pick up to three meaningful priorities', hint: 'Keep the week deliberately limited.' },
      { title: 'Reserve some recovery space', hint: 'Leave open time for interruptions and rest.' },
      { title: 'Review what actually happened', hint: 'Use Focus history without equating planned time with work done.' },
    ] },
  { id: 'routine', title: 'Build a gentle routine', horizon: 'month',
    description: 'Start with something small enough to sustain.',
    outcome: 'Design a repeatable routine that fits real energy and available time.',
    steps: [
      { title: 'Identify a useful trigger', hint: 'Choose an existing moment instead of an arbitrary new alarm.' },
      { title: 'Make the first action very small', hint: 'Choose an action that fits a difficult day.' },
      { title: 'Try it without chasing streaks', hint: 'A missed day does not undo progress.' },
      { title: 'Review and adjust the routine', hint: 'Keep, reduce or reshape the plan after trying it.' },
    ] },
] as const;
export function getGuidedPlan(id: string): GuidedPlan {
  const template = GUIDED_PLANS.find((item) => item.id === id);
  if (!template) throw new Error('This guided plan is unavailable.');
  return template;
}

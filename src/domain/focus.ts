/** Timer is deadline-based: UI intervals never determine elapsed work time. */
export type FocusStatus = 'running' | 'paused';
export type FocusOutcome = 'completed' | 'stopped' | 'replaced';
export interface FocusHistory {
  id: string;
  goalId: string | null; // unavailable for events recorded before schema v8
  blockId: string | null;
  goalTitle: string;
  startedAtMs: number;
  endedAtMs: number;
  plannedMs: number;
  focusedMs: number;
  outcome: FocusOutcome;
}
export interface FocusSummary {
  sessions: number;
  completed: number;
  focusedMs: number;
}

export interface FocusSession {
  blockId: string;
  goalId: string;
  goalTitle: string;
  status: FocusStatus;
  durationMs: number;
  remainingMs: number;
  deadlineMs: number;
  startedAtMs: number;
  elapsedMs: number;
}

export function getFocusRemainingMs(
  session: Pick<FocusSession, 'status' | 'deadlineMs' | 'remainingMs'>,
  nowMs: number,
): number {
  if (session.status === 'paused') return Math.max(0, session.remainingMs);
  return Math.max(0, session.deadlineMs - nowMs);
}

/** Count only real active time across pause/resume, capped at the planned Timebox. */
export function getFocusElapsedMs(
  session: Pick<FocusSession, 'status' | 'deadlineMs' | 'remainingMs' | 'durationMs' | 'elapsedMs'>,
  nowMs: number,
): number {
  const segmentMs = session.status === 'running'
    ? session.remainingMs - getFocusRemainingMs(session, nowMs)
    : 0;
  return Math.min(session.durationMs, Math.max(0, session.elapsedMs + Math.max(0, segmentMs)));
}

export function getFocusDurationMs(startAt: string, endAt: string): number {
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  const duration = end - start;
  if (!Number.isFinite(duration) || duration < 60_000 || duration > 24 * 60 * 60_000) {
    throw new Error('Timebox duration must be between 1 minute and 24 hours.');
  }
  return duration;
}

export function formatFocusTime(remainingMs: number): string {
  const seconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

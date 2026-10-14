/** Timer is deadline-based: UI intervals never determine elapsed work time. */
export type FocusStatus = 'running' | 'paused';

export interface FocusSession {
  blockId: string;
  goalId: string;
  goalTitle: string;
  status: FocusStatus;
  durationMs: number;
  remainingMs: number;
  deadlineMs: number;
}

export function getFocusRemainingMs(
  session: Pick<FocusSession, 'status' | 'deadlineMs' | 'remainingMs'>,
  nowMs: number,
): number {
  if (session.status === 'paused') return Math.max(0, session.remainingMs);
  return Math.max(0, session.deadlineMs - nowMs);
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

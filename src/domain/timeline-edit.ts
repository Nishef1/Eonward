import { localDayBounds, localDayKey, type TimeBlock } from './timeblocks';

export type TimelineEditMode = 'move' | 'resize';
export interface TimelineEditPreview {
  blockId: string;
  goalId: string;
  kind: TimeBlock['kind'];
  intention: string;
  flexible: boolean;
  day: string;
  mode: TimelineEditMode;
  fromStart: string;
  fromEnd: string;
  toStart: string;
  toEnd: string;
  conflicts: number;
}
const STEP_MS = 15 * 60 * 1000;
export const TIMELINE_EDIT_STEP_MINUTES = 15;

/** Screen gestures and accessible stepper buttons always use identical rules.
 * Only an explicit confirmation may persist the preview. */
export function previewTimelineEdit(
  block: TimeBlock,
  others: readonly TimeBlock[],
  day: Date,
  mode: TimelineEditMode,
  deltaMinutes: number,
): TimelineEditPreview {
  const { from, to } = localDayBounds(day);
  const floor = Date.parse(from), ceiling = Date.parse(to);
  const originalStart = Date.parse(block.startAt), originalEnd = Date.parse(block.endAt);
  if (!Number.isFinite(floor) || !Number.isFinite(ceiling) ||
      ceiling - floor !== 86400000) {
    throw new Error('Use the editor for timezone transition dates.');
  }
  if (block.goalCompleted) throw new Error('Completed goals cannot be rescheduled.');
  if (!Number.isFinite(originalStart) || !Number.isFinite(originalEnd) ||
      originalEnd <= originalStart || originalStart < floor || originalEnd > ceiling) {
    throw new Error('Use the editor for overnight or cross-day reservations.');
  }
  if (!Number.isInteger(deltaMinutes) || deltaMinutes % 15 !== 0) {
    throw new Error('Use 15-minute increments.');
  }
  if (mode !== 'move' && mode !== 'resize') throw new Error('Unknown timeline action.');
  const offset = deltaMinutes * 60000;
  const proposedStart = originalStart + (mode === 'move' ? offset : 0);
  const proposedEnd = originalEnd + offset;
  if (proposedStart < floor || proposedEnd > ceiling ||
      proposedEnd <= proposedStart || proposedEnd - proposedStart < STEP_MS) {
    throw new Error('Keep at least 15 minutes within the selected day.');
  }
  const conflicts = others.filter((other) => other.id !== block.id &&
    Date.parse(other.startAt) < proposedEnd && Date.parse(other.endAt) > proposedStart).length;
  return { blockId: block.id, goalId: block.goalId, kind: block.kind,
    intention: block.intention, flexible: block.flexible, day: localDayKey(day), mode,
    fromStart: block.startAt, fromEnd: block.endAt,
    toStart: new Date(proposedStart).toISOString(),
    toEnd: new Date(proposedEnd).toISOString(), conflicts };
}

/** Translate vertical pixels to stable quarter-hour steps at the current zoom. */
export function pixelsToQuarterHours(deltaY: number, hourHeight: number): number {
  if (!Number.isFinite(deltaY) || !Number.isFinite(hourHeight) || hourHeight <= 0) return 0;
  return Math.round(deltaY / hourHeight * 4) * TIMELINE_EDIT_STEP_MINUTES;
}

import { localDayBounds, localDayKey, type TimeBlock } from './timeblocks';

export interface ReplanMove {
  id: string;
  fromStart: string;
  fromEnd: string;
  toStart: string;
  toEnd: string;
}
export interface ReplanPreview {
  day: string;
  mode: 'recover' | 'extend';
  moves: ReplanMove[];
  protectedCount: number;
  availableMinutes: number;
}
type ReplanRequest = { mode: 'recover' | 'extend'; now: Date; day: Date; targetId?: string; extraMinutes?: 15 | 30 };
type Interval = { start: number; end: number };
const overlap = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/** Deterministic, offline preview: nothing is mutated until a separately confirmed transaction. */
export function previewReplan(blocks: readonly TimeBlock[], request: ReplanRequest): ReplanPreview {
  const { from, to } = localDayBounds(request.day);
  const begin = Date.parse(from), limit = Date.parse(to), now = request.now.getTime();
  if (limit - begin !== 86400000) throw new Error('Use the list editor on clock-change days.');
  if (!Number.isFinite(now) || !Number.isFinite(limit)) throw new Error('Invalid recovery day.');
  const day = localDayKey(request.day);
  if (localDayKey(request.now) !== day) throw new Error('Recovery is available for today only.');
  const sorted = [...blocks].sort((a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id));
  if (new Set(sorted.map((block) => block.id)).size !== sorted.length) throw new Error('Duplicate calendar block.');
  const target = request.mode === 'extend' ? sorted.find((block) => block.id === request.targetId) : undefined;
  if (request.mode === 'extend' && (!target || !target.flexible || target.goalCompleted ||
    ![15, 30].includes(request.extraMinutes ?? -1) ||
    Date.parse(target.endAt) <= now || Date.parse(target.startAt) > limit)) {
    throw new Error('Select an unfinished, flexible block that has not ended.');
  }
  const targetStart = target ? Date.parse(target.startAt) : now;
  const movable = sorted.filter((block) => {
    const start = Date.parse(block.startAt), end = Date.parse(block.endAt);
    return block.flexible && !block.goalCompleted && start >= begin && end <= limit &&
      (request.mode === 'recover' ? start >= now : block.id !== target?.id && start >= targetStart);
  });
  const movableIds = new Set(movable.map((block) => block.id));
  const protectedBlocks = sorted.filter((block) => !movableIds.has(block.id) && block.id !== target?.id);
  const occupied: Interval[] = protectedBlocks.map((block) =>
    ({ start: Date.parse(block.startAt), end: Date.parse(block.endAt) }));
  const moves: ReplanMove[] = [];
  let cursor = request.mode === 'recover' ? now + 15 * 60000 : targetStart;
  if (target) {
    const end = Date.parse(target.endAt) + (request.extraMinutes ?? 0) * 60000;
    const extended = { start: targetStart, end };
    if (end > limit || occupied.some((slot) => overlap(slot, extended))) {
      throw new Error('The extension conflicts with protected time or crosses midnight.');
    }
    occupied.push(extended);
    cursor = end;
    moves.push({ id: target.id, fromStart: target.startAt, fromEnd: target.endAt,
      toStart: target.startAt, toEnd: new Date(end).toISOString() });
  }
  for (const block of movable) {
    const original = Date.parse(block.startAt);
    const duration = Date.parse(block.endAt) - original;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Invalid scheduled duration.');
    let start = Math.max(original, cursor);
    // Advance through *all* occupied reservations, including future fixed events.
    while (true) {
      const conflict = occupied.filter((slot) => overlap({ start, end: start + duration }, slot))
        .sort((a, b) => a.end - b.end)[0];
      if (!conflict) break;
      start = conflict.end;
    }
    if (start + duration > limit) throw new Error('The remaining flexible blocks do not fit today. Edit or move a block manually.');
    occupied.push({ start, end: start + duration });
    cursor = start + duration;
    if (start !== original) moves.push({ id: block.id, fromStart: block.startAt, fromEnd: block.endAt,
      toStart: new Date(start).toISOString(), toEnd: new Date(start + duration).toISOString() });
  }
  // The free-time number is unoccupied wall time, not a claim of real availability.
  const intervals = occupied.map(({ start, end }) => ({ start: Math.max(now, start), end: Math.min(limit, end) }))
    .filter((slot) => slot.end > slot.start).sort((a, b) => a.start - b.start);
  let busy = 0, last = now;
  for (const slot of intervals) { busy += Math.max(0, slot.end - Math.max(last, slot.start)); last = Math.max(last, slot.end); }
  return { day, mode: request.mode, moves,
    protectedCount: protectedBlocks.length, availableMinutes: Math.max(0, Math.floor((limit - now - busy) / 60000)) };
}

/** Calendar blocks are scheduled occurrences, separate from a goal's Horizon. */
export type BlockKind = 'block' | 'box';
export interface BlockInput {
  goalId: string;
  date: string; // local YYYY-MM-DD
  start: string; // local HH:mm
  end: string;
  kind: BlockKind;
  intention: string;
}
export interface TimeBlock {
  id: string;
  goalId: string;
  goalTitle: string;
  goalCompleted: boolean;
  startAt: string; // UTC ISO instant, display in device local timezone
  endAt: string;
  kind: BlockKind;
  intention: string;
}
export function localDayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function localClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
export function parseLocalDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  return Number(match[1]) === date.getFullYear()
    && Number(match[2]) === date.getMonth() + 1
    && Number(match[3]) === date.getDate() ? date : null;
}
export function shiftLocalDay(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  next.setDate(next.getDate() + days);
  return next;
}
export function timeRangeFromInput(input: Pick<BlockInput, 'date' | 'start' | 'end'>): { startAt: string; endAt: string } {
  const day = parseLocalDay(input.date);
  if (!day) throw new Error('Enter a valid date (YYYY-MM-DD).');
  const parseClock = (value: string) => {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
    if (!m) throw new Error('Enter a 24-hour time, e.g. 09:30.');
    return [Number(m[1]), Number(m[2])] as const;
  };
  const make = (value: string) => {
    const [h, m] = parseClock(value);
    const result = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
    // Reject non-existent local times during the DST spring-forward gap.
    if (result.getHours() !== h || result.getMinutes() !== m || localDayKey(result) !== input.date) {
      throw new Error('That local time does not exist on this date.');
    }
    return result;
  };
  const start = make(input.start);
  const end = make(input.end);
  if (end.getTime() <= start.getTime()) {
    throw new Error('End time must be later than start time, on the same day.');
  }
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}
export function localDayBounds(day: Date): { from: string; to: string } {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0);
  const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 0, 0);
  return { from: start.toISOString(), to: next.toISOString() };
}
export interface PlacedBlock {
  block: TimeBlock;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}
/** Each overlapping group shares horizontal space; blocks keep their true vertical time position. */
export function layoutBlocks(blocks: readonly TimeBlock[], hourHeight = 64): PlacedBlock[] {
  const ordered = [...blocks].sort((a, b) =>
    a.startAt.localeCompare(b.startAt) || a.endAt.localeCompare(b.endAt) || a.id.localeCompare(b.id));
  const result: PlacedBlock[] = [];
  let group: PlacedBlock[] = [];
  let groupEnd = -Infinity;
  let active: { end: number; lane: number }[] = [];
  function flush() {
    const lanes = Math.max(1, ...group.map((item) => item.lane + 1));
    for (const item of group) item.lanes = lanes;
    group = [];
    active = [];
  }
  for (const block of ordered) {
    const start = new Date(block.startAt);
    const end = new Date(block.endAt);
    const startMs = start.getTime();
    const endMs = end.getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue;
    if (startMs >= groupEnd && group.length) flush();
    active = active.filter((item) => item.end > startMs);
    const occupied = new Set(active.map((item) => item.lane));
    let lane = 0;
    while (occupied.has(lane)) lane++;
    active.push({ end: endMs, lane });
    groupEnd = Math.max(groupEnd, endMs);
    const beginMinutes = start.getHours() * 60 + start.getMinutes();
    const durationMinutes = (endMs - startMs) / 60000;
    const placement: PlacedBlock = {
      block, top: beginMinutes / 60 * hourHeight,
      height: Math.max(30, durationMinutes / 60 * hourHeight),
      lane, lanes: 1,
    };
    group.push(placement);
    result.push(placement);
  }
  if (group.length) flush();
  return result;
}

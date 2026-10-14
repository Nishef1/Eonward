export const HORIZONS = ['day', 'week', 'month', 'quarter', 'year', 'decade', 'life'] as const;

export type Horizon = (typeof HORIZONS)[number];

export const HORIZON_TITLES: Record<Horizon, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
  decade: 'Decade',
  life: 'Life',
};

const pad = (value: number) => String(value).padStart(2, '0');

function noon(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12, 0, 0, 0);
}

export function startOfWeek(date: Date): Date {
  const day = noon(date.getFullYear(), date.getMonth(), date.getDate());
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
}

// ISO weeks are calculated with UTC calendar components to avoid DST errors.
export function isoWeekKey(date: Date): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const isoYear = utc.getUTCFullYear();
  const first = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((utc.getTime() - first.getTime()) / 86400000 + 1) / 7);
  return `${isoYear}-W${pad(week)}`;
}

export function periodKey(horizon: Horizon, date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  switch (horizon) {
    case 'day': return `${y}-${pad(m)}-${pad(date.getDate())}`;
    case 'week': return isoWeekKey(date);
    case 'month': return `${y}-${pad(m)}`;
    case 'quarter': return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
    case 'year': return String(y);
    case 'decade': return String(Math.floor(y / 10) * 10);
    case 'life': return 'life';
  }
}

export function shiftPeriod(horizon: Horizon, date: Date, delta: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  switch (horizon) {
    case 'day': return noon(y, m, d + delta);
    case 'week': return noon(y, m, d + delta * 7);
    case 'month': return noon(y, m + delta, 1);
    case 'quarter': return noon(y, Math.floor(m / 3) * 3 + delta * 3, 1);
    case 'year': return noon(y + delta, 0, 1);
    case 'decade': return noon(Math.floor(y / 10) * 10 + delta * 10, 0, 1);
    case 'life': return noon(y, m, d);
  }
}

export function periodLabel(horizon: Horizon, date: Date): string {
  const y = date.getFullYear();
  switch (horizon) {
    case 'day':
      return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
    case 'week': {
      const start = startOfWeek(date);
      const end = noon(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      const first = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(start);
      const last = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(end);
      return `${first} – ${last}`;
    }
    case 'month': return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
    case 'quarter': return `Quarter ${Math.floor(date.getMonth() / 3) + 1}, ${y}`;
    case 'year': return String(y);
    case 'decade': return `${Math.floor(y / 10) * 10}s`;
    case 'life': return 'The bigger picture';
  }
}

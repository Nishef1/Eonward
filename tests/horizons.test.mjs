import assert from 'node:assert/strict';
import test from 'node:test';
import { isoWeekKey, periodKey, shiftPeriod, startOfWeek, periodLabel } from '../src/domain/horizons.ts';
import { normalizeGoalTitle } from '../src/domain/goals.ts';

test('all seven horizon keys use independent periods', () => {
  const date = new Date(2026, 9, 14, 12);
  assert.equal(periodKey('day', date), '2026-10-14');
  assert.equal(periodKey('week', date), '2026-W42');
  assert.equal(periodKey('month', date), '2026-10');
  assert.equal(periodKey('quarter', date), '2026-Q4');
  assert.equal(periodKey('year', date), '2026');
  assert.equal(periodKey('decade', date), '2020');
  assert.equal(periodKey('life', date), 'life');
});

test('ISO week-year follows Thursday at New Year', () => {
  assert.equal(isoWeekKey(new Date(2020, 11, 31, 12)), '2020-W53');
  assert.equal(isoWeekKey(new Date(2021, 0, 1, 12)), '2020-W53');
  assert.equal(isoWeekKey(new Date(2021, 0, 4, 12)), '2021-W01');
});

test('period navigation does not roll into the wrong month', () => {
  const endOfMonth = new Date(2024, 0, 31, 12);
  assert.equal(periodKey('month', shiftPeriod('month', endOfMonth, 1)), '2024-02');
  assert.equal(periodKey('quarter', shiftPeriod('quarter', endOfMonth, 1)), '2024-Q2');
  assert.equal(periodKey('year', shiftPeriod('year', endOfMonth, 1)), '2025');
  assert.equal(periodKey('decade', shiftPeriod('decade', endOfMonth, 1)), '2030');
  assert.equal(periodKey('day', shiftPeriod('day', endOfMonth, 1)), '2024-02-01');
});

test('week starts Monday without mutating input', () => {
  const date = new Date(2026, 9, 18, 12);
  const start = startOfWeek(date);
  assert.equal(periodKey('day', start), '2026-10-12');
  assert.equal(periodKey('day', date), '2026-10-18');
  assert.match(periodLabel('week', date), /Oct 12/);
});

test('name normalization rejects empty and overlong goals', () => {
  assert.equal(normalizeGoalTitle('  Learn   to build  '), 'Learn to build');
  assert.throws(() => normalizeGoalTitle('   '), /needs a title/);
  assert.throws(() => normalizeGoalTitle('x'.repeat(181)), /180 characters/);
});

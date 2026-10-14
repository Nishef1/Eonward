import assert from 'node:assert/strict';
import test from 'node:test';
import { isoWeekKey, periodKey, shiftPeriod, startOfWeek, periodLabel, dateFromPeriodKey, parseDateInput } from '../src/domain/horizons.ts';
import { normalizeGoalTitle, availableGoalParents } from '../src/domain/goals.ts';
import { buildPerspectiveSections } from '../src/domain/perspective.ts';

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

test('saved period can be recovered accurately for editing', () => {
  const fallback = new Date(2026, 9, 14, 12);
  for (const horizon of ['day', 'week', 'month', 'quarter', 'year', 'decade']) {
    const key = periodKey(horizon, fallback);
    assert.equal(periodKey(horizon, dateFromPeriodKey(horizon, key, new Date(2031, 2, 8))), key);
  }
  assert.equal(periodKey('week', dateFromPeriodKey('week', '2020-W53', fallback)), '2020-W53');
  assert.equal(periodKey('week', dateFromPeriodKey('week', '2021-W01', fallback)), '2021-W01');
});

test('strict date input rejects impossible calendar days', () => {
  assert.equal(periodKey('day', parseDateInput('2024-02-29')), '2024-02-29');
  assert.equal(parseDateInput('2025-02-29'), null);
  assert.equal(parseDateInput('2026-13-01'), null);
  assert.equal(parseDateInput('2026-04-31'), null);
  assert.equal(parseDateInput('2026/10/14'), null);
});

test('parent choices cannot contain the edited goal or any descendants', () => {
  const goal = (id, parentId) => ({ id, parentId, title: id });
  const items = [goal('root', null), goal('child', 'root'), goal('grandchild', 'child'), goal('other', null)];
  assert.deepEqual(availableGoalParents(items, 'root').map((x) => x.id), ['other']);
  assert.deepEqual(availableGoalParents(items, 'child').map((x) => x.id), ['root', 'other']);
});

test('multi-horizon overview groups unique saved goals and limits previews', () => {
  const periods = [
    { horizon: 'day', key: '2026-10-14', label: 'Today' },
    { horizon: 'year', key: '2026', label: '2026' },
    { horizon: 'life', key: 'life', label: 'Life' },
  ];
  const goal = (id, horizon, periodKey, completed, createdAt) => ({
    id, title: id, horizon, periodKey, completed, createdAt, childrenCount: 0,
  });
  const goals = [
    goal('a', 'day', '2026-10-14', false, '2026-10-12T12:00:00Z'),
    goal('b', 'day', '2026-10-14', false, '2026-10-13T12:00:00Z'),
    goal('c', 'day', '2026-10-14', true, '2026-10-14T12:00:00Z'),
    goal('not-this-day', 'day', '2026-10-13', false, '2026-10-14T12:00:00Z'),
    goal('d', 'life', 'life', false, '2026-10-11T12:00:00Z'),
  ];
  const sections = buildPerspectiveSections(periods, goals);
  assert.deepEqual(sections.map((section) => section.total), [3, 0, 1]);
  assert.deepEqual(sections.map((section) => section.completed), [1, 0, 0]);
  assert.deepEqual(sections[0].preview.map((item) => item.id), ['b', 'a']);
  assert.deepEqual(sections[1].preview, []);
  assert.equal(new Set(sections.flatMap((section) => section.preview.map((item) => item.id))).size, 3);
});

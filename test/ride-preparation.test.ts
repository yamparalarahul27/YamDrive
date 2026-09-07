import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCheckList, parseDepartureTime, plannedClock } from '../src/lib/ride-preparation.ts';
import { buildRideSchedule, DEFAULT_RIDE_PLAN, parseRidePlan } from '../src/lib/ride-plan.ts';

test('departure uses a valid 24-hour time and rejects malformed saved input', () => {
  for (const time of ['00:00', '04:30', '05:00', '23:59']) assert.equal(parseDepartureTime(time), time);
  for (const time of ['24:00', '05:60', '5:00', '', null, {}, '05:00 AM']) assert.equal(parseDepartureTime(time), undefined);
});
test('India departure produces stop and arrival clocks with break durations', () => {
  const schedule = buildRideSchedule(DEFAULT_RIDE_PLAN);
  assert.equal(plannedClock('05:00'), '5:00 AM');
  assert.equal(plannedClock('05:00', schedule.stops[1].elapsedMinutes), '7:15 AM');
  assert.equal(plannedClock('05:00', schedule.elapsedMinutes), '5:15 PM');
  assert.equal(plannedClock('23:30', 90), '1:00 AM (+1d)');
  assert.equal(plannedClock('23:30', 1530), '1:00 AM (+2d)');
  assert.equal(plannedClock('11:59', 1), '12:00 PM');
  assert.equal(plannedClock(undefined, 90), null);
  assert.equal(plannedClock('05:00', -1), null);
});
test('stored preparation preserves valid choices and filters corrupt or duplicate checks', () => {
  const plan = parseRidePlan({ ...DEFAULT_RIDE_PLAN, departureTime: '04:30', preRideChecks: ['fuel', 'fuel', 'bogus', 1, 'brakes'], lightMap: false });
  assert.equal(plan.departureTime, '04:30');
  assert.deepEqual(plan.preRideChecks, ['fuel', 'brakes']);
  assert.equal(plan.lightMap, false);
  assert.deepEqual(parseCheckList(null), []);
  assert.equal(parseRidePlan({ departureTime: 'nonsense', lightMap: 'false' }).lightMap, undefined);
  assert.equal(parseRidePlan({ departureTime: 'nonsense' }).departureTime, undefined);
});

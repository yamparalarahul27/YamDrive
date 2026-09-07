import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRideSchedule, DEFAULT_RIDE_PLAN, parseRidePlan, rideDirectionsUrl } from '../src/lib/ride-plan.ts';

test('600 km at 60 km/h gives nine breaks and no break at arrival', () => {
  const result = buildRideSchedule(DEFAULT_RIDE_PLAN);
  assert.equal(result.stops.length, 9);
  assert.equal(result.ridingMinutes, 600);
  assert.equal(result.elapsedMinutes, 735);
  assert.equal(result.stops[1].elapsedMinutes, 135);
  assert.equal(result.stops.at(-1)?.km, 540);
});
test('coincident fuel/rest targets are one stop and short trips need no stop', () => {
  const result = buildRideSchedule({ ...DEFAULT_RIDE_PLAN, fuelEveryKm: 180 });
  assert.equal(result.stops.length, 9);
  assert.equal(result.stops.filter(s => s.fuel && s.rest).length, 3);
  assert.equal(buildRideSchedule({ ...DEFAULT_RIDE_PLAN, distanceKm: 50 }).stops.length, 0);
});
test('separate fuel stops contribute to elapsed time and remain sorted', () => {
  const result = buildRideSchedule({ ...DEFAULT_RIDE_PLAN, distanceKm: 200, fuelEveryKm: 100 });
  assert.deepEqual(result.stops.map(s => s.km), [60, 100, 120, 180]);
  assert.equal(result.elapsedMinutes, 260);
});
test('old or invalid stored preferences restore valid bounded defaults', () => {
  assert.deepEqual(parseRidePlan(undefined), DEFAULT_RIDE_PLAN);
  const result = parseRidePlan({ averageKph: 0, breakEveryMinutes: NaN, distanceKm: Infinity });
  assert.deepEqual(result, DEFAULT_RIDE_PLAN);
});
test('motorcycle handoff encodes destinations without injecting parameters', () => {
  const url = new URL(rideDirectionsUrl({ ...DEFAULT_RIDE_PLAN, origin: 'Guntur & Co', destination: 'Bangalore #1' }));
  assert.equal(url.searchParams.get('origin'), 'Guntur & Co');
  assert.equal(url.searchParams.get('destination'), 'Bangalore #1');
  assert.equal(url.searchParams.get('travelmode'), 'two-wheeler');
});

test('endpoint pins persist, reject invalid coordinates and drive external directions', () => {
  const originPin = { latitude: 16.3, longitude: 80.4 };
  const destinationPin = { latitude: 12.9, longitude: 77.6 };
  const plan = parseRidePlan({ ...DEFAULT_RIDE_PLAN, originPin, destinationPin });
  assert.deepEqual(plan.originPin, originPin);
  assert.deepEqual(plan.destinationPin, destinationPin);
  assert.equal(parseRidePlan({ originPin: { latitude: 91, longitude: 0 } }).originPin, undefined);
  const url = new URL(rideDirectionsUrl(plan));
  assert.equal(url.searchParams.get('origin'), '16.3,80.4');
  assert.equal(url.searchParams.get('destination'), '12.9,77.6');
});

test('ride settings preserve a valid speed range and discard invalid ranges', () => {
  assert.deepEqual(parseRidePlan({ speedRange: { min: 40, max: 60 } }).speedRange, { min: 40, max: 60 });
  assert.equal(parseRidePlan({ speedRange: { min: 60, max: 40 } }).speedRange, undefined);
});

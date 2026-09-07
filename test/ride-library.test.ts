import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTrip, parseRideLibrary, switchRide, upsertRide } from '../src/lib/ride-library.ts';
import { DEFAULT_RIDE_PLAN } from '../src/lib/ride-plan.ts';
import type { Trip } from '../src/lib/types';
const original: Trip = { id: 'original', name: 'Guntur ride', stops: [{ id: 'fuel', name: 'Petrol', category: 'fuel', latitude: 16, longitude: 80, createdAt: 1 }], updatedAt: 1,
  ridePlan: { ...DEFAULT_RIDE_PLAN, departureTime: '04:30', preRideChecks: ['fuel', 'brakes'] } };
test('legacy ride migration retains its identity, endpoints, stops, departure and checks', () => {
  const trip = parseTrip(JSON.parse(JSON.stringify(original)))!;
  const library = parseRideLibrary({ activeId: trip.id, trips: [trip] })!;
  assert.equal(library.activeId, original.id);
  assert.deepEqual(library.trips[0].stops, trip.stops);
  assert.equal(library.trips[0].ridePlan?.departureTime, '04:30');
  assert.deepEqual(library.trips[0].ridePlan?.preRideChecks, ['fuel', 'brakes']);
});
test('switching saves outgoing edits and restores the selected ride without mixing data', () => {
  const next: Trip = { id: 'second', name: 'Coast', updatedAt: 2, stops: [], ridePlan: { ...DEFAULT_RIDE_PLAN, destination: 'Chennai', preRideChecks: [] } };
  const edited = { ...original, name: 'Edited original' };
  const first = switchRide(edited, [original, next], next.id);
  assert.equal(first.trip.id, 'second');
  assert.deepEqual(first.trip.stops, []);
  assert.deepEqual(first.trip.ridePlan?.preRideChecks, []);
  const back = switchRide({ ...next, name: 'Edited second' }, first.trips, original.id);
  assert.equal(back.trip.name, 'Edited original');
  assert.equal(back.trip.stops[0].id, 'fuel');
  assert.equal(back.trips.find(t => t.id === 'second')?.name, 'Edited second');
  const restored = parseRideLibrary(JSON.parse(JSON.stringify({ activeId: back.trip.id, trips: back.trips })))!;
  assert.equal(restored.activeId, original.id);
  assert.equal(restored.trips.length, 2);
});
test('invalid active id falls back to a valid ride; malformed and duplicate rides are skipped', () => {
  const parsed = parseRideLibrary({ activeId: 'missing', trips: [null, {}, original, original] })!;
  assert.equal(parsed.activeId, original.id);
  assert.equal(parsed.trips.length, 1);
  assert.equal(parseRideLibrary({ trips: [] }), null);
  assert.equal(switchRide(original, [original], 'missing').trip.id, original.id);
  assert.equal(upsertRide([original], { ...original, name: 'Updated' }).length, 1);
});

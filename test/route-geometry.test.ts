import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodePolyline6, cumulativeKm, pointAlong, routeSignature, parseRoadRoute } from '../src/lib/route-geometry.ts';

test('polyline6 decodes signed coordinates in longitude/latitude order', () => {
  // Google polyline example coordinates scaled at 1e6 instead of 1e5.
  const encoded = '_izlhA~rlgdF_{geC~ywl@_kwzCn`{nI';
  assert.deepEqual(decodePolyline6(encoded), [[-120.2, 38.5], [-120.95, 40.7], [-126.453, 43.252]]);
  assert.throws(() => decodePolyline6('~~~~'));
});
test('break targets follow bends in the route instead of the endpoints chord', () => {
  const points: [number, number][] = [[0, 0], [1, 0], [1, 1]];
  const distances = cumulativeKm(points);
  const middle = pointAlong(points, distances, 0.5);
  assert.ok(Math.abs(middle[0] - 1) < 0.00001);
  assert.ok(Math.abs(middle[1]) < 0.00001);
  assert.deepEqual(pointAlong(points, distances, 1), [1, 1]);
  assert.deepEqual(pointAlong(points, distances, 0), [0, 0]);
});
test('route cache becomes stale when endpoints or stop order change', () => {
  const a = { latitude: 1, longitude: 2 }, b = { latitude: 2, longitude: 3 };
  assert.notEqual(routeSignature('A', 'B', [a, b]), routeSignature('A', 'B', [b, a]));
  assert.notEqual(routeSignature('A', 'B', []), routeSignature('A', 'C', []));
  assert.equal(routeSignature(' A ', 'B', []), routeSignature('a', 'b', []));
});
test('invalid persisted route geometry is rejected', () => {
  const route = { signature: 'test', coordinates: [[80, 16], [77, 13]], distanceKm: 630, durationMinutes: 900, savedAt: 1 };
  assert.ok(parseRoadRoute(route));
  assert.equal(parseRoadRoute({ ...route, coordinates: [[NaN, 16], [77, 13]] }), null);
  assert.equal(parseRoadRoute({ ...route, distanceKm: 0 }), null);
  assert.equal(parseRoadRoute(null), null);
});

test('moving an endpoint pin invalidates a cached route even with the same label', () => {
  const a = { latitude: 16.3, longitude: 80.4 }, b = { latitude: 16.31, longitude: 80.4 };
  assert.notEqual(routeSignature('A', 'B', [], a), routeSignature('A', 'B', [], b));
  assert.notEqual(routeSignature('A', 'B', []), routeSignature('A', 'B', [], a));
  assert.notEqual(routeSignature('A', 'B', [], a, a), routeSignature('A', 'B', [], a, b));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexRoute, routeProgress } from '../src/lib/navigation-guidance.ts';
import { cumulativeKm, pointAlong, simplifyRoute, type Position } from '../src/lib/route-geometry.ts';

test('indexed matching preserves full-scan results across a long road and off-route fixes', () => {
  const route: Position[] = Array.from({ length: 12000 }, (_, i) => [80 - i * 0.0002, 16 - i * 0.00025 + Math.sin(i / 30) * 0.001]);
  const distances = cumulativeKm(route), blocks = indexRoute(route);
  for (const index of [0, 63, 64, 65, 127, 6000, 11999]) {
    for (const offset of [0, 0.0002, 0.02, 1]) {
      const fix: Position = [route[index][0] + offset, route[index][1]];
      const full = routeProgress(fix, route, distances), indexed = routeProgress(fix, route, distances, blocks);
      assert.deepEqual(indexed, full);
    }
  }
});
test('index handles duplicate coordinates and loops without relying on previous position', () => {
  const route: Position[] = [[80,16],[80,16],[80.01,16],[80.01,16.01],[80,16],[79.99,16]];
  const distances = cumulativeKm(route);
  for (const fix of [[80,16], [80.01,16.005]] as Position[]) {
    assert.deepEqual(routeProgress(fix, route, distances, indexRoute(route)), routeProgress(fix, route, distances));
  }
});
test('display simplification retains bends and endpoints without changing the navigation geometry', () => {
  const route: Position[] = [[80,16],[80.001,16],[80.002,16],[80.002,16.001],[80.002,16.002]];
  const snapshot = JSON.stringify(route);
  assert.deepEqual(simplifyRoute(route), [route[0], route[2], route[4]]);
  assert.equal(JSON.stringify(route), snapshot);
  assert.deepEqual(simplifyRoute([route[0], route[1]]), [route[0], route[1]]);
});
test('binary route interpolation covers start, end, exact vertices and duplicate segments', () => {
  const route: Position[] = [[80,16],[80,16],[80.01,16],[80.02,16]], d = cumulativeKm(route);
  assert.deepEqual(pointAlong(route,d,0), route[0]);
  assert.deepEqual(pointAlong(route,d,1), route[3]);
  assert.ok(Math.abs(pointAlong(route,d,0.5)[0] - route[2][0]) < 1e-9);
  const quarter = pointAlong(route,d,0.25);
  assert.ok(Math.abs(quarter[0] - 80.005) < 1e-9);
});

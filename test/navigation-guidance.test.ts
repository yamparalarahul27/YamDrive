import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bearingBetween, routeProgress, nextTurn, turnKind } from '../src/lib/navigation-guidance.ts';
import { cumulativeKm, type Position } from '../src/lib/route-geometry.ts';
test('heading follows cardinal directions', () => {
  assert.equal(bearingBetween([0,0],[0,1]), 0);
  assert.equal(bearingBetween([0,0],[1,0]), 90);
  assert.equal(bearingBetween([0,0],[-1,0]), 270);
});
test('progress projects onto a segment and identifies distance off the route', () => {
  const points: Position[] = [[0,0],[0.01,0],[0.01,0.01]], d = cumulativeKm(points);
  const p = routeProgress([0.005,0], points,d);
  assert.ok(Math.abs(p.km - d[1]/2) < 0.001);
  assert.ok(p.distanceKm < 0.001);
  assert.ok(routeProgress([0.005,0.005],points,d).distanceKm > 0.075);
});
test('next-turn advances after passing a turn and preserves arrival', () => {
  const steps = [{ index:0,type:1,instruction:'Start' },{ index:1,type:10,instruction:'Right' },{ index:2,type:4,instruction:'Arrive' }];
  assert.equal(nextTurn(steps,[0,1,2],0.5)?.instruction,'Right');
  assert.equal(nextTurn(steps,[0,1,2],1.1)?.instruction,'Arrive');
  assert.equal(turnKind(15),'left'); assert.equal(turnKind(10),'right'); assert.equal(turnKind(26),'roundabout');
});

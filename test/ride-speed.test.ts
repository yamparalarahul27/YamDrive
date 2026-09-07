import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gpsSpeedKph, parseSpeedRange, pauseClock, rideElapsed, speedBand } from '../src/lib/ride-speed.ts';
test('GPS speed converts metres per second and rejects stale, inaccurate or missing fixes', () => {
  const fix = { timestamp: 10000, coords: { speed: 10, accuracy: 5 } };
  assert.equal(gpsSpeedKph(fix, 11000), 36);
  assert.equal(gpsSpeedKph(fix, 19000), null);
  assert.equal(gpsSpeedKph({ ...fix, coords: { speed: -1, accuracy: 5 } }, 11000), null);
  assert.equal(gpsSpeedKph({ ...fix, coords: { speed: 10, accuracy: 60 } }, 11000), null);
  assert.equal(gpsSpeedKph({ ...fix, coords: { speed: 0, accuracy: 5 } }, 11000), 0);
});
test('range boundaries and unknown readings are classified correctly', () => {
  const range = { min: 40, max: 60 };
  assert.equal(speedBand(39, range), 'below');
  assert.equal(speedBand(40, range), 'within');
  assert.equal(speedBand(60, range), 'within');
  assert.equal(speedBand(61, range), 'above');
  assert.equal(speedBand(null, range), 'unknown');
  assert.equal(parseSpeedRange({ min: 60, max: 40 }), null);
});
test('pause and resume exclude paused time and repeated pause is harmless', () => {
  const ride = { status: 'active' as const, elapsedMs: 0, startedAt: 1000 };
  const paused = pauseClock(ride, 11000);
  assert.equal(rideElapsed(paused, 21000), 10000);
  assert.deepEqual(pauseClock(paused, 21000), paused);
  assert.equal(rideElapsed({ ...paused, status: 'active', startedAt: 21000 }, 26000), 15000);
});

test('demo cycles colour states and integrates accelerated route distance', async () => {
  const { demoSpeed, demoDistanceKm } = await import('../src/lib/ride-speed.ts');
  const range = { min: 40, max: 60 };
  assert.equal(speedBand(demoSpeed(0, range), range), 'below');
  assert.equal(speedBand(demoSpeed(8000, range), range), 'within');
  assert.equal(speedBand(demoSpeed(16000, range), range), 'above');
  assert.equal(demoSpeed(24000, range), 0);
  assert.equal(demoDistanceKm(24000, range), demoDistanceKm(31000, range));
  assert.ok(demoDistanceKm(40000, range) > demoDistanceKm(32000, range));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { remainingRide, recordElevation } from '../src/lib/ride-overview.ts';
test('remaining ride maps geometry progress to road distance and adds only future breaks', () => {
  assert.deepEqual(remainingRide(600,600,250,500,60,[100,200,300,400,500],15), {travelledKm:300,remainingKm:300,remainingBreaks:2,minutes:330});
  assert.equal(remainingRide(600,600,600,500,60,[100],15).minutes,0);
});
test('elevation rejects stale, missing and inaccurate readings, preserving accepted extrema', () => {
  const first=recordElevation(null,100,10,1000,1000);
  assert.equal(recordElevation(first,900,80,2000,2000),first);
  assert.equal(recordElevation(first,900,10,2000,20000),first);
  assert.equal(recordElevation(first,null,10,2000,2000),first);
  assert.deepEqual(recordElevation(first,90,10,2000,2000),{current:90,lowest:90,highest:100,timestamp:2000});
});

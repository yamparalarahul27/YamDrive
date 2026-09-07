import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MAX_WAYPOINTS, directionsUrlTo, routeUrl } from '../src/lib/navigation-links.ts';
import type { Stop } from '../src/lib/types.ts';

const stopAt = (latitude: number, longitude: number, name = 'Stop'): Stop => ({
  id: `${latitude},${longitude}`,
  name,
  category: 'fuel',
  latitude,
  longitude,
  createdAt: 0,
});

const paramsOf = (url: string) => new URL(url).searchParams;

describe('directionsUrlTo', () => {
  it('builds a driving link to a single destination', () => {
    const params = paramsOf(directionsUrlTo({ latitude: 12.9716, longitude: 77.5946 }));
    assert.equal(params.get('api'), '1');
    assert.equal(params.get('destination'), '12.9716,77.5946');
    assert.equal(params.get('travelmode'), 'driving');
  });

  it('percent-encodes coordinates so the pair survives parsing', () => {
    const url = directionsUrlTo({ latitude: 12.9716, longitude: 77.5946 });
    assert.ok(url.includes('destination=12.9716%2C77.5946'));
  });
});

describe('routeUrl', () => {
  it('returns null when there is no route to draw', () => {
    assert.equal(routeUrl([]), null);
    assert.equal(routeUrl([stopAt(1, 1)]), null);
  });

  it('uses the first and last stops as origin and destination', () => {
    const link = routeUrl([stopAt(1, 1), stopAt(2, 2)]);
    assert.ok(link);
    const params = paramsOf(link.url);
    assert.equal(params.get('origin'), '1,1');
    assert.equal(params.get('destination'), '2,2');
    assert.equal(params.get('waypoints'), null);
    assert.equal(link.includedStops, 2);
    assert.equal(link.droppedStops, 0);
  });

  it('puts the middle stops in waypoints, pipe-separated and in order', () => {
    const link = routeUrl([stopAt(1, 1), stopAt(2, 2), stopAt(3, 3), stopAt(4, 4)]);
    assert.ok(link);
    assert.equal(paramsOf(link.url).get('waypoints'), '2,2|3,3');
    assert.equal(link.includedStops, 4);
    assert.equal(link.droppedStops, 0);
  });

  it('caps waypoints at what Google Maps accepts and reports the overflow', () => {
    // 1 origin + 12 middle + 1 destination: 3 middle stops must be dropped.
    const stops = Array.from({ length: 14 }, (_, index) => stopAt(index + 1, index + 1));
    const link = routeUrl(stops);
    assert.ok(link);

    const waypoints = paramsOf(link.url).get('waypoints');
    assert.ok(waypoints);
    assert.equal(waypoints.split('|').length, MAX_WAYPOINTS);
    assert.equal(link.includedStops, MAX_WAYPOINTS + 2);
    assert.equal(link.droppedStops, 3);

    // The destination is still the final stop, not the ninth waypoint.
    assert.equal(paramsOf(link.url).get('destination'), '14,14');
  });
});

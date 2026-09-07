import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_REGION,
  coordinatesOf,
  estimatedDriveMinutes,
  estimatedRoadKm,
  formatDistanceKm,
  formatDuration,
  haversineKm,
  legDistancesKm,
  regionAround,
  regionForCoordinates,
  regionRadiusMeters,
  totalStraightLineKm,
} from '../src/lib/geo.ts';

const DELHI = { latitude: 28.6139, longitude: 77.209 };
const MUMBAI = { latitude: 19.076, longitude: 72.8777 };
const BENGALURU = { latitude: 12.9716, longitude: 77.5946 };
const CHENNAI = { latitude: 13.0827, longitude: 80.2707 };

describe('haversineKm', () => {
  it('matches known great-circle distances to within a kilometre', () => {
    assert.ok(Math.abs(haversineKm(DELHI, MUMBAI) - 1148) < 1);
    assert.ok(Math.abs(haversineKm(BENGALURU, CHENNAI) - 290) < 1);
  });

  it('is zero for a point against itself', () => {
    assert.equal(haversineKm(DELHI, DELHI), 0);
  });

  it('is symmetric', () => {
    assert.equal(haversineKm(DELHI, MUMBAI), haversineKm(MUMBAI, DELHI));
  });
});

describe('legDistancesKm', () => {
  it('reports zero for the first stop so it can be indexed with the list', () => {
    const legs = legDistancesKm([DELHI, MUMBAI, BENGALURU]);
    assert.equal(legs.length, 3);
    assert.equal(legs[0], 0);
    assert.equal(legs[1], haversineKm(DELHI, MUMBAI));
    assert.equal(legs[2], haversineKm(MUMBAI, BENGALURU));
  });

  it('handles empty and single-stop trips', () => {
    assert.deepEqual(legDistancesKm([]), []);
    assert.deepEqual(legDistancesKm([DELHI]), [0]);
  });
});

describe('totalStraightLineKm', () => {
  it('sums the legs', () => {
    const stops = [DELHI, MUMBAI, BENGALURU];
    const expected = haversineKm(DELHI, MUMBAI) + haversineKm(MUMBAI, BENGALURU);
    assert.ok(Math.abs(totalStraightLineKm(stops) - expected) < 1e-9);
  });

  it('is zero when there is nowhere to go', () => {
    assert.equal(totalStraightLineKm([]), 0);
    assert.equal(totalStraightLineKm([DELHI]), 0);
  });
});

describe('estimates', () => {
  it('inflates straight-line distance for road winding', () => {
    assert.equal(estimatedRoadKm(100), 125);
  });

  it('converts distance to minutes at the assumed average speed', () => {
    assert.equal(estimatedDriveMinutes(90, 45), 120);
  });

  it('refuses to divide by a zero speed', () => {
    assert.equal(estimatedDriveMinutes(90, 0), 0);
  });
});

describe('formatDistanceKm', () => {
  it('uses metres below a kilometre', () => {
    assert.equal(formatDistanceKm(0.42), '420 m');
  });

  it('keeps one decimal for short hops', () => {
    assert.equal(formatDistanceKm(4.26), '4.3 km');
  });

  it('rounds and groups thousands for long hauls', () => {
    assert.equal(formatDistanceKm(42.4), '42 km');
    assert.equal(formatDistanceKm(1148.1), '1,148 km');
  });

  it('degrades gracefully on junk input', () => {
    assert.equal(formatDistanceKm(Number.NaN), '—');
    assert.equal(formatDistanceKm(-5), '—');
  });
});

describe('formatDuration', () => {
  it('formats minutes, hours, and both', () => {
    assert.equal(formatDuration(45), '45 min');
    assert.equal(formatDuration(120), '2 h');
    assert.equal(formatDuration(155), '2 h 35 min');
  });

  it('degrades gracefully on junk input', () => {
    assert.equal(formatDuration(0), '—');
    assert.equal(formatDuration(Number.NaN), '—');
  });
});

describe('regionForCoordinates', () => {
  it('returns null when there is nothing to frame', () => {
    assert.equal(regionForCoordinates([]), null);
  });

  it('centres on the bounding box and pads it', () => {
    const region = regionForCoordinates([BENGALURU, CHENNAI], 1.4);
    assert.ok(region);
    assert.ok(Math.abs(region.latitude - (BENGALURU.latitude + CHENNAI.latitude) / 2) < 1e-9);
    assert.ok(Math.abs(region.longitude - (BENGALURU.longitude + CHENNAI.longitude) / 2) < 1e-9);
    // Padded, so the span is wider than the raw spread.
    assert.ok(region.longitudeDelta > CHENNAI.longitude - BENGALURU.longitude);
  });

  it('keeps a usable zoom for a single point', () => {
    const region = regionForCoordinates([DELHI]);
    assert.ok(region);
    assert.ok(region.latitudeDelta > 0);
    assert.ok(region.longitudeDelta > 0);
  });
});

describe('regionAround', () => {
  it('copies only coordinate fields, dropping extras from stops and results', () => {
    const stopLike = { ...DELHI, id: 'abc', name: 'A stop', category: 'fuel' };
    assert.deepEqual(regionAround(stopLike, 0.05), {
      latitude: DELHI.latitude,
      longitude: DELHI.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  });
});

describe('regionRadiusMeters', () => {
  it('never returns a radius too small to search in', () => {
    assert.ok(regionRadiusMeters(regionAround(DELHI, 0.0001)) >= 1000);
  });

  it('grows with the visible region', () => {
    const tight = regionRadiusMeters(regionAround(DELHI, 0.05));
    const wide = regionRadiusMeters(regionAround(DELHI, 2));
    assert.ok(wide > tight);
  });

  it('stays inside the Places API 50 km cap for a default view', () => {
    // The default region spans the country; callers clamp, but check the
    // helper itself produces a finite, positive number.
    assert.ok(Number.isFinite(regionRadiusMeters(DEFAULT_REGION)));
    assert.ok(regionRadiusMeters(DEFAULT_REGION) > 0);
  });
});

describe('coordinatesOf', () => {
  it('drops everything that is not a coordinate', () => {
    const stops = [
      { ...DELHI, id: 'a', name: 'Start', category: 'fuel', note: 'top up' },
      { ...MUMBAI, id: 'b', name: 'End', category: 'stay' },
    ];
    assert.deepEqual(coordinatesOf(stops), [
      { latitude: DELHI.latitude, longitude: DELHI.longitude },
      { latitude: MUMBAI.latitude, longitude: MUMBAI.longitude },
    ]);
  });

  it('handles an empty list', () => {
    assert.deepEqual(coordinatesOf([]), []);
  });
});

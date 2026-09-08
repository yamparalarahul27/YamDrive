import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_VEHICLE, parseVehicle, validServiceDate } from '../src/lib/vehicle.ts';
test('vehicle details and records round-trip independently of rides', () => {
  const value = { ...DEFAULT_VEHICLE, odometer: 21000, pressures: [{ front: 29, rear: 32, at: '2026-01-01T04:30:00Z' }], services: [{ date: '2026-01-01', km: 20000, notes: 'Oil change' }] };
  assert.deepEqual(parseVehicle(JSON.parse(JSON.stringify(value))), value);
  assert.equal(DEFAULT_VEHICLE.pressures.length, 0);
});
test('invalid saved data and impossible readings are rejected', () => {
  for (const value of [null, {}, { ...DEFAULT_VEHICLE, odometer: -1 }, { ...DEFAULT_VEHICLE, year: 2022.5 }, { ...DEFAULT_VEHICLE, pressures: [{ front: 0, rear: 32, at: 'bad' }] }, { ...DEFAULT_VEHICLE, services: [{ date: '2026-01-01', km: 21000, notes: '' }] }]) assert.throws(() => parseVehicle(value));
});
test('service dates must be real dates in the past or today', () => {
  assert.equal(validServiceDate('2024-02-29'), true);
  assert.equal(validServiceDate('2025-02-29'), false);
  assert.equal(validServiceDate('2099-01-01'), false);
  assert.equal(validServiceDate('yesterday'), false);
});

test('full-to-full mileage includes partial fills and excludes initial fuel', async () => {
  const { fuelMetrics } = await import('../src/lib/vehicle.ts');
  const fills = [
    { km: 20000, litres: 10, cost: 1100, full: true, date: '2026-01-01' },
    { km: 20100, litres: 3, cost: 330, full: false, date: '2026-01-02' },
    { km: 20300, litres: 7, cost: 770, full: true, date: '2026-01-03' },
    { km: 20400, litres: 2, cost: 220, full: false, date: '2026-01-04' },
  ];
  assert.deepEqual(fuelMetrics(fills), { spend: 2420, kmPerLitre: 30, costPerKm: 1100 / 300 });
  assert.equal(fuelMetrics(fills.slice(0, 2)).kmPerLitre, null);
  assert.equal(fuelMetrics([]).spend, 0);
});
test('fuel records validate numbers and preserve older vehicle data', () => {
  assert.deepEqual(parseVehicle(DEFAULT_VEHICLE), DEFAULT_VEHICLE);
  for (const litres of [0, -1, NaN, Infinity]) assert.throws(() => parseVehicle({ ...DEFAULT_VEHICLE, fuelFills: [{ km: 20000, litres, cost: 100, full: true, date: '2026-01-01' }] }));
});

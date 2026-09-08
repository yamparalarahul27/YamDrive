import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_VEHICLE } from '../src/lib/vehicle.ts';
import { energyEstimate, serviceDue } from '../src/lib/vehicle-dashboard.ts';
test('range needs measured mileage and capacity, then consumes distance and adds partial fills', () => {
  assert.equal(energyEstimate(DEFAULT_VEHICLE), null);
  const vehicle = { ...DEFAULT_VEHICLE, tankLitres: 13, odometer: 20450, fuelFills: [
    { km: 20000, litres: 10, cost: 1000, full: true, date: '2026-01-01' },
    { km: 20300, litres: 10, cost: 1000, full: true, date: '2026-01-02' },
    { km: 20400, litres: 2, cost: 200, full: false, date: '2026-01-03' },
  ] };
  const result = energyEstimate(vehicle)!;
  assert.ok(Math.abs(result.litres - 10) < 0.00001);
  assert.ok(Math.abs(result.rangeKm - 300) <= 1);
  assert.equal(energyEstimate({ ...vehicle, odometer: 25000 })!.litres, 0);
});
test('schedule uses purchase milestones and earliest time or distance without repair resets', () => {
  const v = { ...DEFAULT_VEHICLE, purchaseDate: '2022-08-31', completedServiceKm: 20000 };
  const due = serviceDue(v, '2024-01-01')!;
  assert.equal(due.km, 25000); assert.equal(due.date, '2025-02-28'); assert.equal(due.due, false);
  assert.equal(serviceDue(v, '2026-01-01')!.due, true);
  assert.equal(serviceDue({ ...v, nextServiceKm: 22000, nextServiceDate: '2026-12-01' }, '2026-01-01')!.date, '2026-12-01');
  assert.equal(serviceDue(DEFAULT_VEHICLE, '2026-01-01'), null);
  assert.equal(serviceDue({ ...v, model: 'Other bike' }, '2026-01-01'), null);
});

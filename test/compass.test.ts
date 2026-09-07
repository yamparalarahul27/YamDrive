import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compassDirection, compassLabel, unwrapAngle } from '../src/lib/compass.ts';

test('compass sectors wrap north and reject missing headings', () => {
  assert.deepEqual([0,45,90,135,180,225,270,315,359,360,-1].map(compassDirection), ['N','NE','E','SE','S','SW','W','NW','N','N','N']);
  assert.equal(compassDirection(null), '—');
  assert.equal(compassDirection(NaN), '—');
  assert.equal(compassDirection(22.49), 'N');
  assert.equal(compassDirection(22.5), 'NE');
});
test('pointer rotation takes the short arc across north in both directions', () => {
  assert.equal(unwrapAngle(359, 1), 361);
  assert.equal(unwrapAngle(1, 359), -1);
  assert.equal(unwrapAngle(721, 359), 719);
});

test('diagonal labels distinguish the dominant axis without reversing compass order', () => {
  assert.equal(compassLabel(330), 'Nw');
  assert.equal(compassLabel(300), 'nW');
  assert.equal(compassLabel(315), 'NW');
  assert.equal(compassLabel(30), 'Ne');
  assert.equal(compassLabel(60), 'nE');
  assert.equal(compassLabel(150), 'Se');
  assert.equal(compassLabel(240), 'sW');
  assert.equal(compassLabel(0), 'N');
  assert.equal(compassLabel(null), '—');
});

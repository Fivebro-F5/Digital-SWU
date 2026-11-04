import test from 'node:test';
import assert from 'node:assert/strict';
import { isWalkable, movePlayer, nearbyPlace, PLACES, SPAWN } from './campus.ts';

test('spawn and all interaction markers are reachable', () => {
  assert.equal(isWalkable(SPAWN), true);
  for (const place of PLACES) {
    assert.equal(isWalkable(place.entrance), true, place.id);
    assert.equal(nearbyPlace(place.entrance)?.id, place.id);
  }
});

test('movement respects building and map boundaries', () => {
  assert.deepEqual(movePlayer({ x: 2.8, y: 2 }, -1, 0), { x: 2.8, y: 2 });
  assert.deepEqual(movePlayer({ x: 0.2, y: 5 }, -1, 0), { x: 0.2, y: 5 });
  assert.deepEqual(movePlayer({ x: 5, y: 5 }, 0.2, 0), { x: 5.2, y: 5 });
});

test('interaction only appears near an entrance', () => {
  assert.equal(nearbyPlace(SPAWN), null);
  assert.equal(nearbyPlace({ x: 4, y: 2 })?.id, 'library');
});

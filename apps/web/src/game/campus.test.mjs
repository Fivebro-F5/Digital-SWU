import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDINGS, ENTITIES, MAP_HEIGHT, MAP_WIDTH, SPAWN, canEnter, directionFromAxes, doorForMove, facingTarget, isWalkable, moveOne, terrainAt } from './campus.ts';

test('spawn, doors and example entities fit the expanded map', () => {
  assert.equal(isWalkable(SPAWN), true);
  for (const building of BUILDINGS) {
    assert.ok(building.x > 0 && building.y > 0);
    assert.ok(building.x + building.width < MAP_WIDTH && building.y + building.height < MAP_HEIGHT);
    const outside = { x: building.door.x, y: building.door.y + 1 };
    assert.equal(isWalkable(outside), true, building.id);
    assert.equal(facingTarget(outside, 'up', false)?.type, 'building');
  }
  for (const entity of ENTITIES) assert.ok(entity.at.x > 0 && entity.at.x < MAP_WIDTH - 1 && entity.at.y > 0 && entity.at.y < MAP_HEIGHT - 1, entity.id);
});

test('movement respects trees, water, buildings and NPCs', () => {
  assert.equal(terrainAt({ x: 0, y: 12 }), 'tree');
  assert.equal(terrainAt({ x: 15, y: 18 }), 'water');
  assert.equal(isWalkable({ x: 5, y: 5 }), false);
  assert.equal(isWalkable({ x: 19, y: 12 }), false);
  assert.deepEqual(moveOne({ x: 1, y: 12 }, 'left'), { x: 1, y: 12 });
  assert.deepEqual(moveOne(SPAWN, 'right'), { x: SPAWN.x + 1, y: SPAWN.y });
});

test('combined inputs move diagonally without cutting through blocked corners', () => {
  assert.equal(directionFromAxes(1, -1), 'up-right');
  assert.equal(directionFromAxes(-1, 1), 'down-left');
  assert.equal(directionFromAxes(0, 0), null);
  assert.deepEqual(moveOne({ x: 1, y: 1 }, 'down-right', () => true), { x: 2, y: 2 });
  const wall = (point) => !(point.x === 2 && point.y === 1);
  assert.deepEqual(moveOne({ x: 1, y: 1 }, 'down-right', wall), { x: 1, y: 2 });
  assert.deepEqual(moveOne({ x: 1, y: 1 }, 'down-right', (point) => point.x !== 2 && point.y !== 2), { x: 1, y: 1 });
  assert.deepEqual(moveOne({ x: 1, y: 1 }, 'down-right', (point) => point.x !== 2 || point.y !== 2), { x: 1, y: 1 });
});

test('every exterior door is triggered only from its outside tile while moving inward', () => {
  for (const building of BUILDINGS) {
    const outside = { x: building.door.x, y: building.door.y + 1 };
    assert.equal(doorForMove(outside, 'up')?.id, building.id);
    assert.equal(doorForMove(outside, 'up-right'), null);
    assert.equal(doorForMove(outside, 'down'), null);
    assert.equal(doorForMove({ x: outside.x + 1, y: outside.y }, 'up'), null);
  }
});

test('library access requires card', () => {
  const library = BUILDINGS.find((building) => building.id === 'library');
  assert.ok(library);
  const outside = { x: library.door.x, y: library.door.y + 1 };
  assert.equal(facingTarget(outside, 'up', false)?.type, 'building');
  assert.equal(facingTarget(outside, 'down', false), null);
  assert.equal(canEnter(library, false), false);
  assert.equal(canEnter(library, true), true);
});

test('collected card no longer appears as an interaction target', () => {
  const card = ENTITIES.find((entity) => entity.id === 'card');
  assert.ok(card);
  assert.equal(facingTarget({ x: card.at.x - 1, y: card.at.y }, 'right', false)?.type, 'entity');
  assert.equal(facingTarget({ x: card.at.x - 1, y: card.at.y }, 'right', true), null);
});

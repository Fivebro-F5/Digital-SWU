// 验证 TMX 场景的四向移动、16 像素步长和沿途碰撞。
import test from 'node:test';
import assert from 'node:assert/strict';
import { canStep, directionFromAxes, step } from './campus.ts';

test('moves one 16-pixel tile from the exact spawn coordinates', () => {
  const spawn = { x: 768, y: 1220 };
  assert.deepEqual(step(spawn, 'up', 16), { x: 768, y: 1204 });
  assert.deepEqual(step(spawn, 'left', 16), { x: 752, y: 1220 });
  assert.equal(directionFromAxes(1, -1), 'up');
  assert.equal(directionFromAxes(0, 0), null);
});

test('blocks narrow obstacles between endpoints and stops at map bounds', () => {
  const from = { x: 768, y: 1220 };
  const to = step(from, 'up', 16);
  const wall = { x: 764, y: 1210, width: 8, height: 3 };
  assert.equal(canStep(from, to, 1536, 1344, []), true);
  assert.equal(canStep(from, to, 1536, 1344, [wall]), false);
  assert.equal(canStep(to, from, 1536, 1344, [wall]), false);
  assert.equal(canStep({ x: 8, y: 32 }, { x: -8, y: 32 }, 1536, 1344, []), false);
});

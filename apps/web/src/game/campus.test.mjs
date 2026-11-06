// 验证 TMX 场景的四向移动、16 像素步长和沿途碰撞。
import test from 'node:test';
import assert from 'node:assert/strict';
// 验证边界出口和普通移动共用的坐标规则。
import { canStep, crossingAt, directionFromAxes, step } from './campus.ts';

test('moves one 16-pixel tile from the exact spawn coordinates', () => {
  const spawn = { x: 768, y: 1220 };
  assert.deepEqual(step(spawn, 'up', 16), { x: 768, y: 1204 });
  assert.deepEqual(step(spawn, 'left', 16), { x: 752, y: 1220 });
  assert.equal(directionFromAxes(1, -1), 'up');
  assert.equal(directionFromAxes(0, 0), null);
});

// 每个出口的两端均可往返，入口范围外和错误方向不切图。
test('crosses the four gate exits and returns at the same position along the edge', () => {
  const routes = [
    ['02', 'right', 'left', { x: 1584, y: 496 }, { x: 0, y: 496 }, { x: 1584, y: 720 }, { x: 0, y: 720 }],
    ['03', 'left', 'right', { x: 0, y: 496 }, { x: 1584, y: 496 }, { x: 0, y: 720 }, { x: 1584, y: 720 }],
    ['04', 'up', 'down', { x: 688, y: 0 }, { x: 688, y: 1168 }, { x: 928, y: 0 }, { x: 928, y: 1168 }],
    ['01', 'down', 'up', { x: 688, y: 1168 }, { x: 688, y: 0 }, { x: 928, y: 1168 }, { x: 928, y: 0 }],
  ];
  for (const [zone, out, back, minFrom, minTo, maxFrom, maxTo] of routes) {
    for (const [from, to] of [[minFrom, minTo], [maxFrom, maxTo]]) {
      assert.deepEqual(crossingAt('00', from, out), { zone, point: to });
      assert.deepEqual(crossingAt(zone, to, back), { zone: '00', point: from });
      assert.equal(crossingAt(zone, to, out), null);
    }
  }
  assert.equal(crossingAt('00', { x: 1584, y: 480 }, 'right'), null);
  assert.equal(crossingAt('00', { x: 1568, y: 496 }, 'right'), null);
  assert.equal(crossingAt('04', { x: 944, y: 1168 }, 'down'), null);
});

// 雕像花园北口和行署路南口双向连通，范围包含端点。
test('crosses between the memorial steps and Xingshu Road', () => {
  for (const x of [688, 800, 928]) {
    assert.deepEqual(crossingAt('04', { x, y: 0 }, 'up'), { zone: '05', point: { x, y: 1168 } });
    assert.deepEqual(crossingAt('05', { x, y: 1168 }, 'down'), { zone: '04', point: { x, y: 0 } });
  }
  assert.equal(crossingAt('04', { x: 672, y: 0 }, 'up'), null);
  assert.equal(crossingAt('05', { x: 944, y: 1168 }, 'down'), null);
  assert.equal(crossingAt('05', { x: 800, y: 1152 }, 'down'), null);
  assert.equal(crossingAt('05', { x: 800, y: 1168 }, 'up'), null);
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

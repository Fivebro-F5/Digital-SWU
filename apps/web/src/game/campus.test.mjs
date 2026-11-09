// 验证 TMX 场景的八向移动、16 像素步长和沿途碰撞。
import test from 'node:test';
import { minimapTransform } from './minimap.ts';
import assert from 'node:assert/strict';
// 验证边界出口和普通移动共用的坐标规则。
import { canStep, canWorldStep, zoneAt, worldRegions, directionFromAxes, facingForMove, step } from './campus.ts';

test('moves one 16-pixel tile from the exact spawn coordinates', () => {
  const spawn = { x: 768, y: 1220 };
  assert.deepEqual(step(spawn, 'up', 16), { x: 768, y: 1204 });
  assert.deepEqual(step(spawn, 'left', 16), { x: 752, y: 1220 });
  assert.equal(directionFromAxes(1, -1), 'up-right');
  assert.deepEqual(step(spawn, 'up-right', 16), { x: 784, y: 1204 });
  assert.equal(facingForMove('up-right'), 'up');
  assert.equal(directionFromAxes(0, 0), null);
});

// 接缝上的一步保持连续全局坐标，覆盖五条通道的两个端点及双向移动。
test('walks continuously across all five seams in both directions', () => {
  const seams = [
    ['00', '02', 'x', 1600, 496, 720], ['03', '00', 'x', 0, 496, 720],
    ['04', '00', 'y', 0, 688, 928], ['00', '01', 'y', 1184, 688, 928],
    ['05', '04', 'y', -1184, 688, 928],
  ];
  for (const [source, target, axis, edge, min, max] of seams) {
    const other = axis === 'x' ? 'y' : 'x';
    for (const along of [min, max, (min + max) / 2]) {
      const from = { [axis]: edge - 16, [other]: along };
      const to = { [axis]: edge, [other]: along };
      assert.equal(zoneAt(from), source);
      assert.equal(zoneAt(to), target);
      assert.equal(canWorldStep(from, to, 16, []), true);
      assert.equal(canWorldStep(to, from, 16, []), true);
    }
    for (const along of [min - 16, max + 16]) {
      const from = { [axis]: edge - 16, [other]: along };
      const to = { [axis]: edge, [other]: along };
      assert.equal(canWorldStep(from, to, 16, []), false);
      assert.equal(canWorldStep(to, from, 16, []), false);
    }
  }
});

test('blocks holes, outer edges, long jumps and obstacles in translated regions', () => {
  assert.equal(worldRegions.length, 6);
  assert.equal(zoneAt({ x: -1, y: -1 }), undefined);
  assert.equal(canWorldStep({ x: 0, y: -16 }, { x: -16, y: -16 }, 16, []), false);
  assert.equal(canWorldStep({ x: 800, y: -2368 }, { x: 800, y: -2384 }, 16, []), false);
  assert.equal(canWorldStep({ x: 800, y: 896 }, { x: 800, y: -1200 }, 16, []), false);
  assert.equal(canWorldStep({ x: 1584, y: 592 }, { x: 1600, y: 592 }, 16,
    [{ x: 1596, y: 580, width: 8, height: 24 }]), false);
  assert.equal(canWorldStep({ x: 800, y: -1200 }, { x: 816, y: -1200 }, 16,
    [{ x: 808, y: -1210, width: 4, height: 20 }]), false);
});

test('checks diagonal seam intersections rather than teleporting to an entry', () => {
  assert.equal(canWorldStep({ x: 1584, y: 480 }, { x: 1600, y: 496 }, 16, []), true);
  assert.equal(canWorldStep({ x: 1600, y: 496 }, { x: 1584, y: 480 }, 16, []), true);
  assert.equal(canWorldStep({ x: 1584, y: 496 }, { x: 1600, y: 480 }, 16, []), false);
  assert.equal(canWorldStep({ x: 800, y: 0 }, { x: 816, y: -16 }, 16, []), true);
});

test('blocks narrow obstacles between endpoints and stops at map bounds', () => {
  const from = { x: 768, y: 1220 };
  const to = step(from, 'up', 16);
  const wall = { x: 764, y: 1210, width: 8, height: 3 };
  assert.equal(canStep(from, to, 1536, 1344, []), true);
  assert.equal(canStep(from, to, 1536, 1344, [wall]), false);
  assert.equal(canStep(to, from, 1536, 1344, [wall]), false);
  assert.equal(canStep({ x: 8, y: 32 }, { x: -8, y: 32 }, 1536, 1344, []), false);
  assert.equal(canStep({ x: 32, y: 32 }, { x: 48, y: 16 }, 1536, 1344, [{ x: 44, y: 20, width: 4, height: 4 }]), false);
});

// 包括负坐标、矩形视口和不同尺寸，防止小地图与主地图发生偏移或拉伸。
test('projects the whole world, negative regions and viewport with one uniform scale', () => {
  const bounds = { x: -1600, y: -2368, width: 4800, height: 4736 };
  for (const [width, height] of [[200, 200], [140, 140], [240, 160]]) {
    const transform = minimapTransform(bounds, width, height);
    const area = transform.rect(bounds);
    assert.ok(area.x >= 8 && area.y >= 8);
    assert.ok(area.x + area.width <= width - 8 + 1e-9);
    assert.ok(area.y + area.height <= height - 8 + 1e-9);
    assert.ok(Math.abs(area.width / area.height - bounds.width / bounds.height) < 1e-9);
    const origin = transform.point({ x: 0, y: 0 });
    const east = transform.point({ x: 1600, y: 0 });
    const north = transform.point({ x: 0, y: -1184 });
    assert.ok(Math.abs(east.x - origin.x - 1600 * transform.scale) < 1e-9);
    assert.ok(Math.abs(origin.y - north.y - 1184 * transform.scale) < 1e-9);
    const camera = transform.rect({ x: -200, y: -300, width: 768, height: 480 });
    assert.deepEqual({ x: camera.x, y: camera.y }, transform.point({ x: -200, y: -300 }));
    assert.equal(camera.width, 768 * transform.scale);
    assert.equal(camera.height, 480 * transform.scale);
  }
});

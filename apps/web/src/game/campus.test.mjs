// 验证 TMX 场景的八向移动、16 像素步长和沿途碰撞。
import test from 'node:test';
import { minimapTransform } from './minimap.ts';
import assert from 'node:assert/strict';
// 验证边界出口和普通移动共用的坐标规则。
import { canStep, canWorldStep, zoneAt, worldRegions, directionFromAxes, facingForMove, step } from './campus.ts';

test('fractional Tiled spawn can move beyond x=1011.333 without allowing oversized steps', () => {
  const from = { x: 1011.333, y: 1012.67 };
  const to = step(from, 'right', 16);
  assert.ok(to.x - from.x > 16); // Reproduce the floating-point rounding error.
  assert.equal(canWorldStep(from, to, 16, []), true);
  assert.equal(canWorldStep(to, from, 16, []), true);
  assert.equal(canWorldStep(from, { x: from.x + 16.001, y: from.y }, 16, []), false);
  assert.equal(canWorldStep(from, to, 16, [{ x: 1020, y: 1000, width: 10, height: 30 }]), false);
  let current = { x: 819.333, y: 1012.67 };
  for (let i = 0; i < 40; i++) {
    const next = step(current, 'right', 16);
    assert.equal(canWorldStep(current, next, 16, []), true);
    current = next;
  }
});

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
test('six final regions cover the world with continuous bidirectional seams', () => {
  assert.equal(worldRegions.length, 6);
  assert.equal(worldRegions.reduce((sum, r) => sum + r.width * r.height, 0), 4800 * 3552);
  for (const a of worldRegions) for (const b of worldRegions) {
    if (a.x + a.width === b.x && a.y === b.y) {
      const from = { x: b.x - 8, y: a.y + a.height / 2 };
      const to = { ...from, x: b.x + 8 };
      assert.equal(canWorldStep(from, to, 16, []), true);
      assert.equal(canWorldStep(to, from, 16, []), true);
    }
    if (a.y + a.height === b.y && a.x === b.x) {
      const from = { x: a.x + a.width / 2, y: b.y - 8 };
      const to = { ...from, y: b.y + 8 };
      assert.equal(canWorldStep(from, to, 16, []), true);
      assert.equal(canWorldStep(to, from, 16, []), true);
    }
  }
  assert.equal(zoneAt({x: 800, y: 1184}), undefined);
  assert.equal(canWorldStep({x: 800, y: 1176}, {x: 800, y: 1192}, 16, []), false);
  assert.equal(canWorldStep({x: -232, y: 0}, {x: -216, y: 0}, 16, [{x:-225,y:-10,width:4,height:20}]), false);
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


test('final map resources resolve relative to their owning TMX or TSX', async () => {
  const { resolveMapAsset, decodeTileGid } = await import('./mapAssetUtils.ts');
  const base = '../../../../picture/final/maps_final/00_final.tmx';
  const tsx = resolveMapAsset(base, 'SWU_Beautiful_Campus_Sprites/01_Trees.tsx');
  assert.equal(resolveMapAsset(tsx, '01_Trees/oak.png'), '../../../../picture/final/maps_final/SWU_Beautiful_Campus_Sprites/01_Trees/oak.png');
  assert.equal(resolveMapAsset(base, '../assets/ground_tiles_16.png'), '../../../../picture/final/assets/ground_tiles_16.png');
  assert.equal(resolveMapAsset(resolveMapAsset(base, 'building.tsx'), '../../one_road_scene_v14/assets/hanhong_gate_only_pixel.png'), '../../../../picture/one_road_scene_v14/assets/hanhong_gate_only_pixel.png');
  assert.deepEqual(decodeTileGid(0x80000000 + 349), { gid: 349, flipX: true, flipY: false });
  assert.deepEqual(decodeTileGid(349), { gid: 349, flipX: false, flipY: false });
});

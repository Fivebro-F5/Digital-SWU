import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseRoadRoute, createRoadNetwork } from './roadNpc.ts';

test('NPC route follows adjacent Roads cells and respects blocked links', () => {
  const nodes = Array.from({ length: 21 }, (_, index) => ({ x: index * 16, y: 8, zone: '00' }));
  const network = createRoadNetwork(nodes, (from, to) =>
    !(Math.min(from.x, to.x) === 160 && Math.max(from.x, to.x) === 176));
  const route = chooseRoadRoute(network, nodes[0], () => 0.9);
  assert.equal(route.length, 10);
  assert.deepEqual(route.at(-1), nodes[10]);
  let previous = nodes[0];
  for (const next of route) {
    assert.equal(Math.abs(next.x - previous.x) + Math.abs(next.y - previous.y), 16);
    assert.equal(network.has(next), true);
    previous = next;
  }
});

test('NPC route can cross a contiguous zone seam and stays in its component', () => {
  const nodes = Array.from({ length: 15 }, (_, index) => ({ x: index * 16, y: 8, zone: index < 7 ? '00' : '04' }));
  nodes.push({ x: 600, y: 8, zone: '07' });
  const network = createRoadNetwork(nodes, () => true);
  const route = chooseRoadRoute(network, nodes[0], () => 0.99);
  assert.ok(route.length >= 10);
  assert.equal(route.some((node) => node.zone === '04'), true);
  assert.equal(route.some((node) => node.zone === '07'), false);
});

import type { CampusZone, Point } from './campus';

export interface RoadNode extends Point { zone: CampusZone }
const key = ({ x, y }: Point): string => `${x},${y}`;
const offsets = [[0, -16], [16, 0], [0, 16], [-16, 0]] as const;

// 图的顶点来自 TMX Roads 非空瓦片中心；边只连接能实际走通的相邻道路格。
export function createRoadNetwork(nodes: readonly RoadNode[], canTraverse: (from: Point, to: Point) => boolean) {
  const byKey = new Map(nodes.map((node) => [key(node), node]));
  const byZone = new Map<CampusZone, RoadNode[]>();
  for (const node of byKey.values()) {
    const group = byZone.get(node.zone) ?? [];
    group.push(node);
    byZone.set(node.zone, group);
  }
  const neighborCache = new Map<string, RoadNode[]>();
  const neighbors = (node: RoadNode): RoadNode[] => {
    const id = key(node);
    const cached = neighborCache.get(id);
    if (cached) return cached;
    const adjacent = offsets.flatMap(([dx, dy]) => {
      const next = byKey.get(`${node.x + dx},${node.y + dy}`);
      return next && canTraverse(node, next) ? [next] : [];
    });
    neighborCache.set(id, adjacent);
    return adjacent;
  };
  return { nodes: [...byKey.values()], byZone, neighbors, has: (point: Point) => byKey.has(key(point)) };
}

export type RoadNetwork = ReturnType<typeof createRoadNetwork>;

// 限定半径的广度优先搜索：先选可到达的目的地，再按最短道路路径前进。
export function chooseRoadRoute(network: RoadNetwork, start: RoadNode, random: () => number): RoadNode[] {
  const startKey = key(start);
  const visited = new Map<string, { node: RoadNode; previous: string | null; depth: number }>([
    [startKey, { node: start, previous: null, depth: 0 }],
  ]);
  const queue = [start];
  const destinations: RoadNode[] = [];
  let furthest = start;
  for (let index = 0; index < queue.length && index < 900; index++) {
    const current = queue[index];
    const depth = visited.get(key(current))!.depth;
    if (depth >= 24) continue;
    for (const next of network.neighbors(current)) {
      const nextKey = key(next);
      if (visited.has(nextKey)) continue;
      const nextDepth = depth + 1;
      visited.set(nextKey, { node: next, previous: key(current), depth: nextDepth });
      queue.push(next);
      furthest = next;
      if (nextDepth >= 10) destinations.push(next);
    }
  }
  const destination = destinations.length ? destinations[Math.floor(random() * destinations.length)] : furthest;
  const route: RoadNode[] = [];
  for (let cursor = key(destination); cursor !== startKey;) {
    const entry = visited.get(cursor)!;
    route.push(entry.node);
    cursor = entry.previous!;
  }
  return route.reverse();
}

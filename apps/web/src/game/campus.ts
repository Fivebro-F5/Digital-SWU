// 含弘门坐标使用 TMX 原图像素，移动步长由地图瓦片尺寸决定。
export interface Point { x: number; y: number }
export interface Rect extends Point { width: number; height: number }
export type Direction = 'up' | 'down' | 'left' | 'right';

// 含弘门的四个出口和雕像花园北口共用双向通道规则。
const routes = [
  { from: '00', to: '02', direction: 'right', axis: 'x', edge: 1584, opposite: 'left', oppositeEdge: 0, min: 496, max: 720 },
  { from: '00', to: '03', direction: 'left', axis: 'x', edge: 0, opposite: 'right', oppositeEdge: 1584, min: 496, max: 720 },
  { from: '00', to: '04', direction: 'up', axis: 'y', edge: 0, opposite: 'down', oppositeEdge: 1168, min: 688, max: 928 },
  { from: '00', to: '01', direction: 'down', axis: 'y', edge: 1168, opposite: 'up', oppositeEdge: 0, min: 688, max: 928 },
  { from: '04', to: '05', direction: 'up', axis: 'y', edge: 0, opposite: 'down', oppositeEdge: 1168, min: 688, max: 928 },
] as const;
export type CampusZone = (typeof routes)[number]['from' | 'to'];

// 根据当前地图和朝外方向确定目的地，保留沿边界的坐标。
export function crossingAt(zone: CampusZone, point: Point, direction: Direction): { zone: CampusZone; point: Point } | null {
  const exit = routes.find((route) =>
    (route.from === zone && route.direction === direction) ||
    (route.to === zone && route.opposite === direction),
  );
  if (!exit) return null;
  const outward = zone === exit.from;
  const along = exit.axis === 'x' ? point.y : point.x;
  if (point[exit.axis] !== (outward ? exit.edge : exit.oppositeEdge) || along < exit.min || along > exit.max) return null;
  return {
    zone: outward ? exit.to : exit.from,
    point: { ...point, [exit.axis]: outward ? exit.oppositeEdge : exit.edge },
  };
}

export function directionFromAxes(dx: number, dy: number): Direction | null {
  if (dy !== 0) return dy < 0 ? 'up' : 'down';
  return dx < 0 ? 'left' : dx > 0 ? 'right' : null;
}

export function step(point: Point, direction: Direction, tileSize: number): Point {
  const offsets: Record<Direction, Point> = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
  };
  const offset = offsets[direction];
  return { x: point.x + offset.x * tileSize, y: point.y + offset.y * tileSize };
}

// 检查整段脚底移动轨迹，避免一步跨过比瓦片更窄的障碍。
export function canStep(from: Point, to: Point, width: number, height: number, collisions: readonly Rect[]): boolean {
  if (to.x < 0 || to.y < 0 || to.x >= width || to.y >= height) return false;
  return !collisions.some((wall) =>
    Math.max(from.x, to.x) >= wall.x && Math.min(from.x, to.x) < wall.x + wall.width &&
    Math.max(from.y, to.y) >= wall.y && Math.min(from.y, to.y) < wall.y + wall.height,
  );
}

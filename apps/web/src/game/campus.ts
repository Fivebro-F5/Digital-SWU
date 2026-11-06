// 含弘门坐标使用 TMX 原图像素，移动步长由地图瓦片尺寸决定。
export interface Point { x: number; y: number }
export interface Rect extends Point { width: number; height: number }
export type Direction = 'up' | 'down' | 'left' | 'right';

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

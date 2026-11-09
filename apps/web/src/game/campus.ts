// 含弘门坐标使用 TMX 原图像素，移动步长由地图瓦片尺寸决定。
export interface Point { x: number; y: number }
export interface Rect extends Point { width: number; height: number }
export type Direction = 'up' | 'down' | 'left' | 'right';
export type MoveDirection = Direction | 'up-left' | 'up-right' | 'down-left' | 'down-right';

// 以 00 左上角为游戏世界原点，按完整 TMX 尺寸拼接，不重叠边缘瓦片。
export const zoneOffsets = {
  '00': { x: 0, y: 0 }, '01': { x: 0, y: 1184 },
  '02': { x: 1600, y: 0 }, '03': { x: -1600, y: 0 },
  '04': { x: 0, y: -1184 }, '05': { x: 0, y: -2368 },
} as const;
export type CampusZone = keyof typeof zoneOffsets;
export interface WorldRegion extends Rect { id: CampusZone }
export const worldRegions: WorldRegion[] = Object.entries(zoneOffsets).map(([id, offset]) => ({
  id: id as CampusZone, ...offset, width: 1600, height: 1184,
}));
export const worldBounds: Rect = { x: -1600, y: -2368, width: 4800, height: 4736 };
export function zoneAt(point: Point): CampusZone | undefined {
  return worldRegions.find((area) => point.x >= area.x && point.x < area.x + area.width &&
    point.y >= area.y && point.y < area.y + area.height)?.id;
}
const seams = [
  { from: '00', to: '02', axis: 'x', edge: 1600, min: 496, max: 720 },
  { from: '03', to: '00', axis: 'x', edge: 0, min: 496, max: 720 },
  { from: '04', to: '00', axis: 'y', edge: 0, min: 688, max: 928 },
  { from: '00', to: '01', axis: 'y', edge: 1184, min: 688, max: 928 },
  { from: '05', to: '04', axis: 'y', edge: -1184, min: 688, max: 928 },
] as const;
// 只处理一格输入；接缝按移动线段的交点检查，斜向不能绕过通道限制。
export function canWorldStep(from: Point, to: Point, tileSize: number, collisions: readonly Rect[]): boolean {
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite) ||
      Math.abs(to.x - from.x) > tileSize || Math.abs(to.y - from.y) > tileSize) return false;
  const source = zoneAt(from); const target = zoneAt(to);
  if (!source || !target) return false;
  if (source !== target) {
    const seam = seams.find((entry) => (entry.from === source && entry.to === target) ||
      (entry.to === source && entry.from === target));
    if (!seam) return false;
    const t = (seam.edge - from[seam.axis]) / (to[seam.axis] - from[seam.axis]);
    const along = seam.axis === 'x' ? from.y + (to.y - from.y) * t : from.x + (to.x - from.x) * t;
    if (along < seam.min || along > seam.max) return false;
  }
  return !collisions.some((wall) =>
    Math.max(from.x, to.x) >= wall.x && Math.min(from.x, to.x) < wall.x + wall.width &&
    Math.max(from.y, to.y) >= wall.y && Math.min(from.y, to.y) < wall.y + wall.height);
}

export function directionFromAxes(dx: number, dy: number): MoveDirection | null {
  const vertical = dy < 0 ? 'up' : dy > 0 ? 'down' : '';
  const horizontal = dx < 0 ? 'left' : dx > 0 ? 'right' : '';
  return (vertical && horizontal ? `${vertical}-${horizontal}` : vertical || horizontal || null) as MoveDirection | null;
}

export function facingForMove(direction: MoveDirection): Direction {
  return direction.includes('up') ? 'up' : direction.includes('down') ? 'down' : direction.includes('left') ? 'left' : 'right';
}

export function step(point: Point, direction: MoveDirection, tileSize: number): Point {
  const offsets: Record<MoveDirection, Point> = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
    'up-left': { x: -1, y: -1 }, 'up-right': { x: 1, y: -1 },
    'down-left': { x: -1, y: 1 }, 'down-right': { x: 1, y: 1 },
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

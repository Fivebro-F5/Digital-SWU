export interface Position { x: number; y: number }

export interface Place {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  color: number;
  entrance: Position;
}

export const MAP_SIZE = 12;
export const SPAWN: Position = { x: 5, y: 5 };

// These are fictional prototype markers, not verified campus geography.
export const PLACES: readonly Place[] = [
  { id: 'library', name: '图书馆示意', description: '未来可查看馆藏入口和开放信息；当前仅演示地点交互。', x: 1, y: 1, width: 2, depth: 2, height: 62, color: 0x538f87, entrance: { x: 3.8, y: 2 } },
  { id: 'teaching', name: '教学楼示意', description: '空教室数据尚未接入，当前不可查询。', x: 8, y: 1, width: 2, depth: 2, height: 72, color: 0xc68d68, entrance: { x: 7.2, y: 2 } },
  { id: 'canteen', name: '食堂示意', description: '未来可展示餐饮信息；当前仅演示地点交互。', x: 1, y: 8, width: 2, depth: 2, height: 48, color: 0xd2ae72, entrance: { x: 3.8, y: 9 } },
  { id: 'square', name: '活动中心示意', description: '活动和通知数据尚未接入。', x: 8, y: 8, width: 2, depth: 2, height: 58, color: 0x8c9dc6, entrance: { x: 7.2, y: 9 } },
];

const EDGE = 0.18;

export function isWalkable(point: Position): boolean {
  if (point.x < EDGE || point.y < EDGE || point.x > MAP_SIZE - 1 - EDGE || point.y > MAP_SIZE - 1 - EDGE) return false;
  return PLACES.every((place) =>
    point.x < place.x - 0.65 || point.x > place.x + place.width - 0.35 ||
    point.y < place.y - 0.65 || point.y > place.y + place.depth - 0.35,
  );
}

export function movePlayer(from: Position, dx: number, dy: number): Position {
  // Resolve axes separately so the player can slide along building walls.
  const xStep = { x: from.x + dx, y: from.y };
  const afterX = isWalkable(xStep) ? xStep : from;
  const yStep = { x: afterX.x, y: afterX.y + dy };
  return isWalkable(yStep) ? yStep : afterX;
}

export function nearbyPlace(position: Position): Place | null {
  return PLACES.find((place) => Math.hypot(position.x - place.entrance.x, position.y - place.entrance.y) < 0.85) ?? null;
}

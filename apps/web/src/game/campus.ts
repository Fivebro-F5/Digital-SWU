export interface Point { x: number; y: number }
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Terrain = 'grass' | 'path' | 'tall-grass' | 'water' | 'tree';

export interface Building {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  roof: number;
  door: Point;
  floors: number;
  requiresCard?: boolean;
}

export interface Entity {
  id: string;
  kind: 'vehicle' | 'lamp' | 'item' | 'bot' | 'npc' | 'animal';
  name: string;
  description: string;
  at: Point;
}

export const TILE = 32;
export const MAP_WIDTH = 32;
export const MAP_HEIGHT = 24;
export const SPAWN: Point = { x: 15, y: 12 };

// Fictional prototype layout; none of these tiles claim real campus coordinates.
export const BUILDINGS: readonly Building[] = [
  { id: 'library', name: '图书馆', description: '收集通行卡后，从门前按 E 进入阅览室。', x: 4, y: 3, width: 7, height: 5, roof: 0x4e8c83, door: { x: 7, y: 7 }, floors: 1, requiresCard: true },
  { id: 'teaching', name: '教学楼', description: '教室查询尚未接入；可进入室内示意场景。', x: 21, y: 3, width: 7, height: 5, roof: 0xb9765c, door: { x: 24, y: 7 }, floors: 1 },
  { id: 'canteen', name: '食堂', description: '餐饮信息尚未接入；可进入室内示意场景。', x: 4, y: 16, width: 7, height: 5, roof: 0xcb9b57, door: { x: 7, y: 20 }, floors: 1 },
  { id: 'activity', name: '活动中心', description: '三层室内示例，可在楼梯处切换楼层。', x: 21, y: 16, width: 7, height: 5, roof: 0x6a82b2, door: { x: 24, y: 20 }, floors: 3 },
];

export const ENTITIES: readonly Entity[] = [
  { id: 'bike', kind: 'vehicle', name: '校园单车', description: '载具示例：目前可查看，尚不能骑乘。', at: { x: 11, y: 9 } },
  { id: 'lamp-a', kind: 'lamp', name: '路灯 A', description: '点击或面对它按 E 可切换亮灭。', at: { x: 13, y: 8 } },
  { id: 'lamp-b', kind: 'lamp', name: '路灯 B', description: '点击或面对它按 E 可切换亮灭。', at: { x: 18, y: 18 } },
  { id: 'card', kind: 'item', name: '通行卡', description: '拾取后可以进入图书馆。', at: { x: 17, y: 11 } },
  { id: 'guide', kind: 'npc', name: '导览员', description: '欢迎来到像素校园。真实校园数据尚未接入。', at: { x: 19, y: 12 } },
  { id: 'bot', kind: 'bot', name: '巡游机器人', description: '一个自动巡游的 Bot 范例。', at: { x: 9, y: 14 } },
  { id: 'cat', kind: 'animal', name: '校园猫', description: '一只在草地上散步的动物范例。', at: { x: 22, y: 13 } },
];

export function step(point: Point, direction: Direction): Point {
  return { x: point.x + (direction === 'right' ? 1 : direction === 'left' ? -1 : 0), y: point.y + (direction === 'down' ? 1 : direction === 'up' ? -1 : 0) };
}

export function same(a: Point, b: Point): boolean { return a.x === b.x && a.y === b.y; }

export function terrainAt(point: Point): Terrain {
  const { x, y } = point;
  if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) return 'tree';
  if (x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1) return 'tree';
  if (x >= 14 && x <= 18 && y >= 17 && y <= 20) return 'water';
  if (x === 7 || x === 24 || y === 8 || y === 21 || (x >= 13 && x <= 18 && y >= 8 && y <= 15)) return 'path';
  if ((x * 7 + y * 11) % 13 < 3) return 'tall-grass';
  return 'grass';
}

export function buildingAt(point: Point): Building | null {
  return BUILDINGS.find((building) => point.x >= building.x && point.x < building.x + building.width && point.y >= building.y && point.y < building.y + building.height) ?? null;
}

export function isWalkable(point: Point): boolean {
  const terrain = terrainAt(point);
  if (terrain === 'tree' || terrain === 'water' || buildingAt(point)) return false;
  return !ENTITIES.some((entity) => entity.kind === 'npc' && same(entity.at, point));
}

export function moveOne(from: Point, direction: Direction): Point {
  const next = step(from, direction);
  return isWalkable(next) ? next : from;
}

export type InteractionTarget = { type: 'building'; building: Building } | { type: 'entity'; entity: Entity };

export function facingTarget(position: Point, direction: Direction, collectedCard: boolean): InteractionTarget | null {
  const ahead = step(position, direction);
  const building = BUILDINGS.find((item) => same(item.door, ahead));
  if (building) return { type: 'building', building };
  const entity = ENTITIES.find((item) => (same(item.at, ahead) || (item.kind === 'item' && same(item.at, position))) && !(item.id === 'card' && collectedCard));
  return entity ? { type: 'entity', entity } : null;
}

export function canEnter(building: Building, hasCard: boolean): boolean {
  return !building.requiresCard || hasCard;
}

// 读取含弘门周边六区的 TMX 地形。
import gate from '../../../../picture/pixel_swu_ground_6zones_v1/maps/00_hanhong_gate.tmx?raw';
import outer from '../../../../picture/pixel_swu_ground_6zones_v1/maps/01_outer_approach.tmx?raw';
import east from '../../../../picture/pixel_swu_ground_6zones_v1/maps/02_east_camphor.tmx?raw';
import west from '../../../../picture/pixel_swu_ground_6zones_v1/maps/03_west_camphor.tmx?raw';
import memorial from '../../../../picture/pixel_swu_ground_6zones_v1/maps/04_memorial_steps.tmx?raw';
// 行署路由雕像花园北口进入。
import xingshu from '../../../../picture/pixel_swu_ground_6zones_v1/maps/05_xingshu_road.tmx?raw';
import type { CampusZone, Point, Rect } from './campus';

const zones = {
  '00': { name: '含弘门', tmx: gate },
  '01': { name: '校门外衔接区', tmx: outer },
  '02': { name: '东侧樟林', tmx: east },
  '03': { name: '西侧樟林', tmx: west },
  '04': { name: '雕像花园', tmx: memorial },
  // 状态栏使用地图的区域名称。
  '05': { name: '行署路', tmx: xingshu },
} satisfies Record<CampusZone, { name: string; tmx: string }>;

const number = (element: Element, attribute: string): number => Number(element.getAttribute(attribute));
const position = (element: Element): Point => ({ x: number(element, 'x'), y: number(element, 'y') });
const rectangle = (element: Element): Rect => ({
  ...position(element), width: number(element, 'width'), height: number(element, 'height'),
});
const property = (element: Element, name: string): string =>
  element.querySelector(`property[name="${name}"]`)?.getAttribute('value') ?? '';

// 按当前区域选择地图，并返回供状态栏显示的名称。
export function readGateMap(zone: CampusZone) {
  const { name, tmx } = zones[zone];
  const root = new DOMParser().parseFromString(tmx, 'application/xml').documentElement;
  const tileSize = number(root, 'tilewidth');
  const columns = number(root, 'width');
  const rows = number(root, 'height');
  const spawn = root.querySelector('objectgroup[name="Spawn"] > object[name="player_start"]');
  const terrain = root.querySelector('tileset > image');
  if (root.getAttribute('orientation') !== 'orthogonal' || tileSize <= 0 ||
      tileSize !== number(root, 'tileheight') || !spawn || !terrain) {
    throw new Error('含弘门地图需要正交方格、地形图集和 player_start 出生点。');
  }
  // 直接使用地图的脚底像素坐标，并检查出生点是否在地图内。
  const spawnPoint = position(spawn);
  if (!spawn.hasAttribute('x') || !spawn.hasAttribute('y') ||
      !(spawnPoint.x >= 0 && spawnPoint.x < columns * tileSize &&
        spawnPoint.y >= 0 && spawnPoint.y < rows * tileSize)) {
    throw new Error('含弘门地图的 player_start 出生点坐标无效。');
  }
  const layers = [...root.querySelectorAll('map > layer')].map((layer) => {
    const data = layer.querySelector('data');
    const gids = data?.textContent?.trim().split(/[\s,]+/).map(Number);
    if (data?.getAttribute('encoding') !== 'csv' || gids?.length !== columns * rows) {
      throw new Error(`地图图层 ${layer.getAttribute('name')} 的 CSV 瓦片数据无效。`);
    }
    return Array.from({ length: rows }, (_, y) =>
      gids.slice(y * columns, (y + 1) * columns).map((gid) => gid || -1),
    );
  });
  const images = new Map<number, string>();
  for (const tile of root.querySelectorAll('tileset > tile')) {
    const source = tile.querySelector('image')?.getAttribute('source');
    if (source) images.set(number(tile.parentElement!, 'firstgid') + number(tile, 'id'), source);
  }
  const sprites = [...root.querySelectorAll('objectgroup > object[gid]')].map((object) => ({
    ...rectangle(object),
    source: images.get(number(object, 'gid')),
  }));
  const collisions = [...root.querySelectorAll('objectgroup[name="Collisions"] > object')].map(rectangle);
  const interactions = [...root.querySelectorAll('objectgroup[name="Interactions"] > object')].map((object) => ({
    ...rectangle(object), title: property(object, 'title'), message: property(object, 'message'),
  }));
  const portals = [...root.querySelectorAll('objectgroup[name="Portals"] > object')].map((object) => ({
    ...rectangle(object), name: object.getAttribute('name') ?? 'portal',
  }));
  const specialEntities = [...root.querySelectorAll('objectgroup > object')]
    .filter((object) => !['Spawn', 'Collisions', 'Interactions', 'Portals'].includes(object.parentElement?.getAttribute('name') ?? ''))
    .map((object) => ({
      ...rectangle(object),
      name: property(object, 'display_name') || object.getAttribute('name') || object.getAttribute('type') || 'entity',
    }));
  return {
    name,
    backgroundColor: root.getAttribute('backgroundcolor') ?? '#95C679',
    tileSize, width: columns * tileSize, height: rows * tileSize, layers, sprites, collisions, interactions, portals, specialEntities,
    spawn: spawnPoint, terrain: terrain.getAttribute('source')!, firstGid: number(terrain.parentElement!, 'firstgid'),
  };
}

// TMX 保留局部坐标；仅在运行时将对象平移到拼接后的游戏坐标。
export function placeGateMap(zone: CampusZone, offset: Point) {
  const map = readGateMap(zone);
  const translate = <T extends Point>(point: T): T => ({ ...point, x: point.x + offset.x, y: point.y + offset.y });
  if (map.width !== 1600 || map.height !== 1184 || map.tileSize !== 16) {
    throw new Error(`地图 ${zone} 尺寸与六区拼接布局不匹配，请同步更新布局。`);
  }
  return { ...map, offset, spawn: translate(map.spawn), sprites: map.sprites.map(translate),
    collisions: map.collisions.map(translate), interactions: map.interactions.map(translate),
    portals: map.portals.map(translate), specialEntities: map.specialEntities.map(translate) };
}

import map10 from '../../../../picture/final/maps_final/10_final.tmx?raw';
import map04 from '../../../../picture/final/maps_final/04_final.tmx?raw';
import map11 from '../../../../picture/final/maps_final/11_final.tmx?raw';
import map06 from '../../../../picture/final/maps_final/06_final.tmx?raw';
import map00 from '../../../../picture/final/maps_final/00_final.tmx?raw';
import map07 from '../../../../picture/final/maps_final/07_final.tmx?raw';
import { zoneOffsets, type CampusZone, type Point, type Rect } from './campus';
import { mapAssets, tilesetSources, resolveMapAsset, decodeTileGid } from './mapAssets';
const zones = {
  '10': {name: '西北区', tmx: map10},
  '04': {name: '北部中区', tmx: map04},
  '11': {name: '东北区', tmx: map11},
  '06': {name: '西南区', tmx: map06},
  '00': {name: '含弘门与雕像花园', tmx: map00},
  '07': {name: '东南区', tmx: map07},
} satisfies Record<CampusZone, {name: string; tmx: string}>;
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
  const mapPath = `../../../../picture/final/maps_final/${zone}_final.tmx`;
  const tilesets: { firstGid: number; tileCount: number; source: string }[] = [];
  const images = new Map<number, { source: string; originX: number; originY: number; ground: boolean }>();
  for (const entry of root.querySelectorAll('map > tileset')) {
    const firstGid = number(entry, 'firstgid');
    const external = entry.getAttribute('source');
    const file = external ? resolveMapAsset(mapPath, external) : mapPath;
    if (external && !tilesetSources[file]) throw new Error(`图块集不存在：${file}`);
    const definition = external ? new DOMParser().parseFromString(tilesetSources[file], 'application/xml').documentElement : entry;
    const atlas = definition.querySelector(':scope > image');
    if (atlas) {
      const source = resolveMapAsset(file, atlas.getAttribute('source')!);
      if (!mapAssets[source]) throw new Error(`地形图集不存在：${source}`);
      tilesets.push({ firstGid, tileCount: number(definition, 'tilecount'), source });
    }
    const alignment = definition.getAttribute('objectalignment') || 'bottomleft';
    const originX = alignment.includes('left') ? 0 : alignment.includes('right') ? 1 : 0.5;
    const originY = alignment.includes('top') ? 0 : alignment.includes('bottom') ? 1 : 0.5;
    for (const tile of definition.querySelectorAll(':scope > tile')) {
      const image = tile.querySelector('image');
      if (!image) continue;
      const source = resolveMapAsset(file, image.getAttribute('source')!);
      // 用户允许缺失的装饰图片跳过；不会影响其余地图加载。
      if (!mapAssets[source]) { console.warn(`跳过缺失的地图图片：${source}`); continue; }
      images.set(firstGid + number(tile, 'id'), { source, originX, originY, ground: file.includes('02_Flowers_Shrubs') });
    }
  }
  const sprites = [...root.querySelectorAll('objectgroup > object[gid]')].flatMap((object) => {
    if (object.getAttribute('visible') === '0' || object.parentElement?.getAttribute('visible') === '0') return [];
    const flags = decodeTileGid(number(object, 'gid'));
    const image = images.get(flags.gid);
    if (!image) return [];
    return [{ ...rectangle(object), ...image, ...flags, rotation: number(object, 'rotation'),
      opacity: Number(object.parentElement?.getAttribute('opacity') ?? 1) }];
  });
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
    tileSize, width: columns * tileSize, height: rows * tileSize, layers, tilesets, sprites, collisions, interactions, portals, specialEntities,
    spawn: spawnPoint, terrain: terrain.getAttribute('source')!, firstGid: number(terrain.parentElement!, 'firstgid'),
  };
}

// TMX 保留局部坐标；仅在运行时将对象平移到拼接后的游戏坐标。
export function placeGateMap(zone: CampusZone, offset: Point) {
  const map = readGateMap(zone);
  const translate = <T extends Point>(point: T): T => ({ ...point, x: point.x + offset.x, y: point.y + offset.y });
  if (map.width !== zoneOffsets[zone].width || map.height !== zoneOffsets[zone].height || map.tileSize !== 16) {
    throw new Error(`地图 ${zone} 尺寸与六区拼接布局不匹配，请同步更新布局。`);
  }
  return { ...map, offset, spawn: translate(map.spawn), sprites: map.sprites.map(translate),
    collisions: map.collisions.map(translate), interactions: map.interactions.map(translate),
    portals: map.portals.map(translate), specialEntities: map.specialEntities.map(translate) };
}

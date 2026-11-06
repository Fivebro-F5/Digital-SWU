// 直接读取 TMX，Tiled 保存后的图层、矩形和出生点会随地图更新。
import tmx from '../../../../picture/swu_gate_project/SWU_Gate1_Hanhong.tmx?raw';
import type { Point, Rect } from './campus';

const number = (element: Element, attribute: string): number => Number(element.getAttribute(attribute));
const position = (element: Element): Point => ({ x: number(element, 'x'), y: number(element, 'y') });
const rectangle = (element: Element): Rect => ({
  ...position(element), width: number(element, 'width'), height: number(element, 'height'),
});
const property = (element: Element, name: string): string =>
  element.querySelector(`property[name="${name}"]`)?.getAttribute('value') ?? '';

export function readGateMap() {
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
  return {
    tileSize, width: columns * tileSize, height: rows * tileSize, layers, sprites, collisions, interactions,
    spawn: position(spawn), terrain: terrain.getAttribute('source')!, firstGid: number(terrain.parentElement!, 'firstgid'),
  };
}

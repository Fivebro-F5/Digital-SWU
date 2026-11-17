export const mapAssets = import.meta.glob<string>([
  '../../../../picture/final/**/*.{png,jpg}',
  '../../../../picture/one_road_scene_v14/assets/hanhong_gate_only_pixel.png',
  '../../../../picture/one_road_scene_v14/assets/xingshu_a_pixel.png',
], { eager: true, query: '?url', import: 'default' });

export const tilesetSources = import.meta.glob<string>('../../../../picture/final/**/*.tsx', {
  eager: true, query: '?raw', import: 'default',
});

export { resolveMapAsset, decodeTileGid } from './mapAssetUtils';

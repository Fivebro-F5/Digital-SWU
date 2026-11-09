import type { CampusZone, Direction, Point, Rect } from './campus.ts';

export interface MinimapSnapshot {
  readonly position: Readonly<Point>;
  readonly facing: Direction;
  readonly zone: CampusZone;
  readonly viewport: Readonly<Rect>;
}

// 同一变换用于地形、角色和镜头，包含负坐标并保持纵横比例。
export function minimapTransform(bounds: Readonly<Rect>, width: number, height: number, padding = 8) {
  const scale = Math.min((width - padding * 2) / bounds.width, (height - padding * 2) / bounds.height);
  const left = (width - bounds.width * scale) / 2;
  const top = (height - bounds.height * scale) / 2;
  return {
    scale,
    point: (point: Readonly<Point>): Point => ({
      x: left + (point.x - bounds.x) * scale,
      y: top + (point.y - bounds.y) * scale,
    }),
    rect: (rect: Readonly<Rect>): Rect => ({
      x: left + (rect.x - bounds.x) * scale,
      y: top + (rect.y - bounds.y) * scale,
      width: rect.width * scale, height: rect.height * scale,
    }),
  };
}

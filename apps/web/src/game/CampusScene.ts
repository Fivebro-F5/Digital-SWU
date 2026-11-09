// 含弘门场景直接使用 TMX 数据，并复用小鸟的四向动画。
import Phaser from 'phaser';
// 六区共用连续的全局脚底坐标。
import { canWorldStep, zoneAt, zoneOffsets, worldBounds, directionFromAxes, facingForMove, step, type CampusZone, type Direction, type Point } from './campus';
import { placeGateMap } from './gateMap';
import type { MinimapSnapshot } from './minimap';

export interface GameStatus { scene: string; position: Point; facing: Direction; sprint: boolean }
export interface DebugSnapshot {
  dimension: string;
  zoneId: CampusZone;
  mapName: string;
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  tileLayers: number;
  mapSprites: number;
  collisionAreas: number;
  interactionAreas: number;
  portalAreas: number;
  specialEntityAreas: number;
  zoneCount: number;
  logicalPosition: Point;
  renderPosition: Point;
  facing: Direction;
  moving: boolean;
  sprint: boolean;
  speed: number;
  velocity: Point;
  cameraX: number;
  cameraY: number;
  cameraCenterX: number;
  cameraCenterY: number;
  cameraZoom: number;
  visibleWorldWidth: number;
  visibleWorldHeight: number;
  cameraMode: '跟随角色' | '自由视角';
  viewportWidth: number;
  viewportHeight: number;
  fps: number;
  renderer: string;
  loadedTextures: number;
  declaredImages: number;
  sceneObjects: number;
}
export type GridMode = 'off' | 'category' | 'cell';
export type ObjectDebugMode = 'off' | 'interaction' | 'entity' | 'all';
type GridSegment = { x1: number; y1: number; x2: number; y2: number };
export interface GameHooks {
  onNearby: (name: string | null, description?: string) => void;
  onMessage: (title: string, body: string) => void;
  onStatus: (status: GameStatus) => void;
  isDialogOpen: () => boolean;
}

const birdFrameUrls = import.meta.glob<string>(
  '../../../../picture/角色单帧/bird/original/{idle,walk,run}/*.png',
  { eager: true, query: '?url', import: 'default' },
);
const birdDirections = ['up', 'down', 'left', 'right'] as const;
const birdActions = {
  idle: { frames: 1, frameRate: 1, repeat: 0 },
  walk: { frames: 4, frameRate: 8, repeat: -1 },
  run: { frames: 4, frameRate: 15, repeat: -1 },
} as const;
type BirdAction = keyof typeof birdActions;
const birdFrameKey = (animation: string, frame: number) =>
  `${animation}-${String(frame).padStart(3, '0')}`;
// 新版入口 TMX 的地形图集位于 maps 的同级 assets 目录。
const mapAssets = import.meta.glob<string>('../../../../picture/pixel_swu_ground_6zones_v1/assets/*.png', {
  eager: true, query: '?url', import: 'default',
});

export class CampusScene extends Phaser.Scene {
  static readonly BASE_ZOOM = 1.5;
  // 六区一次加载到同一场景，跨缝时仅更新当前区域名称。
  private readonly maps = {
    '00': placeGateMap('00', zoneOffsets['00']), '01': placeGateMap('01', zoneOffsets['01']), '02': placeGateMap('02', zoneOffsets['02']),
    '03': placeGateMap('03', zoneOffsets['03']), '04': placeGateMap('04', zoneOffsets['04']),
    '05': placeGateMap('05', zoneOffsets['05']),
  };
  private readonly worldMaps = Object.values(this.maps);
  private readonly worldCollisions = this.worldMaps.flatMap((map) => map.collisions);
  private zone: CampusZone = '00';
  private get map() { return this.maps[this.zone]; }
  private readonly mapObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly gridSegmentsCache = new Map<string, GridSegment[]>();
  private gridMode: GridMode = 'off';
  private cameraMode: DebugSnapshot['cameraMode'] = '跟随角色';
  private userZoom = 1;
  private displayWidth = 768;
  private player!: Phaser.GameObjects.Sprite;
  private position = { ...this.map.spawn };
  private facing: Direction = 'down';
  private moving = false;
  private velocity: Point = { x: 0, y: 0 };
  private readonly held: Partial<Record<Direction, boolean>> = {};
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(private readonly hooks: GameHooks) { super('campus'); }

  setGridMode(mode: GridMode): void { this.gridMode = mode; }
  setViewportSize(width: number, height: number, displayWidth: number): void {
    const camera = this.cameras.main;
    const center = camera.getWorldPoint(camera.width / 2, camera.height / 2);
    camera.setSize(width, height);
    this.displayWidth = displayWidth;
    this.setZoom(this.userZoom);
    camera.centerOn(center.x, center.y);
    this.snapCamera();
  }
  setZoom(value: number): number {
    const camera = this.cameras.main;
    const nativeZoom = value * CampusScene.BASE_ZOOM * camera.width / this.displayWidth;
    if (!Number.isFinite(nativeZoom) || nativeZoom <= 0 ||
      !Number.isFinite(camera.width / nativeZoom) || !Number.isFinite(camera.height / nativeZoom)) return this.userZoom;
    this.userZoom = value;
    camera.setZoom(nativeZoom);
    this.refreshRenderBounds();
    return this.userZoom;
  }
  zoomBy(wheelDelta: number): void {
    if (!wheelDelta) return;
    this.setZoom(this.userZoom * (wheelDelta > 0 ? 0.9 : 1.1));
  }
  beginPan(): void { this.cameraMode = '自由视角'; }
  panBy(cssX: number, cssY: number): void {
    const camera = this.cameras.main;
    const displayScale = this.game.canvas.getBoundingClientRect().width / camera.width || 1;
    camera.scrollX -= cssX / displayScale / camera.zoom;
    camera.scrollY -= cssY / displayScale / camera.zoom;
  }
  resetCamera(): void {
    const camera = this.cameras.main;
    this.setZoom(1);
    camera.centerOn(this.player.x, this.player.y);
    this.cameraMode = '跟随角色';
    this.snapCamera();
  }

  private snapCamera(): void {
    const camera = this.cameras.main;
    const zoom = camera.zoom;
    // 摄像机矩阵的平移项为 origin * (1 - zoom) - scroll * zoom。
    const offsetX = camera.width * camera.originX * (1 - zoom);
    const offsetY = camera.height * camera.originY * (1 - zoom);
    camera.scrollX = (offsetX - Math.round(offsetX - camera.scrollX * zoom)) / zoom;
    camera.scrollY = (offsetY - Math.round(offsetY - camera.scrollY * zoom)) / zoom;
  }

  private updateCamera(): void {
    const zoom = this.cameras.main.zoom;
    const renderX = Math.round(this.player.x * zoom) / zoom;
    const renderY = Math.round(this.player.y * zoom) / zoom;
    if (renderX !== this.player.x || renderY !== this.player.y) {
      this.player.setPosition(renderX, renderY).setDepth(renderY);
    }
    if (this.cameraMode === '跟随角色') this.cameras.main.centerOn(renderX, renderY);
    this.snapCamera();
  }

  private gridSegments(): GridSegment[] {
    if (this.gridMode === 'off') return [];
    const key = this.gridMode;
    const cached = this.gridSegmentsCache.get(key);
    if (cached) return cached;
    const segments: GridSegment[] = [];
    for (const map of this.worldMaps) {
      const { width, height, tileSize, layers, offset } = map;
      const cols = width / tileSize; const rows = height / tileSize;
      const line = (x1: number, y1: number, x2: number, y2: number) => segments.push({ x1: x1 + offset.x, y1: y1 + offset.y, x2: x2 + offset.x, y2: y2 + offset.y });
      if (this.gridMode === 'cell') {
        for (let x = 0; x <= cols; x++) line(x * tileSize, 0, x * tileSize, height);
        for (let y = 0; y <= rows; y++) line(0, y * tileSize, width, y * tileSize);
      } else {
        const categoryAt = (x: number, y: number) => {
          for (let layer = layers.length - 1; layer >= 0; layer--) if (layers[layer][y][x] >= 0) return layer;
          return -1;
        };
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const current = categoryAt(x, y);
          if (x + 1 < cols && current !== categoryAt(x + 1, y)) line((x + 1) * tileSize, y * tileSize, (x + 1) * tileSize, (y + 1) * tileSize);
          if (y + 1 < rows && current !== categoryAt(x, y + 1)) line(x * tileSize, (y + 1) * tileSize, (x + 1) * tileSize, (y + 1) * tileSize);
        }
        line(0, 0, width, 0); line(width, 0, width, height);
        line(width, height, 0, height); line(0, height, 0, 0);
      }
    }
    this.gridSegmentsCache.set(key, segments);
    return segments;
  }

  paintGrid(context: CanvasRenderingContext2D, displayWidth: number, displayHeight: number): void {
    if (this.gridMode === 'off') return;
    const camera = this.cameras.main;
    const topLeft = camera.getWorldPoint(0, 0);
    const scaleX = camera.zoom * displayWidth / camera.width;
    const scaleY = camera.zoom * displayHeight / camera.height;
    context.strokeStyle = 'rgba(58, 107, 99, 0.74)';
    context.lineWidth = 1;
    context.beginPath();
    for (const { x1, y1, x2, y2 } of this.gridSegments()) {
      const screenX1 = (x1 - topLeft.x) * scaleX;
      const screenY1 = (y1 - topLeft.y) * scaleY;
      const screenX2 = (x2 - topLeft.x) * scaleX;
      const screenY2 = (y2 - topLeft.y) * scaleY;
      if (Math.max(screenX1, screenX2) < 0 || Math.min(screenX1, screenX2) > displayWidth ||
          Math.max(screenY1, screenY2) < 0 || Math.min(screenY1, screenY2) > displayHeight) continue;
      context.moveTo(Math.round(screenX1) + 0.5, Math.round(screenY1) + 0.5);
      context.lineTo(Math.round(screenX2) + 0.5, Math.round(screenY2) + 0.5);
    }
    context.stroke();
  }

  paintCollisionBoxes(context: CanvasRenderingContext2D, displayWidth: number, displayHeight: number): void {
    const camera = this.cameras.main;
    const topLeft = camera.getWorldPoint(0, 0);
    const scaleX = camera.zoom * displayWidth / camera.width;
    const scaleY = camera.zoom * displayHeight / camera.height;
    const screenX = (worldX: number) => Math.round((worldX - topLeft.x) * scaleX);
    const screenY = (worldY: number) => Math.round((worldY - topLeft.y) * scaleY);
    const outline = (x: number, y: number, width: number, height: number) => {
      const left = screenX(x); const top = screenY(y);
      context.strokeRect(left + 0.5, top + 0.5,
        screenX(x + width) - left, screenY(y + height) - top);
    };
    context.lineWidth = 1;
    context.strokeStyle = '#c54a3e';
    for (const area of this.worldCollisions) outline(area.x, area.y, area.width, area.height);

    // 青框是贴图边界；当前角色实际碰撞判定使用脚底点，绘成黄色十字。
    const playerBounds = this.player.getBounds();
    context.strokeStyle = '#4ac5d3';
    outline(playerBounds.x, playerBounds.y, playerBounds.width, playerBounds.height);
    const footX = screenX(this.player.x) + 0.5;
    const footY = screenY(this.player.y) + 0.5;
    context.strokeStyle = '#f1c34d';
    context.beginPath();
    context.moveTo(footX - 5, footY); context.lineTo(footX + 5, footY);
    context.moveTo(footX, footY - 5); context.lineTo(footX, footY + 5);
    context.stroke();
  }

  paintObjectDebugBoxes(context: CanvasRenderingContext2D, displayWidth: number, displayHeight: number, mode: ObjectDebugMode): void {
    if (mode === 'off') return;
    const camera = this.cameras.main;
    const topLeft = camera.getWorldPoint(0, 0);
    const scaleX = camera.zoom * displayWidth / camera.width;
    const scaleY = camera.zoom * displayHeight / camera.height;
    const draw = (area: { x: number; y: number; width: number; height: number }, label: string, color: string) => {
      const left = Math.round((area.x - topLeft.x) * scaleX);
      const top = Math.round((area.y - topLeft.y) * scaleY);
      const right = Math.round((area.x + area.width - topLeft.x) * scaleX);
      const bottom = Math.round((area.y + area.height - topLeft.y) * scaleY);
      if (right < 0 || bottom < 0 || left > displayWidth || top > displayHeight) return;
      context.strokeStyle = color;
      context.strokeRect(left + 0.5, top + 0.5, right - left, bottom - top);
      if (left >= displayWidth || top >= displayHeight || right - left < 24 || bottom - top < 12) return;
      context.font = '11px monospace';
      const textWidth = context.measureText(label).width;
      const textX = Math.max(0, Math.min(left + 3, displayWidth - textWidth - 5));
      const textY = Math.max(12, top + 13);
      context.fillStyle = 'rgba(22, 34, 36, 0.85)';
      context.fillRect(textX - 2, textY - 11, textWidth + 4, 14);
      context.fillStyle = color;
      context.fillText(label, textX, textY);
    };
    context.save();
    context.lineWidth = 1;
    if (mode === 'interaction' || mode === 'all') {
      for (const area of this.worldMaps.flatMap((map) => map.interactions)) draw(area, area.title || '交互', '#f1c34d');
      for (const area of this.worldMaps.flatMap((map) => map.portals)) draw(area, `接缝标记 ${area.name}`, '#4ca3d9');
    }
    if (mode === 'entity' || mode === 'all') {
      for (const area of this.worldMaps.flatMap((map) => map.specialEntities)) draw(area, area.name, '#bb83e4');
    }
    context.restore();
  }

  private minimapOverview: HTMLCanvasElement | undefined;

  // 只生成一次地形缩略图；返回缓存画布，UI 仅将其作为图片绘制。
  getMinimapOverview(): HTMLCanvasElement {
    if (this.minimapOverview) return this.minimapOverview;
    const canvas = document.createElement('canvas');
    canvas.width = worldBounds.width / 8;
    canvas.height = worldBounds.height / 8;
    const context = canvas.getContext('2d')!;
    context.imageSmoothingEnabled = false;
    for (const map of this.worldMaps) {
      const image = this.textures.get(map.terrain).getSourceImage() as HTMLImageElement;
      const columns = Math.floor(image.width / map.tileSize);
      for (const layer of map.layers) layer.forEach((row, y) => row.forEach((gid, x) => {
        if (gid < map.firstGid) return;
        const tile = gid - map.firstGid;
        context.drawImage(image, tile % columns * map.tileSize, Math.floor(tile / columns) * map.tileSize,
          map.tileSize, map.tileSize, (map.offset.x - worldBounds.x + x * map.tileSize) / 8,
          (map.offset.y - worldBounds.y + y * map.tileSize) / 8, map.tileSize / 8, map.tileSize / 8);
      }));
    }
    this.minimapOverview = canvas;
    return canvas;
  }

  getMinimapSnapshot(): MinimapSnapshot {
    const camera = this.cameras.main;
    const center = camera.getWorldPoint(camera.width / 2, camera.height / 2);
    const width = camera.width / camera.zoom;
    const height = camera.height / camera.zoom;
    return {
      position: { x: this.player.x, y: this.player.y }, facing: this.facing,
      zone: zoneAt(this.player) ?? this.zone,
      viewport: { x: center.x - width / 2, y: center.y - height / 2, width, height },
    };
  }

  getDebugSnapshot(): DebugSnapshot {
    const map = this.map;
    const camera = this.cameras.main;
    const center = camera.getWorldPoint(camera.width / 2, camera.height / 2);
    const loop = this.game.loop;
    return {
      dimension: '室外 / 地表', zoneId: this.zone, mapName: map.name,
      mapWidth: worldBounds.width, mapHeight: worldBounds.height, tileSize: map.tileSize,
      tileLayers: this.worldMaps.reduce((sum, entry) => sum + entry.layers.length, 0), mapSprites: this.worldMaps.reduce((sum, entry) => sum + entry.sprites.length, 0),
      collisionAreas: this.worldMaps.reduce((sum, entry) => sum + entry.collisions.length, 0), interactionAreas: this.worldMaps.reduce((sum, entry) => sum + entry.interactions.length, 0),
      portalAreas: this.worldMaps.reduce((sum, entry) => sum + entry.portals.length, 0), specialEntityAreas: this.worldMaps.reduce((sum, entry) => sum + entry.specialEntities.length, 0),
      zoneCount: Object.keys(this.maps).length,
      logicalPosition: { ...this.position },
      renderPosition: { x: this.player?.x ?? this.position.x, y: this.player?.y ?? this.position.y },
      facing: this.facing, moving: this.moving, sprint: this.keys?.SHIFT?.isDown ?? false,
      speed: Math.hypot(this.velocity.x, this.velocity.y), velocity: { ...this.velocity },
      cameraX: camera.scrollX, cameraY: camera.scrollY, cameraCenterX: center.x, cameraCenterY: center.y,
      cameraZoom: this.userZoom, visibleWorldWidth: camera.width / camera.zoom,
      visibleWorldHeight: camera.height / camera.zoom, cameraMode: this.cameraMode,
      viewportWidth: camera.width, viewportHeight: camera.height,
      fps: loop.actualFps,
      renderer: this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas',
      loadedTextures: Object.keys(this.textures.list).filter((key) => !key.startsWith('__')).length,
      declaredImages: Object.keys(birdFrameUrls).length + new Set(Object.values(this.maps).flatMap((entry) => [entry.terrain, ...entry.sprites.map((sprite) => sprite.source)])).size,
      sceneObjects: this.children.length,
    };
  }

  // 按 TMX 的相对路径加载图集和独立贴图。
  preload(): void {
    // 提前加载各区共用资源，切换时无需重新请求图片。
    const assets = new Set(Object.values(this.maps).flatMap((map) => [
      map.terrain, ...map.sprites.map((sprite) => sprite.source),
    ]));
    for (const source of assets) {
      // TMX 以 maps 为基准，Vite 的资源键以当前源文件为基准。
      const url = source && mapAssets[`../../../../picture/pixel_swu_ground_6zones_v1/${source.replace(/^\.\.\//, '')}`];
      if (!source || !url) throw new Error(`含弘门地图素材缺失：${source}`);
      this.load.image(source, url);
    }
    for (const [path, url] of Object.entries(birdFrameUrls)) {
      this.load.image(path.slice(path.lastIndexOf('/') + 1, -4), url);
    }
  }

  // 地面层低于所有区域的角色与实体（北侧区域使用负 Y）。
  private drawMap(): void {
    for (const object of this.mapObjects.splice(0)) object.destroy();
    for (const map of this.worldMaps) {
      const { tileSize, terrain, firstGid, offset } = map;
      for (const data of map.layers) {
        const layer = this.make.tilemap({ data, tileWidth: tileSize, tileHeight: tileSize });
        const tileset = layer.addTilesetImage(terrain, terrain, tileSize, tileSize, 0, 0, firstGid)!;
        const ground = layer.createLayer(0, tileset, offset.x, offset.y);
        if (ground) this.mapObjects.push(ground.setDepth(-10000));
      }
      for (const sprite of map.sprites) {
        this.mapObjects.push(this.add.image(sprite.x, sprite.y, sprite.source!).setOrigin(0, 1)
          .setDisplaySize(sprite.width, sprite.height).setDepth(sprite.y));
      }
    }
    this.refreshRenderBounds();
  }

  private refreshRenderBounds(): void {
    const camera = this.cameras.main;
    const horizontalPadding = camera.width / camera.zoom / 2 + 1 / camera.zoom;
    const verticalPadding = camera.height / camera.zoom / 2 + 1 / camera.zoom;
    camera.setBounds(worldBounds.x - horizontalPadding, worldBounds.y - verticalPadding,
      worldBounds.width + horizontalPadding * 2, worldBounds.height + verticalPadding * 2);
    camera.setBackgroundColor(this.map.backgroundColor);
  }

  // 首次进游戏使用 00 的出生点，之后全局坐标连续移动。
  create(): void {
    this.zone = '00';
    this.drawMap();
    this.position = { ...this.map.spawn };
    this.velocity = { x: 0, y: 0 };
    this.createPlayer();
    this.displayWidth = this.game.canvas.getBoundingClientRect().width || this.cameras.main.width;
    this.setZoom(1);
    // 非整数缩放时 Phaser 的逐对象取整会让地形和角色分别跳像素。
    this.cameras.main.setRoundPixels(false);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.snapCamera();
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.updateCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.updateCamera, this));
    const keyboard = this.input.keyboard!;
    this.keys = keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,SPACE') as typeof this.keys;
    keyboard.on('keydown-E', this.interact, this);
    keyboard.on('keydown-SPACE', this.interact, this);
    this.report(false);
  }

  // 按键可组合为八向移动；角色动画仍使用四个朝向。
  setDirection(direction: Direction, pressed: boolean): void { this.held[direction] = pressed; }

  update(): void {
    if (this.moving || !this.keys) return;
    const pressed = (direction: Direction, alternate: string) =>
      Number(Boolean(this.held[direction] || this.keys[direction.toUpperCase()].isDown || this.keys[alternate].isDown));
    const direction = this.hooks.isDialogOpen() ? null : directionFromAxes(
      pressed('right', 'D') - pressed('left', 'A'), pressed('down', 'S') - pressed('up', 'W'),
    );
    if (!direction) {
      this.playPlayer('idle');
      return;
    }
    const desiredFacing = facingForMove(direction);
    const turned = this.facing !== desiredFacing;
    this.facing = desiredFacing;
    const { tileSize } = this.map;
    const canMove = (to: Point) => canWorldStep(this.position, to, tileSize, this.worldCollisions);
    const desired = step(this.position, direction, tileSize);
    let next = desired;
    if (!canMove(desired) && direction.includes('-')) {
      const horizontal: Direction = direction.includes('left') ? 'left' : 'right';
      const vertical: Direction = direction.includes('up') ? 'up' : 'down';
      const alongX = step(this.position, horizontal, tileSize);
      const alongY = step(this.position, vertical, tileSize);
      next = canMove(alongX) ? alongX : alongY;
    }
    if (!canMove(next)) {
      this.playPlayer('idle');
      if (turned) this.report(false);
      return;
    }
    const actualDirection = directionFromAxes(next.x - this.position.x, next.y - this.position.y);
    if (actualDirection) this.facing = facingForMove(actualDirection);

    const sprint = this.keys.SHIFT.isDown;
    this.moving = true;
    const distance = Math.hypot(next.x - this.position.x, next.y - this.position.y) / tileSize;
    const duration = Math.round((sprint ? 68 : 132) * distance);
    this.velocity = { x: (next.x - this.position.x) * 1000 / duration, y: (next.y - this.position.y) * 1000 / duration };
    this.playPlayer(sprint ? 'run' : 'walk');
    this.tweens.add({
      targets: this.player, x: next.x, y: next.y, duration,
      onUpdate: () => this.player.setDepth(this.player.y),
      onComplete: () => {
        this.position = next;
        this.zone = zoneAt(next)!;
        this.moving = false;
        this.velocity = { x: 0, y: 0 };
        this.report(sprint);
      },
    });
  }

  // 在脚下或面前一格的 TMX 对话区域按 E 触发互动。
  private nearby() {
    const ahead = step(this.position, this.facing, this.map.tileSize);
    return this.worldMaps.flatMap((map) => map.interactions).find((zone) => [this.position, ahead].some((point) =>
      point.x >= zone.x && point.x < zone.x + zone.width && point.y >= zone.y && point.y < zone.y + zone.height,
    ));
  }

  interact(): void {
    if (this.moving || this.hooks.isDialogOpen()) return;
    const zone = this.nearby();
    if (zone) this.hooks.onMessage(zone.title, zone.message);
  }

  private report(sprint: boolean): void {
    const zone = this.nearby();
    this.hooks.onNearby(zone?.title ?? null, zone ? '按 E 查看介绍。' : undefined);
    // 状态栏显示当前区域及全局游戏脚底坐标。
    this.hooks.onStatus({ scene: this.map.name, position: { ...this.position }, facing: this.facing, sprint });
  }

  // 使用统一的脚底锚点与步态帧序号，减少切换动作时的跳动。
  private createPlayer(): void {
    for (const action of Object.keys(birdActions) as BirdAction[]) {
      const { frames, frameRate, repeat } = birdActions[action];
      for (const direction of birdDirections) {
        const key = `bird-original-${action}-${direction}`;
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: Array.from({ length: frames }, (_, index) => ({ key: birdFrameKey(key, index) })),
          frameRate,
          repeat,
        });
      }
    }
    this.player = this.add.sprite(this.position.x, this.position.y, 'bird-original-idle-down-000')
      .setOrigin(0.5, 88 / 96)
      // 将 96 × 96 的动画帧缩放为 48 × 48 游戏像素。
      .setScale(0.5)
      .setDepth(this.position.y);
    this.playPlayer('idle');
  }
  private playPlayer(action: BirdAction): void {
    const direction = this.facing;
    const key = `bird-original-${action}-${direction}`;
    const { currentAnim, currentFrame, isPlaying } = this.player.anims;
    if (currentAnim?.key === key && (action === 'idle' || isPlaying)) return;
    const startFrame = action !== 'idle' && isPlaying && currentFrame ? currentFrame.index - 1 : 0;
    this.player.play({ key, startFrame });
  }
}

// 含弘门场景直接使用 TMX 数据，并复用小鸟的四向动画。
import Phaser from 'phaser';
// 切图与普通移动共用脚底坐标和方向键判定。
import { canStep, crossingAt, directionFromAxes, facingForMove, step, type CampusZone, type Direction, type Point } from './campus';
import { readGateMap } from './gateMap';

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
  // 预解析六区地图，过界时只替换地图图层和贴图对象。
  private readonly maps = {
    '00': readGateMap('00'), '01': readGateMap('01'), '02': readGateMap('02'),
    '03': readGateMap('03'), '04': readGateMap('04'),
    '05': readGateMap('05'),
  };
  private zone: CampusZone = '00';
  private get map() { return this.maps[this.zone]; }
  private readonly mapObjects: Phaser.GameObjects.GameObject[] = [];
  private gridOverlay?: Phaser.GameObjects.Graphics;
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

  setGridMode(mode: GridMode): void { this.gridMode = mode; this.drawGrid(); }
  setViewportSize(width: number, height: number, displayWidth: number): void {
    const camera = this.cameras.main;
    const center = camera.getWorldPoint(camera.width / 2, camera.height / 2);
    camera.setSize(width, height);
    this.displayWidth = displayWidth;
    this.setZoom(this.userZoom);
    camera.centerOn(center.x, center.y);
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
  beginPan(): void { this.cameras.main.stopFollow(); this.cameraMode = '自由视角'; }
  panBy(cssX: number, cssY: number): void {
    const camera = this.cameras.main;
    const displayScale = this.game.canvas.getBoundingClientRect().width / camera.width || 1;
    camera.scrollX -= cssX / displayScale / camera.zoom;
    camera.scrollY -= cssY / displayScale / camera.zoom;
  }
  resetCamera(): void {
    const camera = this.cameras.main;
    this.setZoom(1);
    camera.startFollow(this.player, true);
    camera.centerOn(this.player.x, this.player.y);
    this.cameraMode = '跟随角色';
  }

  private drawGrid(): void {
    this.gridOverlay?.destroy();
    this.gridOverlay = undefined;
    if (this.gridMode === 'off') return;
    const { width, height, tileSize, layers } = this.map;
    const cols = width / tileSize; const rows = height / tileSize;
    const graphics = this.add.graphics().setDepth(-0.5);
    graphics.lineStyle(1, 0x3a6b63, 0.74);
    if (this.gridMode === 'cell') {
      for (let x = 0; x <= cols; x++) graphics.lineBetween(x * tileSize, 0, x * tileSize, height);
      for (let y = 0; y <= rows; y++) graphics.lineBetween(0, y * tileSize, width, y * tileSize);
    } else {
      const categoryAt = (x: number, y: number) => {
        for (let layer = layers.length - 1; layer >= 0; layer--) if (layers[layer][y][x] >= 0) return layer;
        return -1;
      };
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const current = categoryAt(x, y);
        if (x + 1 < cols && current !== categoryAt(x + 1, y)) graphics.lineBetween((x + 1) * tileSize, y * tileSize, (x + 1) * tileSize, (y + 1) * tileSize);
        if (y + 1 < rows && current !== categoryAt(x, y + 1)) graphics.lineBetween(x * tileSize, (y + 1) * tileSize, (x + 1) * tileSize, (y + 1) * tileSize);
      }
      graphics.strokeRect(0, 0, width, height);
    }
    this.gridOverlay = graphics;
  }

  getDebugSnapshot(): DebugSnapshot {
    const map = this.map;
    const camera = this.cameras.main;
    const center = camera.getWorldPoint(camera.width / 2, camera.height / 2);
    const loop = this.game.loop;
    return {
      dimension: '室外 / 地表', zoneId: this.zone, mapName: map.name,
      mapWidth: map.width, mapHeight: map.height, tileSize: map.tileSize,
      tileLayers: map.layers.length, mapSprites: map.sprites.length,
      collisionAreas: map.collisions.length, interactionAreas: map.interactions.length,
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

  // 地面层保持在角色下方，即使角色落在 y=0 的边界上。
  private drawMap(): void {
    this.gridOverlay?.destroy(); this.gridOverlay = undefined;
    for (const object of this.mapObjects.splice(0)) object.destroy();
    const { tileSize, terrain, firstGid } = this.map;
    for (const data of this.map.layers) {
      const layer = this.make.tilemap({ data, tileWidth: tileSize, tileHeight: tileSize });
      const tileset = layer.addTilesetImage(terrain, terrain, tileSize, tileSize, 0, 0, firstGid)!;
      const ground = layer.createLayer(0, tileset);
      if (ground) this.mapObjects.push(ground.setDepth(-1));
    }
    for (const sprite of this.map.sprites) {
      this.mapObjects.push(this.add.image(sprite.x, sprite.y, sprite.source!).setOrigin(0, 1)
        .setDisplaySize(sprite.width, sprite.height).setDepth(sprite.y));
    }
    this.refreshRenderBounds();
    this.drawGrid();
  }

  private refreshRenderBounds(): void {
    const camera = this.cameras.main;
    const horizontalPadding = camera.width / camera.zoom / 2;
    const verticalPadding = camera.height / camera.zoom / 2;
    camera.setBounds(-horizontalPadding, -verticalPadding,
      this.map.width + horizontalPadding * 2, this.map.height + verticalPadding * 2);
    camera.setBackgroundColor(this.map.backgroundColor);
  }

  // 首次进游戏使用 TMX 出生点，之后往返使用边界入口坐标。
  create(): void {
    this.zone = '00';
    this.drawMap();
    this.position = { ...this.map.spawn };
    this.velocity = { x: 0, y: 0 };
    this.createPlayer();
    this.displayWidth = this.game.canvas.getBoundingClientRect().width || this.cameras.main.width;
    this.setZoom(1);
    this.cameras.main.startFollow(this.player, true);
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
    // 出口先于普通边界碰撞检查，切换后角色与镜头一起落到对侧。
    const candidates: Direction[] = direction.includes('up') ? ['up'] : direction.includes('down') ? ['down'] : [];
    if (direction.includes('left')) candidates.push('left');
    if (direction.includes('right')) candidates.push('right');
    const crossing = candidates.map((candidate) => crossingAt(this.zone, this.position, candidate)).find((route) => route !== null);
    if (crossing) {
      this.velocity = { x: 0, y: 0 };
      this.zone = crossing.zone;
      this.position = crossing.point;
      this.drawMap();
      const { x, y } = this.position;
      this.player.setPosition(x, y).setDepth(y);
      this.cameras.main.centerOn(x, y);
      this.playPlayer(this.keys.SHIFT.isDown ? 'run' : 'walk');
      this.report(this.keys.SHIFT.isDown);
      return;
    }
    const { tileSize, width, height, collisions } = this.map;
    const desired = step(this.position, direction, tileSize);
    let next = desired;
    if (!canStep(this.position, desired, width, height, collisions) && direction.includes('-')) {
      const horizontal: Direction = direction.includes('left') ? 'left' : 'right';
      const vertical: Direction = direction.includes('up') ? 'up' : 'down';
      const alongX = step(this.position, horizontal, tileSize);
      const alongY = step(this.position, vertical, tileSize);
      next = canStep(this.position, alongX, width, height, collisions) ? alongX : alongY;
    }
    if (!canStep(this.position, next, width, height, collisions)) {
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
        this.moving = false;
        this.velocity = { x: 0, y: 0 };
        this.report(sprint);
      },
    });
  }

  // 在脚下或面前一格的 TMX 对话区域按 E 触发互动。
  private nearby() {
    const ahead = step(this.position, this.facing, this.map.tileSize);
    return this.map.interactions.find((zone) => [this.position, ahead].some((point) =>
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
    // 状态栏显示当前区域和切换后的脚底坐标。
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

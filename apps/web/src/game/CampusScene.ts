import Phaser from 'phaser';
import libraryImageUrl from '../../../../picture/assets/campus-environment/buildings/library.png?url';
// 原校园场景使用 terrainAt 查询地形。
import { BUILDINGS, ENTITIES, MAP_HEIGHT, MAP_WIDTH, SPAWN, TILE, canEnter, directionFromAxes, doorForMove, doorOutsideAt, facingTarget, isWalkable, moveOne, same, terrainAt, type Building, type Direction, type Point } from './campus';

export interface GameStatus { scene: string; floor: number; position: Point; facing: Direction; sprint: boolean; hasCard: boolean }
export interface GameHooks {
  onNearby: (name: string | null, description?: string) => void;
  onMessage: (title: string, body: string) => void;
  onStatus: (status: GameStatus) => void;
  isDialogOpen: () => boolean;
}

const center = (n: number) => n * TILE + TILE / 2;
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
// 恢复原校园地图的草地、道路、水域和树木配色。
const colors = { grass: 0x92bd70, grassDark: 0x77a95e, path: 0xd9ca9d, pathDark: 0xc1b483, water: 0x5c9ab1, waterLight: 0x83bdc2, trunk: 0x755943, leaf: 0x4f8e59, dark: 0x344c48 };

function rect(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number, depth = 0): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(x, y, w, h, color).setOrigin(0).setDepth(depth);
}

function text(scene: Phaser.Scene, x: number, y: number, value: string, size = 9, color = '#344c48'): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, { fontFamily: 'monospace', fontSize: `${size}px`, color, backgroundColor: '#f8f0cf', padding: { x: 2, y: 1 } }).setOrigin(0.5, 0).setDepth(1000);
}

function drawCharacter(scene: Phaser.Scene, x: number, y: number, shirt: number, hair = 0x403c43): Phaser.GameObjects.Container {
  const body = scene.add.container(center(x), center(y));
  const shadow = scene.add.ellipse(0, 11, 16, 5, 0x344c48, 0.28);
  const legs = scene.add.graphics().fillStyle(0x394d65).fillRect(-6, 5, 5, 7).fillRect(1, 5, 5, 7);
  const torso = scene.add.graphics().fillStyle(shirt).fillRect(-8, -6, 16, 12).fillStyle(0xf1c69c).fillRect(-5, -15, 10, 10).fillStyle(hair).fillRect(-6, -18, 12, 6).fillRect(-7, -14, 3, 5).fillRect(4, -14, 3, 5);
  const eyes = scene.add.graphics().fillStyle(0x34404b).fillRect(-3, -10, 2, 2).fillRect(2, -10, 2, 2);
  body.add([shadow, legs, torso, eyes]);
  body.setDepth(center(y));
  return body;
}

function drawTile(scene: Phaser.Scene, x: number, y: number): void {
  const t = terrainAt({ x, y });
  const px = x * TILE; const py = y * TILE;
  rect(scene, px, py, TILE, TILE, t === 'water' ? colors.water : t === 'path' ? colors.path : colors.grass);
  const seed = (x * 17 + y * 31) % 7;
  if (t === 'path') {
    rect(scene, px + 3 + seed, py + 5, 4, 2, colors.pathDark);
    rect(scene, px + 20, py + 20 + seed, 5, 2, colors.pathDark);
  } else if (t === 'water') {
    rect(scene, px + 3 + seed, py + 10, 11, 2, colors.waterLight);
    rect(scene, px + 15, py + 24, 12, 2, colors.waterLight);
  } else if (t === 'tree') {
    rect(scene, px + 13, py + 20, 6, 12, colors.trunk, py + 25);
    rect(scene, px + 5, py + 6, 22, 17, colors.leaf, py + 26);
    rect(scene, px + 9, py + 2, 14, 6, colors.leaf, py + 26);
    rect(scene, px + 9, py + 9, 5, 3, 0x69a86a, py + 27);
  } else {
    rect(scene, px + 6 + seed, py + 9, 3, 4, colors.grassDark);
    rect(scene, px + 20, py + 21 - seed, 4, 3, colors.grassDark);
    if (t === 'tall-grass') {
      for (let i = 0; i < 3; i++) rect(scene, px + 4 + i * 9, py + 16 - (i % 2) * 4, 6, 11, 0x5f9c58, py + 20);
    }
  }
}

function drawBuilding(scene: Phaser.Scene, building: Building, click: () => void): void {
  const px = building.x * TILE; const py = building.y * TILE;
  const w = building.width * TILE; const h = building.height * TILE;
  const d = py + h;
  // 图书馆和其他建筑共用点击区域，图书馆优先绘制贴图。
  scene.add.zone(px + w / 2, py + h / 2, w, h).setInteractive({ useHandCursor: true }).on('pointerdown', click);
  if (building.id === 'library' && scene.textures.exists('campus-library')) {
    const image = scene.add.image(center(building.door.x), d, 'campus-library').setOrigin(0.5, 1);
    image.setScale(Math.min(w / image.width, h / image.height)).setDepth(d);
    text(scene, px + w / 2, py + 19, building.name, 10);
    return;
  }
  rect(scene, px + 4, py + 14, w - 8, h - 12, 0xe5d9ad, d - 3);
  rect(scene, px, py + 2, w, h - 27, building.roof, d - 2);
  rect(scene, px + 7, py + 10, w - 14, 6, 0xffffff, d - 1).setAlpha(0.18);
  for (let i = 1; i < building.width - 1; i += 2) {
    rect(scene, px + i * TILE, py + h - 31, 17, 16, 0x4c7374, d);
    rect(scene, px + i * TILE + 3, py + h - 27, 11, 3, 0xa5d0be, d + 1);
  }
  rect(scene, center(building.door.x) - 11, py + h - 32, 22, 32, colors.dark, d + 1);
  rect(scene, center(building.door.x) - 8, py + h - 29, 16, 29, 0x8f644e, d + 2);
  rect(scene, center(building.door.x) + 3, py + h - 14, 2, 2, 0xf8d66c, d + 3);
  text(scene, px + w / 2, py + 19, building.name, 10);
}

function drawEntity(scene: Phaser.Scene, entity: (typeof ENTITIES)[number], click: () => void): Phaser.GameObjects.Container | null {
  const { x, y } = entity.at;
  const px = center(x); const py = center(y);
  let character: Phaser.GameObjects.Container | null = null;
  if (entity.kind === 'npc' || entity.kind === 'bot') character = drawCharacter(scene, x, y, entity.kind === 'npc' ? 0xe9a05e : 0x8196a7, entity.kind === 'npc' ? 0x624639 : 0x7c8692);
  if (entity.kind === 'animal') {
    rect(scene, px - 9, py, 18, 9, 0xf3d8a4, py + 12);
    rect(scene, px - 6, py - 6, 12, 10, 0xf3d8a4, py + 12);
    rect(scene, px - 6, py - 9, 4, 4, 0xf3d8a4, py + 12);
    rect(scene, px + 2, py - 9, 4, 4, 0xf3d8a4, py + 12);
  } else if (entity.kind === 'vehicle') {
    rect(scene, px - 12, py + 3, 8, 8, colors.dark, py + 12);
    rect(scene, px + 5, py + 3, 8, 8, colors.dark, py + 12);
    rect(scene, px - 7, py - 3, 18, 4, 0xb86458, py + 13);
    rect(scene, px + 1, py - 8, 3, 9, 0xb86458, py + 13);
  } else if (entity.kind === 'lamp') {
    character = scene.add.container(0, 0, [rect(scene, px - 2, py - 20, 4, 30, colors.dark), rect(scene, px - 7, py - 22, 14, 6, 0xf5d979)]).setDepth(py + 15);
  } else if (entity.kind === 'item') {
    character = scene.add.container(0, 0, [rect(scene, px - 8, py - 5, 16, 12, 0x4b82ac), rect(scene, px - 5, py - 2, 10, 2, 0xf9e8a9)]).setDepth(py + 12);
  }
  scene.add.zone(px, py, 28, 30).setInteractive({ useHandCursor: true }).on('pointerdown', click);
  return character;
}

abstract class GridScene extends Phaser.Scene {
  protected player!: Phaser.GameObjects.Sprite;
  protected position: Point = { ...SPAWN };
  protected facing: Direction = 'down';
  protected moving = false;
  protected held: Partial<Record<Direction, boolean>> = {};
  protected keys!: Record<string, Phaser.Input.Keyboard.Key>;
  protected hooks: GameHooks;
  protected sprint = false;
  constructor(key: string, hooks: GameHooks) { super(key); this.hooks = hooks; }
  preload(): void {
    for (const [path, url] of Object.entries(birdFrameUrls)) {
      const key = path.slice(path.lastIndexOf('/') + 1, -4);
      if (!this.textures.exists(key)) this.load.image(key, url);
    }
  }
  protected createPlayer(): void {
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
    this.player = this.add.sprite(center(this.position.x), center(this.position.y), 'bird-original-idle-down-000')
      .setOrigin(0.5, 88 / 96)
      .setScale(0.4)
      .setDepth(center(this.position.y));
    this.playPlayer('idle');
  }
  private playPlayer(action: BirdAction): void {
    const direction = this.facing.split('-')[0];
    const key = `bird-original-${action}-${direction}`;
    const { currentAnim, currentFrame, isPlaying } = this.player.anims;
    if (currentAnim?.key === key && (action === 'idle' || isPlaying)) return;
    const startFrame = action !== 'idle' && isPlaying && currentFrame ? currentFrame.index - 1 : 0;
    this.player.play({ key, startFrame });
  }
  protected setupInput(): void {
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.on('keydown-E', () => this.interact());
    this.input.keyboard!.on('keydown-SPACE', () => this.interact());
  }
  setDirection(direction: Direction, pressed: boolean): void { this.held[direction] = pressed; }
  update(): void {
    this.sprint = this.keys?.SHIFT?.isDown ?? false;
    if (this.moving || !this.keys) return;
    if (this.hooks.isDialogOpen()) {
      this.playPlayer('idle');
      return;
    }
    const pressed = (direction: 'up' | 'down' | 'left' | 'right', alternate: string) => this.held[direction] || this.keys[direction.toUpperCase()]?.isDown || this.keys[alternate]?.isDown;
    const dx = Number(Boolean(pressed('right', 'D'))) - Number(Boolean(pressed('left', 'A')));
    const dy = Number(Boolean(pressed('down', 'S'))) - Number(Boolean(pressed('up', 'W')));
    const direction = directionFromAxes(dx, dy);
    if (direction) this.tryMove(direction);
    else this.playPlayer('idle');
  }
  protected tryMove(direction: Direction): void {
    const turned = this.facing !== direction;
    this.facing = direction;
    if (this.beforeMove(direction)) return;
    const next = moveOne(this.position, direction, (point) => this.canMove(point));
    if (same(next, this.position)) {
      this.playPlayer('idle');
      if (turned) this.report();
      return;
    }
    const distance = Math.hypot(next.x - this.position.x, next.y - this.position.y);
    this.position = next;
    this.moving = true;
    this.playPlayer(this.sprint ? 'run' : 'walk');
    this.tweens.add({ targets: this.player, x: center(next.x), y: center(next.y), duration: Math.round((this.sprint ? 68 : 132) * distance), onUpdate: () => { this.player.x = Math.round(this.player.x); this.player.y = Math.round(this.player.y); }, onComplete: () => { this.player.setPosition(center(next.x), center(next.y)); this.moving = false; this.player.setDepth(center(next.y)); this.arrived(); this.report(); } });
    this.report();
  }
  protected beforeMove(_direction: Direction): boolean { return false; }
  protected abstract canMove(point: Point): boolean;
  protected abstract arrived(): void;
  protected abstract report(): void;
  abstract interact(): void;
}

export class CampusScene extends GridScene {
  private hasCard = false;
  private lamps = new Set<string>();
  private sprites = new Map<string, Phaser.GameObjects.Container | null>();
  constructor(hooks: GameHooks) { super('campus', hooks); }
  override preload(): void {
    super.preload();
    if (!this.textures.exists('campus-library')) this.load.image('campus-library', libraryImageUrl);
  }

  create(data?: { returnAt?: Point; hasCard?: boolean }): void {
    this.position = data?.returnAt ? { ...data.returnAt } : { ...SPAWN };
    this.hasCard = data?.hasCard ?? this.hasCard;
    this.facing = 'down'; this.moving = false; this.held = {};
    for (let y = 0; y < MAP_HEIGHT; y++) for (let x = 0; x < MAP_WIDTH; x++) drawTile(this, x, y);
    for (const building of BUILDINGS) drawBuilding(this, building, () => this.handleBuilding(building));
    for (const entity of ENTITIES) {
      if (entity.id === 'card' && this.hasCard) continue;
      const sprite = drawEntity(this, entity, () => this.handleEntity(entity));
      if (entity.kind === 'lamp') sprite?.setAlpha(this.lamps.has(entity.id) ? 1 : 0.55);
      this.sprites.set(entity.id, sprite);
    }
    this.createPlayer();
    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE, MAP_HEIGHT * TILE).startFollow(this.player, true, 1, 1);
    this.cameras.main.roundPixels = true;
    this.setupInput(); this.report();
  }
  protected canMove(point: Point): boolean { return isWalkable(point); }
  protected beforeMove(direction: Direction): boolean {
    const building = doorForMove(this.position, direction);
    if (!building) return false;
    if (!canEnter(building, this.hasCard)) this.hooks.onMessage('需要通行卡', '先在中央道路拾取蓝色通行卡，再向图书馆门内移动。');
    else this.scene.start('interior', { building, hasCard: this.hasCard, returnAt: { ...this.position } });
    return true;
  }
  protected arrived(): void {
    if (same(this.position, ENTITIES.find((entity) => entity.id === 'card')!.at) && !this.hasCard) this.handleEntity(ENTITIES.find((entity) => entity.id === 'card')!);
  }
  protected report(): void {
    const target = facingTarget(this.position, this.facing, this.hasCard);
    const door = doorOutsideAt(this.position);
    this.hooks.onNearby(target ? (target.type === 'building' ? target.building.name : target.entity.name) : door?.name ?? null, target ? (target.type === 'building' ? target.building.description : target.entity.description) : door ? `${door.description} 向上移动即可进门。` : undefined);
    this.hooks.onStatus({ scene: '校园', floor: 1, position: { ...this.position }, facing: this.facing, sprint: this.sprint, hasCard: this.hasCard });
  }
  interact(): void {
    if (this.hooks.isDialogOpen()) return;
    const target = facingTarget(this.position, this.facing, this.hasCard);
    if (!target) {
      const door = doorOutsideAt(this.position);
      if (door) this.handleBuilding(door);
      else this.hooks.onMessage('周围很安静', '面向实体按 E 可以互动；走到门前向内移动即可进门。');
      return;
    }
    if (target.type === 'building') this.handleBuilding(target.building); else this.handleEntity(target.entity);
  }
  private handleBuilding(building: Building): void {
    this.hooks.onMessage(building.name, canEnter(building, this.hasCard) ? `${building.description} 走到门外，向上移动即可进入。` : '需要通行卡。先在中央道路拾取蓝色通行卡，再从门外向上移动。');
  }
  private handleEntity(entity: (typeof ENTITIES)[number]): void {
    if (entity.id === 'card') {
      if (this.hasCard) return;
      this.hasCard = true;
      this.sprites.get('card')?.destroy();
      this.hooks.onMessage('获得通行卡', '现在可以从图书馆正门进入室内。');
      this.report();
    } else if (entity.kind === 'lamp') {
      if (this.lamps.has(entity.id)) this.lamps.delete(entity.id); else this.lamps.add(entity.id);
      this.sprites.get(entity.id)?.setAlpha(this.lamps.has(entity.id) ? 1 : 0.55);
      this.hooks.onMessage(entity.name, `路灯已${this.lamps.has(entity.id) ? '点亮' : '熄灭'}。`);
    } else this.hooks.onMessage(entity.name, entity.description);
  }
}

export class InteriorScene extends GridScene {
  private building!: Building;
  private returnAt!: Point;
  private hasCard = false;
  private floor = 1;
  constructor(hooks: GameHooks) { super('interior', hooks); }
  create(data: { building: Building; hasCard: boolean; returnAt: Point }): void {
    this.building = data.building; this.returnAt = data.returnAt; this.hasCard = data.hasCard;
    this.floor = 1; this.position = { x: 5, y: 6 }; this.facing = 'down'; this.moving = false; this.held = {};
    this.paintRoom();
    this.createPlayer();
    this.cameras.main.setBounds(0, 0, 12 * TILE, 8 * TILE).centerOn(6 * TILE, 4 * TILE);
    this.cameras.main.roundPixels = true;
    this.setupInput(); this.report();
  }
  private paintRoom(): void {
    this.children.removeAll(true);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) {
      const border = x === 0 || y === 0 || x === 11 || y === 7;
      rect(this, x * TILE, y * TILE, TILE, TILE, border ? 0x607b7c : (x + y) % 2 ? 0xe9dcb7 : 0xf1e6c7);
      if (y === 0 && x > 1 && x < 10 && x % 2 === 0) rect(this, x * TILE + 5, 5, 21, 20, 0x88bac1);
    }
    rect(this, 5 * TILE, 7 * TILE, TILE, TILE, 0xa36c50);
    rect(this, 2 * TILE, 2 * TILE, TILE * 2, TILE, 0xa27854, 80);
    rect(this, 7 * TILE, 4 * TILE, TILE * 2, TILE, 0xa27854, 80);
    if (this.building.floors > 1) {
      rect(this, 9 * TILE, 2 * TILE, TILE, TILE, 0x897aa3);
      text(this, center(9), 2 * TILE + 7, '↑', 14);
    }
    text(this, 6 * TILE, 7, `${this.building.name}  ${this.floor}F`, 10);
    text(this, center(5), 7 * TILE + 7, '出口', 9);
  }
  protected canMove(point: Point): boolean { return point.x > 0 && point.x < 11 && point.y > 0 && point.y < 7; }
  protected beforeMove(direction: Direction): boolean {
    if (this.position.x !== 5 || this.position.y !== 6 || direction !== 'down') return false;
    this.scene.start('campus', { returnAt: this.returnAt, hasCard: this.hasCard });
    return true;
  }
  protected arrived(): void { /* Interaction is intentional via E. */ }
  protected report(): void {
    const atExit = this.position.x === 5 && this.position.y === 6;
    const atStair = this.building.floors > 1 && Math.abs(this.position.x - 9) + Math.abs(this.position.y - 2) <= 1;
    this.hooks.onNearby(atExit ? '出口' : atStair ? '楼梯' : null, atExit ? '向下移动返回校园。' : atStair ? '按 E 切换楼层。' : undefined);
    this.hooks.onStatus({ scene: this.building.name, floor: this.floor, position: { ...this.position }, facing: this.facing, sprint: this.sprint, hasCard: this.hasCard });
  }
  interact(): void {
    if (this.hooks.isDialogOpen()) return;
    if (this.position.x === 5 && this.position.y === 6) { this.hooks.onMessage('出口', '向下移动即可返回校园。'); return; }
    if (this.building.floors > 1 && Math.abs(this.position.x - 9) + Math.abs(this.position.y - 2) <= 1) {
      this.floor = this.floor % this.building.floors + 1;
      this.paintRoom(); this.createPlayer();
      this.hooks.onMessage('楼层切换', `来到 ${this.building.name} ${this.floor}F。`); this.report(); return;
    }
    this.hooks.onMessage(this.building.name, `${this.floor}F 是原创像素室内示意。真实校园服务尚未接入。`);
  }
}

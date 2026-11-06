// 含弘门场景直接使用 TMX 数据，并复用小鸟的四向动画。
import Phaser from 'phaser';
import { canStep, directionFromAxes, step, type Direction, type Point } from './campus';
import { readGateMap } from './gateMap';

export interface GameStatus { scene: string; position: Point; facing: Direction; sprint: boolean }
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
const mapAssets = import.meta.glob<string>('../../../../picture/swu_gate_project/assets/*.png', {
  eager: true, query: '?url', import: 'default',
});

export class CampusScene extends Phaser.Scene {
  private readonly map = readGateMap();
  private player!: Phaser.GameObjects.Sprite;
  private position = { ...this.map.spawn };
  private facing: Direction = 'down';
  private moving = false;
  private readonly held: Partial<Record<Direction, boolean>> = {};
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(private readonly hooks: GameHooks) { super('campus'); }

  // 按 TMX 的相对路径加载图集和独立贴图。
  preload(): void {
    const assets = new Set([this.map.terrain, ...this.map.sprites.map((sprite) => sprite.source)]);
    for (const source of assets) {
      const url = mapAssets[`../../../../picture/swu_gate_project/${source}`];
      if (!source || !url) throw new Error(`含弘门地图素材缺失：${source}`);
      this.load.image(source, url);
    }
    for (const [path, url] of Object.entries(birdFrameUrls)) {
      this.load.image(path.slice(path.lastIndexOf('/') + 1, -4), url);
    }
  }

  // 保留 TMX 图层顺序，独立贴图使用 Tiled 瓦片对象的左下角锚点。
  create(): void {
    const { tileSize, width, height, terrain, firstGid } = this.map;
    for (const data of this.map.layers) {
      const layer = this.make.tilemap({ data, tileWidth: tileSize, tileHeight: tileSize });
      const tileset = layer.addTilesetImage(terrain, terrain, tileSize, tileSize, 0, 0, firstGid)!;
      layer.createLayer(0, tileset);
    }
    for (const sprite of this.map.sprites) {
      this.add.image(sprite.x, sprite.y, sprite.source!).setOrigin(0, 1)
        .setDisplaySize(sprite.width, sprite.height).setDepth(sprite.y);
    }

    this.position = { ...this.map.spawn };
    this.createPlayer();
    this.cameras.main.setBounds(0, 0, width, height).startFollow(this.player, true);
    const keyboard = this.input.keyboard!;
    this.keys = keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,SPACE') as typeof this.keys;
    keyboard.on('keydown-E', this.interact, this);
    keyboard.on('keydown-SPACE', this.interact, this);
    this.report(false);
  }

  // 四向移动以脚底为坐标，每次尝试沿一个轴移动一格。
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
    const turned = this.facing !== direction;
    this.facing = direction;
    const { tileSize, width, height, collisions } = this.map;
    const next = step(this.position, direction, tileSize);
    if (!canStep(this.position, next, width, height, collisions)) {
      this.playPlayer('idle');
      if (turned) this.report(false);
      return;
    }

    const sprint = this.keys.SHIFT.isDown;
    this.moving = true;
    this.playPlayer(sprint ? 'run' : 'walk');
    this.tweens.add({
      targets: this.player, x: next.x, y: next.y, duration: sprint ? 68 : 132,
      onUpdate: () => this.player.setDepth(this.player.y),
      onComplete: () => {
        this.position = next;
        this.moving = false;
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
    this.hooks.onStatus({ scene: '含弘门', position: { ...this.position }, facing: this.facing, sprint });
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

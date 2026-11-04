import Phaser from 'phaser';
import { MAP_SIZE, PLACES, SPAWN, movePlayer, nearbyPlace, type Place, type Position } from './campus';

type Direction = 'up' | 'down' | 'left' | 'right';

const TILE_W = 64;
const TILE_H = 32;
const ORIGIN_X = 480;
const ORIGIN_Y = 110;

function project(point: Position): Position {
  return { x: ORIGIN_X + (point.x - point.y) * TILE_W / 2, y: ORIGIN_Y + (point.x + point.y) * TILE_H / 2 };
}

function polygon(...points: Position[]): Phaser.Math.Vector2[] {
  return points.map((point) => new Phaser.Math.Vector2(point.x, point.y));
}

export class CampusScene extends Phaser.Scene {
  private position: Position = { ...SPAWN };
  private avatar!: Phaser.GameObjects.Container;
  private keys!: Record<Direction | 'interact' | 'upArrow' | 'downArrow' | 'leftArrow' | 'rightArrow', Phaser.Input.Keyboard.Key>;
  private readonly virtual = new Set<Direction>();
  private currentPlace: Place | null = null;

  constructor(private readonly onNearby: (place: Place | null) => void, private readonly onInteract: (place: Place) => void) {
    super('campus-prototype');
  }

  create(): void {
    const ground = this.add.graphics();
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const { x: px, y: py } = project({ x, y });
        const isPath = x === 5 || y === 5 || x === 6 || y === 6;
        ground.fillStyle(isPath ? 0xd8cbb2 : (x + y) % 2 ? 0xa4c99b : 0xafd2a5);
        ground.lineStyle(1, isPath ? 0xc5b69b : 0x8bb58a, 0.6);
        const tile = polygon({ x: px, y: py - 16 }, { x: px + 32, y: py }, { x: px, y: py + 16 }, { x: px - 32, y: py });
        ground.fillPoints(tile, true);
        ground.strokePoints(tile, true);
      }
    }

    for (const place of PLACES) this.drawPlace(place);
    this.add.text(20, 16, '局部校园 · 原型示意', { color: '#25433b', fontFamily: 'sans-serif', fontSize: '17px', fontStyle: 'bold' });

    const shadow = this.add.ellipse(0, 9, 24, 10, 0x244a43, 0.25);
    const body = this.add.ellipse(0, -9, 20, 29, 0x3279ad);
    const head = this.add.circle(0, -28, 9, 0xf6d6ad);
    const eyes = this.add.circle(3, -29, 1.5, 0x263a43);
    this.avatar = this.add.container(0, 0, [shadow, body, head, eyes]).setDepth(100);
    this.placeAvatar();

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('键盘输入不可用');
    this.keys = keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D', interact: 'E' }) as typeof this.keys;
    const arrows = keyboard.createCursorKeys();
    this.keys.upArrow = arrows.up;
    this.keys.downArrow = arrows.down;
    this.keys.leftArrow = arrows.left;
    this.keys.rightArrow = arrows.right;
    this.currentPlace = nearbyPlace(this.position);
    this.onNearby(this.currentPlace);
  }

  update(_time: number, delta: number): void {
    if (!this.keys) return;
    const inputX = Number(this.keys.right.isDown || this.keys.rightArrow?.isDown || this.virtual.has('right')) - Number(this.keys.left.isDown || this.keys.leftArrow?.isDown || this.virtual.has('left'));
    const inputY = Number(this.keys.down.isDown || this.keys.downArrow?.isDown || this.virtual.has('down')) - Number(this.keys.up.isDown || this.keys.upArrow?.isDown || this.virtual.has('up'));
    if (inputX || inputY) {
      const magnitude = Math.hypot(inputX, inputY);
      const distance = Math.min(delta, 50) * 0.003;
      this.position = movePlayer(this.position, inputX / magnitude * distance, inputY / magnitude * distance);
      this.placeAvatar();
      const near = nearbyPlace(this.position);
      if (near?.id !== this.currentPlace?.id) {
        this.currentPlace = near;
        this.onNearby(near);
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) this.interact();
  }

  setDirection(direction: Direction, pressed: boolean): void {
    if (pressed) this.virtual.add(direction);
    else this.virtual.delete(direction);
  }

  interact(): void {
    if (this.currentPlace) this.onInteract(this.currentPlace);
  }

  private placeAvatar(): void {
    const at = project(this.position);
    this.avatar.setPosition(at.x, at.y);
  }

  private drawPlace(place: Place): void {
    const center = project({ x: place.x + (place.width - 1) / 2, y: place.y + (place.depth - 1) / 2 });
    const rx = place.width * TILE_W / 2;
    const ry = place.depth * TILE_H / 2;
    const roofY = center.y - place.height;
    const shape = this.add.graphics();
    shape.fillStyle(Phaser.Display.Color.IntegerToColor(place.color).darken(22).color);
    shape.fillPoints(polygon({ x: center.x - rx, y: roofY }, { x: center.x, y: roofY + ry }, { x: center.x, y: center.y + ry }, { x: center.x - rx, y: center.y }), true);
    shape.fillStyle(Phaser.Display.Color.IntegerToColor(place.color).darken(10).color);
    shape.fillPoints(polygon({ x: center.x + rx, y: roofY }, { x: center.x, y: roofY + ry }, { x: center.x, y: center.y + ry }, { x: center.x + rx, y: center.y }), true);
    shape.fillStyle(place.color);
    shape.lineStyle(2, 0xffffff, 0.65);
    const roof = polygon({ x: center.x, y: roofY - ry }, { x: center.x + rx, y: roofY }, { x: center.x, y: roofY + ry }, { x: center.x - rx, y: roofY });
    shape.fillPoints(roof, true);
    shape.strokePoints(roof, true);
    this.add.text(center.x, roofY - ry - 18, place.name, { color: '#203e38', fontSize: '13px', fontFamily: 'sans-serif', backgroundColor: '#ffffffd9', padding: { x: 5, y: 3 } }).setOrigin(0.5);
    const entrance = project(place.entrance);
    this.add.circle(entrance.x, entrance.y, 7, 0xf5ce65).setStrokeStyle(2, 0x65531e);
  }
}

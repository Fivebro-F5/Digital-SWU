import Phaser from 'phaser';

const PLAYER_SIZE = 32;
const PLAYER_SPEED = 240;
const WORLD_WIDTH = 7680;
const WORLD_HEIGHT = 4320;
const TILE_SIZE = 240;
const DARK_BLUE = 0x174275;
const LIGHT_BLUE = 0x5599d6;
const PLAYER_TEXTURE = 'campus-player';
const PLACEHOLDER_TEXTURE = 'campus-player-placeholder';
const playerImages = import.meta.glob<string>('./assets/player.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

export class CampusScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Pick<Phaser.Types.Input.Keyboard.CursorKeys, 'up' | 'down' | 'left' | 'right'>;
  private readonly direction = new Phaser.Math.Vector2();

  //修改角色图片
  preload() {
    const playerImage = playerImages['./assets/player.png'];
    if (playerImage) this.load.image(PLAYER_TEXTURE, playerImage);
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.drawBackground();

    const texture = this.textures.exists(PLAYER_TEXTURE) ? PLAYER_TEXTURE : PLACEHOLDER_TEXTURE;
    if (!this.textures.exists(texture)) {
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(0xffffff);
      graphics.fillRect(0, 0, PLAYER_SIZE, PLAYER_SIZE);
      graphics.generateTexture(texture, PLAYER_SIZE, PLAYER_SIZE);
      graphics.destroy();
    }

    this.player = this.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, texture);
    this.player.setDisplaySize(PLAYER_SIZE, PLAYER_SIZE);
    this.player.setCollideWorldBounds(true);
    this.cameras.main.startFollow(this.player);

    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey('W'),
      down: keyboard.addKey('S'),
      left: keyboard.addKey('A'),
      right: keyboard.addKey('D'),
    };
  }

  update() {
    const x = Number(this.cursors.right.isDown || this.wasd.right.isDown)
      - Number(this.cursors.left.isDown || this.wasd.left.isDown);
    const y = Number(this.cursors.down.isDown || this.wasd.down.isDown)
      - Number(this.cursors.up.isDown || this.wasd.up.isDown);
    this.direction.set(x, y).normalize().scale(PLAYER_SPEED);
    this.player.setVelocity(this.direction.x, this.direction.y);
  }

  private drawBackground() {
    const background = this.add.graphics();
    for (let y = 0; y < WORLD_HEIGHT; y += TILE_SIZE) {
      for (let x = 0; x < WORLD_WIDTH; x += TILE_SIZE) {
        const isLight = (x / TILE_SIZE + y / TILE_SIZE) % 2 === 0;
        background.fillStyle(isLight ? LIGHT_BLUE : DARK_BLUE);
        background.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}

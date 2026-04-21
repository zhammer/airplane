import Phaser from 'phaser';
import {
  WORLD_W, GRASS_TOP, GRASS_H, SAND_TOP, SAND_H,
  SHORE_Y, CHAR_SPAWN_X, CHAR_SPAWN_Y, shoreYAt,
} from '../constants.js';
import { placeTrees } from '../trees.js';
import { spawnShells } from '../shells.js';

const WAVE_W = 640;
const WAVE_H = 256;

export class MainScene extends Phaser.Scene {
  constructor() { super('MainScene'); }

  preload() {
    this.load.image('grass', 'assets/grass-tile.png');
    this.load.image('beach', 'assets/beach-tile.png');
    this.load.image('character', 'assets/character.png');
    this.load.image('tree', 'assets/tree.png');
    this.load.image('shell-pink', 'assets/shell-pink.png');
    this.load.image('shell-purple', 'assets/shell-purple.png');
    this.load.spritesheet('wave', 'assets/wave-sheet.png', {
      frameWidth: 160,
      frameHeight: 64,
    });
  }

  create() {
    // Background zones
    this.add.tileSprite(0, GRASS_TOP, WORLD_W, GRASS_H, 'grass').setOrigin(0, 0).setDepth(0).setTileScale(4, 4);
    this.add.tileSprite(0, SAND_TOP, WORLD_W, SAND_H, 'beach').setOrigin(0, 0).setDepth(0).setTileScale(4, 4);

    // Wave animation (first 18 frames = full loop)
    this.anims.create({
      key: 'wave',
      frames: this.anims.generateFrameNumbers('wave', { start: 0, end: 17 }),
      frameRate: 1000 / 150,
      repeat: -1,
    });

    // 4 wave sprites at stepped y positions, scaled 4x, origin top-left
    [0, 1, 2, 3].forEach((seg) => {
      const sprite = this.add.sprite(seg * WAVE_W, SHORE_Y[seg], 'wave')
        .setOrigin(0, 0)
        .setScale(4)
        .setDepth(1);
      sprite.play('wave');
      if (seg === 3) sprite.setFlipX(true);

      if (SHORE_Y[seg] < SHORE_Y[2]) {
        const under = this.add.sprite(seg * WAVE_W, SHORE_Y[seg] + WAVE_H, 'wave')
          .setOrigin(0, 0)
          .setScale(4)
          .setFlipY(true)
          .setDepth(1);
        under.play('wave');
        if (seg === 3) under.setFlipX(true);
      }
    });

    // Trees (depth 2) — randomly placed in grass zone
    this.trees = placeTrees(this);

    // Shells — randomly placed in sand/grass zones
    this.shells = spawnShells(this);

    // Player (depth 3 — always on top), scaled 4x
    this.player = this.physics.add.sprite(CHAR_SPAWN_X, CHAR_SPAWN_Y, 'character');
    this.player.setScale(0.4);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(3);
    this.physics.add.collider(this.player, this.trees);

    // Held shell overlay — screen-space so it locks to the character without camera lag
    this.heldShellSprite = this.add.image(0, 0, 'shell-pink')
      .setScale(0.175)
      .setDepth(4)
      .setScrollFactor(0)
      .setVisible(false);

    this.heldShell = null;
    this.heldShellOffset = { x: -8, y: 22 };

    // Shell pickup overlap
    this.physics.add.overlap(this.player, this.shells, (player, shell) => {
      if (this.heldShell) return;
      this.heldShell = { type: shell.texture.key };
      this.heldShellSprite.setTexture(shell.texture.key).setVisible(true);
      shell.destroy();
    });

    // Physics + camera
    this.physics.world.setBounds(0, 0, WORLD_W, 2080);
    this.cameras.main.setBounds(0, 0, WORLD_W, 2144);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
  }

  update() {
    const speed = 480;
    let vx = 0, vy = 0;

    if (this.cursors.left.isDown  || this.wasd.A.isDown)  vx = -speed;
    if (this.cursors.right.isDown || this.wasd.D.isDown)  vx =  speed;
    if (this.cursors.up.isDown    || this.wasd.W.isDown)  vy = -speed;
    if (this.cursors.down.isDown  || this.wasd.S.isDown)  vy =  speed;

    this.player.setVelocity(vx, vy);

    // Stop at shore boundary
    const shore = shoreYAt(this.player.x);
    if (this.player.y >= shore) {
      this.player.y = shore - 1;
      if (this.player.body.velocity.y > 0) this.player.setVelocityY(0);
      if (this.heldShell) this.releaseShell();
    }

    // Track held shell to player in screen space (no camera lag)
    if (this.heldShell) {
      const cam = this.cameras.main;
      this.heldShellSprite.setPosition(
        this.player.x - cam.scrollX + this.heldShellOffset.x,
        this.player.y - cam.scrollY + this.heldShellOffset.y,
      );
    }
  }

  releaseShell() {
    const type = this.heldShell.type;
    this.heldShell = null;
    this.heldShellSprite.setVisible(false);

    const shell = this.add.image(this.player.x, this.player.y, type)
      .setScale(0.175)
      .setDepth(1.5);

    const startY = shell.y;

    this.tweens.add({
      targets: shell,
      y: startY + 320,
      duration: 6000,
      ease: 'Sine.easeIn',
      onUpdate: (tween) => {
        const t = tween.progress;
        shell.y = startY + t * 320 + Math.pow(Math.sin(t * Math.PI * 5), 3) * 8;
      },
      onComplete: () => {
        this.tweens.add({
          targets: shell,
          alpha: 0,
          duration: 500,
          onComplete: () => shell.destroy(),
        });
      },
    });
  }
}

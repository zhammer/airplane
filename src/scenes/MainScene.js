import Phaser from 'phaser';
import { MAP_W, SAND_TOP, SAND_H, GRASS_TOP } from '../constants.js';

export class MainScene extends Phaser.Scene {
  constructor() { super('MainScene'); }

  preload() {
    this.load.image('grass', 'assets/grass-tile.png');
    this.load.image('beach', 'assets/beach-tile.png');
  }

  create() {
    this.add.tileSprite(0, GRASS_TOP, MAP_W, SAND_TOP - GRASS_TOP, 'grass')
      .setOrigin(0, 0);

    this.add.tileSprite(0, SAND_TOP, MAP_W, SAND_H, 'beach')
      .setOrigin(0, 0);
  }

  update() {}
}

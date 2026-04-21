import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 640,
  height: 480,
  zoom: 1,
  pixelArt: true,
  backgroundColor: 'transparent',
  transparent: true,
  parent: 'game',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [MainScene],
});

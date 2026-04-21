import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 480,
  height: 360,
  backgroundColor: 'transparent',
  transparent: true,
  parent: 'game',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [MainScene],
});

import { WORLD_W, GRASS_TOP, GRASS_H, CHAR_SPAWN_X, CHAR_SPAWN_Y } from './constants.js';

const TREE_COUNT = 8;
const MARGIN = 120;
const MIN_DIST_FROM_PLAYER = 240;
const MIN_DIST_BETWEEN_TREES = 160;

export function placeTrees(scene) {
  const group = scene.physics.add.staticGroup();
  const placed = [];

  let attempts = 0;
  while (placed.length < TREE_COUNT && attempts < 500) {
    attempts++;
    const x = MARGIN + Math.random() * (WORLD_W - MARGIN * 2);
    const y = GRASS_TOP + MARGIN + Math.random() * (GRASS_H - MARGIN * 2);

    const distPlayer = Math.hypot(x - CHAR_SPAWN_X, y - CHAR_SPAWN_Y);
    if (distPlayer < MIN_DIST_FROM_PLAYER) continue;

    const tooClose = placed.some(p => Math.hypot(x - p.x, y - p.y) < MIN_DIST_BETWEEN_TREES);
    if (tooClose) continue;

    placed.push({ x, y });
    group.create(x, y, 'tree').setScale(1.6).setDepth(2).refreshBody();
  }

  return { group, positions: placed };
}

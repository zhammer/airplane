import { WORLD_W, GRASS_TOP, GRASS_H, SAND_TOP, shoreYAt } from './constants.js';

const SAND_COUNT = 6;
const GRASS_COUNT = 6;
const MARGIN = 80;
const MIN_DIST_BETWEEN_SHELLS = 120;
const MIN_DIST_FROM_TREE = 180;
const SHELL_SCALE = 0.175;

function placeShellsInZone(scene, group, allPlaced, specs, getY, treePositions) {
  for (const { type, count } of specs) {
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < 500) {
      attempts++;
      const x = MARGIN + Math.random() * (WORLD_W - MARGIN * 2);
      const y = getY(x);
      if (y === null) continue;

      const tooClose = allPlaced.some(p => Math.hypot(x - p.x, y - p.y) < MIN_DIST_BETWEEN_SHELLS);
      if (tooClose) continue;

      const nearTree = treePositions.some(p => Math.hypot(x - p.x, y - p.y) < MIN_DIST_FROM_TREE);
      if (nearTree) continue;

      allPlaced.push({ x, y });
      group.create(x, y, type).setScale(SHELL_SCALE).setDepth(1.5).refreshBody();
      placed++;
    }
  }
}

export function spawnShells(scene, treePositions = []) {
  const group = scene.physics.add.staticGroup();
  const allPlaced = [];

  // Sand zone: 10% purple odds → 1 purple, rest pink
  placeShellsInZone(scene, group, allPlaced, [
    { type: 'shell-purple', count: Math.round(SAND_COUNT * 0.1) },
    { type: 'shell-pink',   count: Math.round(SAND_COUNT * 0.9) },
  ], (x) => {
    const top = SAND_TOP + MARGIN;
    const bottom = shoreYAt(x) - MARGIN;
    return bottom <= top ? null : top + Math.random() * (bottom - top);
  }, treePositions);

  // Grass zone: 30% purple odds → 2 purple, rest pink
  placeShellsInZone(scene, group, allPlaced, [
    { type: 'shell-purple', count: Math.round(GRASS_COUNT * 0.3) },
    { type: 'shell-pink',   count: Math.round(GRASS_COUNT * 0.7) },
  ], (_x) => {
    const top = GRASS_TOP + MARGIN;
    const bottom = GRASS_TOP + GRASS_H - MARGIN;
    return top + Math.random() * (bottom - top);
  }, treePositions);

  return group;
}

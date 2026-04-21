// World (full scrollable map: 80x60 tiles @ 32px = 4x scale-up)
export const WORLD_W = 2560;
export const WORLD_H = 1920;

// Viewport (Phaser internal = CSS output, no zoom)
export const VIEWPORT_W = 640;
export const VIEWPORT_H = 480;

// Zone y-positions (4x of original 8px-tile layout)
export const GRASS_TOP = 0;
export const GRASS_H = 1248;
export const SAND_TOP = 1248;
export const SAND_H = 672;
export const WAVE_H = 256;

// Shore boundary: stepped curve across 4 x-segments (each 640px wide)
// World y where wave tile top sits per segment: [seg0, seg1, seg2, seg3]
export const SHORE_Y = [1824, 1856, 1888, 1888];

// Shore boundary polyline derived from wave tile collision polygon (map.tsx tile id=13),
// tiled across 4 wave segments. World coordinates [x, y]. All values 4x of tile-derived points.
export const SHORE_POLY = [
  // seg 0 (SHORE_Y=1824)
  [0, 1958], [36, 1971], [95, 1970], [233, 1930], [283, 1930],
  [383, 1982], [428, 1983], [476, 1955], [520, 1955], [603, 1970],
  // seg 1 (SHORE_Y=1856)
  [640, 1988], [676, 2003], [735, 2002], [873, 1962], [923, 1962],
  [1023, 2014], [1068, 2015], [1116, 1987], [1160, 1987], [1243, 2002],
  // seg 2 (SHORE_Y=1888)
  [1280, 2020], [1316, 2035], [1375, 2034], [1513, 1994], [1563, 1994],
  [1663, 2046], [1708, 2047], [1756, 2019], [1800, 2019], [1883, 2034],
  // seg 3 (SHORE_Y=1888, flipped)
  [1920, 2050], [1956, 2034], [2040, 2019], [2084, 2019],
  [2132, 2047], [2177, 2046], [2277, 1994], [2327, 1994],
  [2465, 2034], [2524, 2035], [2560, 2022],
];

/** Returns the interpolated shore world-y for a given world x */
export function shoreYAt(x) {
  const cx = Math.max(0, Math.min(WORLD_W, x));
  let lo = 0, hi = SHORE_POLY.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (SHORE_POLY[mid][0] <= cx) lo = mid; else hi = mid;
  }
  const [x0, y0] = SHORE_POLY[lo];
  const [x1, y1] = SHORE_POLY[hi];
  if (x1 === x0) return y0;
  return y0 + (cx - x0) / (x1 - x0) * (y1 - y0);
}

// Character spawn (4x of original TMJ positions)
export const CHAR_SPAWN_X = 1320;
export const CHAR_SPAWN_Y = 1140;

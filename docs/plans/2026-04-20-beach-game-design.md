# Beach Shell Game — Design Doc
_2026-04-20_

## Overview

A chill, sandbox 2D browser game. A creature walks a small beach island, picks up shells, and releases them at the shore to watch them float off into the waves. No score, no win state.

## Map

A closed rectangular world composed of three horizontal zones:

- **Grass** (top): tiled green tiles, trees placed as solid obstacles
- **Sand/beach** (middle): tiled brown tiles, shells scattered here
- **Waves** (bottom): animated wave GIF; the top edge of the GIF defines the static shore boundary

Hard walls on all four sides — player cannot leave the map.

## Assets

| Asset | Description |
|---|---|
| Wave GIF | Animated ocean at bottom; top edge used as shore collision curve |
| Beach tiles | Rectangular brown tiles for sand zone |
| Grass tiles | Rectangular green tiles for grass zone |
| Character sprite | Single sprite; shell overlaid on top when held |
| Shell sprites | Multiple variants, scattered on sand |
| Tree sprites | Placed on grass; solid collision obstacles |

## Player Movement

360° free movement with variable velocity, driven by a virtual joystick (on-screen, bottom-left corner). Joystick displacement from center maps linearly to movement speed. Player collides with map edges and tree sprites.

## Game Loop

1. Shells spawn randomly on the sand at scene start
2. Player walks over a shell → picks it up (shell disappears from world, shell sprite renders on top of character)
3. Player can only hold one shell at a time; walking over another shell while holding does nothing
4. Player walks into the wave zone (crosses the shore boundary) → shell is released
5. Released shell plays a float-and-drift animation, moving downward into the waves and off screen
6. Player is free again to pick up another shell

## Shore Boundary

The boundary between sand and waves is a static irregular curve, traced from the top edge of the wave GIF. Implemented as a Phaser polygon collider or a per-x-coordinate height map sampled at scene load. When the player's feet cross below this curve, the shell release triggers.

## Tech Stack

- **Phaser 3** — game engine (sprites, physics, scene management)
- **Vite** — bundler; outputs static files loadable by Chrome extension
- **nipplejs** — virtual joystick library
- **Chrome Extension (Manifest V3)** — popup hosts the game; future versions will accept cross-tab input via `chrome.runtime` messaging

## Future: Cross-Tab Controls

The virtual joystick will eventually be replaced by input forwarded from a content script running on another tab. The game will expose a `receiveJoystickInput({ angle, magnitude })` interface so the input source can be swapped without touching game logic.

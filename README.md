# Airplane

![Airplane](docs/promo.png)

A Chrome extension that connects a beach creature to live flight data from [OpenSky Network](https://map.opensky-network.org). Click a flight on the map and the creature moves at that flight's speed and direction. Collect and release shells into the ocean.

## How it works

1. Open [map.opensky-network.org](https://map.opensky-network.org)
2. Click the Airplane extension icon to open the game
3. Click any flight on the map — the creature starts moving in that flight's direction at a scaled version of its real speed
4. Walk to the shoreline to release a held shell into the waves
5. Click a different flight to change course

## Development

```bash
npm install
npm run build
```

Load `dist/` as an unpacked extension in `chrome://extensions`.

For local dev with WASD controls, open `popup.html?dev` via Vite:

```bash
npm run dev
```

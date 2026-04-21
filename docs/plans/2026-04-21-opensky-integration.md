# OpenSky Integration Plan

**Goal:** Connect the beach game to live flight data from map.opensky-network.org. When the user clicks a flight in the OpenSky map, the beach creature moves in the direction and at the speed of that flight. When all shells are released, an end screen shows a log of all flights observed during the session.

**Architecture:** Chrome extension content script on opensky watches for flight selection and position pings, sends messages to the popup via `chrome.runtime.sendMessage`. The popup maintains an in-memory flight event store and drives the Phaser character from the latest speed/track values.

---

## Data Flow

```
opensky page (content.js)
  → MutationObserver on #selected_position
  → chrome.runtime.sendMessage({ type, icao, speedKt, trackDeg, ... })
    → main.js listener
      → events.ts (flight store)
      → flightState (shared object)
        → MainScene.update() → player velocity
```

---

## Event Store Schema (`src/events.ts`)

```ts
type PositionUpdate = {
  timestamp: number;
  speedKt: number;
  trackDeg: number;   // compass: 0=N, 90=E, 180=S, 270=W
  lat: number;
  lon: number;
};

type Flight = {
  icao: string;
  startedAt: number;
  endedAt: number | null;   // null = still active
  aircraftType: string | null;  // e.g. "BOEING 757-200", null if n/a
  registration: string | null;  // e.g. "N12345"
  country: string | null;
  route: string | null;         // e.g. "LGA-IAH"
  updates: PositionUpdate[];
};

export const flights: Flight[] = [];
```

Helpers: `startFlight()`, `addUpdate()`, `endFlight()`, `latestUpdate()`.
`n/a` values from opensky are normalized to `null` on ingestion.

---

## Speed Mapping

`mappedSpeed = speedKt * (480 / 250)`

- 250 kt → 480 px/s (current WASD feel)
- 500 kt → 960 px/s (noticeably faster)
- 100 kt → 192 px/s (slow prop plane)

Track → velocity:
```js
const rad = (trackDeg * Math.PI) / 180;
vx = Math.sin(rad) * mappedSpeed;   // E positive
vy = -Math.cos(rad) * mappedSpeed;  // N negative (screen coords)
```

---

> **Note for implementer:** Tasks 1–4 are already written and committed to `main`. Do not rewrite them — start from Task 5.

## Task 1: Event Store ✅

**File:** `src/events.ts`

Already implemented. Covers `startFlight`, `addUpdate`, `endFlight`, `latestUpdate`, and `nullIfBlank` normalization.

---

## Task 2: Content Script ✅

**File:** `src/content.js`

Already implemented. Covers:
- MutationObserver on `#selected_position`
- URL watch for `?icao=` (popstate + title observer fallback)
- Scrapes speed, track, position on each position ping
- Scrapes aircraft type, registration, country, route on flight select
- Retry loop to attach observer once DOM is ready

---

## Task 3: Message Wiring ✅

**File:** `src/main.js`

Already implemented. `chrome.runtime.onMessage` listener updates `flightState` and calls event store. `DEV_MODE` flag enabled via `?dev` URL param.

---

## Task 4: Game Integration ✅

**File:** `src/scenes/MainScene.js`

Already implemented. `update()` drives player velocity from `flightState.speedKt` and `flightState.trackDeg`. WASD only active in `DEV_MODE`.

---

## Task 5: Vite Config — Content Script Bundle

**File:** `vite.config.js`

The content script needs to be bundled separately (no ES module imports in content scripts — Chrome injects them as plain scripts).

```js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        content: resolve(__dirname, 'src/content.js'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'content' ? 'content.js' : 'assets/[name]-[hash].js',
      },
    },
  },
});
```

Update `manifest.json` to point at `content.js` in the built output:
```json
"content_scripts": [{
  "matches": ["https://map.opensky-network.org/*"],
  "js": ["content.js"]
}]
```

---

## Task 6: Build and Test on OpenSky

```bash
npm run build
```

Load `dist/` as unpacked extension in `chrome://extensions`.

1. Open map.opensky-network.org
2. Open popup (click extension icon)
3. Click a flight on the map
4. Verify creature starts moving in the flight's direction
5. Click a different flight — direction/speed should update live
6. Click away (deselect) — creature should stop

**Tune speed mapping** if needed — edit `SPEED_SCALE` in `MainScene.js`.

---

## Task 7: End Screen Overlay

**File:** `src/overlay.js` (new), `popup.html`

Triggered when all shells have been released (tracked in `MainScene`).

### HTML structure (injected over canvas)

```html
<div id="end-screen" style="display:none">
  <h1>Shells released</h1>
  <div id="flight-log"></div>
</div>
```

### Flight log entry per flight

```
AA 737 MAX  |  N12345  |  LGA → IAH
00:04:32    |  avg 487 kt  |  🇺🇸
```

### `src/overlay.js`

```js
import { flights } from './events.ts';

export function showEndScreen() {
  const el = document.getElementById('end-screen');
  const log = document.getElementById('flight-log');

  for (const flight of flights) {
    const duration = formatDuration(
      (flight.endedAt ?? Date.now()) - flight.startedAt
    );
    const avgSpeed = avgKt(flight.updates);
    log.innerHTML += renderFlight(flight, duration, avgSpeed);
  }

  el.style.display = 'flex';
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function avgKt(updates) {
  if (!updates.length) return null;
  return Math.round(updates.reduce((s, u) => s + u.speedKt, 0) / updates.length);
}

function renderFlight(f, duration, avgSpeed) {
  const type = f.aircraftType ?? f.icao;
  const reg  = f.registration ? `· ${f.registration}` : '';
  const route = f.route ?? '—';
  const speed = avgSpeed ? `${avgSpeed} kt avg` : '';
  return `<div class="flight-entry">
    <span class="type">${type} ${reg}</span>
    <span class="route">${route}</span>
    <span class="meta">${duration} · ${speed}</span>
  </div>`;
}
```

### Trigger in MainScene

When the last shell is released:
```js
import { showEndScreen } from '../overlay.js';

// In releaseShell(), after animation starts:
if (this.shells.countActive() === 0 && !this.heldShell) {
  this.time.delayedCall(2000, showEndScreen);
}
```

---

## Task 8: Commit and Ship

```bash
git add .
git commit -m "feat: opensky flight integration + end screen"
```

Rebuild, reload extension, test full flow end-to-end.

---

## Open Questions / Later

- **Shell respawn:** Does the game reset after end screen, or is it one-session-only?
- **Route parsing:** `selected_route` may be blank for many flights. Fallback to just icao + type.
- **Speed cap:** Should very fast military/test aircraft be capped so the creature doesn't fly off screen?
- **Position trail:** Could visualize the flight path on the end screen using the lat/lon updates.

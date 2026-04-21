import { flights } from './events.ts';

export function showEndScreen() {
  const el = document.getElementById('end-screen');
  const log = document.getElementById('flight-log');

  const lines = ['> session complete', ''];

  for (const flight of flights) {
    const id = flight.registration ?? flight.icao;
    const route = flight.route ?? 'n/a';
    const type = flight.aircraftType ?? flight.typedesc ?? 'unknown';
    const duration = formatDuration((flight.endedAt ?? Date.now()) - flight.startedAt);
    const avg = avgKt(flight.updates);
    const speed = avg ? `${avg} kt avg` : 'no speed data';

    lines.push(`  ${id}  |  ${route}  |  ${type}`);
    lines.push(`  ${duration}  |  ${speed}`);
    lines.push('');
  }

  log.textContent = lines.join('\n');
  el.style.display = 'flex';
}

export function hideEndScreen() {
  document.getElementById('end-screen').style.display = 'none';
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

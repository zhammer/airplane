// Content script for map.opensky-network.org
// Watches for flight selection/deselection and position updates.

function getText(id) {
  return document.getElementById(id)?.textContent?.trim() ?? null;
}

function parseSpeed(raw) {
  // "271 kt" → 271
  const m = raw?.match(/([\d.]+)\s*kt/);
  return m ? parseFloat(m[1]) : null;
}

function parseTrack(raw) {
  // "237.8°" → 237.8
  const m = raw?.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

function parsePosition(raw) {
  // "39.707°, -77.177°" → { lat, lon }
  const m = raw?.match(/([-\d.]+)°,\s*([-\d.]+)°/);
  return m ? { lat: parseFloat(m[1]), lon: parseFloat(m[2]) } : null;
}

function getIcaoFromUrl() {
  return new URLSearchParams(window.location.search).get('icao');
}

function sendMessage(msg) {
  chrome.runtime.sendMessage(msg);
}

let currentIcao = null;

function onPositionUpdate() {
  const icao = getIcaoFromUrl();
  if (!icao) return;

  const speedRaw = getText('selected_speed1');
  const trackRaw = getText('selected_track1');
  const posRaw   = getText('selected_position');

  const speedKt  = parseSpeed(speedRaw);
  const trackDeg = parseTrack(trackRaw);
  const pos      = parsePosition(posRaw);

  if (speedKt === null || trackDeg === null || !pos) return;

  sendMessage({
    type: 'position_update',
    icao,
    speedKt,
    trackDeg,
    lat: pos.lat,
    lon: pos.lon,
  });
}

function onFlightSelected(icao) {
  currentIcao = icao;
  sendMessage({
    type: 'flight_selected',
    icao,
    typedesc:     getText('selected_typedesc'),
    aircraftType: getText('selected_typelong'),
    registration: getText('selected_registration'),
    country:      getText('selected_country'),
    route:        getText('selected_route'),
  });
}

function onFlightDeselected() {
  if (currentIcao) {
    sendMessage({ type: 'flight_deselected', icao: currentIcao });
    currentIcao = null;
  }
}

// Watch URL for icao changes (opensky uses pushState navigation)
let lastIcao = getIcaoFromUrl();

function checkIcao() {
  const icao = getIcaoFromUrl();
  if (icao === lastIcao) return;
  lastIcao = icao;
  if (icao) onFlightSelected(icao);
  else onFlightDeselected();
}

const urlObserver = new MutationObserver(checkIcao);
urlObserver.observe(document.querySelector('title') ?? document.head, { subtree: true, characterData: true, childList: true });

// Also catch popstate (back/forward)
window.addEventListener('popstate', checkIcao);

// Watch #selected_position for position pings
function attachPositionObserver() {
  const el = document.getElementById('selected_position');
  if (!el) return false;
  const obs = new MutationObserver(onPositionUpdate);
  obs.observe(el, { characterData: true, childList: true, subtree: true });
  return true;
}

// Retry until the element exists (page may not be fully rendered yet)
if (!attachPositionObserver()) {
  const retry = setInterval(() => {
    if (attachPositionObserver()) clearInterval(retry);
  }, 500);
}

// Fire immediately if a flight is already selected on load
if (lastIcao) onFlightSelected(lastIcao);

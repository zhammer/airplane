import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene.js';
import { startFlight, addUpdate, endFlight } from './events.ts';

// Shared flight state readable by the scene
export const flightState = {
  speedKt: 0,
  trackDeg: 0,
  active: false,
};

const DEV_MODE = new URLSearchParams(window.location.search).has('dev');
export { DEV_MODE };


// Receive messages from the content script
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'flight_selected') {
      startFlight(msg.icao, msg.typedesc, msg.aircraftType, msg.registration, msg.country, msg.route);
      flightState.active = true;
    } else if (msg.type === 'position_update') {
      addUpdate({ speedKt: msg.speedKt, trackDeg: msg.trackDeg, lat: msg.lat, lon: msg.lon });
      flightState.speedKt = msg.speedKt;
      flightState.trackDeg = msg.trackDeg;
    } else if (msg.type === 'flight_deselected') {
      endFlight();
      flightState.active = false;
      flightState.speedKt = 0;
    }
  });
}

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

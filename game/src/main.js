// main.js — VELMARA: Streets of Gold. Boots the game, owns the shared
// state, runs the loop, and wires the menus, the save and the screenshot
// scenes together. Every other module works on the state object S.
import { WORLD_SEED, START_CASH, START_AMMO, INTRO_TEXT, CONTROLS_TEXT, LANDMARKS } from './config.js';
import { makeRng } from './random.js';
import { genCity } from './city.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { spawnPeds, updatePeds } from './peds.js';
import { spawnTrafficCars, spawnParkedCars, updateTraffic, updatePlayerCar, collideCars, autoDrive } from './vehicles.js';
import { updatePolice } from './police.js';
import { updatePlayer, spawnPickups, saveGame, loadSave, hasSave } from './player.js';
import { newMissionState, updateMission, missionMarker, missionObjectiveText, startMission } from './missions.js';
import { buildHud, updateHud, showScreen } from './hud.js';
import { drawWorld, drawActors, drawLighting, drawEdgeArrow, updateCamera } from './render.js';
import { applyShot } from './shots.js';

window.__gameError = null;
window.addEventListener('error', (e) => { window.__gameError = String(e.message || e.error); });

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const S = {
  canvas, ctx,
  vw: window.innerWidth, vh: window.innerHeight,
  mode: 'title',
  shot: 0, shotAuto: null,
  now: 0,
  timeMin: 8 * 60, day: 1,
  cam: { x: 560, y: 480, zoom: 1, shake: 0 },
  shake: 0, damageFlash: 0, muzzle: 0,
  player: {
    x: 560, y: 480, angle: 0, hp: 100, weapon: 'fists', ammo: START_AMMO,
    cash: START_CASH, car: null, cooldown: 0, walkPhase: 0, moving: false,
    lastDamageT: 99,
  },
  cars: [], peds: [], footCops: [], bullets: [], particles: [], skids: [],
  pickups: [],
  heat: 0, stars: 0, lastCrimeT: 99, nearestCopDist: null,
  mission: newMissionState(),
  city: null, rng: makeRng(WORLD_SEED),
  audio: createAudio(),
  input: createInput(canvas),
  bannerText: '', bannerT: 0,
  subtitleText: '', subtitleT: 0,
  toastText: '', toastT: 0,
  hintText: CONTROLS_TEXT,
  attractT: 0,
  saveGame: null,
  missionMarker: null, missionObjective: null,
};

S.banner = (text, secs) => { S.bannerText = text; S.bannerT = secs; };
S.subtitle = (text, secs) => { S.subtitleText = text; S.subtitleT = secs; };
S.toast = (text, secs) => { S.toastText = text; S.toastT = secs; };
S.saveGame = () => saveGame(S);
S.missionMarker = () => missionMarker(S);
S.missionObjective = () => missionObjectiveText(S);

function buildWorld() {
  S.city = genCity();
  S.rng = makeRng(WORLD_SEED);
  S.peds = spawnPeds(S.city, WORLD_SEED);
  S.cars = [];
  S.cars.push(...spawnTrafficCars(S));
  S.cars.push(...spawnParkedCars(S));
  S.pickups = spawnPickups();
  S.footCops = [];
  S.bullets = [];
  S.particles = [];
  S.skids = [];
}

function resetPlayer(x, y) {
  const P = S.player;
  P.x = x; P.y = y; P.angle = 0;
  P.hp = 100; P.weapon = 'fists'; P.ammo = START_AMMO;
  P.cash = START_CASH; P.car = null; P.cooldown = 0;
  P.lastDamageT = 99;
  S.heat = 0; S.stars = 0; S.lastCrimeT = 99;
  S.mission = newMissionState();
}

function newGame() {
  buildWorld();
  resetPlayer(LANDMARKS.safehouse.x, LANDMARKS.safehouse.y);
  S.timeMin = 8 * 60; S.day = 1;
  S.mode = 'play';
  showScreen(S, null);
  S.subtitle('Riko Vale is back in Velmara. The Courier job is waiting at Mercado Viejo.', 6);
  S.mission.nextT = 1.5;
  S.audio.init();
  S.saveGame();
}

function continueGame() {
  const save = loadSave();
  buildWorld();
  resetPlayer(LANDMARKS.safehouse.x, LANDMARKS.safehouse.y);
  if (save) {
    S.player.cash = save.cash;
    S.player.x = save.x; S.player.y = save.y;
    S.player.hp = save.hp; S.player.ammo = save.ammo;
    S.timeMin = (save.hour || 8) * 60; S.day = save.day || 1;
    if (save.mission > 0 && save.mission < 5) {
      S.mission.idx = save.mission;
      S.mission.nextT = 1;
    }
  }
  S.mode = 'play';
  showScreen(S, null);
  S.audio.init();
}

function retryAfterEnd() {
  S.player.hp = 100;
  S.player.lastDamageT = 99;
  S.mode = 'play';
  showScreen(S, null);
  S.saveGame();
}

function quitToTitle() {
  S.mode = 'title';
  S.saveGame();
  showScreen(S, 'title');
}

function wireUi() {
  const story = document.querySelector('#title-screen .story');
  if (story) story.textContent = INTRO_TEXT;
  for (const el of document.querySelectorAll('#title-screen .controls, #pause-screen .controls')) {
    el.textContent = CONTROLS_TEXT;
  }
  const btnNew = document.getElementById('btn-new');
  if (btnNew) btnNew.addEventListener('click', () => { S.audio.init(); newGame(); });
  const btnContinue = document.getElementById('btn-continue');
  if (btnContinue) {
    btnContinue.disabled = !hasSave();
    btnContinue.addEventListener('click', () => { S.audio.init(); continueGame(); });
  }
  const btnSound = document.getElementById('btn-sound');
  if (btnSound) btnSound.addEventListener('click', () => {
    S.audio.init();
    S.audio.setMuted(!S.audio.muted);
    btnSound.textContent = 'SOUND: ' + (S.audio.muted ? 'OFF' : 'ON');
  });
  const btnResume = document.getElementById('btn-resume');
  if (btnResume) btnResume.addEventListener('click', () => { S.mode = 'play'; showScreen(S, null); });
  const btnSave = document.getElementById('btn-save');
  if (btnSave) btnSave.addEventListener('click', () => { S.saveGame(); S.toast('Game saved', 2); });
  const btnQuit = document.getElementById('btn-quit');
  if (btnQuit) btnQuit.addEventListener('click', quitToTitle);
  const btnRetry = document.getElementById('btn-retry');
  if (btnRetry) btnRetry.addEventListener('click', retryAfterEnd);
  const btnEndTitle = document.getElementById('btn-end-title');
  if (btnEndTitle) btnEndTitle.addEventListener('click', quitToTitle);
}

function onKey(code) {
  if (code === 'KeyM') {
    S.audio.init();
    S.audio.setMuted(!S.audio.muted);
    const b = document.getElementById('btn-sound');
    if (b) b.textContent = 'SOUND: ' + (S.audio.muted ? 'OFF' : 'ON');
  }
  if (code === 'KeyP' || code === 'Escape') {
    if (S.mode === 'play') { S.mode = 'pause'; showScreen(S, 'pause'); }
    else if (S.mode === 'pause') { S.mode = 'play'; showScreen(S, null); }
  }
  if (code === 'Enter' && S.mode === 'title') newGame();
}

function update(dt) {
  S.now += dt;
  S.timeMin += dt; // 1 real second = 1 game minute
  if (S.timeMin >= 24 * 60) { S.timeMin -= 24 * 60; S.day++; }
  S.bannerT = Math.max(0, S.bannerT - dt);
  S.subtitleT = Math.max(0, S.subtitleT - dt);
  S.toastT = Math.max(0, S.toastT - dt);
  S.muzzle = Math.max(0, S.muzzle - dt);
  // Particles.
  for (const pt of S.particles) {
    pt.life -= dt;
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vy += 60 * dt;
  }
  S.particles = S.particles.filter((p) => p.life > 0);
  for (const s of S.skids) s.life -= dt;
  S.skids = S.skids.filter((s) => s.life > 0);
  if (S.mode === 'title') {
    // Attract mode: the camera drifts over the city while life goes on.
    S.attractT += dt;
    S.cam.x = 1800 + Math.cos(S.attractT * 0.07) * 900;
    S.cam.y = 1100 + Math.sin(S.attractT * 0.05) * 500;
    S.cam.zoom = 0.62;
    updatePeds(S, dt);
    updateTraffic(S, dt);
    return;
  }
  if (S.mode !== 'play') {
    // End screens: show once when the mode flips to wasted/busted.
    if (S.mode === 'wasted' || S.mode === 'busted') {
      const endTitle = document.getElementById('end-title');
      const endText = document.getElementById('end-text');
      if (endTitle) endTitle.textContent = S.mode === 'wasted' ? 'WASTED' : 'BUSTED';
      if (endText) endText.textContent = S.mode === 'wasted'
        ? 'Riko lost $100 and woke up at Clinica Sol.'
        : 'The patrols took Riko in — $150 fine, back at the safehouse.';
      showScreen(S, 'end');
    }
    return;
  }
  if (S.shotAuto && S.player.car) {
    autoDrive(S, S.player.car, S.shotAuto.x, S.shotAuto.y, dt);
  } else {
    updatePlayer(S, dt);
    if (S.player.car && !S.player.car.dead) updatePlayerCar(S, dt);
  }
  updateTraffic(S, dt);
  updatePeds(S, dt);
  updatePolice(S, dt);
  updateMission(S, dt);
  collideCars(S, dt);
  updateCamera(S, dt);
  // Engine and siren follow the world.
  const spd = S.player.car ? Math.abs(S.player.car.speed) / S.player.car.model.top : 0;
  S.audio.engine(S.player.car ? spd : 0);
  S.audio.siren(S.nearestCopDist);
}

function render() {
  S.vw = window.innerWidth; S.vh = window.innerHeight;
  const shakeX = S.shake > 0 ? (Math.random() - 0.5) * S.shake : 0;
  const shakeY = S.shake > 0 ? (Math.random() - 0.5) * S.shake : 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, S.vw, S.vh);
  ctx.setTransform(S.cam.zoom, 0, 0, S.cam.zoom, S.vw / 2 - (S.cam.x + shakeX) * S.cam.zoom, S.vh / 2 - (S.cam.y + shakeY) * S.cam.zoom);
  drawWorld(S);
  drawActors(S);
  drawEdgeArrow(S);
  drawLighting(S);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

let lastT = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;
  try { update(dt); } catch (e) { window.__gameError = String(e && e.message || e); }
  try { render(); } catch (e) { window.__gameError = String(e && e.message || e); }
  if (S.mode === 'play' || S.mode === 'title') updateHud(S);
  S.input.endFrame();
  requestAnimationFrame(loop);
}

window.__gameState = function gameState() {
  return {
    mode: S.mode, shot: S.shot,
    x: Math.round(S.player.x), y: Math.round(S.player.y),
    hp: Math.round(S.player.hp), cash: S.player.cash, ammo: S.player.ammo,
    stars: S.stars, heat: Math.round(S.heat),
    mission: S.mission.idx, missionStep: S.mission.step,
    inCar: !!S.player.car,
    carHealth: S.player.car ? Math.round(S.player.car.health) : null,
    cars: S.cars.filter((c) => !c.dead).length,
    peds: S.peds.length,
    cops: S.cars.filter((c) => c.driver === 'police' && !c.dead).length,
    footCops: S.footCops.length,
    time: Math.floor(S.timeMin / 60) + ':' + String(Math.floor(S.timeMin % 60)).padStart(2, '0'),
    error: window.__gameError,
  };
};

// Boot.
buildWorld();
buildHud(S);
wireUi();
S.input.attach(onKey);
window.__velmara = S; // test hook for the CDP play-test (teleports, state)
showScreen(S, 'title');
const params = new URLSearchParams(window.location.search);
const shotN = parseInt(params.get('shot') || '0', 10);
if (shotN >= 1 && shotN <= 4) {
  buildWorld();
  resetPlayer(LANDMARKS.safehouse.x, LANDMARKS.safehouse.y);
  applyShot(S, shotN);
  showScreen(S, null);
}
requestAnimationFrame(loop);

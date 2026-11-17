// missions.js — the story of Riko Vale: five chained missions, then taxi
// fares forever. Each step has a map marker, a beacon and an edge arrow;
// the subtitle tells the story as it happens.
import { MISSIONS, TAXI_FARES, MARINA_CAR, LANDMARKS } from './config.js';
import { dist } from './random.js';
import { makeCar } from './vehicles.js';
import { addCrime } from './peds.js';

export function newMissionState() {
  return { idx: 0, step: 0, timer: 0, active: false, holdT: 0, nextT: 0, failed: false, fare: null, fareCooldown: 0 };
}

export function currentMission(S) {
  return S.mission.idx < MISSIONS.length ? MISSIONS[S.mission.idx] : null;
}

export function startMission(S, idx) {
  const M = MISSIONS[idx];
  if (!M) return;
  S.mission.idx = idx;
  S.mission.step = 0;
  S.mission.timer = M.timer;
  S.mission.active = true;
  S.mission.holdT = 0;
  S.mission.failed = false;
  S.subtitle(M.title + ' — ' + M.intro, 6);
  S.audio.init();
  if (idx === 1) spawnMissionCar(S);
  if (S.saveGame) S.saveGame();
}

function spawnMissionCar(S) {
  // The gold Aurea GT must already be waiting at the marina when mission 2
  // starts — spawn it here, not at world build.
  for (const c of S.cars) if (c.missionCar) return;
  const car = makeCar('aurea', MARINA_CAR.x, MARINA_CAR.y, Math.PI / 2, 'parked', '#e8b820');
  car.missionCar = true;
  S.cars.push(car);
}

export function currentStep(S) {
  const M = currentMission(S);
  if (!M || !S.mission.active) return null;
  return M.steps[S.mission.step] || null;
}

export function missionMarker(S) {
  const step = currentStep(S);
  if (step) return { x: step.x, y: step.y, label: step.label };
  const f = S.mission.fare;
  if (f) return { x: f.state === 'pickup' ? f.px : f.dx, y: f.state === 'pickup' ? f.py : f.dy, label: f.state === 'pickup' ? 'Pick up the fare' : 'Drop off the fare ($' + f.pay + ')' };
  return null;
}

export function missionObjectiveText(S) {
  const M = currentMission(S);
  if (M && S.mission.active) {
    const step = currentStep(S);
    return { title: M.title, text: step ? step.label : '', timer: S.mission.timer };
  }
  if (S.mission.fare) {
    const f = S.mission.fare;
    return { title: 'Taxi Fare', text: f.state === 'pickup' ? 'Pick up the passenger' : 'Drop off the passenger — $' + f.pay, timer: 0 };
  }
  if (S.mission.idx >= MISSIONS.length) return { title: 'Velmara', text: 'Story complete — drive a taxi, explore the city', timer: 0 };
  return { title: 'Velmara', text: 'Head to the marker to start the next job', timer: 0 };
}

export function updateMission(S, dt) {
  const M = S.mission;
  // After the story: taxi fares.
  if (M.idx >= MISSIONS.length) { updateFare(S, dt); return; }
  if (!M.active) {
    M.nextT -= dt;
    if (M.nextT <= 0) {
      if (M.failed) { M.failed = false; startMission(S, M.idx); }
      else startMission(S, M.idx);
    }
    return;
  }
  const def = MISSIONS[M.idx];
  if (def.timer > 0) {
    M.timer -= dt;
    if (M.timer <= 0) { failMission(S, 'Out of time'); return; }
  }
  const step = def.steps[M.step];
  if (!step) { completeMission(S); return; }
  // Mission 5, gold run: the heat stays at 3 stars for the whole delivery.
  if (M.idx === 4 && M.step === 1) {
    S.heat = Math.max(S.heat, 41);
    S.stars = Math.max(S.stars, 3);
  }
  const P = S.player;
  const d = dist(P.x, P.y, step.x, step.y);
  if (step.kind === 'steal') {
    if (P.car && P.car.missionCar) { advanceStep(S); return; }
    return;
  }
  if (step.kind === 'escape') {
    M.escapeT -= dt;
    // The timer running out does NOT fail the step — the contact covers us.
    if (S.stars === 0 || M.escapeT <= 0) {
      S.heat = 0; S.stars = 0;
      advanceStep(S);
    }
    return;
  }
  if (step.kind === 'collect') {
    if (d < 48) {
      M.holdT += dt;
      if (M.holdT >= 2) { M.holdT = 0; advanceStep(S); }
    } else M.holdT = 0;
    return;
  }
  if (d < 46) {
    if (step.kind === 'pickup' && M.idx === 4 && M.step === 0) {
      S.heat = 60; S.stars = 3; S.lastCrimeT = 0;
    }
    if (step.kind === 'goto' && M.idx === 2 && M.step === 0) {
      S.heat = 40; S.stars = 2; S.lastCrimeT = 0;
      S.subtitle('Contact: "Patrols are coming. Run — lose them and you are free."', 5);
    }
    if (step.kind === 'deliver' && M.idx === 1) {
      if (!P.car || !P.car.missionCar) return; // must bring the gold car itself
    }
    advanceStep(S);
  }
}

export function advanceStep(S) {
  const M = S.mission;
  M.step++;
  M.holdT = 0;
  const def = MISSIONS[M.idx];
  const next = def.steps[M.step];
  if (!next) { completeMission(S); return; }
  if (next.kind === 'escape') M.escapeT = next.timer || 45;
  S.audio.blip(990, 0.12, 'sine', 0.12);
  if (S.saveGame) S.saveGame();
}

export function completeMission(S) {
  const M = S.mission;
  const def = MISSIONS[M.idx];
  S.player.cash += def.reward;
  S.banner('MISSION PASSED  +$' + def.reward, 3);
  S.audio.pass();
  S.subtitle('"' + def.title + '" done. Riko pockets $' + def.reward + '.', 4);
  M.idx++;
  M.step = 0;
  M.active = false;
  M.nextT = 2.5;
  if (S.saveGame) S.saveGame();
}

export function failMission(S, why) {
  const M = S.mission;
  S.banner('MISSION FAILED — ' + why, 3);
  S.audio.fail();
  M.active = false;
  M.failed = true;
  M.nextT = 3;
  S.heat = Math.max(0, S.heat - 20);
  S.stars = Math.min(5, Math.ceil(S.heat / 20));
}

// --- taxi fares (after the story) ------------------------------------------
const FARE_SPOTS = [
  { x: 560, y: 480 }, { x: 880, y: 760 }, { x: 1840, y: 1040 },
  { x: 3120, y: 1320 }, { x: 2880, y: 2240 }, { x: 1520, y: 1320 },
  { x: 560, y: 1040 }, { x: 2160, y: 760 }, { x: 2800, y: 1600 },
  { x: 2480, y: 1880 }, { x: 1200, y: 200 }, { x: 880, y: 1880 },
];

export function updateFare(S, dt) {
  const M = S.mission;
  if (!M.fare) {
    M.fareCooldown -= dt;
    if (M.fareCooldown > 0) return;
    const a = FARE_SPOTS[Math.floor(Math.random() * FARE_SPOTS.length)];
    let b = FARE_SPOTS[Math.floor(Math.random() * FARE_SPOTS.length)];
    if (dist(a.x, a.y, b.x, b.y) < 500) b = FARE_SPOTS[(FARE_SPOTS.indexOf(a) + 5) % FARE_SPOTS.length];
    M.fare = {
      px: a.x, py: a.y, dx: b.x, dy: b.y,
      pay: TAXI_FARES[Math.floor(Math.random() * TAXI_FARES.length)],
      state: 'pickup',
    };
    S.toast('Taxi fare waiting — pick up the passenger', 3);
    return;
  }
  const f = M.fare;
  const tx = f.state === 'pickup' ? f.px : f.dx;
  const ty = f.state === 'pickup' ? f.py : f.dy;
  if (dist(S.player.x, S.player.y, tx, ty) < 48) {
    if (f.state === 'pickup') {
      f.state = 'dropoff';
      S.subtitle('Passenger: "Take me there — and step on it."', 3);
      S.audio.blip(990, 0.12, 'sine', 0.12);
    } else {
      S.player.cash += f.pay;
      S.banner('FARE COMPLETE  +$' + f.pay, 2);
      S.audio.pass();
      M.fare = null;
      M.fareCooldown = 4;
      if (S.saveGame) S.saveGame();
    }
  }
}

export function debugSetMission(S, idx, step) {
  // Used by shot mode and tests to jump straight into a mission beat.
  startMission(S, idx);
  S.mission.step = step || 0;
  const def = MISSIONS[idx];
  const st = def.steps[S.mission.step];
  if (st && st.kind === 'escape') S.mission.escapeT = st.timer || 45;
  if (idx === 1 && S.mission.step >= 1) spawnMissionCar(S);
}

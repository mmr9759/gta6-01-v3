// peds.js — the 26 pedestrians of Velmara. They stroll the sidewalks, cross
// at corners, and run when they hear a shot or a car comes at them.
import { AVENUES, STREETS, ROAD_W, ROAD_H, SIDEWALK } from './config.js';
import { makeRng } from './random.js';
import { circleHitsWorld } from './city.js';
import { clamp, dist } from './random.js';

const SKINS = ['#e8b88a', '#c89068', '#8a5a3a', '#f0c8a0', '#6a4530'];
const SHIRTS = ['#d84a4a', '#4a7ad8', '#e8b820', '#5ab87a', '#8a5ad8', '#e0e0e0', '#d88a4a', '#3a9a8a'];
const PANTS = ['#2a2a3a', '#3a3a4a', '#5a4a3a', '#2a4a3a', '#4a4a5a'];

export function spawnPeds(city, seed) {
  const rng = makeRng(seed + 7);
  const peds = [];
  for (let i = 0; i < 26; i++) {
    // Start on a sidewalk edge: just outside a road band.
    let x, y, tries = 0;
    do {
      if (rng.chance(0.5)) {
        x = rng.pick(AVENUES) + rng.range(-ROAD_W / 2 - SIDEWALK, ROAD_W / 2 + SIDEWALK);
        y = rng.range(60, 2320);
      } else {
        x = rng.range(60, 3540);
        y = rng.pick(STREETS) + rng.range(-ROAD_H / 2 - SIDEWALK, ROAD_H / 2 + SIDEWALK);
      }
      tries++;
    } while (tries < 20 && (circleHitsWorld(city, x, y, 10) || y > 2360));
    peds.push({
      x, y, angle: rng.range(0, Math.PI * 2),
      speed: rng.range(38, 62), skin: rng.pick(SKINS),
      shirt: rng.pick(SHIRTS), pants: rng.pick(PANTS),
      walkPhase: rng.range(0, 6), flee: 0, target: null,
      retarget: rng.range(0, 4),
    });
  }
  return peds;
}

function pickSidewalkTarget(p, rng) {
  // Walk to a random nearby intersection, staying on sidewalks.
  if (rng.chance(0.5)) {
    return { x: rng.pick(AVENUES) + rng.range(-ROAD_W / 2 - 8, ROAD_W / 2 + 8), y: p.y + rng.range(-260, 260) };
  }
  return { x: p.x + rng.range(-260, 260), y: rng.pick(STREETS) + rng.range(-ROAD_H / 2 - 8, ROAD_H / 2 + 8) };
}

export function scarePeds(S, x, y, radius) {
  for (const p of S.peds) {
    if (dist(p.x, p.y, x, y) < radius) {
      p.flee = 2.5 + Math.random();
      p.angle = Math.atan2(p.y - y, p.x - x);
    }
  }
}

export function updatePeds(S, dt) {
  const rng = S.rng;
  for (const p of S.peds) {
    p.retarget -= dt;
    if (p.flee > 0) p.flee -= dt;
    if (!p.target || p.retarget <= 0 || dist(p.x, p.y, p.target.x, p.target.y) < 14) {
      p.target = pickSidewalkTarget(p, rng);
      p.retarget = rng.range(3, 7);
    }
    const sp = p.flee > 0 ? p.speed * 2.6 : p.speed;
    const want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
    let d = want - p.angle;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    p.angle += clamp(d, -2.4 * dt, 2.4 * dt);
    const nx = p.x + Math.cos(p.angle) * sp * dt;
    const ny = p.y + Math.sin(p.angle) * sp * dt;
    if (!circleHitsWorld(S.city, nx, ny, 10)) { p.x = nx; p.y = ny; }
    else { p.target = pickSidewalkTarget(p, rng); p.retarget = rng.range(2, 5); }
    p.x = clamp(p.x, 20, 3580); p.y = clamp(p.y, 20, 2360);
    p.walkPhase += dt * (p.flee > 0 ? 11 : 6);
  }
}

// A pedestrian hit by a car: knocked down, then gets up and runs.
export function knockPed(S, p) {
  p.flee = 4;
  p.knocked = 1.2;
  S.shake = Math.max(S.shake, 6);
  addCrime(S, 14, 'ped hit');
  spawnParticles(S, p.x, p.y, 8, '#e8b88a');
}

export function spawnParticles(S, x, y, n, color) {
  for (let i = 0; i < n; i++) {
    S.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160 - 40,
      life: 0.5 + Math.random() * 0.4, max: 0.9, color, size: 2 + Math.random() * 3,
    });
  }
}

export function addCrime(S, heat, why) {
  if (S.shot) return;
  S.heat = Math.min(100, S.heat + heat);
  S.lastCrimeT = 0;
  S.stars = Math.min(5, Math.ceil(S.heat / 20));
}

// police.js — Velmara's patrol. Cars chase and ram, foot officers chase on
// foot when the heat is high, arrest up close, and shoot back at 3 stars.
import { CAR_MODELS } from './config.js';
import { clamp, dist, angleDiff } from './random.js';
import { makeCar } from './vehicles.js';
import { moveCircle, nearestNode, carHitsWorld } from './city.js';
import { spawnParticles, addCrime } from './peds.js';

export function wantedCount(S) {
  return S.stars === 0 ? 0 : Math.min(1 + S.stars, 5);
}

export function spawnPatrol(S, x, y) {
  const c = makeCar('patrol', x, y, 0, 'police', '#20385a');
  c.cruise = 300;
  c.health = 100;
  S.cars.push(c);
  return c;
}

function nearestPatrol(S) {
  let best = null, bd = Infinity;
  for (const c of S.cars) {
    if (c.driver !== 'police' || c.dead) continue;
    const d = dist(c.x, c.y, S.player.x, S.player.y);
    if (d < bd) { bd = d; best = c; }
  }
  return { car: best, dist: bd };
}

export function updatePolice(S, dt) {
  // Keep the right number of patrol cars on the street.
  const want = wantedCount(S);
  let have = 0;
  for (const c of S.cars) if (c.driver === 'police' && !c.dead) have++;
  if (want > have && !S.shot) {
    const a = Math.random() * Math.PI * 2;
    spawnPatrol(S, S.player.x + Math.cos(a) * 700, S.player.y + Math.sin(a) * 700);
  }
  if (S.stars === 0) {
    // Heat gone: patrols drive off and fade.
    for (const c of S.cars) {
      if (c.driver === 'police' && !c.dead) {
        const d = dist(c.x, c.y, S.player.x, S.player.y);
        if (d > 1100) c.dead = true;
      }
    }
  }
  // Patrol cars chase the player and ram.
  for (const c of S.cars) {
    if (c.driver !== 'police' || c.dead) continue;
    const m = c.model;
    const wantA = Math.atan2(S.player.y - c.y, S.player.x - c.x);
    const diff = angleDiff(c.angle, wantA);
    c.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
    const d = dist(c.x, c.y, S.player.x, S.player.y);
    const targetSpeed = d > 260 ? m.top * 0.92 : m.top * 0.7;
    if (c.speed < targetSpeed) c.speed += m.accel * 1.15 * dt;
    else c.speed -= 200 * dt;
    const dx = Math.cos(c.angle) * c.speed * dt;
    const dy = Math.sin(c.angle) * c.speed * dt;
    const ox = c.x, oy = c.y;
    c.x += dx; c.y += dy;
    if (carHitsWorld(S.city, c)) { c.x = ox; c.y = oy; c.speed *= 0.5; }
    // Ramming the player's car hurts it; ramming the player on foot hurts them.
    if (d < 46 && Math.abs(c.speed) > 60) {
      if (S.player.car) {
        S.player.car.health -= 6 * dt;
        S.shake = Math.max(S.shake, 5);
      } else {
        hurtPlayer(S, 6 * dt, 'rammed');
      }
      c.speed *= 0.6;
    }
    if (c.health <= 0 && !c.exploded) {
      c.exploded = true; c.dead = true;
      spawnParticles(S, c.x, c.y, 22, '#ff8830');
      S.shake = Math.max(S.shake, 10);
      addCrime(S, 18, 'cop down');
    }
  }
  updateFootCops(S, dt);
  const near = nearestPatrol(S);
  S.nearestCopDist = near.car ? near.dist : null;
}

// Foot officers: spawn at 2+ stars while the player is on foot, chase,
// arrest after 1.2s up close, shoot back at 3+ stars.
export function updateFootCops(S, dt) {
  if (S.shot) return;
  const want = (S.stars >= 2 && !S.player.car) ? Math.min(S.stars - 1, 3) : 0;
  let have = 0;
  for (const f of S.footCops) if (!f.dead) have++;
  if (want > have) {
    const a = Math.random() * Math.PI * 2;
    S.footCops.push({
      x: S.player.x + Math.cos(a) * 420, y: S.player.y + Math.sin(a) * 420,
      angle: 0, hp: 50, arrestT: 0, shootT: 1 + Math.random(), dead: false,
      walkPhase: Math.random() * 6,
    });
  }
  for (const f of S.footCops) {
    if (f.dead) continue;
    const d = dist(f.x, f.y, S.player.x, S.player.y);
    if (d > 900) { f.dead = true; continue; }
    const wantA = Math.atan2(S.player.y - f.y, S.player.x - f.x);
    f.angle = wantA;
    if (d > 26) {
      const sp = 165;
      const nx = f.x + Math.cos(f.angle) * sp * dt;
      const ny = f.y + Math.sin(f.angle) * sp * dt;
      const p = moveCircle(S.city, f.x, f.y, nx - f.x, ny - f.y, 12);
      f.x = p.x; f.y = p.y;
      f.walkPhase += dt * 9;
    }
    if (d < 34) {
      f.arrestT += dt;
      if (f.arrestT > 1.2) { busted(S); return; }
    } else f.arrestT = 0;
    if (S.stars >= 3 && d < 420 && d > 60) {
      f.shootT -= dt;
      if (f.shootT <= 0) {
        f.shootT = 0.9 + Math.random() * 0.7;
        S.bullets.push({
          x: f.x, y: f.y, angle: wantA + (Math.random() - 0.5) * 0.22,
          speed: 720, life: 0.8, from: 'cop', damage: 9,
        });
        S.audio.shot();
        spawnParticles(S, f.x + Math.cos(f.angle) * 20, f.y + Math.sin(f.angle) * 20, 2, '#ffd860');
      }
    }
    if (f.hp <= 0) {
      f.dead = true;
      spawnParticles(S, f.x, f.y, 10, '#20385a');
      addCrime(S, 18, 'cop down');
    }
  }
  S.footCops = S.footCops.filter((f) => !f.dead);
}

export function hurtPlayer(S, amount, why) {
  if (S.shot || S.mode !== 'play') return;
  S.player.hp -= amount;
  S.player.lastDamageT = 0;
  S.damageFlash = Math.min(1, S.damageFlash + 0.35);
  S.shake = Math.max(S.shake, 3);
  if (S.player.hp <= 0) wasted(S);
}

export function busted(S) {
  if (S.shot || S.mode !== 'play') return;
  S.player.cash = Math.max(0, S.player.cash - 150);
  S.heat = 0; S.stars = 0;
  S.footCops = [];
  for (const c of S.cars) if (c.driver === 'police') c.dead = true;
  exitCarTo(S, 560, 480);
  S.mode = 'busted';
  S.audio.busted();
  if (S.saveGame) S.saveGame();
}

export function wasted(S) {
  if (S.shot || S.mode !== 'play') return;
  S.player.cash = Math.max(0, S.player.cash - 100);
  S.heat = Math.max(0, S.heat - 40);
  S.stars = Math.min(5, Math.ceil(S.heat / 20));
  S.footCops = [];
  exitCarTo(S, 1200, 200);
  S.mode = 'wasted';
  S.audio.fail();
  if (S.saveGame) S.saveGame();
}

function exitCarTo(S, x, y) {
  if (S.player.car) { S.player.car.driver = 'parked'; S.player.car = null; }
  S.player.x = x; S.player.y = y;
  S.player.hp = 100;
  S.player.lastDamageT = 99;
}

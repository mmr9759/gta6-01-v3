// player.js — Riko Vale on foot and behind the wheel: walking, aiming,
// shooting, stealing cars, buying ammo, pickups, health regen, the wanted
// decay, and the localStorage save.
import { WEAPONS, AMMO_PRICE, AMMO_PACK, SPRAY_PRICE, LANDMARKS } from './config.js';
import { clamp, dist, angleDiff } from './random.js';
import { moveCircle } from './city.js';
import { nearestCar } from './vehicles.js';
import { scarePeds, spawnParticles, addCrime } from './peds.js';
import { hurtPlayer } from './police.js';

export function updatePlayer(S, dt) {
  const P = S.player;
  const I = S.input;
  P.lastDamageT += dt;
  if (P.lastDamageT > 5 && P.hp < 100) P.hp = Math.min(100, P.hp + 3 * dt);
  // Wanted decay: 8s without a crime cools the heat down.
  S.lastCrimeT += dt;
  if (S.lastCrimeT > 8 && S.heat > 0) {
    S.heat = Math.max(0, S.heat - 7 * dt);
    S.stars = Math.min(5, Math.ceil(S.heat / 20));
  }
  // Weapon switch.
  if (I.pressed('Digit1')) P.weapon = 'fists';
  if (I.pressed('Digit2')) P.weapon = 'pistol';
  if (I.pressed('KeyR')) buyAmmo(S);
  if (I.pressed('KeyF')) trySpray(S);
  if (P.car) { updateInCar(S, dt); return; }
  updateOnFoot(S, dt);
  updateBullets(S, dt);
  updatePickups(S, dt);
}

function updateOnFoot(S, dt) {
  const P = S.player;
  const I = S.input;
  const wm = I.worldMouse(S.cam, S.vw, S.vh);
  P.angle = Math.atan2(wm.y - P.y, wm.x - P.x);
  const axes = I.moveAxes();
  const run = I.down('ShiftLeft') || I.down('ShiftRight');
  const speed = run ? 265 : 175;
  let dx = axes.x * speed * dt, dy = axes.y * speed * dt;
  if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
  const p = moveCircle(S.city, P.x, P.y, dx, dy, 13);
  P.moving = (p.x !== P.x || p.y !== P.y);
  P.x = p.x; P.y = p.y;
  P.walkPhase += dt * (P.moving ? (run ? 12 : 8) : 0);
  // Enter a car.
  if (I.pressed('KeyE')) {
    const car = nearestCar(S, P.x, P.y, 64, null);
    if (car) stealCar(S, car);
  }
  // Shoot / punch with the mouse.
  if (I.mouse.down) tryShoot(S, dt);
  P.cooldown -= dt;
}

export function stealCar(S, car) {
  const P = S.player;
  if (car.driver === 'traffic' || car.driver === 'parked') {
    addCrime(S, 10, 'stole car');
    S.toast('Stole a ' + car.model.name, 2);
  }
  if (car.driver === 'police') addCrime(S, 10, 'stole patrol car');
  car.driver = 'player';
  P.car = car;
  P.x = car.x; P.y = car.y;
  S.audio.init();
  if (S.onStealCar) S.onStealCar(car);
}

export function exitCar(S) {
  const P = S.player;
  const car = P.car;
  if (!car) return;
  P.car = null;
  car.driver = 'parked';
  car.speed = 0;
  // Step out to the side of the car.
  const side = { x: P.x - Math.sin(car.angle) * 30, y: P.y + Math.cos(car.angle) * 30 };
  const p = moveCircle(S.city, car.x, car.y, side.x - car.x, side.y - car.y, 13);
  P.x = p.x; P.y = p.y;
  P.angle = car.angle;
}

function updateInCar(S, dt) {
  const P = S.player;
  const I = S.input;
  // E exits the car — handled in the in-car branch, not the on-foot one.
  if (I.pressed('KeyE')) { exitCar(S); return; }
  // The car exploded under us: get out before syncing the player to it.
  if (!P.car || P.car.dead) {
    if (P.car && P.car.exploded) { P.car = null; }
    return;
  }
  // Drive-by: the pistol can be fired from the car.
  if (I.mouse.down) tryShoot(S, dt);
  P.cooldown -= dt;
  updateBullets(S, dt);
  updatePickups(S, dt);
}

function tryShoot(S, dt) {
  const P = S.player;
  if (P.cooldown > 0) return;
  const w = WEAPONS[P.weapon];
  P.cooldown = w.cooldown;
  const wm = S.input.worldMouse(S.cam, S.vw, S.vh);
  const aim = Math.atan2(wm.y - P.y, wm.x - P.x);
  if (P.weapon === 'pistol') {
    if (P.ammo <= 0) { S.audio.blip(160, 0.08, 'square', 0.08); S.toast('Out of ammo — press R to buy ($50)', 2); return; }
    P.ammo--;
    addCrime(S, 4, 'fired');
    S.audio.shot();
    S.muzzle = 0.06;
    S.bullets.push({
      x: P.x + Math.cos(aim) * 22, y: P.y + Math.sin(aim) * 22,
      angle: aim, speed: 900, life: 0.7, from: 'player', damage: w.damage,
    });
    scarePeds(S, P.x, P.y, 420);
    S.shake = Math.max(S.shake, 1.5);
  } else {
    S.audio.punch();
    // Melee: hit whatever is close in front.
    let hit = false;
    for (const f of S.footCops) {
      if (!f.dead && dist(P.x, P.y, f.x, f.y) < w.range + 14 && Math.abs(angleDiff(aim, Math.atan2(f.y - P.y, f.x - P.x))) < 0.9) {
        f.hp -= w.damage; hit = true;
        spawnParticles(S, f.x, f.y, 5, '#20385a');
      }
    }
    for (const p of S.peds) {
      if (dist(P.x, P.y, p.x, p.y) < w.range && Math.abs(angleDiff(aim, Math.atan2(p.y - P.y, p.x - P.x))) < 0.9) {
        p.flee = 3; p.knocked = 0.8; hit = true;
        spawnParticles(S, p.x, p.y, 5, '#e8b88a');
      }
    }
    if (hit) { addCrime(S, 4, 'assault'); S.shake = Math.max(S.shake, 2); }
  }
}

function buyAmmo(S) {
  const P = S.player;
  if (P.cash < AMMO_PRICE) { S.toast('Need $50 for ammo', 2); return; }
  P.cash -= AMMO_PRICE;
  P.ammo += AMMO_PACK;
  S.audio.pickup();
  S.toast('Bought ' + AMMO_PACK + ' rounds', 2);
}

function trySpray(S) {
  const P = S.player;
  const L = LANDMARKS.spray;
  if (!P.car) return;
  if (dist(P.x, P.y, L.x, L.y) > 90) return;
  if (P.cash < SPRAY_PRICE) { S.toast('Pintura Rosa needs $300', 2); return; }
  if (P.car.health >= 100 && S.stars === 0) { S.toast('Car is already clean', 2); return; }
  P.cash -= SPRAY_PRICE;
  P.car.health = 100;
  S.heat = 0; S.stars = 0;
  S.audio.pass();
  S.toast('Pintura Rosa — fresh paint, clean record', 3);
  spawnParticles(S, P.x, P.y, 16, '#ff8ac0');
}

export function updateBullets(S, dt) {
  for (const b of S.bullets) {
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    // Buildings stop bullets.
    let blocked = false;
    for (const bd of S.city.buildings) {
      if (b.x > bd.x && b.x < bd.x + bd.w && b.y > bd.y && b.y < bd.y + bd.h) { blocked = true; break; }
    }
    if (blocked) { b.life = 0; spawnParticles(S, b.x, b.y, 3, '#c8c8c8'); continue; }
    if (b.from === 'player') {
      for (const f of S.footCops) {
        if (!f.dead && dist(b.x, b.y, f.x, f.y) < 16) {
          f.hp -= b.damage; b.life = 0;
          spawnParticles(S, b.x, b.y, 5, '#c03030');
          break;
        }
      }
      if (b.life > 0) for (const c of S.cars) {
        if (!c.dead && c !== S.player.car && dist(b.x, b.y, c.x, c.y) < 30) {
          c.health -= b.damage; b.life = 0;
          spawnParticles(S, b.x, b.y, 4, '#ffb830');
          if (c.health <= 0 && c.driver === 'police' && !c.exploded) { c.exploded = true; c.dead = true; }
          break;
        }
      }
      if (b.life > 0) for (const p of S.peds) {
        if (dist(b.x, b.y, p.x, p.y) < 14) {
          p.knocked = 1.2; p.flee = 4; b.life = 0;
          spawnParticles(S, b.x, b.y, 5, '#e8b88a');
          break;
        }
      }
    } else if (b.from === 'cop') {
      if (dist(b.x, b.y, S.player.x, S.player.y) < 16) {
        b.life = 0;
        hurtPlayer(S, b.damage, 'shot');
      }
    }
  }
  S.bullets = S.bullets.filter((b) => b.life > 0);
}

export function updatePickups(S, dt) {
  for (const pk of S.pickups) {
    pk.respawn -= dt;
    if (pk.taken && pk.respawn <= 0) pk.taken = false;
    if (pk.taken) continue;
    if (dist(S.player.x, S.player.y, pk.x, pk.y) < 40) {
      if (pk.kind === 'health' && S.player.hp < 100) {
        S.player.hp = Math.min(100, S.player.hp + 40);
        S.audio.pickup();
        S.toast('Health +40', 2);
        pk.taken = true; pk.respawn = 25;
      } else if (pk.kind === 'ammo') {
        S.player.ammo += AMMO_PACK;
        S.audio.pickup();
        S.toast('Ammo +' + AMMO_PACK, 2);
        pk.taken = true; pk.respawn = 25;
      }
    }
  }
}

export function spawnPickups() {
  return [
    { kind: 'health', x: LANDMARKS.hospital.x, y: LANDMARKS.hospital.y, taken: false, respawn: 0 },
    { kind: 'ammo', x: LANDMARKS.gunshop.x, y: LANDMARKS.gunshop.y, taken: false, respawn: 0 },
  ];
}

const SAVE_KEY = 'velmara-save-v1';

export function saveGame(S) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: S.player.cash, mission: S.mission.idx,
      x: S.player.x, y: S.player.y, hp: S.player.hp, ammo: S.player.ammo,
      hour: Math.floor(S.timeMin / 60), day: S.day,
    }));
  } catch (e) { /* storage unavailable — the game still plays */ }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function hasSave() { return !!loadSave(); }

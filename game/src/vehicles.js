// vehicles.js — the cars of Velmara: the player's driving physics, the
// traffic that follows the road graph, parked cars, and car collisions.
// A car collides as two circles (front and back axle), never one big circle.
import { CAR_MODELS, CAR_COLORS, AVENUES, STREETS, ROAD_W, ROAD_H,
  WORLD_W, WORLD_H } from './config.js';
import { makeRng, clamp, dist, angleDiff } from './random.js';
import { moveCar, nearestNode, nodeNeighbors, greedyNextNode, carHitsWorld } from './city.js';
import { spawnParticles, addCrime } from './peds.js';

let nextCarId = 1;

export function makeCar(modelKey, x, y, angle, driver, color) {
  const model = CAR_MODELS[modelKey];
  return {
    id: nextCarId++, modelKey, model,
    x, y, angle, speed: 0,
    health: 100, color: color || model.color,
    driver: driver || 'traffic',
    node: -1, prevNode: -1, cruise: 130,
    brake: false, smoke: 0, dead: false, exploded: false,
    missionCar: false, steer: 0,
  };
}

export function spawnTrafficCars(S) {
  const rng = S.rng;
  const cars = [];
  const keys = ['pico', 'cometa', 'aurea', 'burro', 'taxi'];
  for (let i = 0; i < 16; i++) {
    let x, y, tries = 0;
    do {
      if (rng.chance(0.5)) { x = rng.pick(AVENUES); y = rng.range(80, 2320); }
      else { x = rng.range(80, 3520); y = rng.pick(STREETS); }
      tries++;
    } while (tries < 30 && dist(x, y, S.player.x, S.player.y) < 320);
    const angle = rng.chance(0.5) ? 0 : Math.PI / 2;
    const c = makeCar(rng.pick(keys), x, y, angle, 'traffic', rng.pick(CAR_COLORS));
    c.node = nearestNode(S.city, x, y);
    c.prevNode = c.node;
    c.cruise = rng.range(120, 185);
    c.speed = rng.range(60, 140);
    cars.push(c);
  }
  return cars;
}

export function spawnParkedCars(S) {
  // Parked on the centre line of a road, facing along it — never on a sidewalk.
  const rng = S.rng;
  const cars = [];
  const spots = [
    { x: 560, y: 200, a: 0 }, { x: 1200, y: 480, a: Math.PI / 2 },
    { x: 1840, y: 760, a: 0 }, { x: 2480, y: 1040, a: Math.PI / 2 },
    { x: 880, y: 1320, a: 0 }, { x: 3120, y: 1880, a: Math.PI / 2 },
    { x: 2160, y: 2160, a: 0 },
  ];
  const keys = ['pico', 'cometa', 'burro', 'taxi'];
  for (const s of spots) {
    const c = makeCar(rng.pick(keys), s.x, s.y, s.a, 'parked', rng.pick(CAR_COLORS));
    cars.push(c);
  }
  return cars;
}

export function nearestCar(S, x, y, maxD, exclude) {
  let best = null, bd = maxD * maxD;
  for (const c of S.cars) {
    if (c === exclude || c.dead) continue;
    const d = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// --- player driving --------------------------------------------------------
export function updatePlayerCar(S, dt) {
  const car = S.player.car;
  if (!car) return;
  const I = S.input;
  const m = car.model;
  const sand = S.city && car.y > 2280;
  const top = m.top * (sand ? 0.45 : 1);
  const forward = I.down('KeyW') || I.down('ArrowUp');
  const back = I.down('KeyS') || I.down('ArrowDown');
  const left = I.down('KeyA') || I.down('ArrowLeft');
  const right = I.down('KeyD') || I.down('ArrowRight');
  const handbrake = I.down('ShiftLeft') || I.down('ShiftRight');
  if (forward) car.speed += m.accel * dt;
  else if (back) car.speed -= (car.speed > 8 ? m.accel * 1.2 : m.accel * 0.6) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 90 * dt);
  if (handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 420 * dt);
  car.speed = clamp(car.speed, -top * 0.45, top);
  const dir = car.speed >= 0 ? 1 : -1;
  const steerRate = 2.1 * (1 - Math.min(0.55, Math.abs(car.speed) / top * 0.6)) * (handbrake ? 1.5 : 1);
  if (left) car.angle -= steerRate * dt * dir;
  if (right) car.angle += steerRate * dt * dir;
  const spd = Math.abs(car.speed);
  if (handbrake && spd > 140) {
    S.skids.push({ x: car.x, y: car.y, angle: car.angle, life: 3 });
    if (S.skids.length > 220) S.skids.shift();
    if (Math.random() < dt * 8) spawnParticles(S, car.x, car.y, 1, '#888888');
  }
  const dx = Math.cos(car.angle) * car.speed * dt;
  const dy = Math.sin(car.angle) * car.speed * dt;
  const moved = moveCar(S.city, car, dx, dy);
  if (!moved && spd > 60) {
    car.speed *= 0.4;
    car.health -= 4;
    S.shake = Math.max(S.shake, 4);
    spawnParticles(S, car.x, car.y, 6, '#c8c8c8');
  }
  if (car.health <= 0 && !car.exploded) explodeCar(S, car);
  if (car.health < 45) {
    car.smoke += dt;
    if (Math.random() < dt * 6) spawnParticles(S, car.x, car.y, 1, '#666666');
  }
  S.player.x = car.x; S.player.y = car.y;
  S.player.angle = car.angle;
}

// --- traffic AI ------------------------------------------------------------
function lanePoint(city, car) {
  const n = city.nodes[car.node];
  const p = city.nodes[car.prevNode] || n;
  let dx = n.x - p.x, dy = n.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  // Right-hand lane: right vector of the direction of travel.
  return { x: n.x + (-dy) * 14, y: n.y + dx * 14 };
}

function carAhead(S, car, range) {
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  let best = null, bd = range;
  for (const o of S.cars) {
    if (o === car || o.dead) continue;
    const dx = o.x - car.x, dy = o.y - car.y;
    const along = dx * fx + dy * fy;
    const side = Math.abs(-dx * fy + dy * fx);
    if (along > 0 && along < bd && side < 30) { bd = along; best = o; }
  }
  return best;
}

export function updateTraffic(S, dt) {
  for (const car of S.cars) {
    if (car.driver !== 'traffic' || car.dead) continue;
    const target = lanePoint(S.city, car);
    const d = dist(car.x, car.y, target.x, target.y);
    if (d < 26) {
      car.prevNode = car.node;
      const ns = nodeNeighbors(S.city, car.node);
      const back = car.prevNode;
      const opts = ns.filter((n) => n !== back);
      car.node = opts.length ? opts[Math.floor(Math.random() * opts.length)] : back;
    }
    const want = Math.atan2(target.y - car.y, target.x - car.x);
    const diff = angleDiff(car.angle, want);
    car.angle += clamp(diff, -1.9 * dt, 1.9 * dt);
    const ahead = carAhead(S, car, 90);
    const wantSpeed = ahead ? 0 : car.cruise;
    if (car.speed < wantSpeed) car.speed += 160 * dt;
    else if (car.speed > wantSpeed) car.speed -= 320 * dt;
    const dx = Math.cos(car.angle) * car.speed * dt;
    const dy = Math.sin(car.angle) * car.speed * dt;
    const ox = car.x, oy = car.y;
    car.x += dx; car.y += dy;
    if (carHitsWorld(S.city, car)) { car.x = ox; car.y = oy; car.speed *= 0.5; car.angle += 0.4; }
  }
}

// --- collisions ------------------------------------------------------------
export function collideCars(S, dt) {
  const list = S.cars;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.dead) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = 44;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d, ny = dy / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        const rel = Math.abs(a.speed - b.speed);
        // Damage only once per half second per car — an overlap that lasts
        // several frames must not drain health frame after frame.
        if (rel > 120 && S.now - (a.lastHitT || 0) > 0.5) {
          a.health -= 3; a.lastHitT = S.now;
          if (a === S.player.car || b === S.player.car) S.shake = Math.max(S.shake, 3);
        }
        if (rel > 120 && S.now - (b.lastHitT || 0) > 0.5) {
          b.health -= 3; b.lastHitT = S.now;
        }
      }
    }
  }
  // Cars vs pedestrians.
  for (const car of list) {
    if (car.dead || Math.abs(car.speed) < 40) continue;
    for (const p of S.peds) {
      if (p.knocked && p.knocked > 0) continue;
      if (dist(car.x, car.y, p.x, p.y) < 34) {
        p.knocked = 1.2;
        p.flee = 4;
        if (car === S.player.car) { addCrime(S, 14, 'ped hit'); S.shake = Math.max(S.shake, 5); }
        spawnParticles(S, p.x, p.y, 6, '#e8b88a');
        car.speed *= 0.85;
      }
    }
  }
}

export function explodeCar(S, car) {
  car.exploded = true; car.dead = true; car.health = 0;
  spawnParticles(S, car.x, car.y, 26, '#ff8830');
  spawnParticles(S, car.x, car.y, 14, '#444444');
  S.shake = Math.max(S.shake, 12);
  if (car === S.player.car) {
    S.player.car = null;
    S.player.x = car.x; S.player.y = car.y;
  }
}

// Auto-drive for shot mode: greedy node toward the target, then straight
// at it when close. Never a straight line across the city.
export function autoDrive(S, car, tx, ty, dt) {
  const m = car.model;
  const d = dist(car.x, car.y, tx, ty);
  let target;
  if (d < 220) target = { x: tx, y: ty };
  else {
    const from = nearestNode(S.city, car.x, car.y);
    const next = greedyNextNode(S.city, from, tx, ty);
    target = S.city.nodes[next];
  }
  const want = Math.atan2(target.y - car.y, target.x - car.x);
  const diff = angleDiff(car.angle, want);
  car.angle += clamp(diff, -2.2 * dt, 2.2 * dt);
  if (Math.abs(diff) < 0.6) car.speed = Math.min(car.speed + m.accel * dt, m.top * 0.75);
  else car.speed = Math.max(car.speed - 200 * dt, 90);
  const dx = Math.cos(car.angle) * car.speed * dt;
  const dy = Math.sin(car.angle) * car.speed * dt;
  const ox = car.x, oy = car.y;
  car.x += dx; car.y += dy;
  if (carHitsWorld(S.city, car)) { car.x = ox; car.y = oy; car.speed *= 0.4; }
  S.player.x = car.x; S.player.y = car.y;
}

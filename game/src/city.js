// city.js — builds Velmara once from the fixed seed: blocks, buildings with
// precomputed windows, trees, palms, piers, the road graph, and every
// collision helper the game uses. The road graph is the grid of intersections.
import { AVENUES, STREETS, ROAD_W, ROAD_H, SIDEWALK, WORLD_W, WORLD_H,
  WORLD_SEED, DISTRICTS, LANDMARKS, WATER_Y, SAND_Y } from './config.js';
import { makeRng } from './random.js';

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  }
  return DISTRICTS[2];
}

export function isOnRoad(x, y) {
  for (const ax of AVENUES) if (Math.abs(x - ax) <= ROAD_W / 2 + SIDEWALK) return true;
  for (const sy of STREETS) if (Math.abs(y - sy) <= ROAD_H / 2 + SIDEWALK) return true;
  return false;
}

export function isWater(x, y) { return y >= WATER_Y; }
export function isSand(x, y) { return y >= SAND_Y && y < WATER_Y; }

function nearLandmark(x, y, r) {
  for (const k of Object.keys(LANDMARKS)) {
    const L = LANDMARKS[k];
    if (Math.abs(L.x - x) < r && Math.abs(L.y - y) < r) return true;
  }
  return false;
}

export function genCity() {
  const rng = makeRng(WORLD_SEED);
  const buildings = [];
  const trees = [];
  const palms = [];
  const lamps = [];
  // Road graph nodes: one per intersection, index = si * AVENUES.length + ai.
  const nodes = [];
  for (let si = 0; si < STREETS.length; si++) {
    for (let ai = 0; ai < AVENUES.length; ai++) {
      nodes.push({ x: AVENUES[ai], y: STREETS[si], ai, si });
    }
  }
  // Buildings, one or two per block.
  for (let si = 0; si < STREETS.length - 1; si++) {
    for (let ai = 0; ai < AVENUES.length - 1; ai++) {
      const bx0 = AVENUES[ai] + ROAD_W / 2 + SIDEWALK + 8;
      const by0 = STREETS[si] + ROAD_H / 2 + SIDEWALK + 8;
      const bx1 = AVENUES[ai + 1] - ROAD_W / 2 - SIDEWALK - 8;
      const by1 = STREETS[si + 1] - ROAD_H / 2 - SIDEWALK - 8;
      const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
      const d = districtAt(cx, cy);
      if (d.name === 'Parque Verde') continue; // park: trees only, no buildings
      if (by0 >= SAND_Y) continue; // beach: no buildings
      if (nearLandmark(cx, cy, 130)) continue;
      const tall = d.name === 'Centro';
      const splitV = rng.chance(0.5);
      const count = rng.chance(0.45) ? 2 : 1;
      for (let i = 0; i < count; i++) {
        let x0, y0, x1, y1;
        if (count === 1) { x0 = bx0; y0 = by0; x1 = bx1; y1 = by1; }
        else if (splitV) {
          const mid = (bx0 + bx1) / 2 + rng.range(-20, 20);
          x0 = i === 0 ? bx0 : mid + 10; x1 = i === 0 ? mid - 10 : bx1;
          y0 = by0; y1 = by1;
        } else {
          const mid = (by0 + by1) / 2 + rng.range(-20, 20);
          y0 = i === 0 ? by0 : mid + 10; y1 = i === 0 ? mid - 10 : by1;
          x0 = bx0; x1 = bx1;
        }
        const w = x1 - x0, h = y1 - y0;
        if (w < 40 || h < 40) continue;
        const roof = rng.pick(d.roofs);
        const height = tall ? rng.range(26, 52) : rng.range(8, 18);
        const windows = [];
        const cols = Math.max(2, Math.floor(w / 34));
        const rows = Math.max(2, Math.floor(h / 34));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (rng.chance(0.22)) continue;
            windows.push({
              x: x0 + 10 + c * ((w - 20) / cols) + 4,
              y: y0 + 10 + r * ((h - 20) / rows) + 4,
              w: (w - 20) / cols - 9, h: (h - 20) / rows - 9,
              lit: rng.chance(0.5),
            });
          }
        }
        buildings.push({ x: x0, y: y0, w, h, roof, height, windows, district: d.name });
      }
    }
  }
  // Parque Verde: a real park full of trees.
  for (let i = 0; i < 90; i++) {
    trees.push({ x: rng.range(2560, 3560), y: rng.range(40, 680), r: rng.range(10, 18), shade: rng.pick(['#3f7a3a', '#4a8a42', '#35702f']) });
  }
  // Scattered trees in the other districts.
  for (let i = 0; i < 46; i++) {
    const x = rng.range(60, 3540), y = rng.range(60, 2260);
    if (isOnRoad(x, y) || nearLandmark(x, y, 90)) continue;
    let inside = false;
    for (const b of buildings) if (x > b.x - 6 && x < b.x + b.w + 6 && y > b.y - 6 && y < b.y + b.h + 6) { inside = true; break; }
    if (!inside) trees.push({ x, y, r: rng.range(9, 15), shade: rng.pick(['#3f7a3a', '#4a8a42', '#35702f']) });
  }
  // Palms along the beach road and through the park.
  for (let x = 120; x < 3560; x += 130) {
    palms.push({ x: x + rng.range(-14, 14), y: 2230 + rng.range(-8, 8) });
    if (rng.chance(0.6)) palms.push({ x: x + rng.range(-14, 14), y: 2100 + rng.range(-8, 8) });
  }
  for (let i = 0; i < 14; i++) palms.push({ x: rng.range(2560, 3560), y: rng.range(60, 660) });
  // Street lamps at every intersection corner.
  for (const n of nodes) lamps.push({ x: n.x + ROAD_W / 2 + 4, y: n.y - ROAD_H / 2 - 4 });
  return { buildings, trees, palms, lamps, nodes };
}

// --- collision -------------------------------------------------------------
// True when a circle of radius r at (x,y) touches a building or the map edge
// or the water. Cars and people both use this; the beach sand is passable.
export function circleHitsWorld(city, x, y, r) {
  if (x < r || y < r || x > WORLD_W - r || y > WORLD_H - r) return true;
  if (y + r >= WATER_Y) return true;
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  return false;
}

// Move-then-resolve for a circle: try the full step, then x-only, then y-only.
// Returns the corrected position so bodies slide along walls instead of sticking.
export function moveCircle(city, x, y, dx, dy, r) {
  let nx = x + dx, ny = y + dy;
  if (!circleHitsWorld(city, nx, ny, r)) return { x: nx, y: ny };
  if (!circleHitsWorld(city, nx, y, r)) return { x: nx, y };
  if (!circleHitsWorld(city, x, ny, r)) return { x, y: ny };
  return { x, y };
}

// A car is two circles (front and back axle), radius w/2+2 — never one big
// circle, or cars cannot drive along a road edge or out of a parking spot.
export function carHitsWorld(city, car) {
  const m = car.model;
  const fx = car.x + Math.cos(car.angle) * (m.len / 2 - 8);
  const fy = car.y + Math.sin(car.angle) * (m.len / 2 - 8);
  const bx = car.x - Math.cos(car.angle) * (m.len / 2 - 8);
  const by = car.y - Math.sin(car.angle) * (m.len / 2 - 8);
  const r = m.wid / 2 + 2;
  return circleHitsWorld(city, fx, fy, r) || circleHitsWorld(city, bx, by, r);
}

export function moveCar(city, car, dx, dy) {
  const oldX = car.x, oldY = car.y;
  car.x += dx; car.y += dy;
  if (carHitsWorld(city, car)) {
    car.x = oldX + dx; car.y = oldY;
    if (carHitsWorld(city, car)) {
      car.x = oldX; car.y = oldY + dy;
      if (carHitsWorld(city, car)) { car.x = oldX; car.y = oldY; return false; }
    }
  }
  return true;
}

// --- road graph ------------------------------------------------------------
export function nodeIndex(ai, si) { return si * AVENUES.length + ai; }
export function nearestNode(city, x, y) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < city.nodes.length; i++) {
    const n = city.nodes[i];
    const d = (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
export function nodeNeighbors(city, idx) {
  const n = city.nodes[idx];
  const out = [];
  if (n.ai > 0) out.push(nodeIndex(n.ai - 1, n.si));
  if (n.ai < AVENUES.length - 1) out.push(nodeIndex(n.ai + 1, n.si));
  if (n.si > 0) out.push(nodeIndex(n.ai, n.si - 1));
  if (n.si < STREETS.length - 1) out.push(nodeIndex(n.ai, n.si + 1));
  return out;
}
// Greedy next intersection toward a target: the neighbour closest to it.
export function greedyNextNode(city, fromIdx, tx, ty) {
  const ns = nodeNeighbors(city, fromIdx);
  let best = ns[0], bd = Infinity;
  for (const i of ns) {
    const n = city.nodes[i];
    const d = (n.x - tx) * (n.x - tx) + (n.y - ty) * (n.y - ty);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

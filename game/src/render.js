// render.js — draws Velmara on the canvas: the ground, roads and crosswalks,
// buildings with fake-height shadows, trees and palms, the harbour, the
// cars, the people, the mission beacon, and the day/night light over it all.
import { AVENUES, STREETS, ROAD_W, ROAD_H, WORLD_W, WORLD_H,
  WATER_Y, SAND_Y, LANDMARKS, PIERS_X } from './config.js';
import { clamp } from './random.js';

export function viewRect(S) {
  const hw = S.vw / 2 / S.cam.zoom, hh = S.vh / 2 / S.cam.zoom;
  return { x0: S.cam.x - hw - 60, y0: S.cam.y - hh - 60, x1: S.cam.x + hw + 60, y1: S.cam.y + hh + 60 };
}
function onScreen(v, x, y, pad) {
  return x > v.x0 - pad && x < v.x1 + pad && y > v.y0 - pad && y < v.y1 + pad;
}

export function drawWorld(S) {
  const ctx = S.ctx;
  const v = viewRect(S);
  // Ground.
  ctx.fillStyle = '#4a4a3e';
  ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  // Beach sand.
  ctx.fillStyle = '#e8d090';
  ctx.fillRect(Math.max(v.x0, 0), SAND_Y, Math.min(v.x1, WORLD_W), WATER_Y - SAND_Y);
  // Water with an animated shimmer.
  const wg = ctx.createLinearGradient(0, WATER_Y, 0, WORLD_H);
  wg.addColorStop(0, '#2a7ab8');
  wg.addColorStop(1, '#144a78');
  ctx.fillStyle = wg;
  ctx.fillRect(Math.max(v.x0, 0), WATER_Y, Math.min(v.x1, WORLD_W), WORLD_H - WATER_Y);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const wy = WATER_Y + 18 + i * 14;
    if (wy < v.y0 || wy > v.y1) continue;
    const off = Math.sin(S.now * 1.4 + i * 2.1) * 26;
    ctx.beginPath();
    ctx.moveTo(Math.max(v.x0, 0) + ((i * 317 + off) % 900), wy);
    ctx.lineTo(Math.max(v.x0, 0) + ((i * 317 + off) % 900) + 90, wy);
    ctx.stroke();
  }
  drawRoads(S, v);
  drawPiers(S, v);
  drawBuildings(S, v);
  drawNature(S, v);
  drawLandmarks(S, v);
  drawPickups(S, v);
  drawSkids(S, v);
  drawMissionBeacon(S, v);
}

function drawRoads(S, v) {
  const ctx = S.ctx;
  // Asphalt.
  ctx.fillStyle = '#3c3c3c';
  for (const ax of AVENUES) {
    if (ax < v.x0 - 60 || ax > v.x1 + 60) continue;
    ctx.fillRect(ax - ROAD_W / 2, Math.max(v.y0, 0), ROAD_W, Math.min(v.y1, SAND_Y) - Math.max(v.y0, 0));
  }
  for (const sy of STREETS) {
    if (sy < v.y0 - 60 || sy > v.y1 + 60) continue;
    ctx.fillRect(Math.max(v.x0, 0), sy - ROAD_H / 2, Math.min(v.x1, WORLD_W) - Math.max(v.x0, 0), ROAD_H);
  }
  // Sidewalk edge.
  ctx.fillStyle = '#6a6a60';
  for (const ax of AVENUES) {
    if (ax < v.x0 - 60 || ax > v.x1 + 60) continue;
    ctx.fillRect(ax - ROAD_W / 2 - 14, Math.max(v.y0, 0), 4, Math.min(v.y1, SAND_Y) - Math.max(v.y0, 0));
    ctx.fillRect(ax + ROAD_W / 2 + 10, Math.max(v.y0, 0), 4, Math.min(v.y1, SAND_Y) - Math.max(v.y0, 0));
  }
  // Dashed yellow centre lines.
  ctx.fillStyle = '#e8c820';
  for (const ax of AVENUES) {
    if (ax < v.x0 - 60 || ax > v.x1 + 60) continue;
    for (let y = Math.max(0, Math.floor(v.y0 / 44) * 44); y < Math.min(v.y1, SAND_Y); y += 44) {
      ctx.fillRect(ax - 2, y, 4, 22);
    }
  }
  for (const sy of STREETS) {
    if (sy < v.y0 - 60 || sy > v.y1 + 60) continue;
    for (let x = Math.max(0, Math.floor(v.x0 / 44) * 44); x < Math.min(v.x1, WORLD_W); x += 44) {
      ctx.fillRect(x, sy - 2, 22, 4);
    }
  }
  // Zebra crossings at every intersection.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const ax of AVENUES) {
    for (const sy of STREETS) {
      if (!onScreen(v, ax, sy, 80)) continue;
      for (let i = -3; i <= 3; i++) {
        ctx.fillRect(ax + i * 9 - 3, sy - ROAD_H / 2 - 12, 6, 10);
        ctx.fillRect(ax + i * 9 - 3, sy + ROAD_H / 2 + 2, 6, 10);
      }
    }
  }
}

function drawPiers(S, v) {
  const ctx = S.ctx;
  ctx.fillStyle = '#8a6a42';
  for (const px of PIERS_X) {
    if (px < v.x0 - 60 || px > v.x1 + 60) continue;
    ctx.fillRect(px - 14, 2280, 28, 160);
    ctx.fillStyle = '#7a5a38';
    for (let y = 2290; y < 2430; y += 22) ctx.fillRect(px - 14, y, 28, 3);
    ctx.fillStyle = '#8a6a42';
  }
}

function drawBuildings(S, v) {
  const ctx = S.ctx;
  for (const b of S.city.buildings) {
    if (b.x > v.x1 || b.x + b.w < v.x0 || b.y > v.y1 || b.y + b.h < v.y0) continue;
    // Fake-height shadow, offset down-right by the building's height.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(b.x + b.height * 0.45, b.y + b.height * 0.45, b.w, b.h);
    // Walls and roof.
    ctx.fillStyle = shade(b.roof, -28);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
    // Precomputed windows.
    for (const w of b.windows) {
      ctx.fillStyle = w.lit ? '#ffe89a' : 'rgba(20,30,50,0.55)';
      ctx.fillRect(w.x, w.y, w.w, w.h);
    }
  }
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function drawNature(S, v) {
  const ctx = S.ctx;
  for (const t of S.city.trees) {
    if (!onScreen(v, t.x, t.y, 30)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(t.x + 5, t.y + 6, t.r, t.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t.shade;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath(); ctx.arc(t.x - t.r * 0.3, t.y - t.r * 0.3, t.r * 0.45, 0, Math.PI * 2); ctx.fill();
  }
  for (const p of S.city.palms) {
    if (!onScreen(v, p.x, p.y, 30)) continue;
    ctx.strokeStyle = '#7a5a38';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 3, p.y - 20); ctx.stroke();
    ctx.strokeStyle = '#3f8a3a';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.5;
      ctx.beginPath();
      ctx.moveTo(p.x + 3, p.y - 20);
      ctx.quadraticCurveTo(p.x + 3 + Math.cos(a) * 14, p.y - 20 + Math.sin(a) * 10, p.x + 3 + Math.cos(a) * 24, p.y - 20 + Math.sin(a) * 16);
      ctx.stroke();
    }
  }
  // Street lamps (glow at night is added by the lighting pass).
  ctx.fillStyle = '#3a3a3a';
  for (const l of S.city.lamps) {
    if (!onScreen(v, l.x, l.y, 20)) continue;
    ctx.fillRect(l.x - 2, l.y - 2, 4, 4);
  }
}

function drawLandmarks(S, v) {
  const ctx = S.ctx;
  // The golden yacht in the water.
  const Y = LANDMARKS.yacht;
  if (onScreen(v, Y.x, Y.y, 80)) {
    ctx.save();
    ctx.translate(Y.x, Y.y);
    ctx.fillStyle = '#f0ead8';
    ctx.beginPath(); ctx.ellipse(0, 0, 52, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b820';
    ctx.fillRect(-34, -26, 60, 16);
    ctx.fillStyle = '#20385a';
    ctx.fillRect(-34, -26, 60, 4);
    ctx.restore();
  }
  // Signposts: a coloured plaque with the name, drawn when close enough.
  const signs = [
    ['safehouse', '#5ab87a'], ['market', '#e8a020'], ['hotel', '#e8b820'],
    ['garage', '#d84a4a'], ['docks', '#4a7ad8'], ['bank', '#c8a860'],
    ['hospital', '#e8e8e8'], ['gunshop', '#8a8a8a'], ['spray', '#ff8ac0'],
    ['cafe', '#d88a4a'], ['bar', '#7a5ad8'], ['tienda', '#3a9a8a'],
  ];
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  for (const [key, color] of signs) {
    const L = LANDMARKS[key];
    if (!onScreen(v, L.x, L.y, 120)) continue;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(L.x, L.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('◆', L.x, L.y + 3.5);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(L.name, L.x + 1, L.y - 13);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(L.name, L.x, L.y - 14);
  }
}

function drawPickups(S, v) {
  const ctx = S.ctx;
  for (const pk of S.pickups) {
    if (pk.taken || !onScreen(v, pk.x, pk.y, 40)) continue;
    const bob = Math.sin(S.now * 3 + pk.x) * 3;
    ctx.save();
    ctx.translate(pk.x, pk.y + bob);
    ctx.fillStyle = pk.kind === 'health' ? '#e83a3a' : '#ffd23e';
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'health' ? '+' : '»', 0, 5);
    ctx.restore();
  }
}

function drawSkids(S, v) {
  const ctx = S.ctx;
  ctx.strokeStyle = 'rgba(10,10,10,0.45)';
  ctx.lineWidth = 4;
  for (const s of S.skids) {
    if (!onScreen(v, s.x, s.y, 40)) continue;
    ctx.beginPath();
    ctx.moveTo(s.x - Math.cos(s.angle) * 12, s.y - Math.sin(s.angle) * 12);
    ctx.lineTo(s.x + Math.cos(s.angle) * 12, s.y + Math.sin(s.angle) * 12);
    ctx.stroke();
  }
}

function drawMissionBeacon(S, v) {
  const ctx = S.ctx;
  const mk = S.missionMarker ? S.missionMarker() : null;
  if (!mk || !onScreen(v, mk.x, mk.y, 200)) return;
  const pulse = 1 + Math.sin(S.now * 4) * 0.15;
  const g = ctx.createRadialGradient(mk.x, mk.y, 4, mk.x, mk.y, 60 * pulse);
  g.addColorStop(0, 'rgba(255,210,62,0.55)');
  g.addColorStop(1, 'rgba(255,210,62,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(mk.x, mk.y, 60 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('M', mk.x, mk.y + 9);
}

// --- actors ----------------------------------------------------------------
export function drawActors(S) {
  const ctx = S.ctx;
  const v = viewRect(S);
  for (const car of S.cars) {
    if (car.dead || !onScreen(v, car.x, car.y, 80)) continue;
    drawCar(ctx, car, S.now);
  }
  for (const p of S.peds) {
    if (!onScreen(v, p.x, p.y, 40)) continue;
    drawPerson(ctx, p.x, p.y, p.angle, p.walkPhase, p.skin, p.shirt, p.pants, p.knocked > 0);
  }
  for (const f of S.footCops) {
    if (f.dead || !onScreen(v, f.x, f.y, 40)) continue;
    drawPerson(ctx, f.x, f.y, f.angle, f.walkPhase, '#e8b88a', '#20385a', '#16283e', false);
    // Police cap.
    ctx.fillStyle = '#101c2e';
    ctx.beginPath(); ctx.arc(f.x, f.y - 7, 6, 0, Math.PI * 2); ctx.fill();
  }
  drawPlayer(S, v);
  // Bullets and tracers.
  for (const b of S.bullets) {
    if (!onScreen(v, b.x, b.y, 40)) continue;
    ctx.strokeStyle = b.from === 'player' ? '#ffe89a' : '#ff9a5a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x - Math.cos(b.angle) * 26, b.y - Math.sin(b.angle) * 26);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Muzzle flash.
  if (S.muzzle > 0) {
    const P = S.player;
    const fx = P.x + Math.cos(P.angle) * 26, fy = P.y + Math.sin(P.angle) * 26;
    ctx.fillStyle = 'rgba(255,220,120,0.9)';
    ctx.beginPath(); ctx.arc(fx, fy, 9, 0, Math.PI * 2); ctx.fill();
  }
  // Particles.
  for (const pt of S.particles) {
    if (!onScreen(v, pt.x, pt.y, 20)) continue;
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

export function drawCar(ctx, car, now) {
  const m = car.model;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-m.len / 2 + 3, -m.wid / 2 + 4, m.len, m.wid);
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -m.len / 2, -m.wid / 2, m.len, m.wid, 7);
  ctx.fill();
  // Hood and trunk lines.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(m.len / 2 - 12, -m.wid / 2 + 3, 8, m.wid - 6);
  // Windshield and rear window.
  ctx.fillStyle = 'rgba(20,30,50,0.75)';
  ctx.fillRect(m.len / 2 - 22, -m.wid / 2 + 3, 8, m.wid - 6);
  ctx.fillRect(-m.len / 2 + 8, -m.wid / 2 + 3, 7, m.wid - 6);
  // Headlights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(m.len / 2 - 2, -m.wid / 2 + 2, 3, 5);
  ctx.fillRect(m.len / 2 - 2, m.wid / 2 - 7, 3, 5);
  // Police light bar.
  if (car.driver === 'police') {
    const blink = Math.floor(now * 6) % 2 === 0;
    ctx.fillStyle = blink ? '#ff2a2a' : '#2a6aff';
    ctx.fillRect(-6, -m.wid / 2 + 2, 12, 6);
    ctx.fillStyle = blink ? '#2a6aff' : '#ff2a2a';
    ctx.fillRect(-6, m.wid / 2 - 8, 12, 6);
  }
  // Taxi sign.
  if (car.modelKey === 'taxi') {
    ctx.fillStyle = '#111111';
    ctx.fillRect(-8, -4, 16, 8);
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 2);
  }
  // Damage smoke is particles; a wrecked look comes from the dark overlay.
  if (car.health < 45) {
    ctx.fillStyle = 'rgba(0,0,0,' + (0.25 + (45 - car.health) / 100) + ')';
    roundRect(ctx, -m.len / 2, -m.wid / 2, m.len, m.wid, 7);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPerson(ctx, x, y, angle, phase, skin, shirt, pants, knocked) {
  ctx.save();
  ctx.translate(x, y);
  if (knocked) { ctx.rotate(Math.PI / 2); ctx.translate(0, 4); }
  const swing = Math.sin(phase) * 4;
  // Legs.
  ctx.strokeStyle = pants;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 2); ctx.lineTo(-swing * 0.4, 10);
  ctx.moveTo(0, 2); ctx.lineTo(swing * 0.4, 10);
  ctx.stroke();
  // Body.
  ctx.fillStyle = shirt;
  ctx.beginPath(); ctx.ellipse(0, 0, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
  // Head.
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(Math.cos(angle) * 3, Math.sin(angle) * 3 - 8, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPlayer(S, v) {
  const ctx = S.ctx;
  const P = S.player;
  if (P.car || !onScreen(v, P.x, P.y, 40)) return;
  drawPerson(ctx, P.x, P.y, P.angle, P.walkPhase, '#e8b88a', '#c03030', '#2a2a3a', false);
  // Aim line, short and subtle.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(P.x + Math.cos(P.angle) * 16, P.y + Math.sin(P.angle) * 16);
  ctx.lineTo(P.x + Math.cos(P.angle) * 34, P.y + Math.sin(P.angle) * 34);
  ctx.stroke();
  // Pistol in hand.
  if (P.weapon === 'pistol') {
    ctx.fillStyle = '#222222';
    ctx.fillRect(P.x + Math.cos(P.angle) * 12 - 3, P.y + Math.sin(P.angle) * 12 - 2, 9, 4);
  }
}

// --- lighting, camera, edge arrow ------------------------------------------
export function lightForHour(hour) {
  // Returns {dark: 0..1, tint} — bright day, orange sunset, dark night.
  if (hour >= 7 && hour < 17) return { dark: 0, tint: null };
  if (hour >= 17 && hour < 19) return { dark: 0.12, tint: 'rgba(255,140,60,0.14)' };
  if (hour >= 19 && hour < 20.5) return { dark: 0.3, tint: 'rgba(255,110,60,0.10)' };
  if (hour >= 6 && hour < 7) return { dark: 0.25, tint: 'rgba(255,150,90,0.08)' };
  return { dark: 0.52, tint: 'rgba(20,30,90,0.10)' };
}

export function drawLighting(S) {
  const ctx = S.ctx;
  const hour = (S.timeMin / 60) % 24;
  const L = lightForHour(hour);
  const v = viewRect(S);
  if (L.tint) {
    ctx.fillStyle = L.tint;
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  }
  if (L.dark > 0) {
    ctx.fillStyle = 'rgba(8,10,28,' + L.dark + ')';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    // Lamp pools and headlight glow cut through the dark.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of S.city.lamps) {
      if (!onScreen(v, l.x, l.y, 120)) continue;
      const g = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, 90);
      g.addColorStop(0, 'rgba(255,220,130,0.20)');
      g.addColorStop(1, 'rgba(255,220,130,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(l.x, l.y, 90, 0, Math.PI * 2); ctx.fill();
    }
    const P = S.player;
    const hx = P.x + Math.cos(P.angle) * 60, hy = P.y + Math.sin(P.angle) * 60;
    const hg = ctx.createRadialGradient(hx, hy, 4, hx, hy, 130);
    hg.addColorStop(0, 'rgba(255,240,180,0.16)');
    hg.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(hx, hy, 130, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // Red damage vignette.
  if (S.damageFlash > 0.02) {
    const g = ctx.createRadialGradient(S.cam.x, S.cam.y, 100, S.cam.x, S.cam.y, Math.max(S.vw, S.vh) * 0.7);
    g.addColorStop(0, 'rgba(200,0,0,0)');
    g.addColorStop(1, 'rgba(200,0,0,' + (S.damageFlash * 0.5) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  }
}

export function drawEdgeArrow(S) {
  const ctx = S.ctx;
  const mk = S.missionMarker ? S.missionMarker() : null;
  if (!mk) return;
  const v = viewRect(S);
  if (mk.x > v.x0 && mk.x < v.x1 && mk.y > v.y0 && mk.y < v.y1) return;
  const cx = clamp(mk.x, v.x0 + 30, v.x1 - 30);
  const cy = clamp(mk.y, v.y0 + 30, v.y1 - 30);
  const a = Math.atan2(mk.y - S.cam.y, mk.x - S.cam.x);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(a);
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(16, 0); ctx.lineTo(-10, -11); ctx.lineTo(-4, 0); ctx.lineTo(-10, 11);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function updateCamera(S, dt) {
  const P = S.player;
  const speed = P.car ? Math.abs(P.car.speed) : 0;
  const targetZoom = (S.vw < 900 ? 0.85 : 1) * (1 - Math.min(0.22, speed / 2400));
  S.cam.zoom += (targetZoom - S.cam.zoom) * Math.min(1, dt * 3);
  S.cam.x += (P.x - S.cam.x) * Math.min(1, dt * 5);
  S.cam.y += (P.y - S.cam.y) * Math.min(1, dt * 5);
  S.cam.x = clamp(S.cam.x, 0, WORLD_W);
  S.cam.y = clamp(S.cam.y, 0, WORLD_H);
  S.shake = Math.max(0, S.shake - dt * 22);
  S.damageFlash = Math.max(0, S.damageFlash - dt * 1.4);
}

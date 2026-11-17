// hud.js — the DOM HUD over the canvas: objective panel, wanted stars,
// cash and clock, minimap with district label, health and ammo, banners,
// subtitles, toasts, and the title / pause / end screens.
import { WORLD_W, WORLD_H, AVENUES, STREETS } from './config.js';
import { districtAt } from './city.js';

export function buildHud(S) {
  const hud = document.getElementById('hud');
  hud.innerHTML = '';
  const mk = (id, cls) => {
    const el = document.createElement('div');
    el.id = id; el.className = cls;
    hud.appendChild(el);
    return el;
  };
  S.el = {
    obj: mk('obj', 'panel'),
    stats: mk('stats', 'panel'),
    minimapWrap: mk('minimap-wrap', 'panel'),
    vitals: mk('vitals', 'panel'),
    banner: mk('banner', ''),
    subtitle: mk('subtitle', ''),
    toast: mk('toast', ''),
    hint: mk('hint', ''),
  };
  S.el.obj.innerHTML = '<div class="obj-title"></div><div class="obj-text"></div><div class="obj-dist"></div>';
  S.el.stats.innerHTML = '<div class="stars"></div><div class="cash"></div><div class="clock"></div>';
  const mm = document.createElement('canvas');
  mm.width = 220; mm.height = 160;
  mm.id = 'minimap';
  S.el.minimapWrap.appendChild(mm);
  S.minimapCtx = mm.getContext('2d');
  const dl = document.createElement('div');
  dl.className = 'district-label';
  S.el.minimapWrap.appendChild(dl);
  S.el.districtLabel = dl;
  S.el.vitals.innerHTML = '<div class="hp-bar"><div class="hp-fill"></div></div><div class="weapon"></div>';
  // Title screen.
  const title = document.createElement('div');
  title.id = 'title-screen';
  title.innerHTML = '<h1>VELMARA</h1><h2>STREETS OF GOLD</h2>'
    + '<p class="story"></p>'
    + '<p class="controls"></p>'
    + '<div class="menu-buttons"><button id="btn-new">NEW GAME</button>'
    + '<button id="btn-continue">CONTINUE</button>'
    + '<button id="btn-sound">SOUND: ON</button></div>';
  document.getElementById('screens').appendChild(title);
  S.el.title = title;
  // Pause menu.
  const pause = document.createElement('div');
  pause.id = 'pause-screen';
  pause.innerHTML = '<h1>PAUSED</h1><p class="controls"></p>'
    + '<div class="menu-buttons"><button id="btn-resume">RESUME</button>'
    + '<button id="btn-save">SAVE GAME</button>'
    + '<button id="btn-quit">QUIT TO TITLE</button></div>';
  document.getElementById('screens').appendChild(pause);
  S.el.pause = pause;
  // Wasted / busted screen.
  const end = document.createElement('div');
  end.id = 'end-screen';
  end.innerHTML = '<h1 id="end-title">WASTED</h1><p id="end-text"></p>'
    + '<div class="menu-buttons"><button id="btn-retry">RETRY</button>'
    + '<button id="btn-end-title">TITLE SCREEN</button></div>';
  document.getElementById('screens').appendChild(end);
  S.el.end = end;
  return S.el;
}

function fmtClock(S) {
  const h = Math.floor(S.timeMin / 60) % 24;
  const m = Math.floor(S.timeMin % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + '  ·  Day ' + S.day;
}

export function updateHud(S) {
  const el = S.el;
  if (!el) return;
  const obj = S.missionObjective ? S.missionObjective() : { title: 'Velmara', text: '', timer: 0 };
  el.obj.querySelector('.obj-title').textContent = obj.title;
  el.obj.querySelector('.obj-text').textContent = obj.text;
  const mk = S.missionMarker ? S.missionMarker() : null;
  let distTxt = '';
  if (mk) {
    const d = Math.round(Math.hypot(mk.x - S.player.x, mk.y - S.player.y));
    distTxt = '◈ ' + d + 'm';
  }
  if (obj.timer > 0) distTxt += (distTxt ? '  ·  ' : '') + '⏱ ' + Math.ceil(obj.timer) + 's';
  el.obj.querySelector('.obj-dist').textContent = distTxt;
  // Wanted stars, cash, clock.
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < S.stars ? '★' : '☆';
  el.stats.querySelector('.stars').textContent = stars;
  el.stats.querySelector('.stars').style.color = S.stars > 0 ? '#ffd23e' : '#888888';
  el.stats.querySelector('.cash').textContent = '$' + S.player.cash;
  el.stats.querySelector('.clock').textContent = fmtClock(S);
  // Vitals.
  const hpFill = el.vitals.querySelector('.hp-fill');
  hpFill.style.width = Math.max(0, S.player.hp) + '%';
  hpFill.style.background = S.player.hp > 50 ? '#4ac86a' : S.player.hp > 25 ? '#e8a020' : '#d83a3a';
  const wname = S.player.weapon === 'pistol' ? 'Pistol' : 'Fists';
  const ammo = S.player.weapon === 'pistol' ? ' · ' + S.player.ammo + ' rounds' : '';
  const car = S.player.car ? ' · ' + S.player.car.model.name + ' ♥' + Math.max(0, Math.round(S.player.car.health)) : '';
  el.vitals.querySelector('.weapon').textContent = wname + ammo + car;
  // District label.
  const d = districtAt(S.player.x, S.player.y);
  el.districtLabel.textContent = d.name + ' — ' + d.blurb;
  // Banner / subtitle / toast timers.
  if (S.bannerT > 0) { el.banner.textContent = S.bannerText; el.banner.style.opacity = '1'; }
  else el.banner.style.opacity = '0';
  if (S.subtitleT > 0) { el.subtitle.textContent = S.subtitleText; el.subtitle.style.opacity = '1'; }
  else el.subtitle.style.opacity = '0';
  if (S.toastT > 0) { el.toast.textContent = S.toastText; el.toast.style.opacity = '1'; }
  else el.toast.style.opacity = '0';
  // Controls hint, only early on.
  el.hint.textContent = S.hintText || '';
  drawMinimap(S);
}

export function drawMinimap(S) {
  const ctx = S.minimapCtx;
  if (!ctx) return;
  const sx = 220 / WORLD_W, sy = 160 / WORLD_H;
  // Sea and sand.
  ctx.fillStyle = '#1e5a8a';
  ctx.fillRect(0, 2380 * sy, 220, 160 - 2380 * sy);
  ctx.fillStyle = '#e8d090';
  ctx.fillRect(0, 2300 * sy, 220, 80 * sy);
  // Ground.
  ctx.fillStyle = '#3a3a32';
  ctx.fillRect(0, 0, 220, 2300 * sy);
  // Park.
  ctx.fillStyle = '#2f6a2f';
  ctx.fillRect(2500 * sx, 0, 1100 * sx, 720 * sy);
  // Roads.
  ctx.fillStyle = '#555550';
  for (const ax of AVENUES) ctx.fillRect(ax * sx - 2, 0, 4, 2300 * sy);
  for (const sy2 of STREETS) ctx.fillRect(0, sy2 * sy - 2, 220, 4);
  // Buildings.
  ctx.fillStyle = '#7a7a72';
  for (const b of S.city.buildings) ctx.fillRect(b.x * sx, b.y * sy, Math.max(1, b.w * sx), Math.max(1, b.h * sy));
  // Mission marker.
  const mk = S.missionMarker ? S.missionMarker() : null;
  if (mk) {
    const blink = Math.floor(S.now * 3) % 2 === 0;
    ctx.fillStyle = blink ? '#ffd23e' : '#ffffff';
    ctx.beginPath();
    ctx.arc(mk.x * sx, mk.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('M', mk.x * sx, mk.y * sy + 2.5);
  }
  // Cars, police, player.
  for (const c of S.cars) {
    if (c.dead) continue;
    ctx.fillStyle = c.driver === 'police' ? '#3a7ad8' : '#dddddd';
    ctx.fillRect(c.x * sx - 1.5, c.y * sy - 1.5, 3, 3);
  }
  ctx.fillStyle = '#ff5a5a';
  for (const f of S.footCops) if (!f.dead) ctx.fillRect(f.x * sx - 1, f.y * sy - 1, 2, 2);
  // Player arrow.
  const px = S.player.x * sx, py = S.player.y * sy;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(S.player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Viewport box.
  const vw = S.vw / S.cam.zoom * sx, vh = S.vh / S.cam.zoom * sy;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.strokeRect(S.cam.x * sx - vw / 2, S.cam.y * sy - vh / 2, vw, vh);
}

export function showScreen(S, name) {
  // name: 'title' | 'pause' | 'end' | null
  if (S.el.title) S.el.title.style.display = name === 'title' ? 'flex' : 'none';
  if (S.el.pause) S.el.pause.style.display = name === 'pause' ? 'flex' : 'none';
  if (S.el.end) S.el.end.style.display = name === 'end' ? 'flex' : 'none';
  const hudOn = name === null;
  if (S.el.obj) S.el.obj.style.display = hudOn ? 'block' : 'none';
  if (S.el.stats) S.el.stats.style.display = hudOn ? 'block' : 'none';
  if (S.el.minimapWrap) S.el.minimapWrap.style.display = hudOn ? 'block' : 'none';
  if (S.el.vitals) S.el.vitals.style.display = hudOn ? 'block' : 'none';
}

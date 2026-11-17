// shots.js — the four screenshot scenes. Each one drops the player straight
// into a living moment of the game (HUD and minimap on, no title screen) and
// freezes the clock at the right golden hour. Busted/wasted are off in
// shot mode, so the scene stays put for the camera.
import { LANDMARKS, MARINA_CAR } from './config.js';
import { makeCar } from './vehicles.js';
import { spawnPatrol } from './police.js';
import { debugSetMission } from './missions.js';

export function applyShot(S, n) {
  S.shot = n;
  S.mode = 'play';
  S.shotAuto = null;
  // A busy, lived-in street for every shot: traffic and pedestrians already
  // moving, the clock already running.
  if (n === 1) shotGoldRunChase(S);
  else if (n === 2) shotMarinaMorning(S);
  else if (n === 3) shotHarborLights(S);
  else if (n === 4) shotTaxiGoldenHour(S);
  S.cam.x = S.player.x; S.cam.y = S.player.y;
  S.cam.zoom = 0.95;
  S.hintText = '';
}

function giveCar(S, modelKey, x, y, angle, color) {
  const car = makeCar(modelKey, x, y, angle, 'player', color);
  car.health = 100;
  S.cars.push(car);
  S.player.car = car;
  S.player.x = x; S.player.y = y;
  S.player.angle = angle;
  return car;
}

function shotGoldRunChase(S) {
  // Cover: the Gold Run chase through Centro at 18:05, four stars, patrols
  // closing in, the gold Aurea GT running for the yacht.
  S.timeMin = 18 * 60 + 5;
  S.day = 1;
  debugSetMission(S, 4, 1);
  S.heat = 80; S.stars = 4; S.lastCrimeT = 0;
  giveCar(S, 'aurea', 1840, 1040, 0, '#e8b820');
  S.player.car.missionCar = true;
  S.player.car.speed = 320;
  spawnPatrol(S, 1840 - 260, 1040 + 40);
  spawnPatrol(S, 1840 + 300, 1040 - 30);
  spawnPatrol(S, 2160, 1320);
  S.shotAuto = { x: 3200, y: 2300 };
  S.subtitle('Gold Run — get the gold to the yacht. Lose the patrols.', 8);
}

function shotMarinaMorning(S) {
  // On foot at the marina, 09:12: pedestrians, traffic, the beach behind.
  S.timeMin = 9 * 60 + 12;
  S.day = 1;
  debugSetMission(S, 1, 0);
  S.player.car = null;
  S.player.x = 2960; S.player.y = 2220;
  S.player.angle = -Math.PI / 2;
  S.player.weapon = 'pistol';
  S.player.ammo = 24;
  S.heat = 0; S.stars = 0;
  S.subtitle('Hot Wheels — steal the gold Aurea GT at the marina.', 8);
}

function shotHarborLights(S) {
  // The docks at dusk, 19:24: Harbor Lights, two stars, pistol out.
  S.timeMin = 19 * 60 + 24;
  S.day = 1;
  debugSetMission(S, 2, 0);
  S.player.car = null;
  S.player.x = 2830; S.player.y = 2190;
  S.player.angle = Math.PI / 4;
  S.player.weapon = 'pistol';
  S.player.ammo = 24;
  S.heat = 40; S.stars = 2; S.lastCrimeT = 0;
  spawnPatrol(S, 2560, 2160);
  S.subtitle('Harbor Lights — meet the contact at the docks.', 8);
}

function shotTaxiGoldenHour(S) {
  // A taxi fare on the beach road at golden hour, 18:05, one star.
  S.timeMin = 18 * 60 + 5;
  S.day = 1;
  S.mission.idx = 5; // story complete — fares are the job now
  S.mission.active = false;
  S.mission.fare = { px: 2800, py: 2160, dx: 880, dy: 760, pay: 60, state: 'pickup' };
  S.mission.fareCooldown = 99;
  giveCar(S, 'taxi', 2160, 2160, 0, '#f0c020');
  S.player.car.speed = 200;
  S.heat = 20; S.stars = 1; S.lastCrimeT = 0;
  S.shotAuto = { x: 2800, y: 2160 };
  S.subtitle('Taxi fare — pick up the passenger on the beach road.', 8);
}

// Where the screenshot scenes want the camera to look before the first
// frame, so the city, the car and the HUD are all in the picture at once.
export function shotCamera(S) {
  return { x: S.player.x, y: S.player.y };
}

// config.js — VELMARA: Streets of Gold. All constants for the city, the cars,
// the weapons, the landmarks and the story missions. Nothing here is copied
// from any commercial game: Velmara, Riko Vale and every name below are ours.
export const WORLD_W = 3600;
export const WORLD_H = 2600;
export const AVENUES = [240, 560, 880, 1200, 1520, 1840, 2160, 2480, 2800, 3120, 3360];
export const STREETS = [200, 480, 760, 1040, 1320, 1600, 1880, 2160];
export const ROAD_W = 64; // avenue width
export const ROAD_H = 56; // street width
export const SIDEWALK = 14;
export const WATER_Y = 2380; // y >= this is the harbour water
export const SAND_Y = 2300; // sand band 2300..2380
export const WORLD_SEED = 20261117;

// Districts: rect [x0,y0,x1,y1], HUD blurb (never repeats the district name),
// roof palette used by the city generator.
export const DISTRICTS = [
  { name: 'Casco Viejo', x0: 0, y0: 0, x1: 1150, y1: 720,
    blurb: 'pastel houses, narrow lanes',
    roofs: ['#e8a0a0', '#f2c98a', '#a8c8a0', '#e8d27a', '#d98a7a', '#f0e0b8'] },
  { name: 'Parque Verde', x0: 2500, y0: 0, x1: 3600, y1: 720,
    blurb: 'green lawns and old trees',
    roofs: ['#c8b890', '#b8a888'] },
  { name: 'Centro', x0: 1150, y0: 720, x1: 2500, y1: 1650,
    blurb: 'glass towers and gold',
    roofs: ['#7a8a9a', '#5a6a7a', '#8a9aaa', '#6a7a8a', '#9aa8b8'] },
  { name: 'Las Lomas', x0: 2500, y0: 720, x1: 3600, y1: 2300,
    blurb: 'hillside homes above the bay',
    roofs: ['#d8b078', '#c89a6a', '#e0c090', '#b8906a', '#d0a880'] },
  { name: 'Puerto del Sol', x0: 0, y0: 1650, x1: 2500, y1: 2380,
    blurb: 'docks, fish and deals',
    roofs: ['#a89888', '#988878', '#b8a898', '#8a7a6a'] },
  { name: 'Playa Dorada', x0: 0, y0: 2300, x1: 3600, y1: 2600,
    blurb: 'golden sand and slow waves',
    roofs: ['#e8d8b0'] },
];

// Fixed landmarks. Every mission, shop and story beat points at one of these.
export const LANDMARKS = {
  safehouse: { x: 560, y: 480, name: 'Safehouse', kind: 'safehouse' },
  market: { x: 880, y: 760, name: 'Mercado Viejo', kind: 'market' },
  hotel: { x: 1840, y: 1040, name: 'Hotel Aurea', kind: 'hotel' },
  garage: { x: 3120, y: 1320, name: "Lalo's Garage", kind: 'garage' },
  docks: { x: 2880, y: 2240, name: 'The Docks', kind: 'docks' },
  bank: { x: 1520, y: 1320, name: 'Banco de Velmara', kind: 'bank' },
  yacht: { x: 3200, y: 2460, name: 'Golden Yacht', kind: 'yacht' },
  hospital: { x: 1200, y: 200, name: 'Clinica Sol', kind: 'hospital' },
  gunshop: { x: 2480, y: 1880, name: 'Velmara Arms', kind: 'gunshop' },
  spray: { x: 880, y: 1880, name: 'Pintura Rosa', kind: 'spray' },
  cafe: { x: 560, y: 1040, name: 'Café Luna', kind: 'shop' },
  bar: { x: 2160, y: 760, name: 'Bar El Faro', kind: 'shop' },
  tienda: { x: 2800, y: 1600, name: 'Tienda Coral', kind: 'shop' },
};
export const PIERS_X = [2560, 2880, 3200]; // wooden piers reaching into the water
export const MARINA_CAR = { x: 2960, y: 2160 }; // where the gold Aurea GT waits

// Six drivable models. topSpeed in px/s, accel in px/s^2, grip 0..1.
export const CAR_MODELS = {
  pico:   { name: 'Pico',    len: 52, wid: 26, top: 300, accel: 210, grip: 0.86, color: '#c8c8d0' },
  cometa: { name: 'Cometa',  len: 56, wid: 26, top: 360, accel: 260, grip: 0.82, color: '#d84a4a' },
  aurea:  { name: 'Aurea GT', len: 60, wid: 28, top: 470, accel: 330, grip: 0.78, color: '#e8b820' },
  burro:  { name: 'Burro Truck', len: 72, wid: 30, top: 280, accel: 180, grip: 0.9, color: '#7a8a5a' },
  taxi:   { name: 'Taxi',    len: 56, wid: 26, top: 330, accel: 240, grip: 0.84, color: '#f0c020' },
  patrol: { name: 'Patrol Interceptor', len: 58, wid: 28, top: 420, accel: 300, grip: 0.8, color: '#20385a' },
};
export const CAR_COLORS = ['#c8c8d0', '#d84a4a', '#4a7ad8', '#e8b820', '#5ab87a', '#d88a4a', '#8a5ad8', '#e0e0e0', '#3a3a42'];

export const WEAPONS = {
  fists: { name: 'Fists', range: 46, cooldown: 0.35, damage: 12 },
  pistol: { name: 'Pistol', range: 520, cooldown: 0.22, damage: 34 },
};
export const AMMO_PRICE = 50;
export const AMMO_PACK = 24;
export const SPRAY_PRICE = 300;
export const BUSTED_FINE = 150;
export const WASTED_LOSS = 100;
export const START_CASH = 150;
export const START_AMMO = 24;

// Story missions, in order. Steps are data; missions.js runs them.
// kind: goto | pickup | steal | deliver | escape | collect | fare
export const MISSIONS = [
  { id: 1, title: 'The Courier', reward: 400, timer: 100,
    intro: 'Lalo needs a package moved. Pick it up at Mercado Viejo, take it to Hotel Aurea. Fast.',
    steps: [
      { kind: 'pickup', x: 880, y: 760, label: 'Pick up the package at Mercado Viejo' },
      { kind: 'deliver', x: 1840, y: 1040, label: 'Deliver the package to Hotel Aurea' },
    ] },
  { id: 2, title: 'Hot Wheels', reward: 600, timer: 0,
    intro: 'A gold Aurea GT is parked by the marina. Take it. Bring it to Lalo\'s Garage. No questions.',
    steps: [
      { kind: 'steal', x: 2960, y: 2160, label: 'Steal the gold Aurea GT at the marina' },
      { kind: 'deliver', x: 3120, y: 1320, label: 'Deliver the Aurea GT to Lalo\'s Garage' },
    ] },
  { id: 3, title: 'Harbor Lights', reward: 800, timer: 0,
    intro: 'Meet the contact at the docks. Then run — the patrols are already on their way.',
    steps: [
      { kind: 'goto', x: 2880, y: 2240, label: 'Meet the contact at the docks' },
      { kind: 'escape', timer: 45, label: 'Lose the police — stay free until the heat dies down' },
    ] },
  { id: 4, title: 'The Shakedown', reward: 1000, timer: 0,
    intro: 'Three shops owe the crew. Visit each one and collect. Stand close and hold your ground.',
    steps: [
      { kind: 'collect', x: 560, y: 1040, label: 'Collect from Café Luna' },
      { kind: 'collect', x: 2160, y: 760, label: 'Collect from Bar El Faro' },
      { kind: 'collect', x: 2800, y: 1600, label: 'Collect from Tienda Coral' },
    ] },
  { id: 5, title: 'Gold Run', reward: 2500, timer: 170,
    intro: 'The bank gold leaves tonight. Grab it at Banco de Velmara and get it to the yacht. The whole city will be looking.',
    steps: [
      { kind: 'pickup', x: 1520, y: 1320, label: 'Grab the gold at Banco de Velmara' },
      { kind: 'deliver', x: 3200, y: 2300, label: 'Deliver the gold to the yacht at the pier' },
    ] },
];
export const TAXI_FARES = [25, 30, 40, 50, 60, 70];
export const INTRO_TEXT = 'Velmara shines, but the shine is rented. Riko Vale came back to the city with empty pockets and a name people still remember. One courier job, one stolen car, one gold run — that is all it takes to own these streets again.';
export const CONTROLS_TEXT = 'WASD walk/drive · Mouse aim · Click shoot/punch · E enter/exit car · 1/2 weapon · R buy ammo $50 · Shift run/handbrake · P pause · M sound';

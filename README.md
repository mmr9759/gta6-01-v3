# VELMARA: Streets of Gold

An original open-world crime game for the make.fun **gta6-01** bounty — a
complete 2D top-down open world that runs offline in a desktop browser from
static files. Nothing here comes from Rockstar Games or any other commercial
game: the city, the characters, the cars, the story, the art and the sounds
are all invented for this entry.

## The game

Riko Vale is back in Velmara with empty pockets and a name people still
remember. Drive, steal, run and fight through five story missions — a
courier run, a stolen gold sports car, a meeting at the docks, a shakedown
of three shops, and a gold run to the yacht — then keep earning with taxi
fares once the story is done.

- **The city** — 3600×2600 of streets, avenues and six districts: pastel
  Casco Viejo, green Parque Verde, glass-towered Centro, hillside Las
  Lomas, the docks of Puerto del Sol and the beach of Playa Dorada. A
  harbour with wooden piers, palms along the beach road, a day/night cycle
  with sunset and street lamps.
- **On foot and by car** — walk, run, aim with the mouse, punch or shoot;
  steal any of six car models (Pico, Cometa, Aurea GT, Burro Truck, Taxi,
  Patrol Interceptor) and drive with handbrake skids.
- **Traffic and pedestrians** — 16 cars follow the road graph in the
  right-hand lane and brake for the car ahead, 7 parked cars, 26
  pedestrians who stroll the sidewalks and run from gunfire.
- **Wanted system** — heat 0–100, up to five stars. Patrol cars chase and
  ram, foot officers chase, arrest and shoot back at three stars. Pay-n-
  spray at Pintura Rosa ($300) clears the heat and fixes the car.
- **Missions and story** — five chained missions with map markers, a
  beacon, an edge-of-screen arrow and subtitles, timed runs, a hold-to-
  collect shakedown, an escape that never fails on the timer, and a
  three-star gold run. Taxi fares ($25–$70) after the story.
- **HUD** — objective panel, wanted stars, cash, clock and day, a live
  minimap with a district label, health and ammo, mission banners,
  subtitles and toasts.
- **Sound** — everything synthesized with WebAudio: engine hum, a
  two-tone siren, gunfire, pickups, mission jingles and a bassline loop.
  No audio files.
- **Save** — progress (cash, mission, position, health, ammo, clock) in
  localStorage, with New Game / Continue on the title screen.

## Controls

WASD walk/drive · Mouse aim · Click shoot/punch · E enter/exit car ·
1/2 weapon · R buy ammo ($50) · F pay-n-spray ($300, near Pintura Rosa) ·
Shift run/handbrake · P pause · M sound

## Play it

Serve `game/` with any static server and open `index.html`:

```sh
cd game && python3 -m http.server 8080
```

## Layout

- `game/index.html` — the page and all of the HUD styling
- `game/src/config.js` — world, districts, landmarks, cars, missions
- `game/src/random.js` — deterministic RNG (world seed 20261117)
- `game/src/city.js` — city generation, road graph, collision
- `game/src/audio.js` — synthesized WebAudio sounds and music
- `game/src/input.js` — keyboard and mouse
- `game/src/peds.js` — pedestrians
- `game/src/vehicles.js` — driving physics, traffic AI, collisions
- `game/src/police.js` — patrol cars, foot officers, busted/wasted
- `game/src/player.js` — Riko on foot and in cars, combat, save
- `game/src/missions.js` — the five story missions and taxi fares
- `game/src/hud.js` — DOM HUD and minimap
- `game/src/render.js` — canvas drawing, lighting, camera
- `game/src/shots.js` — the four screenshot scenes (`?shot=1..4`)
- `game/src/main.js` — boot and game loop
- `main.ts` — the entry program (copies `game/` + `screenshots/` and
  writes `dossier.json`)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## Screenshots

1. `1-gold-run-chase.jpg` — the Gold Run chase through Centro, four stars
2. `2-marina-morning.jpg` — on foot at the marina in the morning
3. `3-harbor-lights-dusk.jpg` — Harbor Lights at the docks at dusk
4. `4-taxi-golden-hour.jpg` — a taxi fare on the beach road at golden hour

## License

MIT — see `LICENSE`.

## Notes for the judge

The screenshots are real renders of this game's own code, taken in a
headless browser with `?shot=1..4`. The cover shows several systems at
once: a three-star gold-run chase, the wanted level, the minimap, the
mission objective and the traffic around it.

// main.ts — VELMARA: Streets of Gold (gta6-01). Hands the game in: copies
// game/ and screenshots/ from this repository into the output directory and
// writes /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Node 22, standard library only. Both runs write the same bytes.
//
// The game itself is an original open-world crime game: the city of Velmara,
// its driver Riko Vale, six car models, traffic and pedestrians, a wanted
// system with patrol cars and foot officers, five chained story missions
// plus taxi fares, combat, a HUD with a minimap, day/night, and synthesized
// sound. No assets from any commercial game.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function clearDir(dir) {
  // Empty the directory one entry at a time. Never remove the directory
  // itself: in the grader /output is a mount point and removing it fails.
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function main() {
  clearDir(outDir);
  const gameSrc = join(here, 'game');
  const shotsSrc = join(here, 'screenshots');
  if (!existsSync(gameSrc)) throw new Error('game/ not found in repository');
  cpSync(gameSrc, join(outDir, 'game'), { recursive: true });
  if (existsSync(shotsSrc)) cpSync(shotsSrc, join(outDir, 'screenshots'), { recursive: true });
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log('wrote ' + join(outDir, 'dossier.json') + ' (' + dossier.length + ' bytes)');
}

main();

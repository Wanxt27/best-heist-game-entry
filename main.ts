// VAULTBREAK — The Midnight Vault: the entrypoint.
// One clear job: hand the game in. It copies game/ and screenshots/
// from this repository into the output directory and writes
// /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
// The output directory itself is never removed — only its known
// contents (game/, screenshots/, dossier.json) are cleared first.
import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = dirname(fileURLToPath(new URL('main.ts', import.meta.url)));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The entry is the game and its screenshots: refuse early, with a
// readable error, when either is missing instead of handing in a
// half-empty output directory.
for (const name of ['game', 'screenshots']) {
  const src = join(repoRoot, name);
  if (!existsSync(src)) throw new Error('main.ts: missing ' + src + ' — nothing to hand in');
}

mkdirSync(outDir, { recursive: true });

for (const name of ['game', 'screenshots']) {
  const target = join(outDir, name);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  cpSync(join(repoRoot, name), target, { recursive: true });
}

const dossierPath = join(outDir, 'dossier.json');
if (existsSync(dossierPath)) rmSync(dossierPath, { force: true });
const dossier = buildDossier(outDir, { text_max_bytes: 163840 });
writeFileSync(dossierPath, dossier);

console.log('wrote ' + dossierPath + ' (' + dossier.length + ' bytes)');

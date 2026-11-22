# VAULTBREAK — The Midnight Vault

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Wanxt27/best-heist-game-entry/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Wanxt27/best-heist-game-entry/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down 2D heist game that runs in a desktop browser from its own
static files. Three vault rooms, guards with vision cones and
line-of-sight, sweeping security cameras, shadow zones to hide in, an
alarm meter, coin distractions and EMP freezes. Crack the vault, grab
the loot, reach the exit — and don't get caught.

Made for the [$50 "Make the best heist game" bounty on make.fun](https://make.fun/bounty/best-heist-game-20261122-0559). Play it on make.fun with referral code `qzc860x6`.

## Play

Serve `game/` with any static HTTP server and open `game/index.html`.
No network requests, no build step.

- **WASD / arrows** — move
- **Shift** — sneak (slower, harder to spot)
- **E** — crack the vault / grab bonus loot
- **Q** — toss a coin ($25) to distract a nearby guard
- **F** — EMP freeze on the cameras (6s, 2 per level)
- **R** — restart the level
- **M** — mute

Win a level by cracking the vault and reaching the exit. Clear all
three rooms for the getaway screen with your total loot, time and crew
rating.

## Shots

`?shot=start` shows the title screen, `?shot=play` a mid-heist frame
with the whole game visible at once, `?shot=end` the getaway screen.

## Layout

- `game/index.html` — page and canvas
- `game/style.css` — page chrome
- `game/src/levels.js` — the three rooms, patrols and cameras
- `game/src/guards.js` — guard patrols, vision cones, line of sight
- `game/src/cameras.js` — sweeping wall cameras
- `game/src/game.js` — state machine and heist rules
- `game/src/render.js` — everything drawn on the canvas
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesized WebAudio bleeps
- `game/src/shots.js` — deterministic screenshot frames
- `game/src/main.js` — boot and main loop
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to
  `/output` and writes `/output/dossier.json`

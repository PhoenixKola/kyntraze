# KYNTRAZE: FRACTURE RUSH · Release Candidate (B21, owner review pending)

> **Working title.** Standalone, original horde-survival game. This is a **release candidate pending owner sign-off**, not a final release. Artistic, audio-by-ear, real-GPU and human-playtest sign-off are listed in [B20-STATUS.md](B20-STATUS.md) and [B20-RELEASE-CANDIDATE-CHECKLIST.md](B20-RELEASE-CANDIDATE-CHECKLIST.md). The title is not trademark-cleared; see [LICENSE-NOTICES.md](LICENSE-NOTICES.md).

## What the game is

A fast top-down survival run of about **15-18 minutes**. Move, auto-attack, spend Q / E / R abilities, level up with 3-card choices (25 upgrades, Common / Rare / Epic), survive escalating waves in one of **two arenas** (The Gloam Circuit, The Ashen Reliquary), beat the **Fracture Warden at ~8:00** and the **Null Seraph at ~15:00** (final warning at ~14:30). Defeating the Seraph wins the run after a staged death sequence.

### Heroes and transformations

| Hero | Style | Transformations | How each is earned |
|---|---|---|---|
| **Kai** | Versatile fighter | Flarebound (Drive 65+), Cometheart, Stillfire Apex | Cometheart: defeat the Warden as Kai. Stillfire Apex: defeat the Seraph as Kai; in later runs it can be chosen only from ~10:00 with full Drive. |
| **Ren** | Aggressive melee | Crimson Ascendant | Defeat the Fracture Warden as Ren. |
| **Sora** | Ranged precision | Azure Sovereign | Defeat the Fracture Warden as Sora. |

Unlocks are per hero: a Ren or Sora milestone never unlocks Kai's forms, and Ren and Sora never unlock each other.

### Progression (local only)

Fracture Marks are earned at the end of every run (once per run, never duplicated) and spent in the Armory: 5 starting boons, Reroll and Banish modules, 3 crests. 4 optional Contracts, 16 Feats and per-arena mastery objectives are tracked in the Archives. Boss timings and telegraphs never change with contracts.

## Controls

| Action | Keyboard / mouse | Controller |
|---|---|---|
| Move | WASD / arrows | Left stick / D-pad |
| Aim | Mouse | Right stick |
| Dash | Shift / Space | A |
| Q ability | Q | X |
| E ability (Sora: hold to charge, release to fire) | E | RB / RT |
| R ability | R | LB / LT |
| Transformation / Kai form selector (tap or hold) | F, then 1 / 2 / 3 or click | Y |
| Level-up: pick / reroll / banish | click or 1-3; R rerolls; Shift+1-3 banishes (modules from the Armory) | D-pad + A |
| Pause | Esc | Start |

Settings (Master / Music / Effects / Interface volume, Mute, Reduced Effects, Pause on blur) are stored locally. Touch-screen play is **not** a supported input.

## Requirements and running

- Node.js **20.19+** (22 LTS recommended), npm 10+. Developed and automatically tested on Windows with **Chromium**; other browsers are not verified.
- The built game has no backend, no account, no analytics and no hotlinked assets; it works offline when served (opening `dist/index.html` over `file://` is unsupported).

```powershell
npm ci
npm run dev          # http://127.0.0.1:5173
npm run typecheck
npm test             # Vitest
npm run test:e2e     # Playwright (starts the dev server)
npm run build
npm run preview      # production build, http://127.0.0.1:4173
```

Progress lives in the browser's `localStorage` (key `kyntraze-b00-v1`). The `?qa=1` developer route only works on the dev server and writes a **separate** save (`kyntraze-b00-v1-qa`); production builds contain no QA hooks. Production smoke check: `PROD_URL=http://127.0.0.1:4173 npx playwright test e2e/prod-smoke.spec.ts`. Balance probe (relative evidence, not a player): `BALANCE=1 npx vitest run src/tests/balance.bot.test.ts`.

### Windows desktop (Electron, B21)

The same React + Phaser build runs in a locked-down Electron window (`electron/main.cjs`, no preload, no IPC, `nodeIntegration` off, `contextIsolation` and `sandbox` on, all permissions denied, navigation and window-open blocked, remote requests cancelled, CSP on every response). The packaged app serves `dist/` from a private `app://kyntraze` origin so the game's absolute `/art` and `/audio` URLs and `localStorage` behave exactly as on a web server, with one stable save profile (`%APPDATA%\KYNTRAZE FRACTURE RUSH`). The desktop save is **separate** from any browser save; there is no import/export, no updater and no network use.

```powershell
npm run desktop:dev        # Vite on 127.0.0.1:5174 + Electron window, Vite stopped on exit
npm run desktop:build      # = npm run build (the dist/ the desktop app serves)
npm run desktop:smoke      # run dist/ in Electron twice on a throw-away profile: zero failed requests, no Node in the page, no QA hook, save marker persists
npm run desktop:pack       # unpacked app in release\win-unpacked
npm run desktop:dist:win   # NSIS installer: release\KYNTRAZE-FRACTURE-RUSH-Setup-<version>.exe
```

`F11` / `Alt+Enter` toggle fullscreen; `Esc` stays the game's pause key. The installer is **unsigned** (Windows SmartScreen may warn; do not bypass it for public distribution). The game is not commercially cleared: see `LICENSE-NOTICES.md`.

## Folder map

- `src/sim/`: authoritative seeded simulation, independent of React/Phaser.
- `src/game/`: Phaser scenes, rendering, input, audio. `src/bridge/`: UI snapshot bridge. `src/app/`: React shell and screens.
- `src/content/`: heroes, kits, upgrades, enemies, arenas, meta economy.
- `src/tests/`, `e2e/`: Vitest and Playwright suites.
- `art/`, `art-source/`, `prompts/`: source art, rigs, reviews and generation records (not part of the shipped `dist/`). `public/`: runtime assets.
- Batch history: `B06-STATUS.md` ... `B20-STATUS.md`; older `docs/` pages describe earlier batches and are labelled where stale.

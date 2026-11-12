# Batch 00 verification record · 12 November 2026

**Classification: PARTIALLY VERIFIED SOURCE / NOT BROWSER-SIGNED-OFF.** This package is intended as a runnable local project, but **the complete npm dependency installation, final TS application compilation, production Vite bundle, and live Phaser browser gameplay were NOT verified** in the restricted authoring container.

## Actual environment

- Sandbox Linux, Node **v22.16.0**, npm **10.9.2**, global TypeScript compiler available.
- npm registry access fails with DNS `EAI_AGAIN registry.npmjs.org`. No existing `node_modules` for Phaser, React, Vite or Vitest available; Chromium binary exists, but cannot load an unbuilt application.
- Phaser **4.2.1** was confirmed from the official Phaser release index as the stable version; source code pins it exactly.

## Commands actually executed

| Command / check | Result | Evidence / limitation |
|---|---|---|
| `tsc -p tsconfig.core.json --pretty false` | **PASS** | Strict TypeScript core, content, bridge and sim modules typechecked via global compiler. |
| `KYN_TSC_PATH=<global-typescript-path> node scripts/core-smoke.cjs` | **PASS** | Eight groups: content integrity, early spawns, time, pause, kill/XP, invulnerability, save migration and seeded replay. |
| TypeScript `transpileModule` syntax scan (src, e2e, configs) | **PASS** | **62** files, zero syntax diagnostics. This is not a full app typecheck. |
| Asset validation | **PASS** | Real 4 facing PNGs plus two enemy PNGs, XP icon, favicon; all locally generated placeholders. |
| `npm ci --ignore-scripts --fetch-timeout=5000 --fetch-retries=0` | **BLOCKED** | `EAI_AGAIN` resolving npm registry, stopped by 8-second timeout; no packages available. |
| `npm run typecheck` | **BLOCKED** | `TS2688 Cannot find type definition file for 'vite/client'` due absent dependencies. |
| `npm test` | **BLOCKED** | `vitest: not found` due absent dependencies. Unit test source written but not executed. |
| `npm run build` | **BLOCKED** | TypeScript cannot find `vite/client`, and Vite is not installed. No production output claimed. |
| `npm run test:e2e` / live real-browser play | **NOT RUN** | Cannot boot app without npm package installation; no screenshots or FPS metrics claimed. |

## Important lockfile limitation

The included `package-lock.json` is **provisional direct-dependency metadata**, not a fully npm-resolved package tree. Because npm registry access was blocked, the transitive dependency graph and tarball integrity hashes could not be generated or validated. **Do not use `npm ci` as your first install from this package.** Run `npm install` on an internet-connected machine **first** to generate a complete verified lockfile; then `npm ci` is appropriate for subsequent clean installs. This falls short of the handoff's verified-lockfile ideal and must be resolved before accepting B00 as a final reproducible baseline.

## Windows acceptance run

```powershell
cd kyntraze-fracture-rush
node -v
npm install
npm run typecheck
npm run typecheck:core
npm test
npm run test:smoke
npm run build
npm run dev
```

Open `http://127.0.0.1:5173/?seed=1234`, use **Enter the Fracture → Deploy Kai**, and verify controls, enemy pursuit, XP/upgrades, Q, Shift, F, Esc, death and retry. After the development server is active, Playwright tests can be run independently:

```powershell
npx playwright install chromium
npm run test:e2e
```

If the first `npm install` fails, save and share the complete terminal error. If the build succeeds but the game is black, capture browser console messages and attach them with the updated ZIP; don't call it an animation defect without inspecting actual logs.

## Visual and design caveats

- This is an intentionally **technical art prototype**, not the user-approved Kai/Ren/Sora artwork. No genuine character animation, Blender rig assets, audio or normal-speed live visual signoff exists yet.
- B00 contains no bosses/victory run and has not been tuned for 18-minute balance.
- Two enemy kinds and Form I only. Full production features are sequenced in `docs/07-batch-roadmap.md`.
- No Git push or deployment was performed.

# B22 release checklist
- [x] typecheck, unit tests, targeted e2e (HUD, modes, local co-op, online co-op)
- [x] additive save migration with fixtures; ledger idempotency
- [x] server hardening tests (version, malformed, rate limit, full room, reconnect, verified result once)
- [ ] `npm run build` + `npm run desktop:smoke` + `desktop:dist:win` after B22 (NOT RUN)
- [ ] Electron: set a wss server in the Online lobby, confirm CSP/request filter allow only that origin (NOT RUN)
- [ ] ImageGen/Blender art for arenas, enemies, bosses, Vex, outfits (NOT DONE)
- [ ] listen to every new music cue and SFX (NOT DONE)
- [ ] human playthrough: Classic x4 heroes, Expedition x2 realms, Endless 30 min, Boss Rush x3, Vex trial, co-op local + online
- [ ] two-pad local co-op test
- [ ] host the server behind TLS and test from another network
- [ ] code signing (installer is unsigned)
Provenance: music = `scripts/b22-synth.py` (original, generated); SFX = `src/game/audio/b22Sfx.ts` (original, runtime); art = procedural code or tinted existing art. No third-party assets or services were added.

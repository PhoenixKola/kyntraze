# Manual and automated QA checklist

- [ ] Fresh extract + `npm install`, `npm run dev`, local browser loads title.
- [ ] `npm run typecheck`, `npm test`, `npm run build`, `npm run preview` PASS.
- [ ] `npx playwright install chromium` then `npm run test:e2e` PASS.
- [ ] Start Kai with seed=123; move all eight directions and ensure no speed exploit on diagonal.
- [ ] Run into obstacles and edge; player cannot cross them, including Shift dash.
- [ ] Reach range of enemies, see auto attack, kill and collect mint XP; level-up modal shows exactly 3 different upgrades.
- [ ] Choose damage, stride and max HP in separate runs; each changes measurable behavior.
- [ ] Q damages nearby enemies; cooldown prevents spam.
- [ ] Accumulate >=65 Drive; F activates distinct temporary empowered attacks and safely reverts.
- [ ] Escape pause; wait 10s: enemy positions/time and HP unchanged; resume continues.
- [ ] Alt-tab while game running pauses if setting enabled; no sticky movement keys on return.
- [ ] Lose all HP (contact enemies), see true time/kills/level/score; retry resets same seed; home returns title.
- [ ] Corrupt localStorage and reload; game still starts; settings and best record persist normally.
- [ ] Check 1920x1080, 1366x768, 1024x600 and smaller window; no critical HUD/upgrade/modal overflow.
- [ ] Watch normal-speed 3-minute gameplay and record honest performance/input observations and any browser console errors.

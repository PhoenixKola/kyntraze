// B10 focused live capture: real Phaser app on the dev server; the QA hook only places things / forces a level-up.
// node scripts/b10-capture.cjs <outDir> <width> <height> [port]
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const [out, W, H, port = '5173'] = [process.argv[2], Number(process.argv[3] || 960), Number(process.argv[4] || 540), process.argv[5] || '5173'];
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } }); const page = await ctx.newPage(); const errors = []; const shots = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); }); page.on('pageerror', e => errors.push('pageerror ' + String(e).slice(0, 200)));
  const shot = async n => { const f = `${n}-${W}x${H}.png`; await page.screenshot({ path: path.join(out, f) }); shots.push(f); };
  const qa = (f, a) => page.evaluate(f, a);
  const boot = async arena => { await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1&arena=${arena}`); await sleep(400); await page.getByTestId('play-button').click(); await sleep(250); await page.getByTestId('start-run').click(); await page.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(700); };
  const heal = () => qa(() => { const s = window.__KYNT_QA__.sim(); s.player.attackClock = 1e9; if (!window.__heal) window.__heal = setInterval(() => { const q = window.__KYNT_QA__ && window.__KYNT_QA__.sim(); if (q && q.phase === 'running') q.player.hp = q.player.maxHp; }, 100); });
  const mobs = (n, kinds) => qa(([n, kinds]) => { const s = window.__KYNT_QA__.sim(), p = s.player; const DEF = { pursuer: [25, 17, 74, 10], flanker: [18, 15, 118, 7], ranged: [20, 16, 66, 6], aegis: [220, 22, 52, 14], cantor: [90, 18, 70, 6] };
    for (let i = 0; i < n; i++) { const k = kinds[i % kinds.length], d = DEF[k], a = i * 2.399, r = 150 + (i * 47) % 600; s.enemies.push({ id: s.nextId++, kind: k, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.8, hp: d[0], maxHp: d[0], radius: d[1], speed: 0, damage: d[3], touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 99, aimX: 1, aimY: 0, stagger: 0, spawnedAt: s.time }); } }, [n, kinds]);

  // 1) the level-up screen: a plain first level, then Rare/Epic-heavy mid-run offers
  await boot('gloam'); await heal();
  await qa(() => window.__KYNT_QA__.grantXp()); await page.getByTestId('level-up').waitFor(); await sleep(900); await shot('levelup-1-first-level');
  await page.keyboard.press('2'); await sleep(300);
  const afterPick = await qa(() => { const s = window.__KYNT_QA__.sim(); return { phase: s.phase, stacks: { ...s.upgradeStacks }, level: s.player.level }; });
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.level = 11; s.upgradeStacks = { hardlight: 2, widelance: 1, afterglow: 1, plating: 2, impact: 3, stride: 1 }; s.mods.beamDamage = 1.44; s.mods.beamWidth = 1.2; });
  await qa(() => window.__KYNT_QA__.grantXp(['conductor', 'afterburn', 'twinbloom'])); await page.getByTestId('level-up').waitFor(); await sleep(1000); await shot('levelup-2-epic-rare-build');
  await page.getByTestId('upgrade-afterburn').hover(); await sleep(600); await shot('levelup-3-hover-selected');
  await page.getByTestId('upgrade-afterburn').click(); await sleep(300);
  const afterRare = await qa(() => { const s = window.__KYNT_QA__.sim(); return { phase: s.phase, linger: s.mods.beamLinger }; });

  // 2) the minimap: calm, crowd + elite, hazard warning, boss
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.enemies.length = 0; s.player.nextXp = 1e9; s.player.x = 1100; s.player.y = 800; }); await sleep(600); await shot('map-1-calm');
  await mobs(34, ['pursuer', 'flanker', 'ranged']); await mobs(2, ['aegis']); await mobs(1, ['cantor']); await sleep(900); await shot('map-2-crowd-elite');
  await qa(() => window.__KYNT_QA__.arenaHazard()); await sleep(900); await shot('map-3-hazard-warn');
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; s.hazards.length = 0; window.__KYNT_QA__.encounter('warden'); }); await sleep(2600); await shot('map-4-boss');
  const mapState = await qa(() => { const s = window.__KYNT_QA__.sim(); return { enemies: s.enemies.length, boss: s.enemies.some(e => e.kind === 'warden') }; });
  const mm = await page.getByTestId('minimap').boundingBox(); const hudBoxes = await qa(() => [...document.querySelectorAll('.hud-health,.hud-clock,.hud-pause,.hud-slots,.hud-map,.boss-bar')].map(e => { const r = e.getBoundingClientRect(); return [e.className.split(' ').slice(0, 2).join('.'), Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }));

  // 3) ashen arena map
  await ctx.clearCookies(); await boot('ashen'); await heal(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.player.nextXp = 1e9; }); await mobs(26, ['pursuer', 'flanker', 'ranged']); await qa(() => window.__KYNT_QA__.arenaHazard()); await sleep(1000); await shot('map-5-ashen-hazard');
  fs.writeFileSync(path.join(out, `evidence-b10-${W}x${H}.json`), JSON.stringify({ viewport: [W, H], shots, afterPick, afterRare, mapState, minimapBox: mm, hudBoxes, consoleErrors: errors, NOT_VERIFIED: ['frame pacing on a real GPU (swiftshader run)', 'long-run balance with a human player'] }, null, 1));
  console.log(JSON.stringify({ shots, afterPick, afterRare, mapState, mm, hudBoxes, errors }));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

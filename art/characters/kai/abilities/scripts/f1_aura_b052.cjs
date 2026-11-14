// Form I persistent-presentation check: idle / moving / charging / firing / crowded stills at 1x plus fps for Base vs Form I in a crowd.
const { chromium } = require('@playwright/test'); const path = require('path'); const out = process.argv[2]; const W = Number(process.argv[3] || 960), H = Number(process.argv[4] || 540);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const c = await b.newContext({ viewport: { width: W, height: H } }); const page = await c.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:5191/?seed=41&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click(); await page.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(500);
  const qa = f => page.evaluate(f); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 1e6; s.player.maxHp = 1e6; s.player.nextXp = 1e9; s.player.attackClock = 1e9; s.spawnTimer = 1e9; s.nextFlanker = 1e9; });
  const crop = async n => { const h = await qa(() => { const q = window.__KYNT_QA__, p = q.heroPose(), s = q.sim(); const r = document.querySelector('canvas').getBoundingClientRect(); return { x: p.x - Math.max(0, Math.min(2200 - 960, s.player.x - 480)) + r.left, y: p.y - Math.max(0, Math.min(1600 - 540, s.player.y - 270)) + r.top }; }); await page.screenshot({ path: path.join(out, n + '.png'), clip: { x: Math.max(0, h.x - 110), y: Math.max(0, h.y - 120), width: 220, height: 170 } }); };
  const fps = () => qa(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 2000 ? requestAnimationFrame(f) : res(n / 2); }; requestAnimationFrame(f); }));
  const crowd = n => qa(n => { const s = window.__KYNT_QA__.sim(), p = s.player; s.enemies.length = 0; for (let i = 0; i < n; i++) { const a = i * 2.399, r = 70 + (i * 13) % 330; s.enemies.push({ id: 8000 + i, kind: i % 3 ? 'pursuer' : 'flanker', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, hp: 1e6, maxHp: 1e6, radius: 17, speed: 0, damage: 0, touchCooldown: 0 }); } }, n);
  const res = {};
  await crowd(80); res.fpsBaseCrowd = await fps(); await qa(() => { window.__KYNT_QA__.sim().enemies.length = 0; });
  await qa(() => { window.__KYNT_QA__.sim().player.drive = 100; }); await page.keyboard.down('f'); await sleep(80); await page.keyboard.up('f'); await sleep(1400);
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.drive = 100; });
  for (const i of [0, 1, 2]) { await crop('f1-idle-' + i); await sleep(450); }
  await page.keyboard.down('d'); await sleep(350); await crop('f1-run-0'); await sleep(250); await crop('f1-run-1'); await page.keyboard.up('d');
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.drive = 100; s.player.beamCooldown = 0; s.player.sphereCooldown = 0; }); await page.keyboard.down('r'); await sleep(60); await page.keyboard.up('r'); await sleep(450); await crop('f1-sphere-charge'); await sleep(900);
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.drive = 100; s.player.beamCooldown = 0; }); await sleep(1200); await page.keyboard.down('e'); await sleep(60); await page.keyboard.up('e'); await sleep(250); await crop('f1-beam-charge'); await sleep(350); await crop('f1-beam-fire'); await sleep(900);
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.drive = 100; }); await crowd(80); await sleep(300); await crop('f1-crowd'); res.fpsF1Crowd = await fps();
  await page.screenshot({ path: path.join(out, 'f1-crowd-full.png') }); res.errors = errs.length; console.log(JSON.stringify(res)); await b.close();
})();

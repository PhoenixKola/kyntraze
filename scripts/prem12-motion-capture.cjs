// Pre-B12 motion proof: real Phaser app, real W/A/S/D key presses; frames are sampled every ~70 ms around Kai (2x DPR) so a run cycle and the moving auto-punch can be reviewed.
// node scripts/prem12-motion-capture.cjs <outDir> [port]    -> <outDir>/frames/<form>-<dir>-<mode>-NN.png + motion.json (pose clip per frame)
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const out = process.argv[2], port = process.argv[3] || '5173'; const W = 960, H = 540;
fs.mkdirSync(path.join(out, 'frames'), { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 }); const page = await ctx.newPage(); const errors = []; const log = {};
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); }); page.on('pageerror', e => errors.push('pageerror ' + String(e).slice(0, 200)));
  const qa = (f, a) => page.evaluate(f, a);
  await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1&arena=gloam`); await sleep(400); await page.getByTestId('play-button').click(); await sleep(250); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(800);
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.enemies.length = 0; s.player.nextXp = 1e9; if (!window.__heal) window.__heal = setInterval(() => { const q = window.__KYNT_QA__ && window.__KYNT_QA__.sim(); if (q && q.phase === 'running') q.player.hp = q.player.maxHp; }, 100); });
  const box = { x: W / 2 - 90, y: H / 2 - 105, width: 180, height: 185 };
  async function grab(form, dir, mode, key, n, gapMs) {
    const poses = [];
    if (form === 'f1') { const on = await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.drive = 100; s.player.formCooldown = 0; return s.player.form; }); if (!on) { await page.keyboard.press('f'); await sleep(1700); } }
    await qa(([m]) => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; s.player.x = 1100; s.player.y = 800; s.player.attackClock = m === 'punch' ? 0.2 : 1e9; }, [mode]);
    await page.keyboard.down(key); await sleep(380);
    for (let i = 0; i < n; i++) {
      if (mode === 'punch') await qa(() => { const s = window.__KYNT_QA__.sim(), p = s.player; if (!s.enemies.length || Math.hypot(s.enemies[0].x - p.x, s.enemies[0].y - p.y) > 200) { s.enemies.length = 0; s.enemies.push({ id: s.nextId++, kind: 'pursuer', x: p.x + 120, y: p.y, hp: 1e9, maxHp: 1e9, radius: 17, speed: 0, damage: 0, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 99, aimX: 1, aimY: 0, stagger: 0, spawnedAt: s.time }); } });
      await page.screenshot({ path: path.join(out, 'frames', `${form}-${dir}-${mode}-${String(i).padStart(2, '0')}.png`), clip: box });
      poses.push(await qa(() => { const h = window.__KYNT_QA__.heroPose(); return [h.clip ?? h.anim ?? null, h.facing ?? null, h.frame ?? null, h.legs ?? null]; }));
      await sleep(gapMs);
    }
    await page.keyboard.up(key); await sleep(150); log[`${form}-${dir}-${mode}`] = poses;
  }
  const DIRS = [['w', 'north'], ['s', 'south'], ['a', 'west'], ['d', 'east']];
  for (const form of ['base', 'f1']) {
    for (const [k, d] of DIRS) { await grab(form, d, 'run', k, 12, 55); await grab(form, d, 'punch', k, 14, 55); }
  }
  fs.writeFileSync(path.join(out, 'motion.json'), JSON.stringify({ note: 'swiftshader headless; frames sampled ~every 70-90 ms real time; not a substitute for watching at 60 fps', log, errors }, null, 1));
  console.log(JSON.stringify({ errors, sample: log['base-east-punch'] })); await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

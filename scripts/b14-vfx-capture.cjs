// B14 VFX stills: ground presence per form, Form II R opening, auto attacks per form, Form III Instinct Reversal. Real app, dev server, swiftshader; forces state only.
// node scripts/b14-vfx-capture.cjs <outDir> [tag] [port]
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const [out, tag = '', port = '5173'] = [process.argv[2], process.argv[3] || '', process.argv[4] || '5173'];
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const W = 960, H = 540;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [], shots = [];
  async function run(form, fn) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 }); const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); }); page.on('pageerror', e => errors.push('pageerror ' + String(e).slice(0, 200)));
    const qa = (f, a) => page.evaluate(f, a);
    const waitFor = async (f, ms = 6000, a) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await qa(f, a)) return true; await sleep(16); } return false; };
    const crop = async n => { const f = `${n}${tag}.png`; await page.screenshot({ path: path.join(out, f), clip: { x: W / 2 - 200, y: H / 2 - 150, width: 400, height: 260 } }); shots.push(f); };
    const full = async n => { const f = `${n}${tag}.png`; await page.screenshot({ path: path.join(out, f) }); shots.push(f); };
    const freeze = async (n, f, a, c = crop) => { await qa(() => { const s = window.__KYNT_QA__.sim(); if (s.player.form) s.player.drive = 100; }); await waitFor(f, 5000, a); await qa(() => { window.__KYNT_QA__.sim().phase = 'paused'; }); await sleep(140); await c(n); await qa(() => { window.__KYNT_QA__.sim().phase = 'running'; }); };
    await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1${form === 3 ? '&form3=1' : form === 2 ? '&form2=1' : ''}&arena=gloam`); await sleep(500);
    await page.addStyleTag({ content: '[data-testid=pause-menu]{display:none!important}' });
    await page.getByTestId('play-button').click(); await sleep(250); await page.getByTestId('start-run').click(); await page.waitForFunction(() => !!window.__KYNT_QA__); await sleep(1500);
    await qa(() => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.enemies.length = 0; s.player.hp = 1e6; s.player.maxHp = 1e6; });
    if (form) { await qa(f => { const s = window.__KYNT_QA__.sim(); s.cometSeen = 1; s.apexSeen = 1; s.player.drive = 100; s.player.form = f; }, form); await sleep(1800); }
    await fn({ page, qa, waitFor, crop, full, freeze });
    await ctx.close();
  }
  const foes = (qa, n, dist = 80, hp = 300) => qa(({ n, dist, hp }) => { const s = window.__KYNT_QA__.sim(), p = s.player; for (let i = 0; i < n; i++) { const a = (i / n) * 6.28 + 0.4; s.enemies.push({ id: s.nextId++, kind: 'pursuer', x: p.x + Math.cos(a) * (dist + (i % 3) * 30), y: p.y + Math.sin(a) * (dist + (i % 3) * 30), hp, maxHp: hp, radius: 17, vx: 0, vy: 0, stagger: 0, flash: 0, hitStop: 0, speed: 0 }); } }, { n, dist, hp });
  const only = process.argv[5] || 'all';
  // ---- ground presence
  if (only === 'all' || only === 'ground') {
    await run(0, async c => { await c.crop('ground-base'); });
    await run(1, async c => { await c.crop('ground-f1'); });
    await run(2, async c => { await c.crop('ground-f2'); await sleep(900); await c.crop('ground-f2b'); });
    await run(3, async c => { await c.crop('ground-f3'); });
  }
  // ---- Form II R opening, four facings
  if (only === 'all' || only === 'cannon') for (const [dn, ang] of [['e', 0], ['n', -1.5708], ['w', 3.1416], ['s', 1.5708]]) await run(2, async c => {
    await c.qa(a => { const s = window.__KYNT_QA__.sim(), p = s.player; for (let i = 0; i < 5; i++) { const d = 150 + i * 40, sd = (i - 2) * 26; s.enemies.push({ id: s.nextId++, kind: 'pursuer', x: p.x + Math.cos(a) * d - Math.sin(a) * sd, y: p.y + Math.sin(a) * d + Math.cos(a) * sd, hp: 900, maxHp: 900, radius: 17, vx: 0, vy: 0, stagger: 0, flash: 0, hitStop: 0, speed: 0 }); } s.player.cometCooldown = 0; }, ang);
    await sleep(500); await c.page.keyboard.press('r');
    for (const [t, n] of [[0.05, 'a'], [0.25, 'b'], [0.5, 'c'], [1.0, 'd'], [1.6, 'e'], [1.72, 'f'], [1.95, 'g']]) await c.freeze(`r2-${dn}-${n}`, t => { const k = window.__KYNT_QA__.sim().cast; return !!k && k.kind === 'comet' && k.t >= t; }, t);
  });
  // ---- auto attacks (enemies nearby, attack clock live)
  if (only === 'all' || only === 'auto') for (const f of [0, 1, 2, 3]) await run(f, async c => {
    await c.qa(() => { const s = window.__KYNT_QA__.sim(); s.player.attackClock = 0; });
    await foes(c.qa, 5, 90, 5000);
    for (let i = 0; i < 10; i++) { await sleep(45); await c.freeze(`auto-f${f}-${i}`, () => true); }
  });
  // ---- Form III reversal
  if (only === 'all' || only === 'reversal') await run(3, async c => {
    await foes(c.qa, 5, 120, 400); await c.qa(() => { const s = window.__KYNT_QA__.sim(); s.player.reversalCooldown = 0; s.player.attackClock = 1e9; });
    await c.page.keyboard.press('r');
    for (const [t, n] of [[0.04, 'rev-a'], [0.2, 'rev-b'], [0.4, 'rev-c'], [0.6, 'rev-d'], [0.85, 'rev-e'], [1.1, 'rev-f']]) await c.freeze(n, t => { const k = window.__KYNT_QA__.sim().cast; return !!k && k.kind === 'reversal' && k.t >= t; }, t);
  });
  fs.writeFileSync(path.join(out, `evidence-vfx${tag}.json`), JSON.stringify({ shots, consoleErrors: errors, note: 'swiftshader stills; real-speed motion NOT watched' }, null, 1));
  console.log(JSON.stringify({ n: shots.length, errors })); await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

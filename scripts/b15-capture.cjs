// B15 combat-feedback stills: enemy hit, shield block, Kai hurt, mob death, boss hit. Real app, dev server, swiftshader.
// node scripts/b15-capture.cjs <outDir> [port]
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const [out, port = '5173'] = [process.argv[2], process.argv[3] || '5173'];
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [];
  for (const [W, H] of [[960, 540], [640, 360]]) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } }); const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); }); page.on('pageerror', e => errors.push('pageerror ' + String(e).slice(0, 200)));
    await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1&arena=gloam`); await sleep(500);
    await page.getByTestId('play-button').click(); await sleep(250); await page.getByTestId('start-run').click(); await page.waitForFunction(() => !!window.__KYNT_QA__); await sleep(1200);
    const qa = (f, a) => page.evaluate(f, a);
    const shot = async n => page.screenshot({ path: path.join(out, `${n}_${W}x${H}.png`) });
    await qa(() => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.enemies.length = 0; s.player.hp = 1e6; s.player.maxHp = 1e6; });
    const spawn = (kind, dx, dy, hp, extra) => qa(({ kind, dx, dy, hp, extra }) => { const s = window.__KYNT_QA__.sim(), p = s.player; s.enemies.push(Object.assign({ id: s.nextId++, kind, x: p.x + dx, y: p.y + dy, hp, maxHp: hp, radius: 18, damage: 8, speed: 0, aimX: -1, aimY: 0, mode: 'move', modeT: 1, touchCooldown: 0, stagger: 0, spawnT: 0 }, extra)); }, { kind, dx, dy, hp, extra });
    const impacts = () => qa(() => window.__KYNT_QA__.sim().impacts.map(i => i.kind));
    await spawn('pursuer', 70, 0, 900, { speed: 0 }); await sleep(450); await shot('hit'); console.log(W, 'impact kinds', await impacts());
    await qa(() => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; }); await spawn('aegis', 90, 0, 900, { aimX: -1 }); await sleep(500); await shot('block'); console.log(W, 'block kinds', await impacts());
    await qa(() => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; s.player.hp = 100; s.player.maxHp = 100; s.player.invulnerable = 0; }); await spawn('pursuer', 10, 0, 900, { speed: 0, touchCooldown: 0 }); await sleep(120); await shot('hurt');
    await qa(() => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; s.player.hp = 1e6; s.player.maxHp = 1e6; }); await spawn('bruiser', 70, 0, 20, {}); await qa(() => { window.__KYNT_QA__.sim().enemies[0].hp = 1; }); for (const [i, ms] of [[0, 150], [1, 150], [2, 250]]) { await sleep(ms); await shot('death_bruiser_' + i); }
    await ctx.close();
  }
  console.log('errors', errors); await browser.close();
})();

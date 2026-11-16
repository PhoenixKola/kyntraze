// B19 Ren / Sora ability + transformation stills (real app, dev server, swiftshader). node scripts/b19-capture.cjs <outDir> <port> [arena] [W] [H] [heroes]
const { chromium } = require('@playwright/test'); const path = require('path'); const fs = require('fs');
const [out, port, arena = 'gloam', W = 960, H = 540, heroes = 'ren,sora'] = [process.argv[2], process.argv[3], process.argv[4], +process.argv[5] || 960, +process.argv[6] || 540, process.argv[7]];
fs.mkdirSync(out, { recursive: true }); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
  for (const hero of (heroes || 'ren,sora').split(',')) {
    const page = await (await b.newContext({ viewport: { width: W, height: H } })).newPage(); page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()); });
    await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1&arena=${arena}&hero=${hero}&ascend=0`); await sleep(500); await page.getByTestId('play-button').click(); await sleep(300); await page.getByTestId('start-run').click();
    await page.waitForFunction(() => !!window.__KYNT_QA__); await sleep(600);
    const shot = n => page.screenshot({ path: path.join(out, `${hero}_${arena}_${n}_${W}x${H}.png`) });
    const crowd = (n = 9, r = 150) => page.evaluate(([n, r]) => { const s = window.__KYNT_QA__.sim(), p = s.player; s.spawnTimer = 1e9; s.nextFlanker = 1e9; p.hp = 1e6; p.maxHp = 1e6; p.nextXp = 1e9; s.enemies.length = 0; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, d = r * (0.6 + 0.8 * ((i * 7) % 5) / 5); s.enemies.push({ id: 900 + i, kind: i % 4 === 3 ? 'ranged' : 'pursuer', x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * 0.8, hp: 600, maxHp: 600, radius: 17, speed: 0, damage: 0, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 99, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 }); } p.qCooldown = 0; p.beamCooldown = 0; p.sphereCooldown = 0; }, [n, r]);
    await crowd(); await sleep(250); await shot('00_idle_crowd');
    const key = async (k, hold = 90) => { await page.keyboard.down(k); await sleep(hold); await page.keyboard.up(k); };
    for (const [name, k, hold, marks] of [['q', 'q', 90, [120, 250, 420]], ['e', 'e', hero === 'sora' ? 900 : 90, [150, 350, 600]], ['r', 'r', 90, [300, 700, 1100]]]) {
      await crowd(); await sleep(200); await key(k, hold); let t = 0; let i = 0; for (const m of marks) { await sleep(Math.max(0, m - t)); t = m; await shot(`10_${name}_${++i}`); }
      await sleep(1600);
    }
    await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.heroFormUnlocked = true; s.player.drive = 100; });
    await crowd(); await sleep(150); await key('f', 60);
    for (const [n, ms] of [['20_reveal_a', 300], ['20_reveal_b', 700], ['20_reveal_c', 700], ['20_reveal_d', 600]]) { await sleep(ms); await shot(n); }
    await sleep(1200); await crowd(); await sleep(200); await shot('30_ascended_idle');
    await page.keyboard.down('d'); await sleep(450); await shot('31_ascended_moving'); await page.keyboard.up('d');
    for (const [name, k, hold, marks] of [['q', 'q', 90, [120, 300]], ['e', 'e', hero === 'sora' ? 1300 : 90, [200, 500]], ['r', 'r', 90, [450, 1000]]]) {
      await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.player.drive = 100; }); await crowd(); await sleep(200); await key(k, hold); let t = 0, i = 0; for (const m of marks) { await sleep(Math.max(0, m - t)); t = m; await shot(`40_asc_${name}_${++i}`); }
      await sleep(1600);
    }
    console.log(hero, arena, 'phase', await page.evaluate(() => window.__KYNT_QA__.sim().phase), 'form', await page.evaluate(() => window.__KYNT_QA__.sim().player.form));
    await page.close();
  }
  console.log('errors', errs); await b.close();
})();

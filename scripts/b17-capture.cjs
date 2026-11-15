// B17 boss presentation stills (real app, dev server, swiftshader). node scripts/b17-capture.cjs <outDir> <port> [arena] [W] [H]
const { chromium } = require('@playwright/test'); const path = require('path'); const fs = require('fs');
const [out, port, arena = 'gloam', W = 960, H = 540] = [process.argv[2], process.argv[3], process.argv[4], +process.argv[5] || 960, +process.argv[6] || 540];
fs.mkdirSync(out, { recursive: true }); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
  for (const boss of ['warden', 'seraph']) {
    const page = await (await b.newContext({ viewport: { width: W, height: H } })).newPage(); page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text().slice(0, 150)); });
    await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1&arena=${arena}`); await sleep(500); await page.getByTestId('play-button').click(); await sleep(300); await page.getByTestId('start-run').click(); await page.waitForFunction(() => !!window.__KYNT_QA__); await sleep(1200);
    const near = () => page.evaluate(k => { const q = window.__KYNT_QA__.sim(), e = q.enemies.find(x => x.kind === k && x.hp > 0), p = q.player; if (e && e.mode !== 'intro') { e.x = p.x + 120; e.y = p.y - 40; } }, boss);
    const shot = async n => { await near(); return page.screenshot({ path: path.join(out, `${boss}_${arena}_${n}_${W}x${H}.png`) }); };
    const sim = f => page.evaluate(f);
    await sim(() => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.enemies.length = 0; s.player.hp = 1e6; s.player.maxHp = 1e6; window.__KYNT_QA__.encounter(window.__BOSS__ = arguments[0]); }).catch(() => {});
    await page.evaluate(k => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.player.hp = 1e6; s.player.maxHp = 1e6; window.__KYNT_QA__.encounter(k); }, boss);
    for (const [n, ms] of [['entrance1', 500], ['entrance2', 700], ['entrance3', 700]]) { await sleep(ms); await shot(n); }
    await sleep(1500);
    for (const [n, ms] of [['atk1', 700], ['atk2', 500], ['atk3', 500]]) { await sleep(ms); await shot(n); }
    await page.evaluate(k => { const e = window.__KYNT_QA__.sim().enemies.find(x => x.kind === k && x.hp > 0); if (e) { e.hp = e.maxHp * 0.45; } }, boss); await sleep(500); await shot('phase_break'); await sleep(1800); await shot('phase2_a'); await sleep(900); await shot('phase2_b');
    await page.evaluate(k => { const q = window.__KYNT_QA__.sim(), e = q.enemies.find(x => x.kind === k && x.hp > 0), p = q.player; if (e) { e.x = p.x + 70; e.y = p.y - 30; } p.nextXp = 1e9; window.__KYNT_QA__.killBoss(k); }, boss);
    for (const [n, ms] of [['death1', 120], ['death2', 350], ['death3', 400], ['death4', 450], ['death5', 450], ['death6', 450], ['death7', 500]]) { await sleep(ms); await shot(n); }
    if (boss === 'seraph') { await sleep(2500); await shot('after'); }
    console.log(boss, arena, W, 'phase', await page.evaluate(() => window.__KYNT_QA__.sim().phase));
    await page.close();
  }
  console.log('errors', errs); await b.close();
})();

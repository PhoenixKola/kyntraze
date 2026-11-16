// B21 boss damage levels: node scripts/b21-boss-capture.cjs <outDir> <port>. Warden + Seraph at 100/60/30% HP and phase 2 (QA route, stills, software GL).
const { chromium } = require('@playwright/test'); const path = require('path'); const fs = require('fs'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = process.argv[2], port = process.argv[3] || 5199; fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
  for (const boss of ['warden', 'seraph']) {
    const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage(); page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()); });
    await page.goto(`http://127.0.0.1:${port}/?seed=5&qa=1&arena=${boss === 'warden' ? 'gloam' : 'ashen'}&encounter=${boss}`); await sleep(500); await page.getByTestId('play-button').click(); await sleep(300); await page.getByTestId('start-run').click().catch(() => {});
    await page.waitForFunction(() => !!window.__KYNT_QA__); await sleep(500);
    await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.hp = 1e7; s.player.maxHp = 1e7; });
    await sleep(6500);
    for (const [name, frac, ph] of [['full', 1, 1], ['p1_60', 0.6, 1], ['p1_30', 0.3, 1], ['p2_70', 0.7, 2], ['p2_20', 0.2, 2]]) {
      await page.evaluate(([bk, f, ph]) => { const s = window.__KYNT_QA__.sim(), e = s.enemies.find(q => q.kind === bk); if (!e) return; e.hp = e.maxHp * f; if (e.ai) { e.ai.phase = ph; e.ai.invuln = true; } }, [boss, frac, ph]);
      await sleep(900); await page.screenshot({ path: path.join(out, `${boss}_${name}.png`) });
    }
    await page.close();
  }
  console.log('errors', errs); await b.close();
})();

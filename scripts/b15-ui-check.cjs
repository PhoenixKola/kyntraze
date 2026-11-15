const { chromium } = require('@playwright/test'); const path = require('path');
const out = process.argv[2], port = process.argv[3]; const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1&form3=1&arena=gloam`); await sleep(500);
  await page.getByTestId('play-button').click(); await sleep(400);
  const r = await page.evaluate(() => { const a = document.querySelector('.seed-field input').getBoundingClientRect(), b = document.querySelector('[data-testid=start-run]').getBoundingClientRect(); return { inputBottom: a.bottom, btnBottom: b.bottom, inputH: a.height, btnH: b.height }; }); console.log(r);
  await page.screenshot({ path: path.join(out, 'ui_hero.png') });
  await page.getByTestId('start-run').click(); await page.waitForFunction(() => !!window.__KYNT_QA__); await sleep(1200);
  await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 86; s.player.maxHp = 100; s.spawnTimer = 1e9; });
  await sleep(300); await page.screenshot({ path: path.join(out, 'ui_hp.png'), clip: { x: 0, y: 0, width: 420, height: 130 } });
  await page.evaluate(() => window.__KYNT_QA__.grantXp()); await sleep(900); await page.screenshot({ path: path.join(out, 'ui_levelup.png') });
  await page.keyboard.press('1'); await sleep(120); await page.screenshot({ path: path.join(out, 'ui_levelup_exit.png') });
  await sleep(600); console.log('level-up gone:', await page.getByTestId('level-up').count() === 0, errs); await b.close();
})();

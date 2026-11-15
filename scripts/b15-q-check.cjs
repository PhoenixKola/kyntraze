const { chromium } = require('@playwright/test'); const path = require('path'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
  await page.goto(`http://127.0.0.1:${process.argv[3]}/?seed=31&qa=1&form3=1&arena=gloam`); await sleep(500);
  await page.getByTestId('play-button').click(); await sleep(300); await page.getByTestId('start-run').click(); await page.waitForFunction(() => !!window.__KYNT_QA__); await sleep(1200);
  await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.enemies.length = 0; s.apexSeen = 1; s.player.drive = 100; s.player.form = 3; s.player.hp = 1e6; s.player.maxHp = 1e6; }); await sleep(2200);
  await page.keyboard.press('q'); await sleep(170); await page.screenshot({ path: path.join(process.argv[2], 'q_form3.png'), clip: { x: 280, y: 100, width: 400, height: 320 } }); await b.close();
})();

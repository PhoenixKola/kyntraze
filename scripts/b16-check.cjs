// B16 live checks: audio unlock, title -> arena -> boss -> victory score, settings sliders + persistence. node scripts/b16-check.cjs <outDir> <port>
const { chromium } = require('@playwright/test'); const path = require('path'); const fs = require('fs');
const [out, port] = [process.argv[2], process.argv[3]]; fs.mkdirSync(out, { recursive: true }); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }); const errs = [];
  for (const [W, H] of [[960, 540], [640, 360]]) {
    const page = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
    page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text().slice(0, 160)); });
    await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1&arena=gloam`); await sleep(600);
    await page.getByTestId('play-button').click(); await sleep(1500);
    await page.getByTestId('start-run').click(); await page.waitForFunction(() => !!window.__KYNT_QA__); await sleep(2500);
    const q = () => page.evaluate(() => window.__KYNT_QA__.audio());
    let a = await q(); console.log(W, 'arena', a.state, 'cue', a.cue, 'log', a.musicLog.join('>'));
    await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.player.hp = 1e6; s.player.maxHp = 1e6; window.__KYNT_QA__.encounter('warden'); }); await sleep(2500); a = await q(); console.log(W, 'warden', a.cue, a.started.filter(n => n.includes('warning') || n.includes('roar')));
    await page.evaluate(() => window.__KYNT_QA__.killBoss('warden')); await sleep(2500); a = await q(); console.log(W, 'after warden', a.cue, a.musicLog.join('>'));
    await page.evaluate(() => { window.__KYNT_QA__.encounter('seraph'); }); await sleep(2500); a = await q(); console.log(W, 'seraph', a.cue);
    await page.evaluate(() => window.__KYNT_QA__.killBoss('seraph')); await sleep(2500); a = await q(); console.log(W, 'victory', a.cue, 'sim phase', await page.evaluate(() => window.__KYNT_QA__.sim().phase));
    await page.screenshot({ path: path.join(out, `victory_${W}x${H}.png`) });
    await page.close();
  }
  // settings: sliders, keyboard, persistence across reload
  const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage(); page.on('pageerror', e => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/?qa=1`); await sleep(500); await page.getByTestId('settings-button').click().catch(async () => { await page.getByText('SETTINGS', { exact: false }).first().click(); }); await sleep(500);
  const slider = page.getByLabel('Music volume'); await slider.focus(); for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft'); await sleep(200);
  await page.screenshot({ path: path.join(out, 'settings_960x540.png') });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('kyntraze-b00-v1')).settings); console.log('saved', saved);
  await page.reload(); await sleep(500); await page.getByText('SETTINGS', { exact: false }).first().click(); await sleep(400); console.log('after reload', await page.getByLabel('Music volume').inputValue());
  await page.setViewportSize({ width: 640, height: 360 }); await sleep(300); await page.screenshot({ path: path.join(out, 'settings_640x360.png') });
  console.log('errors', errs); await b.close();
})();

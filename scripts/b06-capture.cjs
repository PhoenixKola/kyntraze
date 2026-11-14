// B06 live capture: real keyboard in the real Phaser app. Usage: node scripts/b06-capture.cjs <outDir> <width> <height> [port] [--video]
// Shots: title, hero-select, settings, gameplay-calm, gameplay-crowd (base), beam-crowd, sphere-crowd, form1-crowd, form1-beam, levelup, pause, results.
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const [out, W, H, port = '5173'] = [process.argv[2], Number(process.argv[3] || 960), Number(process.argv[4] || 540), process.argv[5] || '5173'];
const video = process.argv.includes('--video');
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, ...(video ? { recordVideo: { dir: out, size: { width: W, height: H } } } : {}) });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push('pageerror ' + String(e).slice(0, 200)));
  const shot = async n => { await page.screenshot({ path: path.join(out, `${n}-${W}x${H}.png`) }); };
  await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1`); await sleep(500); await shot('01-title');
  await page.getByRole('button', { name: /SETTINGS/ }).first().click(); await sleep(250); await shot('02-settings');
  await page.getByRole('button', { name: /SAVE/ }).click(); await sleep(150);
  await page.getByTestId('play-button').click(); await sleep(300); await shot('03-hero-select');
  await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(700);
  const qa = f => page.evaluate(f);
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 1e6; s.player.maxHp = 100; s.player.nextXp = 1e9; });
  const key = async (k, ms = 60) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); };
  const clear = () => qa(() => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.hp = 100; });
  const crowd = n => page.evaluate(n => { const s = window.__KYNT_QA__.sim(), p = s.player; let id = 9000 + s.enemies.length; for (let i = 0; i < n; i++) { const a = i * 2.399, r = 90 + (i * 37) % 330; s.enemies.push({ id: id++, kind: i % 3 ? 'pursuer' : 'flanker', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, hp: 25, maxHp: 25, radius: 17, speed: 0, damage: 0, touchCooldown: 0 }); } }, n);
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.x = 1100; s.player.y = 800; s.player.hp = 70; s.player.drive = 42; s.player.attackClock = 1e9; });
  await clear(); await qa(() => { window.__KYNT_QA__.sim().player.hp = 72; });
  await page.keyboard.down('d'); await sleep(350); await page.keyboard.up('d'); await sleep(250); await shot('04-gameplay-calm');
  await crowd(34); await sleep(300); await shot('05-gameplay-crowd');
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.beamCooldown = 0; s.player.sphereCooldown = 0; });
  await key('e'); await sleep(780); await shot('06-beam-crowd'); await sleep(900);
  await clear(); await crowd(30); await key('r'); await sleep(1500); await shot('07-sphere-crowd'); await sleep(900);
  await clear(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.drive = 100; s.player.beamCooldown = 0; s.player.sphereCooldown = 0; s.player.hp = 100; }); await key('f', 80); await sleep(1700);
  await crowd(34); await sleep(300); await shot('08-form1-crowd');
  await key('e'); await sleep(780); await shot('09-form1-beam');
  await sleep(700); await crowd(18); await key('r'); await sleep(1500); await shot('10-form1-sphere'); await sleep(800);
  await qa(() => { window.__KYNT_QA__.grantXp(); }); await sleep(400);
  const lv = await page.getByTestId('level-up').count(); if (lv) { await shot('11-levelup'); await page.locator('.upgrade-button').first().click(); await sleep(300); }
  await page.keyboard.press('Escape'); await sleep(350); await shot('12-pause'); await page.keyboard.press('Escape'); await sleep(300);
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 0.01; s.player.x += 0; }); await clear(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 1; });
  await crowd(8); await qa(() => { const s = window.__KYNT_QA__.sim(); for (const e of s.enemies) { e.x = s.player.x + 5; e.y = s.player.y + 5; e.damage = 999; e.speed = 0; } s.player.invulnerable = 0; s.player.hp = 1; });
  await sleep(4200); if (await page.getByTestId('results-screen').count()) await shot('13-results');
  fs.writeFileSync(path.join(out, `errors-${W}x${H}.json`), JSON.stringify(errors, null, 1));
  await ctx.close(); await browser.close(); console.log('done', out, W, H, 'errors', errors.length);
})();

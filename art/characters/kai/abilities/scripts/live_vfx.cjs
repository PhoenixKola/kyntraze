// B07-pre VFX live sweep: real keyboard in the real Phaser app. Each effect is replayed N times and the game is paused (Escape) at increasing delays;
// the pause menu is hidden with injected CSS so the paused canvas can be screenshot. Usage: node live_vfx.cjs <outDir> <width> <height> [port] [only]
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const [out, W, H, port = '5191', only = ''] = [process.argv[2], +process.argv[3] || 960, +process.argv[4] || 540, process.argv[5], process.argv[6]];
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage(); const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); }); page.on('pageerror', e => errors.push('pageerror ' + String(e).slice(0, 200)));
  await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1`); await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => window.__KYNT_QA__); await sleep(600); await page.addStyleTag({ content: '.overlay{display:none!important}' });
  const qa = (f, a) => page.evaluate(f, a);
  const reset = async (form, enemies = 0, spread = 0, minR = 0) => { await qa(([form, enemies, spread, minR]) => { const s = window.__KYNT_QA__.sim(), q = s.player; s.enemies.length = 0; s.spawnTimer = 1e9; s.nextFlanker = 1e9; q.hp = 1e6; q.maxHp = 1e6; q.nextXp = 1e9; q.x = 1100; q.y = 800; q.dashCooldown = 0; q.qCooldown = 0; q.beamCooldown = 0; q.sphereCooldown = 0; q.attackClock = 1e9; q.form = form; q.drive = form ? 100 : 0;
    s.sphere = null; s.blasts.length = 0; s.cast = null; let id = 9000; for (let i = 0; i < enemies; i++) { const a = i * 2.399 + 0.3, r = (minR || 70) + (i * 37) % (spread || 260); s.enemies.push({ id: id++, kind: i % 3 ? 'pursuer' : 'flanker', x: q.x + Math.cos(a) * r, y: q.y + Math.sin(a) * r * 0.8, hp: 1e5, maxHp: 1e5, radius: 17, speed: 0, damage: 0, touchCooldown: 0 }); } }, [form, enemies, spread, minR]); };
  const key = async (k, ms = 60) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); };
  const shot = async name => { await page.screenshot({ path: path.join(out, name + '.png'), clip: { x: Math.max(0, W / 2 - 250), y: Math.max(0, H / 2 - 190), width: Math.min(W, 500), height: Math.min(H, 380) } }); };
  const sweep = async (name, form, prep, act, times, enemies, spread, minR) => {
    if (only && !name.includes(only)) return;
    for (let i = 0; i < times.length; i++) {
      await reset(form, enemies, spread, minR); await sleep(500); if (prep) await prep();
      const t0 = Date.now(); await act(); const wait = times[i] - (Date.now() - t0); if (wait > 0) await sleep(wait);
      await page.keyboard.press('Escape'); await sleep(120); await shot(`${name}-${String(i).padStart(2, '0')}`); await page.keyboard.press('Escape'); await sleep(350);
    }
  };
  for (const form of [0, 1]) {
    const f = form ? 'f1' : 'base';
    if (form) { await reset(1); await sleep(300); }
    await sweep(`${f}-auto`, form, null, async () => { await qa(() => { window.__KYNT_QA__.sim().player.attackClock = 0; }); }, [60, 110, 170, 260], 5, 160);
    await sweep(`${f}-auto-moving`, form, null, async () => { await qa(() => { window.__KYNT_QA__.sim().player.attackClock = 0; }); await page.keyboard.down('d'); setTimeout(() => page.keyboard.up('d'), 400); }, [70, 130, 200], 6, 170);
    await sweep(`${f}-dash`, form, async () => { await page.keyboard.down('d'); await sleep(60); }, async () => { await key('Shift', 50); }, [40, 90, 150, 230, 330, 450], 0, 0);
    await sweep(`${f}-q`, form, null, async () => { await key('q'); }, [30, 90, 160, 250, 380, 600], 28, 230);
    await sweep(`${f}-r`, form, null, async () => { await key('r'); }, [250, 600, 900, 1050, 1250, 1380, 1480, 1620, 1950], 14, 120, 190);
  }
  fs.writeFileSync(path.join(out, 'errors.json'), JSON.stringify(errors)); console.log('done', out, W, H, 'errors', errors.length, errors.slice(0, 2));
  await browser.close();
})();

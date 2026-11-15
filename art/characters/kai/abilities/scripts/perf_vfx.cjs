// B07-pre VFX frame-time sample: crowd of N enemies, Kai casts Q / R / auto / dash repeatedly; reports rAF frame times. Usage: node perf_vfx.cjs <width> <height> <enemies> [port]
const { chromium } = require('@playwright/test');
const [W, H, N, port = '5191'] = [+process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage(); const errs = [];
  p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 160))); p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await p.goto(`http://127.0.0.1:${port}/?seed=31&qa=1`); await p.getByTestId('play-button').click(); await p.getByTestId('start-run').click(); await p.waitForFunction(() => window.__KYNT_QA__); await sleep(600);
  await p.evaluate(N => { const s = window.__KYNT_QA__.sim(), q = s.player; q.hp = 1e6; q.maxHp = 1e6; q.nextXp = 1e9; s.spawnTimer = 1e9; s.nextFlanker = 1e9; q.drive = 100; let id = 9000; for (let i = 0; i < N; i++) { const a = i * 2.399, r = 130 + (i * 37) % 330; s.enemies.push({ id: id++, kind: i % 3 ? 'pursuer' : 'flanker', x: q.x + Math.cos(a) * r, y: q.y + Math.sin(a) * r * 0.8, hp: 1e6, maxHp: 1e6, radius: 17, speed: 0, damage: 0, touchCooldown: 0 }); } }, N);
  await p.evaluate(() => { window.__ft = []; let l = performance.now(); const f = t => { window.__ft.push(t - l); l = t; window.__raf = requestAnimationFrame(f); }; window.__raf = requestAnimationFrame(f); });
  await p.keyboard.down('f'); await sleep(80); await p.keyboard.up('f'); await sleep(1500);
  for (let i = 0; i < 6; i++) { await p.evaluate(() => { const q = window.__KYNT_QA__.sim().player; q.attackClock = 0; q.qCooldown = 0; q.sphereCooldown = 0; q.dashCooldown = 0; });
    await p.keyboard.down('d'); await p.keyboard.press('q'); await p.keyboard.press('r'); await sleep(250); await p.keyboard.press('Shift'); await sleep(250); await p.keyboard.up('d'); await sleep(1500); }
  const ft = await p.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__ft.slice(5); });
  ft.sort((a, b) => a - b); const avg = ft.reduce((a, b) => a + b, 0) / ft.length;
  console.log(JSON.stringify({ size: [W, H], enemies: N, frames: ft.length, avgMs: +avg.toFixed(1), p50: +ft[ft.length >> 1].toFixed(1), p95: +ft[Math.floor(ft.length * 0.95)].toFixed(1), max: +ft[ft.length - 1].toFixed(1), fps: +(1000 / avg).toFixed(1), errors: errs.length, errs: errs.slice(0, 2) }));
  await b.close();
})();

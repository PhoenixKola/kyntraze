// Pre-B12 UI proofs: hero select, arena strip, arena select, HUD portraits (Base + Form I), hit vignette. Real app on the dev server.
// node scripts/prem12-ui-capture.cjs <outDir> <width> <height> [port] [tag]
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const [out, W, H, port = '5173', tag = ''] = [process.argv[2], Number(process.argv[3] || 960), Number(process.argv[4] || 540), process.argv[5] || '5173', process.argv[6] || ''];
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } }); const page = await ctx.newPage(); const errors = []; const shots = []; const flow = {};
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); }); page.on('pageerror', e => errors.push('pageerror ' + String(e).slice(0, 200)));
  const shot = async n => { const f = `${n}${tag}-${W}x${H}.png`; await page.screenshot({ path: path.join(out, f) }); shots.push(f); };
  const qa = (f, a) => page.evaluate(f, a);
  await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1`); await sleep(500); await shot('ui-0-title');
  await page.getByTestId('play-button').click(); await sleep(450); await shot('ui-1-hero-select');
  flow.strip = await qa(() => { const s = document.querySelector('.arena-strip'), g = document.querySelector('.arena-strip-go'), c = document.querySelector('.arena-strip-copy'); if (!s || !g || !c) return null; const r = e => { const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; }; return { strip: r(s), go: r(g), copy: r(c), goCentreDelta: Math.round((g.getBoundingClientRect().y + g.getBoundingClientRect().height / 2) - (c.getBoundingClientRect().y + c.getBoundingClientRect().height / 2)), overflowX: s.scrollWidth > s.clientWidth }; });
  await page.getByTestId('arena-open').click(); await sleep(450); await shot('ui-2-arena-select'); await page.keyboard.press('Escape'); await sleep(450);
  await page.getByTestId('start-run').click(); await page.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(900);
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.attackClock = 1e9; s.spawnTimer = 1e9; s.enemies.length = 0; if (!window.__heal) window.__heal = setInterval(() => { const q = window.__KYNT_QA__ && window.__KYNT_QA__.sim(); if (q && q.phase === 'running' && !window.__noheal) q.player.hp = Math.max(q.player.hp, 60); }, 100); });
  await shot('hud-1-portrait-base');
  // hit vignette: one real hit; sampled 80 ms and 400 ms after, then quiet during i-frames
  await qa(() => { window.__noheal = true; const s = window.__KYNT_QA__.sim(); s.player.hp = 100; s.player.invulnerable = 0; s.enemies.push({ id: s.nextId++, kind: 'pursuer', x: s.player.x, y: s.player.y, hp: 1e6, maxHp: 1e6, radius: 17, speed: 0, damage: 12, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 99, aimX: 1, aimY: 0, stagger: 0, spawnedAt: s.time }); });
  await sleep(140); await shot('hud-2-hit-vignette-peak'); flow.vignetteDuring = await qa(() => { const v = document.querySelector('[data-testid=hit-vignette]'); return v ? getComputedStyle(v).opacity : null; });
  await sleep(1400); flow.vignetteAfter = await qa(() => { const v = document.querySelector('[data-testid=hit-vignette]'); return v ? getComputedStyle(v).opacity : 'absent'; }); await shot('hud-3-after-hit');
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; window.__noheal = false; s.player.drive = 100; });
  await page.keyboard.press('f'); await sleep(1600); await shot('hud-4-portrait-form1');
  fs.writeFileSync(path.join(out, `evidence-ui${tag}-${W}x${H}.json`), JSON.stringify({ viewport: [W, H], flow, shots, consoleErrors: errors, note: 'swiftshader; motion not watched in real time' }, null, 1));
  console.log(JSON.stringify({ flow, errors })); await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

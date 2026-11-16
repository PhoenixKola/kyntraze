// B21 captures: node scripts/b21-capture.cjs <outDir> <port> <arena> <W> <H> — each transformed state idle / moving / dash / charge, with a small crowd. Real app, dev server, software GL (stills only).
const { chromium } = require('@playwright/test'); const path = require('path'); const fs = require('fs');
const [out, port, arena = 'gloam', W = 960, H = 540, only] = [process.argv[2], process.argv[3], process.argv[4], +process.argv[5] || 960, +process.argv[6] || 540, process.argv[7]];
fs.mkdirSync(out, { recursive: true }); const sleep = ms => new Promise(r => setTimeout(r, ms));
const STATES = [['kai', 0], ['kai', 1], ['kai', 2], ['kai', 3], ['ren', 0], ['ren', 1], ['sora', 0], ['sora', 1]].filter(([h, f]) => !only || only.split(',').includes(`${h}${f}`));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
  for (const [hero, form] of STATES) {
    const page = await (await b.newContext({ viewport: { width: W, height: H } })).newPage(); page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()); });
    if (process.env.EVO) await page.addInitScript(() => { window.__EVO__ = true; });
    await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1&arena=${arena}&hero=${hero}&form3=1`); await sleep(500); await page.getByTestId('play-button').click(); await sleep(300); await page.getByTestId('start-run').click().catch(() => {});
    await page.waitForFunction(() => !!window.__KYNT_QA__); await sleep(500);
    const name = `${hero}${form}`; const shot = n => page.screenshot({ path: path.join(out, `${name}_${arena}_${n}_${W}x${H}.png`) });
    await page.evaluate(([f, hero]) => { const s = window.__KYNT_QA__.sim(), p = s.player; s.spawnTimer = 1e9; s.nextFlanker = 1e9; p.hp = 1e6; p.maxHp = 1e6; p.form = f; if (hero !== 'kai') s.heroFormUnlocked = true; s.enemies.length = 0; if (window.__EVO__) { s.upgradeStacks = { impact: 5, tempo: 4, reach: 3, pulse: 3, widelance: 3, hardlight: 4, afterburn: 3, bloombulk: 3, afterglow: 1, twinbloom: 1 }; s.mods.beamLinger = 3; s.mods.beamWidth = 1.7; s.mods.sphereEcho = 2; s.mods.sphereRadius = 1.5; } for (let i = 0; i < 6; i++) { const a = i * 1.05; s.enemies.push({ id: 900 + i, kind: 'pursuer', hp: 1e5, maxHp: 1e5, radius: 18, speed: 0, damage: 0, touchCooldown: 9, mode: 'move', modeT: 0, attackCd: 99, aimX: 0, aimY: 1, stagger: 0, spawnedAt: s.time, x: p.x + Math.cos(a) * 190, y: p.y + Math.sin(a) * 140 }); } }, [form, hero]);
    await sleep(700); await shot('idle');
    await page.keyboard.down('d'); await sleep(550); await shot('run'); await page.keyboard.up('d'); await sleep(120); await shot('stop');
    await page.keyboard.down('d'); await page.keyboard.down('Shift'); await sleep(90); await shot('dash'); await page.keyboard.up('Shift'); await page.keyboard.up('d'); await sleep(500);
    await page.keyboard.down('e'); await sleep(hero === 'sora' ? 700 : 260); await shot('charge'); await page.keyboard.up('e'); await sleep(160); await shot('release'); await sleep(900);
    await page.keyboard.down('q'); await sleep(90); await page.keyboard.up('q'); await sleep(300); await shot('q'); await sleep(1500); await page.keyboard.down('r'); await sleep(90); await page.keyboard.up('r'); for (const [i, ms] of [[1, 250], [2, 250], [3, 300], [4, 400]]) { await sleep(ms); await shot('r' + i); }
    await page.close();
  }
  console.log('errors', errs); await b.close();
})();

// B21 stress: 70 enemies + spammed abilities per hero/form; prints scene display-list size over time (bounded = no leak). Software GL, counts only (no valid FPS).
const { chromium } = require('@playwright/test'); const port = process.argv[2] || 5199; const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
  for (const [hero, form] of (process.env.ONLY ? [process.env.ONLY.split(':')] : [['ren', 1], ['sora', 1], ['kai', 2]]).map(([h, f]) => [h, +f])) {
    const page = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage(); page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()); });
    await page.goto(`http://127.0.0.1:${port}/?seed=7&qa=1&arena=ashen&hero=${hero}&form3=1`); await sleep(500); await page.getByTestId('play-button').click(); await sleep(300); await page.getByTestId('start-run').click().catch(() => {});
    await page.waitForFunction(() => !!window.__KYNT_QA__); await sleep(400);
    await page.evaluate(([f, hero]) => { const s = window.__KYNT_QA__.sim(), p = s.player; s.spawnTimer = 1e9; s.nextFlanker = 1e9; p.hp = 1e7; p.maxHp = 1e7; p.form = f; if (hero !== 'kai') s.heroFormUnlocked = true; s.upgradeStacks = { impact: 5, widelance: 3, afterburn: 3, bloombulk: 3, afterglow: 1, twinbloom: 1, pulse: 3 }; s.mods.beamLinger = 3; s.mods.sphereEcho = 2;
      for (let i = 0; i < 70; i++) { const a = i * 0.9, r = 120 + (i % 7) * 40, kinds = ['pursuer', 'flanker', 'bruiser', 'ranged', 'aegis', 'cantor']; s.enemies.push({ id: 900 + i, kind: kinds[i % 6], hp: 1e6, maxHp: 1e6, radius: 18, speed: 0, damage: 0, touchCooldown: 9, mode: 'move', modeT: 0, attackCd: 99, aimX: 0, aimY: 1, stagger: 0, spawnedAt: s.time, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.7 }); } }, [form, hero]);
    const counts = [];
    for (let i = 0; i < +(process.env.ITER || 24); i++) { for (const k of ['q', 'e', 'r', 'Shift']) { await page.keyboard.down(k); await sleep(hero === 'sora' && k === 'e' ? 700 : 60); await page.keyboard.up(k); } await page.keyboard.down('d'); await sleep(150); await page.keyboard.up('d'); await sleep(250); counts.push(await page.evaluate(() => window.__KYNT_QA__.scene().children.length)); }
    const mx = Math.max(...counts), early = counts.slice(4, 8).reduce((a, c) => a + c, 0) / 4, late = counts.slice(-4).reduce((a, c) => a + c, 0) / 4;
    console.log(counts.join(','));
    console.log(hero, form, 'children first/min/max/late-avg vs early-avg', counts[0], Math.min(...counts), mx, late.toFixed(0), early.toFixed(0), late - early < 40 ? 'BOUNDED' : 'GROWING');
    if (process.env.BREAK) console.log(JSON.stringify(await page.evaluate(() => { const m = {}; for (const c of window.__KYNT_QA__.scene().children.list) { const k = (c.texture && c.texture.key) || c.type; m[k] = (m[k] || 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 12); })));
    await page.close();
  }
  console.log('errors', errs); await b.close();
})();

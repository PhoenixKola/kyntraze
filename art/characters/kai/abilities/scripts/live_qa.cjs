// B05 live QA: drives the real Phaser app with real keyboard input in headless Chromium and records video + screenshots + a JSON report.
// Usage: node live_qa.cjs <outDir> [width] [height]      (needs `npm run dev` on 127.0.0.1:5173 and ?qa=1 dev hook)
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const out = process.argv[2], W = Number(process.argv[3] || 960), H = Number(process.argv[4] || 540);
fs.mkdirSync(out, { recursive: true });
const report = { size: [W, H], errors: [], checks: {}, shots: [] };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: out, size: { width: W, height: H } } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => report.errors.push('pageerror ' + String(e).slice(0, 200)));
  await page.goto('http://127.0.0.1:5173/?seed=11&qa=1');
  await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(600);
  const S = () => page.evaluate(() => { const s = window.__KYNT_QA__.sim(); return { t: s.time, hp: s.player.hp, x: s.player.x, y: s.player.y, form: s.player.form, drive: s.player.drive, kills: s.kills, en: s.enemies.length, phase: s.phase, cast: s.cast ? { k: s.cast.kind, t: s.cast.t, rel: s.cast.released } : null, sphere: !!s.sphere, blasts: s.blasts.length, bcd: s.player.beamCooldown, scd: s.player.sphereCooldown, pose: window.__KYNT_QA__.heroPose() }; });
  const shot = async name => { const f = path.join(out, name + '.png'); await page.screenshot({ path: f }); report.shots.push(name); };
  const horde = (n, r0, r1, spread, arc) => page.evaluate(([n, r0, r1, spread, arc]) => {
    const s = window.__KYNT_QA__.sim(); const p = s.player; s.spawnTimer = 1e9; s.nextFlanker = 1e9; let id = 5000 + s.enemies.length;
    for (let i = 0; i < n; i++) { const a = arc + (Math.random() - 0.5) * spread, r = r0 + Math.random() * (r1 - r0); s.enemies.push({ id: id++, kind: i % 3 ? 'pursuer' : 'flanker', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, hp: 25, maxHp: 25, radius: 17, speed: 40, damage: 4, touchCooldown: 0 }); }
  }, [n, r0, r1, spread, arc]);
  const clearEnemies = () => page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; s.spawnTimer = 1e9; s.nextFlanker = 1e9; });
  const frames = () => page.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); }; requestAnimationFrame(f); }));
  const key = async (k, ms = 60) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); };
  await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 100000; s.player.maxHp = 100000; s.player.attackClock = 1e9; s.player.nextXp = 1e9; });   // QA: survive the horde, silence the auto-punch so ability animations are isolated
  const dirs = [['d', 'east'], ['a', 'west'], ['s', 'south'], ['w', 'north']];
  // 1. each direction: face by walking, then Beam and Sphere with a horde in front
  for (const [k, name] of dirs) {
    await clearEnemies(); await page.keyboard.down(k); await sleep(250); await page.keyboard.up(k); await sleep(150);
    const ang = { east: 0, west: Math.PI, south: Math.PI / 2, north: -Math.PI / 2 }[name];
    await horde(10, 150, 330, 0.5, ang);
    await key('e'); const marks = [0.15, 0.45, 0.62, 0.85];
    let prev = 0; for (const [i, m] of marks.entries()) { await sleep((m - prev) * 1000); prev = m; if (i === 1 || i === 2) await shot(`beam-${name}-${i === 1 ? 'charge' : 'fire'}`); }
    await sleep(1300); const st = await S(); report.checks[`beam-${name}`] = { enemiesLeft: st.en, kills: st.kills, pose: st.pose.clip };
    await clearEnemies(); await sleep(7200);
    await horde(14, 120, 300, 0.5, ang); await key('r'); await sleep(500); await shot(`sphere-${name}-gather`);
    await sleep(500); await shot(`sphere-${name}-throw`); await sleep(350); await shot(`sphere-${name}-flight`); await sleep(300); await shot(`sphere-${name}-burst`); await sleep(500); await shot(`sphere-${name}-after`);
    const st2 = await S(); report.checks[`sphere-${name}`] = { enemiesLeft: st2.en, kills: st2.kills, pose: st2.pose.clip };
    await sleep(16000);
  }
  // 2. Form I: activate with F and fire both
  await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.player.drive = 100; }); await key('f'); await sleep(1100);
  await clearEnemies(); await horde(12, 140, 320, 0.6, 0); await key('e'); await sleep(700); await shot('f1-beam-fire'); await sleep(900);
  await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.player.sphereCooldown = 0; s.player.beamCooldown = 0; s.player.drive = 100; });
  await clearEnemies(); await horde(16, 120, 300, 0.7, 0); await key('r'); await sleep(1250); await shot('f1-sphere-burst'); await sleep(900);
  report.checks.f1 = await S();
  // 3. transitions: run->beam, dash cancel, pause mid-charge, hurt before release
  await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.player.beamCooldown = 0; s.player.sphereCooldown = 0; });
  await page.keyboard.down('d'); await sleep(300); await key('e'); await sleep(200); await key('Shift'); await sleep(120); const dash = await S(); report.checks.dashCancel = { cast: dash.cast, clip: dash.pose.clip }; await page.keyboard.up('d'); await sleep(900);
  await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.player.beamCooldown = 0; }); await key('e'); await sleep(250); await page.keyboard.press('Escape'); await sleep(500);
  const p1 = await S(); await sleep(600); const p2 = await S(); report.checks.pauseMidCharge = { frozen: p1.cast && p2.cast && p1.cast.t === p2.cast.t, phase: p1.phase }; await page.keyboard.press('Escape'); await sleep(900);
  await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.player.beamCooldown = 0; s.player.hp = 100000; }); await key('e'); await sleep(150);
  await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.enemies.push({ id: 9999, kind: 'pursuer', x: s.player.x + 5, y: s.player.y + 5, hp: 25, maxHp: 25, radius: 17, speed: 0, damage: 20, touchCooldown: 0 }); }); await sleep(300);
  const hurt = await S(); report.checks.hurtBeforeRelease = { cast: hurt.cast, hp: hurt.hp, clip: hurt.pose.clip };
  // 4. performance in a crowded fight
  await clearEnemies(); await horde(90, 60, 420, 6.28, 0); await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.player.beamCooldown = 0; s.player.sphereCooldown = 0; });
  report.checks.fpsCrowdIdle = await frames();
  await key('r'); report.checks.fpsSphereCrowd = await frames();
  await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.player.beamCooldown = 0; }); await key('e'); report.checks.fpsBeamCrowd = await frames();
  await shot('crowd-after');
  // 5. death while casting, Results, retry
  await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.player.beamCooldown = 0; s.player.hp = 1; s.player.invulnerable = 0; }); await key('e'); await sleep(200);
  await page.evaluate(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 1; s.player.invulnerable = 0; s.enemies.push({ id: 9998, kind: 'pursuer', x: s.player.x, y: s.player.y, hp: 25, maxHp: 25, radius: 17, speed: 0, damage: 50, touchCooldown: 0 }); }); await sleep(2800);
  report.checks.death = await S(); await shot('results');
  report.checks.resultsVisible = await page.getByTestId('results-screen').isVisible().catch(() => false);
  await ctx.close(); await browser.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1)); console.log(JSON.stringify(report.checks, null, 1).slice(0, 4000)); console.log('errors', report.errors.length);
})().catch(e => { console.error(e); process.exit(1); });

// B07 live capture: real Phaser app, real keyboard, QA hook only to place enemies / freeze poses. Usage: node scripts/b07-capture.cjs <outDir> <width> <height> <scenario> [port]
// scenarios: lineup | solo | mixed | perf | all
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path'), cp = require('child_process');
const [out, W, H, scenario = 'lineup', port = '5173'] = [process.argv[2], Number(process.argv[3] || 960), Number(process.argv[4] || 540), process.argv[5], process.argv[6] || '5173'];
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DEF = { pursuer: { hp: 25, r: 17, sp: 74, dmg: 10 }, flanker: { hp: 18, r: 15, sp: 118, dmg: 7 }, bruiser: { hp: 150, r: 26, sp: 46, dmg: 12 }, ranged: { hp: 20, r: 15, sp: 66, dmg: 6 } };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push('pageerror ' + String(e).slice(0, 200)));
  const shot = async n => { await page.screenshot({ path: path.join(out, `${n}-${W}x${H}.png`) }); };
  await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1`); await sleep(400);
  await page.getByTestId('play-button').click(); await sleep(250); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(800);
  const qa = (f, a) => page.evaluate(f, a);
  const key = async (k, ms = 60) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); };
  const reset = () => qa(() => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; s.enemyShots.length = 0; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.hp = 100; s.player.maxHp = 100; s.player.x = 1100; s.player.y = 800; s.player.attackClock = 1e9; s.player.nextXp = 1e9; s.pickups.length = 0; });
  const add = (kind, dx, dy, extra = {}) => qa(([kind, dx, dy, extra, DEF]) => { const s = window.__KYNT_QA__.sim(), p = s.player, d = DEF[kind]; s.enemies.push({ id: s.nextId++, kind, x: p.x + dx, y: p.y + dy, hp: d.hp, maxHp: d.hp, radius: d.r, speed: d.sp, damage: d.dmg, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 1e9, aimX: dx > 0 ? -1 : 1, aimY: 0, stagger: 0, spawnedAt: s.time, ...extra }); }, [kind, dx, dy, extra, DEF]);
  const pause = async () => { await page.keyboard.press('Escape'); await sleep(200); await page.addStyleTag({ content: '.overlay{display:none!important}' }); };
  const resume = async () => { await page.keyboard.press('Escape'); await sleep(150); };
  const doLineup = async () => {
    await reset(); const kinds = ['pursuer', 'flanker', 'bruiser', 'ranged'];
    kinds.forEach(async () => 0);
    for (let i = 0; i < 4; i++) await add(kinds[i], -270 + i * 150, -60 + (i % 2) * 40, { speed: 0 });
    await sleep(350); await pause(); await shot('lineup-move'); await resume();
    // each pose frozen (paused) through the sim's own attack timeline
    for (const [name, mode, t] of [['windup-early', 'windup', 0.8], ['windup-late', 'windup', 0.12], ['strike', 'strike', 0.1], ['recover', 'recover', 0.2]]) {
      await qa(([mode, t]) => { const s = window.__KYNT_QA__.sim(); for (const e of s.enemies) { e.speed = 0; e.mode = mode; e.modeT = mode === 'windup' ? t * (e.kind === 'bruiser' ? 1.0 : 0.6) : t; e.aimX = e.x < s.player.x ? 1 : -1; e.aimY = 0.0; } }, [mode, t]);
      await sleep(250); await pause(); await shot('lineup-' + name); await resume();
    }
    await qa(() => { const s = window.__KYNT_QA__.sim(); for (const e of s.enemies) { e.mode = 'move'; e.modeT = 0; e.speed = 0; e.hp -= 3; } }); await sleep(30); await shot('lineup-hurt');
    await qa(() => { const s = window.__KYNT_QA__.sim(); for (const e of s.enemies) { s.enemyEvents.push({ id: s.nextId++, kind: 'enemy_death', enemy: e.kind, enemyId: e.id, x: e.x, y: e.y, dirX: 1, dirY: 0 }); e.hp = 0; } }); await sleep(120); await shot('lineup-death-a'); await sleep(200); await shot('lineup-death-b');
  };
  const poll = () => qa(() => { const s = window.__KYNT_QA__.sim(); return { t: +s.time.toFixed(3), hp: s.player.hp, shots: s.enemyShots.length, en: s.enemies.map(e => ({ id: e.id, k: e.kind, m: e.mode, mt: +e.modeT.toFixed(2), x: Math.round(e.x), y: Math.round(e.y), hp: e.hp })), ev: s.enemyEvents.length }; });
  const doSolo = async () => {
    const log = {};
    for (const kind of ['pursuer', 'flanker', 'bruiser', 'ranged']) {
      await reset(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 100; });
      const dx = kind === 'ranged' ? 330 : 240; await add(kind, dx, 20, { attackCd: 0.2 });
      const rows = []; const shotAt = new Set(); let t0 = Date.now();
      while (Date.now() - t0 < 9000) {
        const st = await poll(); const e = st.en[0]; if (!e) break; rows.push({ t: st.t, mode: e.m, modeT: e.mt, hp: st.hp, shots: st.shots, dist: Math.round(Math.hypot(e.x - 1100, e.y - 800)) });
        if (e.m === 'windup' && !shotAt.has('w')) { shotAt.add('w'); await sleep(Math.max(40, e.mt * 450)); await shot(`solo-${kind}-1-telegraph`); }
        if ((e.m === 'strike' || st.shots) && !shotAt.has('s')) { shotAt.add('s'); await shot(`solo-${kind}-2-release`); }
        if (e.m === 'recover' && !shotAt.has('r')) { shotAt.add('r'); await sleep(60); await shot(`solo-${kind}-3-recover`); }
        if (shotAt.size === 3) { await sleep(500); break; } await sleep(25);
      }
      log[kind] = rows; await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 100; });
    }
    fs.writeFileSync(path.join(out, `solo-timeline-${W}x${H}.json`), JSON.stringify(log));
    // dodge proofs with the real keyboard: bruiser slam (walk out of the ring) and ranged bolt (sidestep)
    await reset(); await add('bruiser', 90, 0, { attackCd: 0 }); let hp0 = 100, ok = false, t0 = Date.now();
    while (Date.now() - t0 < 5000) { const st = await poll(); if (st.en[0] && st.en[0].m === 'windup') { await page.keyboard.down('a'); await sleep(900); await page.keyboard.up('a'); ok = true; break; } await sleep(20); }
    await sleep(1400); const after = await poll(); fs.writeFileSync(path.join(out, `dodge-bruiser-${W}x${H}.json`), JSON.stringify({ sawWindup: ok, hpBefore: hp0, hpAfter: after.hp }));
    await reset(); await add('ranged', 330, 0, { attackCd: 0 }); t0 = Date.now(); let side = false;
    while (Date.now() - t0 < 6000) { const st = await poll(); if (st.shots > 0) { await page.keyboard.down('s'); await sleep(450); await page.keyboard.up('s'); side = true; break; } await sleep(15); }
    await sleep(1200); const after2 = await poll(); fs.writeFileSync(path.join(out, `dodge-ranged-${W}x${H}.json`), JSON.stringify({ sawBolt: side, hpAfter: after2.hp }));
  };
  const mix = async (label, formI) => {
    await reset(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 100000; s.player.maxHp = 100; s.player.attackClock = 0.1; s.player.drive = 100; s.player.beamCooldown = 0; s.player.sphereCooldown = 0; });
    if (formI) { await key('f', 80); await sleep(1800); }
    const spec = [['pursuer', 7], ['flanker', 5], ['bruiser', 2], ['ranged', 3]]; let i = 0;
    for (const [k, n] of spec) for (let j = 0; j < n; j++) { const a = (i++) * 2.399, r = 130 + (i * 47) % 260; await add(k, Math.cos(a) * r, Math.sin(a) * r * 0.8, { attackCd: 0.2 + (i % 5) * 0.3, speed: DEF[k].sp }); }
    await sleep(900); await shot(`mixed-${label}-1`); await key('e'); await sleep(800); await shot(`mixed-${label}-2-beam`); await sleep(900); await key('r'); await sleep(1500); await shot(`mixed-${label}-3-sphere`); await sleep(600); await shot(`mixed-${label}-4`);
  };
  const perf = async () => {
    const res = {};
    for (const n of [60, 90, 115]) {
      await reset(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 1e9; s.player.maxHp = 100; s.player.attackClock = 1e9; });
      const kinds = ['pursuer', 'pursuer', 'flanker', 'pursuer', 'ranged', 'bruiser'];
      for (let i = 0; i < n; i++) { const a = i * 2.399, r = 150 + (i * 53) % 420; await add(kinds[i % 6], Math.cos(a) * r, Math.sin(a) * r * 0.8, { attackCd: 1e9 }); }
      await sleep(1200); await shot(`perf-${n}`);
      res[n] = await page.evaluate(() => new Promise(r => { const d = []; let last = performance.now(), c = 0; const f = t => { d.push(t - last); last = t; if (++c < 180) requestAnimationFrame(f); else { d.shift(); d.sort((a, b) => a - b); r({ frames: d.length, avgMs: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1), p95Ms: +d[Math.floor(d.length * 0.95)].toFixed(1), maxMs: +d[d.length - 1].toFixed(1), stats: window.__KYNT_QA__.enemyStats(), enemies: window.__KYNT_QA__.sim().enemies.length }); } }; requestAnimationFrame(f); }));
    }
    const gl = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c && c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
    fs.writeFileSync(path.join(out, `perf-${W}x${H}.json`), JSON.stringify({ renderer: gl, note: 'software GL (SwiftShader), NOT a real GPU', res }, null, 1));
  };
  if (scenario === 'solo' || scenario === 'all') await doSolo();
  if (scenario === 'mixed' || scenario === 'all') { await mix('base', false); await mix('form1', true); }
  if (scenario === 'perf' || scenario === 'all') await perf();
  if (scenario === 'lineup' || scenario === 'all') await doLineup();
  fs.writeFileSync(path.join(out, `errors-${scenario}-${W}x${H}.json`), JSON.stringify(errors, null, 1));
  await ctx.close(); await browser.close(); console.log('done', out, W, H, scenario, 'errors', errors.length);
})();

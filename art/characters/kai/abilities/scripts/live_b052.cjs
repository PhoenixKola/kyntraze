// B05.2 live QA: real keyboard in the real Phaser app. For each form x facing: charge/fire/sphere stills cropped around Kai at 1x, and a per-render-frame trace of
// (hand anchor from the exported sprite anchors) vs (the point the beam/orb is actually drawn from). Also a near-diagonal assisted-aim case, audio-engine stats, and a video.
// Usage: node live_b051.cjs <outDir> [width] [height]    (needs `npm run dev`)
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const out = process.argv[2], W = Number(process.argv[3] || 960), H = Number(process.argv[4] || 540);
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const report = { size: [W, H], traces: {}, shots: [], errors: [], audio: {}, diag: null };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: out, size: { width: W, height: H } } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => report.errors.push('pageerror ' + String(e).slice(0, 200)));
  await page.goto('http://127.0.0.1:' + (process.env.QA_PORT || 5191) + '/?seed=31&qa=1');
  await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(500);
  const qa = f => page.evaluate(f);
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 1e6; s.player.maxHp = 1e6; s.player.nextXp = 1e9; s.player.attackClock = 1e9; });
  const key = async (k, ms = 60) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); };
  const clear = () => qa(() => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; s.spawnTimer = 1e9; s.nextFlanker = 1e9; });
  const place = (ang, n, r0, r1, spread) => page.evaluate(([ang, n, r0, r1, spread]) => { const s = window.__KYNT_QA__.sim(), p = s.player; let id = 9000 + s.enemies.length; for (let i = 0; i < n; i++) { const a = ang + (i / Math.max(1, n - 1) - 0.5) * spread, r = r0 + (r1 - r0) * ((i * 7) % n) / n; s.enemies.push({ id: id++, kind: i % 3 ? 'pursuer' : 'flanker', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, hp: 25, maxHp: 25, radius: 17, speed: 0, damage: 0, touchCooldown: 0 }); } }, [ang, n, r0, r1, spread]);
  const startTrace = () => qa(() => { window.__trace = []; const q = window.__KYNT_QA__; const f = () => { const s = q.sim(), h = q.hand(), o = q.fxOrigin(), pose = q.heroPose(); window.__trace.push({ t: s.cast ? s.cast.t : null, kind: s.cast ? s.cast.kind : null, rel: s.cast ? s.cast.released : null, clip: pose.clip, frame: pose.frameIndex, facing: pose.facing, hand: h ? h.m : null, org: o ? { x: o.x, y: o.y, src: o.src } : null, hero: { x: pose.x, y: pose.y } }); window.__traceRaf = requestAnimationFrame(f); }; window.__traceRaf = requestAnimationFrame(f); });
  const stopTrace = () => qa(() => { cancelAnimationFrame(window.__traceRaf); return window.__trace; });
  const crop = async (name, cx, cy) => { const f = path.join(out, name + '.png'); await page.screenshot({ path: f, clip: { x: Math.max(0, cx - 170), y: Math.max(0, cy - 150), width: Math.min(340, W), height: Math.min(300, H) } }); report.shots.push(name); };
  const heroScreen = () => qa(() => { const q = window.__KYNT_QA__, p = q.heroPose(), cam = document.querySelector('canvas').getBoundingClientRect(); return { x: p.x - Math.max(0, Math.min(2200 - 960, q.sim().player.x - 480)) + cam.left, y: p.y - Math.max(0, Math.min(1600 - 540, q.sim().player.y - 270)) + cam.top }; });
  const dirs = [['d', 'east', 0], ['a', 'west', Math.PI], ['s', 'south', Math.PI / 2], ['w', 'north', -Math.PI / 2]];
  for (const form of ['base', 'f1']) {
    if (form === 'f1') { await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.drive = 100; s.player.beamCooldown = 0; s.player.sphereCooldown = 0; }); await key('f', 80); await sleep(1300); }
    for (const [k, name, ang] of dirs) {
      await clear(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.beamCooldown = 0; s.player.sphereCooldown = 0; s.player.x = 1100; s.player.y = 800; });
      await page.keyboard.down(k); await sleep(220); await page.keyboard.up(k); await sleep(200);
      await place(ang, 9, 160, 360, 0.35); await startTrace(); await key('e'); const marks = [0.3, 0.62];
      let prev = 0; for (const [i, m] of marks.entries()) { await sleep((m - prev) * 1000); prev = m; const hs = await heroScreen(); await crop(`${form}-${name}-beam-${i ? 'fire' : 'charge'}`, hs.x, hs.y); }
      await sleep(1000); report.traces[`${form}-${name}-beam`] = await stopTrace();
      await clear(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.sphereCooldown = 0; });
      await place(ang, 12, 160, 300, 0.4); await startTrace(); await key('r');
      for (const [i, m] of [[0, 0.35], [1, 0.8], [2, 1.0], [3, 1.22], [4, 1.5]]) { await sleep(Math.max(0, m * 1000 - (i ? [0, 350, 800, 1000, 1220][i] : 0))); const hs = await heroScreen(); await crop(`${form}-${name}-sphere-${['gather', 'hold', 'throw', 'flight', 'burst'][i]}`, hs.x + (Math.cos(ang) * (i > 2 ? 120 : 0)), hs.y + (Math.sin(ang) * (i > 2 ? 120 : 0))); }
      await sleep(900); report.traces[`${form}-${name}-sphere`] = await stopTrace();
      await qa(() => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; });
    }
  }
  // near-diagonal assisted aim: Kai moves toward SE while a target sits 30 deg south of east
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.form = 0; s.player.drive = 0; s.player.beamCooldown = 0; s.player.x = 1100; s.player.y = 800; s.enemies.length = 0; });
  await sleep(1500); await page.keyboard.down('d'); await page.keyboard.down('s'); await sleep(200); await page.keyboard.up('d'); await page.keyboard.up('s'); await sleep(120);
  await qa(() => { const s = window.__KYNT_QA__.sim(), p = s.player; for (let i = 0; i < 4; i++) s.enemies.push({ id: 9500 + i, kind: 'pursuer', x: p.x + 280 + i * 30, y: p.y + 150 + i * 17, hp: 25, maxHp: 25, radius: 17, speed: 0, damage: 0, touchCooldown: 0 }); });
  await startTrace(); await key('e'); await sleep(620); const hs = await heroScreen(); await crop('diag-beam-fire', hs.x + 60, hs.y + 30); await sleep(900);
  const dtr = await stopTrace(); const dsim = await qa(() => { const s = window.__KYNT_QA__.sim(); return { enemiesLeft: s.enemies.length, kills: s.kills }; });
  report.diag = { enemiesLeft: dsim.enemiesLeft, kills: dsim.kills, face: dtr.find(t => t.kind === 'beam')?.facing };
  // audio engine stats
  report.audio = await qa(() => window.__KYNT_QA__.audio());
  await ctx.close(); await browser.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report));
  // summarise the hand -> muzzle traces
  const sum = {};
  for (const [name, tr] of Object.entries(report.traces)) {
    const f = tr.filter(t => t.hand && t.org && t.kind); const d = f.map(t => Math.hypot(t.hand.x - t.org.x, t.hand.y - t.org.y));
    sum[name] = { frames: f.length, maxDistPx: d.length ? +Math.max(...d).toFixed(2) : null, src: [...new Set(f.map(t => t.org.src))].join(), clips: [...new Set(f.map(t => t.clip))].join(), facings: [...new Set(f.map(t => t.facing))].join() };
  }
  fs.writeFileSync(path.join(out, 'trace-summary.json'), JSON.stringify(sum, null, 1)); console.log(JSON.stringify(sum, null, 1)); console.log('diag', JSON.stringify(report.diag), 'audio', JSON.stringify({ ...report.audio, started: report.audio.started && report.audio.started.length }), 'errors', report.errors.length);
})().catch(e => { console.error(e); process.exit(1); });

// B13 live capture: the real Phaser app on the dev server with the dev-only QA route (?qa=1&form3=1 = Cometheart + Stillfire Apex unlocked, no time gate, Drive full). Forces enemies/time only; not human play.
// node scripts/b13-capture.cjs <outDir> <width> <height> [port] [video] [arena] [reduced]
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const [out, W, H, port = '5173', video, arena = 'gloam', reduced] = [process.argv[2], Number(process.argv[3] || 960), Number(process.argv[4] || 540), process.argv[5] || '5173', process.argv[6] === 'video' ? 'video' : '', process.argv[7] || 'gloam', process.argv[8] === 'reduced'];
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, ...(video ? { recordVideo: { dir: path.join(out, 'video'), size: { width: W, height: H } } } : {}) });
  if (reduced) await ctx.addInitScript(() => { try { localStorage.setItem('kyntraze-b00-v1', JSON.stringify({ version: 1, settings: { mute: false, reducedEffects: true, pauseOnBlur: true }, best: null })); } catch { /* ignore */ } });
  const page = await ctx.newPage(); const errors = [], shots = [], log = {};
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); }); page.on('pageerror', e => errors.push('pageerror ' + String(e).slice(0, 200)));
  const tag = (reduced ? '-reduced' : '') + (arena !== 'gloam' ? '-' + arena : '');
  const shot = async n => { const f = `${n}${tag}-${W}x${H}.png`; await page.screenshot({ path: path.join(out, f) }); shots.push(f); };
  const qa = (f, a) => page.evaluate(f, a);
  const waitFor = async (fn, ms = 6000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await qa(fn, arg)) return true; await sleep(16); } return false; };
  await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1&form3=1&arena=${arena}`); await sleep(500);
  await page.addStyleTag({ content: '[data-testid=pause-menu]{display:none!important}' });
  await page.getByTestId('play-button').click(); await sleep(250); await page.getByTestId('start-run').click(); await waitFor(() => !!window.__KYNT_QA__ && !!window.__KYNT_QA__.sim(), 20000); await sleep(1500);
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.attackClock = 1e9; s.spawnTimer = 1e9; s.enemies.length = 0; s.player.hp = 1e6; s.player.maxHp = 1e6; });
  const foes = (n, spread = 1, hp = 300) => qa(({ n, spread, hp }) => {
    const s = window.__KYNT_QA__.sim(), p = s.player, d = { x: p.aimX, y: p.aimY };
    for (let i = 0; i < n; i++) { const along = 90 + (i % 4) * 55, side = ((i * 37) % 5 - 2) * 18 * spread; s.enemies.push({ id: s.nextId++, kind: 'pursuer', x: p.x + d.x * along - d.y * side, y: p.y + d.y * along + d.x * side, hp, maxHp: hp, radius: 17, speed: 0, damage: 0, touchCooldown: 99, mode: 'move', modeT: 0, attackCd: 999, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 }); }
  }, { n, spread, hp });
  const clear = () => qa(() => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; s.player.riftCooldown = 0; s.player.reversalCooldown = 0; s.player.evadeCooldown = 0; s.player.drive = 100; s.cast = null; });
  const freezeShot = async (name, fn, arg) => { const ok = await waitFor(fn, 5000, arg); await qa(() => { window.__KYNT_QA__.sim().phase = 'paused'; }); await sleep(120); await shot(name); await qa(() => { window.__KYNT_QA__.sim().phase = 'running'; }); return ok; };
  await shot('00-base-idle-drive-full');
  // ---- first-activation cinematic: tap F (several forms ready -> the selected / highest = Stillfire Apex on release)
  await page.keyboard.down('f'); await sleep(90); await page.keyboard.up('f');
  const marks = [[0.15, '01-cinema-stillness'], [0.8, '02-cinema-omen'], [1.3, '03-cinema-tearing'], [1.85, '04-cinema-commit'], [2.2, '05-cinema-rise'], [2.6, '06-cinema-reveal-pulse'], [3.1, '07-cinema-settle'], [3.5, '08-cinema-return']];
  const cin = { timeline: [] };
  for (const [t, n] of marks) {
    await waitFor(t => { const s = window.__KYNT_QA__.sim(); return !s.cinema || s.cinema.t >= t; }, 9000, t);
    const sn = await qa(() => { const s = window.__KYNT_QA__.sim(); return { t: s.cinema ? +s.cinema.t.toFixed(2) : null, dur: s.cinema?.dur ?? null, time: +s.time.toFixed(2), form: s.player.form, to: s.cinema?.to ?? null }; }); cin.timeline.push({ n, ...sn }); await shot(n);
  }
  log.cinema = cin;
  await waitFor(() => !window.__KYNT_QA__.sim().cinema, 6000);
  log.afterCinema = await qa(() => { const s = window.__KYNT_QA__.sim(); return { form: s.player.form, drive: +s.player.drive.toFixed(1), cinema: !!s.cinema, time: +s.time.toFixed(2), apexSeen: s.apexSeen }; });
  await sleep(700); await shot('09-form3-idle-hover');
  // ---- glide in all four directions, dash, stop
  for (const [k, n] of [['s', 'south'], ['w', 'north'], ['d', 'east'], ['a', 'west']]) { await page.keyboard.down(k); await sleep(520); await shot(`10-glide-${n}`); await page.keyboard.up(k); await sleep(260); if (n === 'south') await shot('11-glide-stop-settle'); }
  await page.keyboard.down('d'); await sleep(300); await page.keyboard.press('Shift'); await sleep(70); await shot('12-dash-vanish'); await sleep(200); await shot('13-dash-arrive'); await page.keyboard.up('d'); await sleep(300);
  // ---- Silver Rift: charge while moving, diagonal mouse aim, short and full release, blink
  log.rift = {};
  await clear(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.x = 1100; s.player.y = 800; s.player.aimX = 1; s.player.aimY = 0; }); await foes(12, 1.6);
  await page.mouse.move(W / 2 + 190, H / 2 - 150); await sleep(60); await page.mouse.move(W / 2 + 200, H / 2 - 160); await sleep(60);
  await page.keyboard.down('d'); await page.keyboard.down('e');
  await freezeShot('20-rift-charge-moving-short', () => { const c = window.__KYNT_QA__.sim().cast; return !!c && c.kind === 'rift' && c.t >= 0.3; });
  await freezeShot('21-rift-charge-full-diagonal', () => { const c = window.__KYNT_QA__.sim().cast; return !!c && c.kind === 'rift' && c.t >= 1.2; });
  await page.keyboard.up('e'); await page.keyboard.up('d');
  await freezeShot('22-rift-release-blink', () => { const c = window.__KYNT_QA__.sim().cast; return !!c && c.kind === 'rift' && c.released && (c.rt ?? 0) >= 0.12; });
  log.rift.after = await qa(() => { const s = window.__KYNT_QA__.sim(); const c = s.cast; return { tier: c?.tier ?? null, blink: c?.blink ?? null, dir: c ? [+c.dirX.toFixed(3), +c.dirY.toFixed(3)] : null, hand: window.__KYNT_QA__.hand(), fx: window.__KYNT_QA__.fxOrigin(), cd: +s.player.riftCooldown.toFixed(2), damaged: s.enemies.filter(e => e.hp < 300).length }; });
  await waitFor(() => !window.__KYNT_QA__.sim().cast, 4000); await sleep(200);
  // aim in the other quadrants (mouse), quick release each
  for (const [dx, dy, n] of [[-200, 150, 'sw'], [-180, -160, 'nw'], [200, 160, 'se']]) {
    await clear(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.x = 1100; s.player.y = 800; }); await foes(6, 2);
    await page.mouse.move(W / 2 + dx - 8, H / 2 + dy - 8); await sleep(50); await page.mouse.move(W / 2 + dx, H / 2 + dy); await sleep(60);
    await page.keyboard.down('e'); await freezeShot(`23-rift-aim-${n}`, () => { const c = window.__KYNT_QA__.sim().cast; return !!c && c.kind === 'rift' && c.t >= 0.6; }); await page.keyboard.up('e'); await waitFor(() => !window.__KYNT_QA__.sim().cast, 4000);
  }
  // wall denial: pin Kai in a corner and release
  await clear(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.x = 70; s.player.y = 70; }); await sleep(200); await page.mouse.move(W / 2 + 140, H / 2 + 100); await sleep(60); await page.mouse.move(W / 2 + 150, H / 2 + 110); await sleep(60);
  await page.keyboard.down('e'); await sleep(450); await page.keyboard.up('e'); await sleep(200); await shot('24-rift-corner'); log.rift.corner = await qa(() => { const s = window.__KYNT_QA__.sim(); return { x: Math.round(s.player.x), y: Math.round(s.player.y), blink: s.cast?.blink ?? null }; });
  await waitFor(() => !window.__KYNT_QA__.sim().cast, 4000);
  // ---- Instinct Reversal
  await clear(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.x = 1100; s.player.y = 800; s.player.aimX = 1; s.player.aimY = 0; }); await foes(10, 3); await shot('30-reversal-before');
  await page.keyboard.press('r');
  await freezeShot('31-reversal-during-a', () => { const c = window.__KYNT_QA__.sim().cast; return !!c && c.kind === 'reversal' && (c.hop ?? 0) >= 2; });
  await freezeShot('32-reversal-during-b', () => { const c = window.__KYNT_QA__.sim().cast; return !!c && c.kind === 'reversal' && (c.hop ?? 0) >= 4; });
  await freezeShot('33-reversal-finish-flash', () => { const c = window.__KYNT_QA__.sim().cast; return !!c && c.kind === 'reversal' && c.released; });
  await waitFor(() => !window.__KYNT_QA__.sim().cast, 4000); await sleep(150); await shot('34-reversal-after');
  log.reversal = await qa(() => { const s = window.__KYNT_QA__.sim(); return { hit: s.enemies.filter(e => e.hp < 300).length, cd: +s.player.reversalCooldown.toFixed(2), x: Math.round(s.player.x), y: Math.round(s.player.y) }; });
  // ---- perfect evasion: an adjacent striker lands a hit while the evasion is ready
  await clear(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.x = 1100; s.player.y = 800; s.player.invulnerable = 0; s.enemies.push({ id: s.nextId++, kind: 'pursuer', x: 1128, y: 800, hp: 300, maxHp: 300, radius: 17, speed: 0, damage: 20, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 999, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 }); });
  await sleep(120); await shot('40-evasion-ghost'); log.evasion = await qa(() => { const s = window.__KYNT_QA__.sim(); return { hp: s.player.hp, cd: +s.player.evadeCooldown.toFixed(2), x: Math.round(s.player.x), y: Math.round(s.player.y) }; });
  // ---- crowd + reduced readability, then the Seraph-style silent finisher on the Warden
  await clear(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.aimX = 1; s.player.aimY = 0; }); await foes(36, 3); await page.keyboard.down('d'); await sleep(450); await shot('50-crowd-glide'); log.perf = await qa(() => new Promise(res => { const d = []; let last = performance.now(), n = 0; const f = now => { d.push(now - last); last = now; if (++n < 150) requestAnimationFrame(f); else { d.shift(); d.sort((x, y) => x - y); res({ frames: d.length, avgMs: +(d.reduce((x, y) => x + y, 0) / d.length).toFixed(1), p95Ms: +d[Math.floor(d.length * 0.95)].toFixed(1), maxMs: +d[d.length - 1].toFixed(1), enemies: window.__KYNT_QA__.sim().enemies.length, note: 'software GL (swiftshader), not a real GPU' }); } }; requestAnimationFrame(f); })); await page.keyboard.up('d');
  await clear(); await qa(() => window.__KYNT_QA__.encounter('warden')); await sleep(3500); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 1e6; s.player.drive = 100; s.player.form = 3; });
  await shot('51-boss-form3'); await qa(() => window.__KYNT_QA__.killBoss('warden')); await sleep(200); await shot('52-finisher-a'); await sleep(350); await shot('53-finisher-b'); await sleep(500); await shot('54-finisher-c');
  log.afterBoss = await qa(() => { const s = window.__KYNT_QA__.sim(); return { phase: s.phase, hazards: s.hazards.length, shots: s.enemyShots.length, bosses: s.bossesDefeated }; });
  log.errors = errors;
  fs.writeFileSync(path.join(out, `evidence-b13${tag}-${W}x${H}.json`), JSON.stringify({ viewport: [W, H], arena, reduced: !!reduced, note: 'SIMULATED via dev QA route; not human play. swiftshader: normal-speed motion and audio NOT VERIFIED.', log, shots, consoleErrors: errors }, null, 1));
  console.log(JSON.stringify({ log, errors }, null, 1));
  await ctx.close(); await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

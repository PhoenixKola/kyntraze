// B12 live capture: the real Phaser app on the dev server with the dev-only QA route (?qa=1&form2=1 = Cometheart unlocked + full Drive). Forces enemies/time only; not human play.
// node scripts/b12-capture.cjs <outDir> <width> <height> [port] [video]
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const [out, W, H, port = '5173', video] = [process.argv[2], Number(process.argv[3] || 960), Number(process.argv[4] || 540), process.argv[5] || '5173', process.argv[6]];
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, ...(video ? { recordVideo: { dir: path.join(out, 'video'), size: { width: W, height: H } } } : {}) });
  const page = await ctx.newPage(); const errors = [], shots = [], log = {};
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); }); page.on('pageerror', e => errors.push('pageerror ' + String(e).slice(0, 200)));
  const shot = async n => { const f = `${n}-${W}x${H}.png`; await page.screenshot({ path: path.join(out, f) }); shots.push(f); };
  const qa = (f, a) => page.evaluate(f, a);
  const waitFor = async (fn, ms = 6000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await qa(fn, arg)) return true; await sleep(16); } return false; };
  const arena = process.argv[7] || 'gloam';
  await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1&form2=1&arena=${arena}`); await sleep(500);
  await page.addStyleTag({ content: '[data-testid=pause-menu]{display:none!important}' });
  await page.getByTestId('play-button').click(); await sleep(250); await page.getByTestId('start-run').click(); await sleep(2500);
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.attackClock = 1e9; s.spawnTimer = 1e9; s.enemies.length = 0; s.player.hp = 1e6; s.player.maxHp = 1e6; });
  const foes = (n, spread = 1) => qa(({ n, spread }) => {
    const s = window.__KYNT_QA__.sim(), p = s.player, d = { x: p.aimX, y: p.aimY };
    for (let i = 0; i < n; i++) { const along = 90 + (i % 4) * 55, side = ((i * 37) % 5 - 2) * 18 * spread; s.enemies.push({ id: s.nextId++, kind: 'pursuer', x: p.x + d.x * along - d.y * side, y: p.y + d.y * along + d.x * side, hp: 300, maxHp: 300, radius: 17, speed: 0, damage: 0, touchCooldown: 99, mode: 'move', modeT: 0, attackCd: 999, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 }); }
  }, { n, spread });
  const clear = () => qa(() => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; s.player.dragonCooldown = 0; s.player.cometCooldown = 0; s.player.drive = 100; s.cast = null; });
  // freeze the sim (phase 'paused') exactly when a condition holds, shoot, resume: deterministic stills of timed moments
  const freezeShot = async (name, fn, arg) => { const ok = await waitFor(fn, 5000, arg); await qa(() => { window.__KYNT_QA__.sim().phase = 'paused'; }); await sleep(120); await shot(name); await qa(() => { window.__KYNT_QA__.sim().phase = 'running'; }); return ok; };
  const face = async key => { await page.keyboard.down(key); await sleep(130); await page.keyboard.up(key); await sleep(260); };
  await shot('00-base-idle-drive-full');
  // ---- cinematic (first activation, full treatment)
  await page.keyboard.press('f');
  const marks = [[0.2, '01-cinema-anticipation'], [0.9, '02-cinema-charge'], [1.5, '03-cinema-before-break'], [1.7, '04-cinema-break'], [1.88, '05-cinema-commit'], [2.35, '06-cinema-recovery']];
  const cin = { timeline: [] };
  for (const [t, n] of marks) {
    const ok = await waitFor(t => { const s = window.__KYNT_QA__.sim(); return !s.cinema || s.cinema.t >= t; }, 8000, t);
    const sn = await qa(() => { const s = window.__KYNT_QA__.sim(); return { t: s.cinema ? +s.cinema.t.toFixed(2) : null, time: +s.time.toFixed(2), form: s.player.form }; }); cin.timeline.push({ n, ...sn }); await shot(n);
  }
  log.cinema = cin;
  await waitFor(() => !window.__KYNT_QA__.sim().cinema, 6000);
  log.afterCinema = await qa(() => { const s = window.__KYNT_QA__.sim(); return { form: s.player.form, drive: +s.player.drive.toFixed(1), cinema: !!s.cinema, time: +s.time.toFixed(2), cometSeen: s.cometSeen }; });
  await sleep(700); await shot('07-form2-idle');
  // ---- moving / dash
  await page.keyboard.down('d'); await sleep(650); await shot('08-form2-run-east'); await page.keyboard.press('Shift'); await sleep(110); await shot('09-form2-dash'); await sleep(300); await page.keyboard.up('d'); await sleep(450); await shot('10-form2-stop-decay');
  // ---- abilities in all four facings
  const dirs = [['s', 'south'], ['n', 'north'], ['e', 'east'], ['w', 'west']]; const keyOf = { south: 's', north: 'w', east: 'd', west: 'a' };
  log.abilities = {};
  for (const d of ['south', 'north', 'east', 'west']) {
    await clear(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.x = 1100; s.player.y = 800; }); await face(keyOf[d]); await foes(9);
    await page.keyboard.press('e');
    const info = {}; for (const [t, n] of [[0.1, 'a-windup'], [0.36, 'b-launch'], [0.44, 'c-lunge'], [0.56, 'd-impact']]) await freezeShot(`dragon-${d}-${n}`, t => { const c = window.__KYNT_QA__.sim().cast; return !!c && c.kind === 'dragon' && c.t >= t; }, t);
    await waitFor(() => !window.__KYNT_QA__.sim().cast, 3000); await sleep(150);
    info.dragon = await qa(() => { const s = window.__KYNT_QA__.sim(); return { alive: s.enemies.filter(e => e.hp > 0).length, damaged: s.enemies.filter(e => e.hp < 300).length, cd: +s.player.dragonCooldown.toFixed(2), x: Math.round(s.player.x), y: Math.round(s.player.y), pose: window.__KYNT_QA__.heroPose().texture }; });
    await clear(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.x = 1100; s.player.y = 800; }); await foes(14, 1.6); await page.keyboard.press('r');
    await freezeShot(`comet-${d}-1-gather`, () => { const c = window.__KYNT_QA__.sim().cast; return !!c && c.kind === 'comet' && c.t >= 0.95; });
    await freezeShot(`comet-${d}-2-fire`, () => { const c = window.__KYNT_QA__.sim().cast; return !!c && c.kind === 'comet' && c.t >= 1.7; });
    info.origin = await qa(() => ({ hand: window.__KYNT_QA__.hand(), fx: window.__KYNT_QA__.fxOrigin() }));
    await freezeShot(`comet-${d}-3-wide`, () => { const c = window.__KYNT_QA__.sim().cast; return !!c && c.kind === 'comet' && c.t >= 2.3; });
    await waitFor(() => !window.__KYNT_QA__.sim().cast, 4000); await sleep(200);
    info.comet = await qa(() => { const s = window.__KYNT_QA__.sim(); return { alive: s.enemies.filter(e => e.hp > 0).length, damaged: s.enemies.filter(e => e.hp < 300).length, cd: +s.player.cometCooldown.toFixed(2), audio: window.__KYNT_QA__.audio() }; });
    log.abilities[d] = info;
  }
  // ---- crowd + aura scenes, boss finisher
  await clear(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.aimX = 1; s.player.aimY = 0; }); await foes(30, 3); await page.keyboard.down('d'); await sleep(500); await shot('crowd-run'); await page.keyboard.up('d');
  await clear(); await qa(() => window.__KYNT_QA__.encounter('warden')); await sleep(3500); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 1e6; s.player.drive = 100; s.player.form = 2; });
  await shot('boss-warden-form2');
  await qa(() => window.__KYNT_QA__.killBoss('warden')); await sleep(260); await shot('boss-finisher-1'); await sleep(450); await shot('boss-finisher-2');
  log.afterBoss = await qa(() => { const s = window.__KYNT_QA__.sim(); return { phase: s.phase, unlocked: s.cometUnlocked, hazards: s.hazards.length, shots: s.enemyShots.length, bosses: s.bossesDefeated, save: localStorage.getItem('kyntraze-b00-v1') }; });
  log.errors = errors;
  fs.writeFileSync(path.join(out, `evidence-b12-${W}x${H}.json`), JSON.stringify({ viewport: [W, H], note: 'SIMULATED via dev QA route; not human play. swiftshader: normal-speed motion and audio NOT VERIFIED.', log, shots, consoleErrors: errors }, null, 1));
  console.log(JSON.stringify({ log, errors }, null, 1));
  await ctx.close(); await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

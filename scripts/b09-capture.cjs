// B09 live capture: real Phaser app on the dev server, real keyboard for dodges, QA hook only to place/force things.
// node scripts/b09-capture.cjs <outDir> <width> <height> <scenario> [port]
// scenarios: calm | select | hazard | crowd | boss | perf | clip | all. Every run writes evidence-<scenario>-<WxH>.json (commit, tree hash, file hashes, OBSERVED / NOT VERIFIED).
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const [out, W, H, scenario = 'calm', port = '5173'] = [process.argv[2], Number(process.argv[3] || 960), Number(process.argv[4] || 540), process.argv[5], process.argv[6] || '5173'];
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const root = path.resolve(__dirname, '..');
const sh = c => { try { return cp.execSync(c, { cwd: root, encoding: 'utf8' }).trim(); } catch { return ''; } };
const hash = f => { try { return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex').slice(0, 16); } catch { return 'missing'; } };
const FILES = ['src/content/arenas.ts', 'src/sim/ArenaHazards.ts', 'src/sim/EnemyAiSystem.ts', 'src/game/render/arenaWorld.ts', 'src/game/render/arenaArt.ts', 'src/game/render/EntityRenderer.ts', 'src/app/ui/ArenaSelect.tsx', 'src/app/ui.css',
  'public/art/arenas/gloam/props.json', 'public/art/arenas/gloam/card.png', 'public/art/arenas/ashen/props.json', 'public/art/arenas/ashen/card.png', 'public/art/bosses/seraph.png'];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const videoDir = path.join(out, 'video');
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, ...(scenario === 'clip' ? { recordVideo: { dir: videoDir, size: { width: W, height: H } } } : {}) });
  const page = await ctx.newPage(); const errors = []; const shots = []; const timeline = {};
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', e => errors.push('pageerror ' + String(e).slice(0, 200)));
  const shot = async n => { const f = `${n}-${W}x${H}.png`; await page.screenshot({ path: path.join(out, f) }); shots.push(f); };
  const qa = (f, a) => page.evaluate(f, a);
  const key = async (k, ms = 60) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); };
  const url = (arena, extra = '') => `http://127.0.0.1:${port}/?seed=31&qa=1&arena=${arena}${extra}`;
  const boot = async (arena, extra = '') => {
    await page.goto(url(arena, extra)); await sleep(400);
    await page.getByTestId('play-button').click(); await sleep(250); await page.getByTestId('start-run').click();
    await page.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(600);
  };
  const heal = () => qa(() => { const s = window.__KYNT_QA__.sim(); s.player.attackClock = 1e9; s.player.nextXp = 1e9; if (!window.__heal) window.__heal = setInterval(() => { const q = window.__KYNT_QA__ && window.__KYNT_QA__.sim(); if (q) q.player.hp = 100; }, 50); });
  const st = () => qa(() => { const s = window.__KYNT_QA__.sim(); return { t: +s.time.toFixed(2), hp: s.player.hp, arena: s.arenaId, hz: s.hazards.map(h => [h.shape, h.tag, +h.delay.toFixed(2), h.fired]), ah: s.arenaHazard, en: s.enemies.length }; });
  const waitFor = async (fn, ms = 12000, a) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await qa(fn, a)) return true; await sleep(25); } return false; };
  const mobs = (n, kinds) => qa(([n, kinds]) => { const s = window.__KYNT_QA__.sim(), p = s.player; const DEF = { pursuer: [25, 17, 74, 10], flanker: [18, 15, 118, 7], bruiser: [150, 26, 46, 12], ranged: [20, 16, 66, 6], aegis: [220, 22, 52, 14], cantor: [90, 18, 70, 6] };
    for (let i = 0; i < n; i++) { const k = kinds[i % kinds.length], d = DEF[k], a = i * 2.399, r = 90 + (i * 47) % 330; s.enemies.push({ id: s.nextId++, kind: k, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.8, hp: d[0], maxHp: d[0], radius: d[1], speed: d[2], damage: d[3], touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 1 + (i % 6) * 0.4, aimX: 1, aimY: 0, stagger: 0, spawnedAt: s.time }); } }, [n, kinds]);
  const clear = () => qa(() => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.enemies.length = 0; s.enemyShots.length = 0; s.hazards.length = 0; });

  if (scenario === 'calm' || scenario === 'all') for (const arena of ['gloam', 'ashen']) {
    await boot(arena); await heal(); await clear(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.x = 1100; s.player.y = 800; }); await sleep(900); await shot(`${arena}-1-calm-center`);
    await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.x = 760; s.player.y = 560; }); await sleep(700); await shot(`${arena}-2-calm-props`);
    await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.x = 120; s.player.y = 120; }); await sleep(700); await shot(`${arena}-3-corner-rim`);
    await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.x = 1400; s.player.y = 1150; }); await mobs(24, ['pursuer', 'flanker', 'ranged']); await sleep(1200); await shot(`${arena}-4-mobs`);
  }
  if (scenario === 'select' || scenario === 'all') {
    await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1`); await sleep(500); await page.getByTestId('play-button').click(); await sleep(500); await shot('select-1-hero-with-arena-strip');
    await page.getByTestId('arena-open').click(); await sleep(700); await shot('select-2-arena-gloam-selected');
    await page.getByTestId('arena-card-ashen').click(); await sleep(500); await shot('select-3-arena-ashen-selected');
    await page.keyboard.press('Escape'); await sleep(400); await shot('select-4-back-on-hero');
    await page.getByTestId('start-run').click(); await page.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(800);
    timeline.selectedStartArena = (await st()).arena; await shot('select-5-ashen-run-started');
  }
  if (scenario === 'hazard' || scenario === 'all') for (const arena of ['gloam', 'ashen']) {
    const lane = arena === 'gloam';
    // proof set: control (stand still, hit) vs dodge (real keys), with debug overlay stills at warning, active and a safe stance
    const trial = async dodge => {
      await boot(arena); await qa(() => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.player.attackClock = 1e9; s.player.hp = 100; s.player.nextXp = 1e9; s.player.invulnerable = 0; s.time = 50; });
      await qa(l => { const s = window.__KYNT_QA__.sim(); if (l) { s.player.x = 800; s.player.y = 832 - 24; } else { const p = s.hazards; } }, lane);
      if (!lane) await qa(() => { const s = window.__KYNT_QA__.sim(); window.__KYNT_QA__.arenaHazard(); });
      else await qa(() => window.__KYNT_QA__.arenaHazard());
      await waitFor(() => window.__KYNT_QA__.sim().hazards.some(h => h.owner === 0), 3000);
      if (!lane) await qa(() => { const s = window.__KYNT_QA__.sim(), h = s.hazards.find(z => z.owner === 0); s.player.x = h.x + 60; s.player.y = h.y - 24; });
      const t0 = Date.now(); await sleep(150);
      if (dodge) { await key(lane ? 's' : 'd', 1000); } else { await sleep(1000); }
      await sleep(1800); return (await st()).hp;
    };
    const control = await trial(false), dodged = await trial(true);
    timeline[`hazard-${arena}`] = { standStillHp: control, keyboardDodgeHp: dodged };
    // stills with the damage-boundary overlay
    await boot(arena, '&debug=hit'); await qa(() => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.player.attackClock = 1e9; s.player.nextXp = 1e9; s.time = 50; }); await heal();
    await qa(l => { const s = window.__KYNT_QA__.sim(); s.player.x = l ? 700 : 1100; s.player.y = l ? 700 : 800; window.__KYNT_QA__.arenaHazard(); }, lane);
    await waitFor(() => window.__KYNT_QA__.sim().hazards.some(h => h.owner === 0), 3000);
    await qa(l => { const s = window.__KYNT_QA__.sim(), h = s.hazards.find(z => z.owner === 0); if (!l) { s.player.x = h.x + 190; s.player.y = h.y - 24; } }, lane);
    await sleep(900); await shot(`${arena}-hazard-1-warn-debug`); await sleep(800); await shot(`${arena}-hazard-2-active-debug`); await sleep(1500);
    await boot(arena); await heal(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.time = 50; }); await qa(l => { const s = window.__KYNT_QA__.sim(); s.player.x = l ? 700 : 1100; s.player.y = l ? 700 : 800; window.__KYNT_QA__.arenaHazard(); }, lane);
    await waitFor(() => window.__KYNT_QA__.sim().hazards.some(h => h.owner === 0), 3000); await sleep(1000); await shot(`${arena}-hazard-3-warn-1x`); await sleep(700); await shot(`${arena}-hazard-4-active-1x`);
  }
  if (scenario === 'crowd' || scenario === 'all') for (const arena of ['gloam', 'ashen']) {
    await boot(arena); await heal(); await clear(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.x = 1100; s.player.y = 800; });
    await mobs(70, ['pursuer', 'flanker', 'pursuer', 'ranged', 'bruiser', 'aegis']); await sleep(1500); await shot(`${arena}-crowd-1-base`);
    await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.invulnerable = 0.6; }); await sleep(120); await shot(`${arena}-crowd-2-hit-iframes`);
    await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.invulnerable = 0.4; s.player.hp = 20; s.player.maxHp = 100; }); await sleep(150); await shot(`${arena}-crowd-3-low-health`);
    await key('f', 80); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.drive = 100; }); await key('f', 80); await sleep(1600); await shot(`${arena}-crowd-4-formI`);
  }
  if (scenario === 'boss' || scenario === 'all') for (const arena of ['gloam', 'ashen']) for (const boss of ['warden', 'seraph']) {
    await boot(arena, `&encounter=${boss}`); await heal(); await waitFor(() => { const b = window.__KYNT_QA__.sim().enemies[0]; return b && b.mode !== 'intro'; }, 6000);
    await qa(([boss]) => { const s = window.__KYNT_QA__.sim(), b = s.enemies[0]; b.mode = 'move'; b.attackCd = 0; b.ai.pat = boss === 'warden' ? 1 : 1; s.player.x = b.x + (boss === 'warden' ? 150 : 280); s.player.y = b.y; }, [boss]);
    await waitFor(() => window.__KYNT_QA__.sim().enemies[0].mode === 'windup', 3000); await sleep(boss === 'warden' ? 450 : 450); await shot(`${arena}-boss-${boss}-telegraph`);
    await sleep(900); await shot(`${arena}-boss-${boss}-release`);
  }
  if (scenario === 'perf' || scenario === 'all') {
    const res = {};
    const REAL = ['aegis', 'aegis', 'cantor', 'cantor', 'bruiser', 'bruiser', 'bruiser', 'ranged', 'ranged', 'ranged', 'ranged'];   // exactly the live caps (aegis 2, cantor 2, bruiser 3, ranged 4); the rest of the 90 are pursuers/flankers
    for (const arena of ['gloam', 'ashen']) for (const [label, kinds, ns] of [['normal', ['pursuer', 'pursuer', 'flanker', 'ranged'], [60, 90, 115]], ['elite-stress', ['pursuer', 'flanker', 'aegis', 'cantor', 'ranged', 'bruiser'], [60, 90, 115]], ['realistic-caps', null, [90]]]) for (const n of ns) {
      await boot(arena); await heal(); await clear();
      if (kinds) await mobs(n, kinds); else { await mobs(REAL.length, REAL); await mobs(n - REAL.length, ['pursuer', 'pursuer', 'pursuer', 'flanker']); }
      await sleep(1500);
      res[`${arena}-${label}-${n}`] = await page.evaluate(() => new Promise(r => { const d = []; let last = performance.now(), c = 0; const f = t => { d.push(t - last); last = t; if (++c < 240) requestAnimationFrame(f); else { d.shift(); d.sort((a, b) => a - b); r({ avgMs: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1), p95Ms: +d[Math.floor(d.length * 0.95)].toFixed(1), maxMs: +d[d.length - 1].toFixed(1), enemies: window.__KYNT_QA__.sim().enemies.length }); } }; requestAnimationFrame(f); }));
    }
    const gl = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c && c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
    fs.writeFileSync(path.join(out, `perf-${W}x${H}.json`), JSON.stringify({ renderer: gl, note: 'software GL (SwiftShader), NOT a real GPU', res }, null, 1));
  }
  if (scenario === 'clip') {
    for (const arena of ['gloam', 'ashen']) { await boot(arena); await heal(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 0.4; s.time = 40; }); const t0 = Date.now(); const keys = ['d', 'w', 'a', 's']; let i = 0; while (Date.now() - t0 < 16000) { await key(keys[i++ % 4], 600); await sleep(50); } }
  }
  const status = await st().catch(() => null);
  const evidence = {
    scenario, viewport: `${W}x${H}`, capturedAt: new Date().toISOString(), commit: sh('git rev-parse HEAD'), branch: sh('git rev-parse --abbrev-ref HEAD'), workingTree: { dirtyFiles: sh('git status --porcelain').split('\n').filter(Boolean).length, diffSha: crypto.createHash('sha1').update(sh('git diff HEAD')).digest('hex') },
    fileHashes: Object.fromEntries(FILES.map(f => [f, hash(f)])), screenshots: shots, consoleProblems: errors.length, errors, renderer: 'software GL (SwiftShader)', finalSimState: status, timeline,
    observed: ['frames captured from the real app; real keyboard for dodges (hp recorded)', 'console error/warning count'],
    notVerified: ['real-speed motion (stills only; software GL timing is not real-time)', 'audio heard by a human', 'real GPU performance', 'physical controller']
  };
  if (scenario === 'clip') { evidence.video = fs.existsSync(videoDir) ? fs.readdirSync(videoDir).map(f => path.join(videoDir, f)) : []; evidence.notVerified.push('video not watched by the author'); }
  await ctx.close(); await browser.close();
  fs.writeFileSync(path.join(out, `evidence-${scenario}-${W}x${H}.json`), JSON.stringify(evidence, null, 1));
  console.log('done', out, W, H, scenario, 'problems', errors.length);
})();

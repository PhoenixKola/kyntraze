// B08 live capture: real Phaser app on the dev server, real keyboard for dodges, QA hook only to place/force encounters.
// node scripts/b08-capture.cjs <outDir> <width> <height> <scenario> [port]
// scenarios: warden | seraph | elites | mixed | perf | clip | all ; every run writes evidence-<scenario>-<WxH>.json (commit, tree hash, file hashes, OBSERVED / NOT VERIFIED).
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const [out, W, H, scenario = 'warden', port = '5173'] = [process.argv[2], Number(process.argv[3] || 960), Number(process.argv[4] || 540), process.argv[5], process.argv[6] || '5173'];
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const root = path.resolve(__dirname, '..');
const sh = c => { try { return cp.execSync(c, { cwd: root, encoding: 'utf8' }).trim(); } catch { return ''; } };
const hash = f => { try { return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex').slice(0, 16); } catch { return 'missing'; } };
const FILES = ['src/sim/BossAiSystem.ts', 'src/sim/EnemyAiSystem.ts', 'src/sim/CombatSystem.ts', 'src/content/bosses.ts', 'src/content/enemies.ts', 'src/game/render/bossRenderer.ts', 'src/game/render/enemyRenderer.ts', 'src/app/ui/Hud.tsx',
  'public/art/bosses/warden.png', 'public/art/bosses/seraph.png', 'public/art/enemies/aegis.png', 'public/art/enemies/cantor.png', 'public/audio/bosses/loudness.json'];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const videoDir = path.join(out, 'video');
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, ...(scenario === 'clip' ? { recordVideo: { dir: videoDir, size: { width: W, height: H } } } : {}) });
  const page = await ctx.newPage(); const errors = []; const shots = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push('pageerror ' + String(e).slice(0, 200)));
  const shot = async n => { const f = `${n}-${W}x${H}.png`; await page.screenshot({ path: path.join(out, f) }); shots.push(f); };
  const qa = (f, a) => page.evaluate(f, a);
  const key = async (k, ms = 60) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); };
  const boot = async (enc, debug = false) => {
    await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1${enc ? '&encounter=' + enc : ''}${debug ? '&debug=hit' : ''}`); await sleep(400);
    await page.getByTestId('play-button').click(); await sleep(250); await page.getByTestId('start-run').click();
    await page.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(300);
  };
  const st = () => qa(() => { const s = window.__KYNT_QA__.sim(); return { t: +s.time.toFixed(2), hp: s.player.hp, px: Math.round(s.player.x), py: Math.round(s.player.y), shots: s.enemyShots.length, hz: s.hazards.length, ph: s.phase, bd: s.bossesDefeated,
    en: s.enemies.map(e => ({ k: e.kind, m: e.mode, mt: +e.modeT.toFixed(2), a: e.ai && e.ai.atk, p: e.ai && e.ai.phase, hp: Math.round(e.hp), x: Math.round(e.x), y: Math.round(e.y) })) }; });
  const waitFor = async (fn, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await qa(fn)) return true; await sleep(25); } return false; };
  // screenshots only: Kai is healed every 50 ms (hits still show their feedback); dodge runs use the real hp instead
  const god = () => qa(() => { const s = window.__KYNT_QA__.sim(); s.player.attackClock = 1e9; s.player.nextXp = 1e9; if (!window.__heal) window.__heal = setInterval(() => { const q = window.__KYNT_QA__ && window.__KYNT_QA__.sim(); if (q) q.player.hp = 100; }, 50); });
  const dropIntro = () => waitFor(() => { const e = window.__KYNT_QA__.sim().enemies[0]; return e && e.mode !== 'intro'; }, 6000);
  // force the boss to start attack index `pat` next, Kai placed at distance `dist` to its east
  const force = (pat, dist = 150) => qa(([pat, dist]) => { const s = window.__KYNT_QA__.sim(), b = s.enemies.find(e => e.kind === 'warden' || e.kind === 'seraph'); b.mode = 'move'; b.attackCd = 0; b.ai.pat = pat; b.ai.exposed = false; s.player.x = b.x + dist; s.player.y = b.y; }, [pat, dist]);
  const timeline = {};

  const doBoss = async kind => {
    await boot(kind); await god();
    await sleep(700); await shot(`${kind}-1-intro-warning`); await sleep(1400); await shot(`${kind}-2-intro-roar`);
    await dropIntro(); await sleep(200);
    const attacks = kind === 'warden' ? [['sweep', 0], ['rupture', 1], ['rush', 2]] : [['volley', 0], ['ring', 1], ['blink', 3]];
    for (const [name, idx] of attacks) {
      await force(idx, kind === 'warden' ? 140 : 280);
      if (await waitFor(() => { const b = window.__KYNT_QA__.sim().enemies[0]; return b && b.mode === 'windup'; }, 3000)) { await sleep(kind === 'warden' ? 380 : 330); await shot(`${kind}-3-${name}-telegraph`); }
      if (await waitFor(() => { const s = window.__KYNT_QA__.sim(), b = s.enemies[0]; return b && (b.mode === 'strike' || s.enemyShots.length > 0 || s.hazards.some(h => h.fired)); }, 4000)) { await sleep(120); await shot(`${kind}-4-${name}-release`); }
      await sleep(900); await shot(`${kind}-5-${name}-recover`); await sleep(1200);
    }
    // phase transition and phase-2 attack
    await qa(() => { const s = window.__KYNT_QA__.sim(), b = s.enemies[0]; b.hp = b.maxHp * 0.49; });
    await sleep(500); await shot(`${kind}-6-phase-change`); await sleep(1900);
    const p2 = kind === 'warden' ? [['sweep2', 1], ['rupture2', 0]] : [['spiral', 0], ['ring2', 3]];
    for (const [name, idx] of p2) { await force(idx, kind === 'warden' ? 140 : 280); await waitFor(() => window.__KYNT_QA__.sim().enemies[0].mode === 'windup', 3000); await sleep(420); await shot(`${kind}-7-${name}-telegraph`); await sleep(1300); await shot(`${kind}-8-${name}-release`); await sleep(1500); }
    // defeat
    await qa(() => { const s = window.__KYNT_QA__.sim(), b = s.enemies[0]; b.ai.invuln = false; b.hp = 1; b.mode = 'move'; });
    await qa(() => { window.__KYNT_QA__.sim().enemies[0].hp = 0.5; });
    await key('Space', 10); await sleep(100);
    await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.attackClock = 0.01; s.player.attackRange = 900; s.player.attackDamage = 5; });
    await waitFor(() => window.__KYNT_QA__.sim().bossesDefeated >= 1, 5000);
    await sleep(250); await shot(`${kind}-9-death-a`); await sleep(500); await shot(`${kind}-9-death-b`); await sleep(1200); await shot(`${kind}-9-death-c`);
    timeline[kind + '-final'] = await st();
  };

  // Real-keyboard dodges, each paired with a stand-still control proving the attack is real.
  const dodge = async (kind, idx, name, keyName, holdMs, dist, minWindowMs, preMs = 0) => {
    const res = {};
    for (const mode of ['control', 'dodge']) {
      await boot(kind); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 100; s.player.attackClock = 1e9; }); await dropIntro(); await sleep(150);
      await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 100; s.player.invulnerable = 0; }); await force(idx, dist);
      const t0 = Date.now(); let sawWindup = false;
      if (await waitFor(() => window.__KYNT_QA__.sim().enemies[0].mode === 'windup', 3000)) { sawWindup = true; res.windupSeenAfterMs = Date.now() - t0; }
      if (mode === 'dodge') { await sleep(preMs); await key(keyName, holdMs); }
      await sleep(minWindowMs); const after = await st(); res[mode] = { sawWindup, hp: after.hp };
    }
    fs.writeFileSync(path.join(out, `dodge-${name}-${W}x${H}.json`), JSON.stringify(res)); timeline['dodge-' + name] = res;
  };

  if (scenario === 'warden' || scenario === 'all') {
    await doBoss('warden');
    await dodge('warden', 0, 'sweep', 's', 900, 120, 1800);
    await dodge('warden', 1, 'rupture', 's', 1100, 150, 2400);
    await dodge('warden', 2, 'rush', 's', 350, 220, 1800, 500);
  }
  if (scenario === 'seraph' || scenario === 'all') {
    await doBoss('seraph');
  }
  if (scenario === 'seraph' || scenario === 'seraphdodge' || scenario === 'all') await dodge('seraph', 0, 'volley', 's', 900, 300, 3300, 520);   // leaves the 5-bolt fan (+-136 px) while the bolts are still in flight
  if (scenario === 'boundary' || scenario === 'all') {
    // debug overlay (white = visible ring edge, green = edge + Kai foot disc, cyan = Kai feet disc / body): the telegraph art must end on the white line
    await boot('warden', true); await god(); await dropIntro();
    await qa(() => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; const p = s.player; s.enemies.push({ id: s.nextId++, kind: 'bruiser', x: p.x + 40, y: p.y - 10, hp: 150, maxHp: 150, radius: 26, speed: 0, damage: 12, touchCooldown: 0, mode: 'windup', modeT: 0.9, attackCd: 1e9, aimX: -1, aimY: 0, stagger: 0, spawnedAt: s.time }); p.attackClock = 1e9; });
    await sleep(300); await shot('boundary-slam-windup-debug');
    await qa(() => { const s = window.__KYNT_QA__.sim(), e = s.enemies[0]; e.modeT = 0.5; }); await sleep(260); await shot('boundary-slam-late-debug');
    await boot('warden', true); await god(); await dropIntro(); await force(0, 120); await waitFor(() => window.__KYNT_QA__.sim().enemies[0].mode === 'windup', 3000); await sleep(300); await shot('boundary-sweep-debug');
    await boot('warden', true); await god(); await dropIntro(); await force(1, 150); await waitFor(() => window.__KYNT_QA__.sim().hazards.length >= 3, 3000); await sleep(300); await shot('boundary-rupture-debug');
  }
  if (scenario === 'elites' || scenario === 'all') {
    await boot('aegis'); await god(); await sleep(1500); await shot('aegis-1-approach');
    await qa(() => { const s = window.__KYNT_QA__.sim(), e = s.enemies.find(x => x.kind === 'aegis'); e.x = s.player.x + 130; e.y = s.player.y; e.aimX = -1; e.attackCd = 0; s.player.attackClock = 0.02; s.player.attackDamage = 30; });
    await sleep(500); await shot('aegis-2-block');
    await waitFor(() => window.__KYNT_QA__.sim().enemies.find(x => x.kind === 'aegis').mode === 'windup', 4000); await sleep(350); await shot('aegis-3-ram-telegraph');
    await waitFor(() => window.__KYNT_QA__.sim().enemies.find(x => x.kind === 'aegis').mode === 'recover', 4000); await sleep(150); await shot('aegis-4-recover-shield-down');
    await boot('cantor'); await god(); await sleep(1800); await shot('cantor-1-aura');
    await waitFor(() => window.__KYNT_QA__.sim().enemies.find(x => x.kind === 'cantor').mode === 'windup', 6000); await sleep(450); await shot('cantor-2-fan-telegraph');
    await waitFor(() => window.__KYNT_QA__.sim().enemyShots.length > 0, 3000); await sleep(250); await shot('cantor-3-orbs');
  }
  if (scenario === 'mixed' || scenario === 'all') {
    await boot('mixed'); await god(); await dropIntro(); await sleep(800); await shot('mixed-1-crowd-boss');
    await key('f', 80); await sleep(1800); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.drive = 100; s.player.beamCooldown = 0; s.player.sphereCooldown = 0; });
    await force(1, 150); await sleep(500); await key('e'); await sleep(700); await shot('mixed-2-formI-beam-over-rupture-telegraph'); await key('r'); await sleep(1400); await shot('mixed-3-formI-nova-over-boss');
  }
  if (scenario === 'perf' || scenario === 'all') {
    const res = {};
    for (const [label, boss, elite] of [['boss', true, false], ['elites', false, true]]) for (const n of [30, 60, 90, 115]) {
      await boot(boss ? 'warden' : null); await god(); if (boss) await dropIntro();
      await qa(([n, elite, boss]) => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; if (!boss) s.enemies.length = 0; const p = s.player; const ks = elite ? ['pursuer', 'flanker', 'aegis', 'cantor', 'ranged', 'bruiser'] : ['pursuer', 'pursuer', 'flanker', 'ranged'];
        const DEF = { pursuer: [25, 17, 74, 10], flanker: [18, 15, 118, 7], bruiser: [150, 26, 46, 12], ranged: [20, 16, 66, 6], aegis: [220, 22, 52, 14], cantor: [90, 18, 70, 6] };
        const base = s.enemies.length; for (let i = 0; i < n - base; i++) { const k = ks[i % ks.length], d = DEF[k], a = i * 2.399, r = 150 + (i * 53) % 420; s.enemies.push({ id: s.nextId++, kind: k, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.8, hp: d[0], maxHp: d[0], radius: d[1], speed: d[2], damage: d[3], touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 1 + (i % 6) * 0.4, aimX: 1, aimY: 0, stagger: 0, spawnedAt: s.time }); } }, [n, elite, boss]);
      await sleep(1500);
      res[`${label}-${n}`] = await page.evaluate(() => new Promise(r => { const d = []; let last = performance.now(), c = 0, maxShots = 0, maxHaz = 0; const f = t => { d.push(t - last); last = t; const s = window.__KYNT_QA__.sim(); maxShots = Math.max(maxShots, s.enemyShots.length); maxHaz = Math.max(maxHaz, s.hazards.length); if (++c < 240) requestAnimationFrame(f); else { d.shift(); d.sort((a, b) => a - b); r({ frames: d.length, avgMs: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1), p95Ms: +d[Math.floor(d.length * 0.95)].toFixed(1), maxMs: +d[d.length - 1].toFixed(1), enemies: s.enemies.length, maxShots, maxHazards: maxHaz, stats: window.__KYNT_QA__.enemyStats() }); } }; requestAnimationFrame(f); }));
      if (n === 115 && boss) await shot('perf-115-boss');
    }
    const gl = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c && c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
    fs.writeFileSync(path.join(out, `perf-${W}x${H}.json`), JSON.stringify({ renderer: gl, note: 'software GL (SwiftShader), NOT a real GPU', res }, null, 1));
  }
  if (scenario === 'clip') {
    await boot('warden'); await god();
    const t0 = Date.now(); const keys = ['d', 'w', 'a', 's']; let i = 0;
    while (Date.now() - t0 < 26000) { await key(keys[i++ % 4], 650); await sleep(60); }
  }
  const status = await st().catch(() => null);
  const evidence = {
    scenario, viewport: `${W}x${H}`, capturedAt: new Date().toISOString(), commit: sh('git rev-parse HEAD'), branch: sh('git rev-parse --abbrev-ref HEAD'), workingTree: { dirtyFiles: sh('git status --porcelain').split('\n').filter(Boolean).length, diffSha: crypto.createHash('sha1').update(sh('git diff HEAD')).digest('hex') },
    fileHashes: Object.fromEntries(FILES.map(f => [f, hash(f)])), screenshots: shots, consoleErrors: errors.length, errors, renderer: 'software GL (SwiftShader)', finalSimState: status, timeline,
    observed: ['frames captured from the real app with real keyboard input for dodges (hp deltas recorded)', 'console error count', 'sim timelines'],
    notVerified: ['real-speed motion (stills only; software GL timing is not real-time)', 'audio heard by a human', 'real GPU performance', 'physical controller']
  };
  if (scenario === 'clip') { evidence.video = fs.existsSync(videoDir) ? fs.readdirSync(videoDir).map(f => path.join(videoDir, f)) : []; evidence.notVerified.push('video not watched by the author'); }
  await ctx.close(); await browser.close();
  fs.writeFileSync(path.join(out, `evidence-${scenario}-${W}x${H}.json`), JSON.stringify(evidence, null, 1));
  console.log('done', out, W, H, scenario, 'errors', errors.length);
})();

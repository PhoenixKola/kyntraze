// B14 before/after UI capture. Real app on the dev server; QA hook only forces states. STILL FRAMES: motion is NOT verified.
// node scripts/b14-capture.cjs <outDir> <tag: before|after> [port]
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const [out, tag = 'before', port = '5173'] = [process.argv[2] || 'art/ui/review/b14/before', process.argv[3], process.argv[4]];
const P = port || '5173';
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sha = f => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 12);
const uiFiles = ['src/app/ui.css', ...fs.readdirSync('src/app/ui').filter(f => /\.(tsx|ts)$/.test(f)).map(f => 'src/app/ui/' + f)];
const SIZES = [[960, 540], [640, 360]];

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const all = [];
  for (const [W, H] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } }); const page = await ctx.newPage();
    const errors = [], shots = [], failures = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); }); page.on('pageerror', e => errors.push('pageerror ' + String(e).slice(0, 200)));
    const shot = async n => { const f = `${n}-${W}x${H}.png`; await page.screenshot({ path: path.join(out, f) }); shots.push(f); };
    const qa = (f, a) => page.evaluate(f, a);
    const step = async (name, fn) => { try { await fn(); } catch (e) { failures.push(name + ': ' + String(e).split('\n')[0].slice(0, 160)); } };
    const url = q => `http://127.0.0.1:${P}/?seed=31&qa=1${q || ''}`;
    const toRun = async q => { await page.goto(url(q)); await sleep(500); await page.getByTestId('play-button').click(); await sleep(300); await page.getByTestId('start-run').click(); await page.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(800); };
    const calm = () => qa(() => { const s = window.__KYNT_QA__.sim(); s.player.attackClock = 1e9; s.spawnTimer = 1e9; s.enemies.length = 0; s.player.nextXp = 1e9; window.__noheal = false; if (!window.__heal) window.__heal = setInterval(() => { const q = window.__KYNT_QA__ && window.__KYNT_QA__.sim(); if (q && q.phase === 'running' && !window.__noheal) q.player.hp = q.player.maxHp; }, 100); });
    const mobs = (n, kinds) => qa(([n, kinds]) => { const s = window.__KYNT_QA__.sim(), p = s.player; const DEF = { pursuer: [25, 17, 74, 10], flanker: [18, 15, 118, 7], ranged: [20, 16, 66, 6], aegis: [220, 22, 52, 14], cantor: [90, 18, 70, 6] };
      for (let i = 0; i < n; i++) { const k = kinds[i % kinds.length], d = DEF[k], a = i * 2.399, r = 150 + (i * 47) % 600; s.enemies.push({ id: s.nextId++, kind: k, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.8, hp: d[0], maxHp: d[0], radius: d[1], speed: 0, damage: d[3], touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 99, aimX: 1, aimY: 0, stagger: 0, spawnedAt: s.time }); } }, [n, kinds]);
    const clear = () => qa(() => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; s.spawnTimer = 1e9; });

    // menus
    await step('title', async () => { await page.goto(url()); await sleep(900); await shot('title'); });
    await step('settings-title', async () => { await page.getByText('SETTINGS').first().click(); await sleep(500); await shot('settings'); await page.keyboard.press('Escape'); await sleep(300); });
    await step('hero-select', async () => { await page.getByTestId('play-button').click(); await sleep(700); await shot('hero-select'); });
    await step('arena-select', async () => { await page.getByTestId('arena-open').click(); await sleep(600); await shot('arena-select'); await page.keyboard.press('Escape'); await sleep(400); });

    // base HUD states (Gloam)
    await step('run', async () => { await page.getByTestId('start-run').click(); await page.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(800); await calm(); await sleep(400); await shot('hud-calm'); });
    await step('crowd', async () => { await mobs(18, ['pursuer', 'flanker', 'ranged']); await sleep(700); await shot('hud-crowd'); });
    await step('late-crowd', async () => { await qa(() => { const s = window.__KYNT_QA__.sim(); s.time = 700; s.player.level = 14; s.player.nextXp = 1e9; }); await mobs(36, ['pursuer', 'flanker', 'ranged']); await mobs(2, ['aegis']); await sleep(900); await shot('hud-late-crowd'); });
    await step('elite-alert', async () => { await clear(); await mobs(12, ['pursuer', 'flanker']); await mobs(2, ['aegis']); await mobs(1, ['cantor']); await sleep(900); await shot('hud-elite-alert'); });
    await step('lowhp', async () => { await clear(); await qa(() => { window.__noheal = true; const s = window.__KYNT_QA__.sim(); s.player.hp = Math.max(1, s.player.maxHp * 0.18); s.player.invulnerable = 0; }); await sleep(500); await shot('hud-lowhp'); await qa(() => { window.__noheal = false; }); });
    await step('level-up', async () => { await qa(() => { window.__KYNT_QA__.sim().player.level = 11; }); await qa(() => window.__KYNT_QA__.grantXp(['conductor', 'afterburn', 'twinbloom'])); await page.getByTestId('level-up').waitFor(); await sleep(1000); await shot('levelup'); await page.getByTestId('upgrade-afterburn').hover(); await sleep(500); await shot('levelup-hover'); await page.getByTestId('upgrade-afterburn').click(); await sleep(400); });

    // bosses
    await step('boss-warden', async () => { await calm(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.time = 479.6; s.spawnTimer = 1e9; if (s.encounter && s.encounter.spawned) { s.encounter.spawned.warden = false; } }); await sleep(1500); await shot('hud-boss-warden-intro'); await sleep(3200); await shot('hud-boss-warden'); });
    await step('warden-reward', async () => { await page.waitForFunction(() => window.__KYNT_QA__.sim().enemies.some(e => e.kind === 'warden' && e.hp > 0), null, { timeout: 8000 }); await qa(() => window.__KYNT_QA__.killBoss('warden')); await sleep(5200); await shot('warden-reward'); await page.locator('.lv-card').first().click({ timeout: 3000 }); await sleep(500); });
    await step('boss-seraph', async () => { await calm(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.time = 899.6; s.spawnTimer = 1e9; if (s.encounter && s.encounter.spawned) { s.encounter.spawned.warden = true; s.encounter.spawned.seraph = false; } }); await sleep(1500); await shot('hud-boss-seraph-intro'); await sleep(3000); await shot('hud-boss-seraph'); });
    await step('pause', async () => { await page.keyboard.press('Escape'); await page.getByTestId('pause-menu').waitFor(); await sleep(500); await shot('pause'); await page.keyboard.press('Escape'); await sleep(400); });
    await step('results-victory', async () => { await qa(() => window.__KYNT_QA__.killBoss('seraph')); await sleep(900); await shot('victory-beat'); await page.getByTestId('results-screen').waitFor({ timeout: 9000 }); await sleep(2800); await shot('results-victory'); });

    // forms 1-3 + defeat on fresh runs
    await step('form1', async () => { await toRun('&form2=0'); await calm(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.drive = 100; }); await page.keyboard.press('f'); await sleep(1700); await shot('hud-form1'); });
    await step('form2', async () => { await toRun('&form2=1'); await calm(); await sleep(300); await shot('hud-form2-ready'); await page.keyboard.press('f'); await sleep(3200); await shot('hud-form2'); });
    await step('form3', async () => { await toRun('&form3=1'); await calm(); await sleep(300); await shot('hud-form3-ready');
      await page.keyboard.down('f'); await sleep(700); await shot('form-selector'); await page.keyboard.up('f'); await sleep(300);
      await qa(() => { const s = window.__KYNT_QA__.sim(); s.cinema = null; }); await sleep(4200); await shot('hud-form3'); });
    await step('cooldowns', async () => { await mobs(10, ['pursuer']); await page.keyboard.press('Shift'); await page.keyboard.press('q'); await sleep(200); await page.keyboard.press('r'); await sleep(200); await page.keyboard.down('e'); await sleep(550); await shot('hud-cooldowns-charging'); await page.keyboard.up('e'); await sleep(500); await shot('hud-cooldowns'); });
    await step('defeat', async () => { await toRun(); await calm(); await qa(() => { window.__noheal = true; const s = window.__KYNT_QA__.sim(); s.player.hp = 1; s.player.invulnerable = 0; s.enemies.push({ id: s.nextId++, kind: 'pursuer', x: s.player.x, y: s.player.y, hp: 25, maxHp: 25, radius: 17, speed: 0, damage: 99, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 99, aimX: 1, aimY: 0, stagger: 0, spawnedAt: s.time }); }); await page.getByTestId('results-screen').waitFor({ timeout: 9000 }); await sleep(1500); await shot('results-defeat'); });
    await step('loading', async () => { await page.goto(url()); await shot('loading-or-title-early'); });
    await step('ashen', async () => { await page.goto(url('&arena=ashen')); await sleep(500); await page.getByTestId('play-button').click(); await sleep(300); await page.getByTestId('start-run').click(); await page.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(800); await calm(); await mobs(20, ['pursuer', 'flanker', 'ranged']); await sleep(700); await shot('hud-ashen-crowd'); });

    const boxes = await qa(() => [...document.querySelectorAll('.hud-health,.hud-clock,.hud-pause,.hud-slots,.hud-map,.boss-bar')].map(e => { const r = e.getBoundingClientRect(); return [e.className.split(' ').slice(0, 2).join('.'), Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })).catch(() => null);
    all.push({ viewport: [W, H], shots, failures, consoleErrors: errors, lastHudBoxes: boxes });
    await ctx.close();
  }
  let head = ''; try { head = cp.execSync('git rev-parse HEAD').toString().trim(); } catch {}
  const hashes = {}; for (const f of uiFiles) hashes[f] = sha(f);
  fs.writeFileSync(path.join(out, `evidence-b14-${tag}.json`), JSON.stringify({ tag, gitHead: head, uiHashes: hashes, status: 'STILL FRAMES ONLY (OBSERVED = stills); normal-speed motion, audio, controller hardware, GPU NOT VERIFIED; swiftshader', runs: all }, null, 1));
  console.log(JSON.stringify(all.map(a => ({ vp: a.viewport, shots: a.shots.length, failures: a.failures, errors: a.consoleErrors.length }))));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

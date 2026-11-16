// B21 real-time clips: node scripts/b21-video.cjs <outDir> <port>. Playwright recordVideo at natural cadence (software GL: the in-page rAF rate is logged per clip, it is NOT a GPU number). Output mp4 via ffmpeg.
const { chromium } = require('@playwright/test'); const path = require('path'); const fs = require('fs'); const { spawnSync } = require('child_process'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = process.argv[2], port = process.argv[3] || 5199; fs.mkdirSync(out, { recursive: true });
const ONLY = process.argv[4] ? process.argv[4].split(',') : null;
const CLIPS = [
  { id: 'ren_ascendant_gloam', hero: 'ren', form: 1, arena: 'gloam' }, { id: 'sora_sovereign_ashen', hero: 'sora', form: 1, arena: 'ashen' },
  { id: 'kai_cometheart_gloam', hero: 'kai', form: 2, arena: 'gloam' }, { id: 'kai_stillfire_ashen', hero: 'kai', form: 3, arena: 'ashen' },
  { id: 'kai_flarebound_gloam', hero: 'kai', form: 1, arena: 'gloam' }, { id: 'ren_base_ashen', hero: 'ren', form: 0, arena: 'ashen' },
  { id: 'sora_reduced_effects_gloam', hero: 'sora', form: 1, arena: 'gloam', reduced: true }, { id: 'ren_evolved_late_build_ashen', hero: 'ren', form: 1, arena: 'ashen', evo: true },
].filter(c => !ONLY || ONLY.includes(c.id));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const log = [];
  for (const c of CLIPS) {
    const dir = path.join(out, '_raw'); fs.mkdirSync(dir, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: 960, height: 540 }, recordVideo: { dir, size: { width: 960, height: 540 } } }); const page = await ctx.newPage();
    if (c.reduced) await page.addInitScript(() => { try { localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ settings: { reducedEffects: true, pauseOnBlur: false } })); } catch {} });
    await page.goto(`http://127.0.0.1:${port}/?seed=11&qa=1&arena=${c.arena}&hero=${c.hero}&form3=1`); await sleep(500); await page.getByTestId('play-button').click(); await sleep(300); await page.getByTestId('start-run').click().catch(() => {});
    await page.waitForFunction(() => !!window.__KYNT_QA__); await sleep(400);
    await page.evaluate(([c]) => { const s = window.__KYNT_QA__.sim(), p = s.player; s.spawnTimer = 1e9; s.nextFlanker = 1e9; p.hp = 1e7; p.maxHp = 1e7; p.form = c.form; if (c.hero !== 'kai') s.heroFormUnlocked = true; if (c.evo) { s.upgradeStacks = { impact: 5, tempo: 4, reach: 3, pulse: 3, widelance: 3, hardlight: 4, afterburn: 3, bloombulk: 3, afterglow: 1, twinbloom: 1 }; s.mods.sphereEcho = 2; s.mods.sphereRadius = 1.5; }
      const kinds = ['pursuer', 'flanker', 'bruiser', 'aegis', 'cantor', 'ranged']; for (let i = 0; i < 24; i++) { const a = i * 0.9, r = 150 + (i % 5) * 50; s.enemies.push({ id: 900 + i, kind: kinds[i % 6], hp: 400, maxHp: 400, radius: 18, speed: 40, damage: 0, touchCooldown: 9, mode: 'move', modeT: 0, attackCd: 99, aimX: 0, aimY: 1, stagger: 0, spawnedAt: s.time, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.7 }); } }, [c]);
    await page.evaluate(() => { window.__fps = []; let n = 0, t0 = performance.now(); const f = t => { n++; if (t - t0 >= 1000) { window.__fps.push(n); n = 0; t0 = t; } requestAnimationFrame(f); }; requestAnimationFrame(f); });
    const press = async (k, ms) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); };
    await sleep(800); await press('d', 900); await press('a', 700); await press('s', 500); await press('w', 500); await press('Shift', 120); await sleep(300);
    await press('q', 90); await sleep(900); await press('e', c.hero === 'sora' ? 1100 : 90); await sleep(1100); await press('d', 400); await press('r', 90); await sleep(2000); await press('a', 600); await sleep(600);
    const fps = await page.evaluate(() => window.__fps); await page.close(); const v = await page.video().path(); await ctx.close();
    const mp4 = path.join(out, c.id + '.mp4'); const r = spawnSync('ffmpeg', ['-y', '-i', v, '-c:v', 'libx264', '-crf', '30', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', mp4], { encoding: 'utf8' });
    log.push({ clip: c.id, size_kb: Math.round(fs.statSync(mp4).size / 1024), rafFpsPerSecond: fps, ffmpeg: r.status });
  }
  fs.rmSync(path.join(out, '_raw'), { recursive: true, force: true }); const jf = path.join(out, 'clips.json'), prev = fs.existsSync(jf) ? JSON.parse(fs.readFileSync(jf, 'utf8')).filter(o => !log.some(l => l.clip === o.clip)) : []; fs.writeFileSync(jf, JSON.stringify([...prev, ...log], null, 1)); console.log(JSON.stringify(log.map(l => [l.clip, l.size_kb, l.rafFpsPerSecond.join('/')])));
  await b.close();
})();

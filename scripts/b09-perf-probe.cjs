// B08.1 A4: profile where frame time goes in the elite-heavy stress case (software GL). Hides one display-object category at a time and re-measures.
// node scripts/b09-perf-probe.cjs <W> <H> [n] [arena] [port]
const { chromium } = require('@playwright/test');
const [W, H, N = '115', arena = 'gloam', port = '5173', extra = '', mix = 'elites'] = [Number(process.argv[2] || 960), Number(process.argv[3] || 540), process.argv[4], process.argv[5], process.argv[6], process.argv[7], process.argv[8]];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(`http://127.0.0.1:${port || 5173}/?seed=31&qa=1&arena=${arena}${extra}`); await sleep(400); await p.getByTestId('play-button').click(); await sleep(250); await p.getByTestId('start-run').click();
  await p.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(500);
  await p.evaluate(([n, MIX]) => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.enemies.length = 0; s.player.hp = 1e9; s.player.attackClock = 1e9; const pl = s.player; const ks = MIX === 'elites' ? ['pursuer', 'flanker', 'aegis', 'cantor', 'ranged', 'bruiser'] : ['pursuer', 'pursuer', 'flanker', 'ranged']; const DEF = { pursuer: [25, 17, 74, 10], flanker: [18, 15, 118, 7], bruiser: [150, 26, 46, 12], ranged: [20, 16, 66, 6], aegis: [220, 22, 52, 14], cantor: [90, 18, 70, 6] };
    for (let i = 0; i < Number(n); i++) { const k = ks[i % ks.length], d = DEF[k], a = i * 2.399, r = 150 + (i * 53) % 420; s.enemies.push({ id: s.nextId++, kind: k, x: pl.x + Math.cos(a) * r, y: pl.y + Math.sin(a) * r * 0.8, hp: d[0], maxHp: d[0], radius: d[1], speed: d[2], damage: d[3], touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 1 + (i % 6) * 0.4, aimX: 1, aimY: 0, stagger: 0, spawnedAt: s.time }); } }, [N, mix]);
  await sleep(1500);
  const measure = () => p.evaluate(() => new Promise(r => { const d = []; let last = performance.now(), c = 0; const f = t => { d.push(t - last); last = t; if (++c < 200) requestAnimationFrame(f); else { d.shift(); r(+(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1)); } }; requestAnimationFrame(f); }));
  const hide = (pred, on) => p.evaluate(([src, on]) => { const sc = window.__KYNT_QA__.scene(); const f = new Function('o', 'return ' + src); let n = 0; for (const o of sc.children.list) { try { if (f(o)) { o.setVisible(on); n++; } } catch (e) {} } return n; }, [pred, on]);
  const out = { baseline: await measure() }; if (process.env.ONLY_BASE) { console.log(JSON.stringify({ extra, mix, baseline: out.baseline })); await b.close(); return; }
  for (const [name, pred] of [['aura-ring', "o.texture && o.texture.key === 'boss-fx-aura-ring'"], ['enemy sprites', "o.texture && o.texture.key.startsWith('enemy-sheet-')"], ['telegraph imgs (circle-warn/aimline/chevron)', "o.texture && /enemy-fx-(circle-warn|aimline|chevron)/.test(o.texture.key)"], ['bolts', "o.texture && /bolt/.test(o.texture.key)"], ['shadows', "o.texture && o.texture.key === 'pres-shadow'"], ['ambience (motes+fog)', "o.texture && /arena-fx-(mote|fog)/.test(o.texture.key)"], ['floor', "o.texture && o.texture.key === 'arena-floor-baked'"], ['ALL extras (aura+tele+bolts+shadows+ambience)', "o.texture && /boss-fx-aura-ring|enemy-fx-|bolt|pres-shadow|arena-fx-(mote|fog)/.test(o.texture.key)"], ['enemies+extras (floor+hero only)', "o.texture && /enemy-sheet-|boss-fx-aura-ring|enemy-fx-|bolt|pres-shadow|arena-fx-(mote|fog)/.test(o.texture.key)"]]) {
    const n = await hide(pred, false); await sleep(200); out[name] = { hidden: n, ms: await measure() }; await hide(pred, true);
  }
  console.log(JSON.stringify({ W, H, N, arena, out, errs }, null, 1)); await b.close();
})();

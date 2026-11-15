// B08.1 A4: CPU profile (V8 sampling via CDP) of the 115-enemy stress case: top self-time functions. node scripts/b09-cpu-profile.cjs <W> <H> <arena> <kinds: elites|normal>
const { chromium } = require('@playwright/test');
const [W, H, arena = 'gloam', mix = 'elites'] = [Number(process.argv[2] || 960), Number(process.argv[3] || 540), process.argv[4], process.argv[5]];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
  await p.goto(`http://127.0.0.1:5173/?seed=31&qa=1&arena=${arena}`); await sleep(400); await p.getByTestId('play-button').click(); await sleep(250); await p.getByTestId('start-run').click();
  await p.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(500);
  await p.evaluate(mix => { const s = window.__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.enemies.length = 0; s.player.hp = 1e9; s.player.attackClock = 1e9; const pl = s.player; const ks = mix === 'elites' ? ['pursuer', 'flanker', 'aegis', 'cantor', 'ranged', 'bruiser'] : ['pursuer', 'pursuer', 'flanker', 'ranged']; const DEF = { pursuer: [25, 17, 74, 10], flanker: [18, 15, 118, 7], bruiser: [150, 26, 46, 12], ranged: [20, 16, 66, 6], aegis: [220, 22, 52, 14], cantor: [90, 18, 70, 6] };
    for (let i = 0; i < 115; i++) { const k = ks[i % ks.length], d = DEF[k], a = i * 2.399, r = 150 + (i * 53) % 420; s.enemies.push({ id: s.nextId++, kind: k, x: pl.x + Math.cos(a) * r, y: pl.y + Math.sin(a) * r * 0.8, hp: d[0], maxHp: d[0], radius: d[1], speed: d[2], damage: d[3], touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 1 + (i % 6) * 0.4, aimX: 1, aimY: 0, stagger: 0, spawnedAt: s.time }); } }, mix);
  await sleep(1500);
  const c = await p.context().newCDPSession(p); await c.send('Profiler.enable'); await c.send('Profiler.start'); await sleep(4000); const { profile } = await c.send('Profiler.stop');
  const dt = profile.timeDeltas, self = new Map(); const byId = new Map(profile.nodes.map(n => [n.id, n]));
  profile.samples.forEach((id, i) => { const n = byId.get(id), k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop().split('?')[0]}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); });
  const total = [...self.values()].reduce((a, b) => a + b, 0);
  console.log(JSON.stringify({ W, H, arena, mix, top: [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${(v / total * 100).toFixed(1)}%  ${k}`) }, null, 1)); await b.close();
})();

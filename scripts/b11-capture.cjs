// B11 live smoke: real Phaser app on the dev server; the QA hook only forces time / bosses / a level-up. Not human play.
// node scripts/b11-capture.cjs <outDir> <width> <height> [port]
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const [out, W, H, port = '5173'] = [process.argv[2], Number(process.argv[3] || 960), Number(process.argv[4] || 540), process.argv[5] || '5173'];
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } }); const page = await ctx.newPage(); const errors = []; const shots = []; const flow = {};
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); }); page.on('pageerror', e => errors.push('pageerror ' + String(e).slice(0, 200)));
  const shot = async n => { const f = `${n}-${W}x${H}.png`; await page.screenshot({ path: path.join(out, f) }); shots.push(f); };
  const qa = (f, a) => page.evaluate(f, a);
  const st = () => qa(() => { const s = window.__KYNT_QA__.sim(); return { phase: s.phase, t: +s.time.toFixed(1), arena: s.arenaId, level: s.player.level, bosses: s.bossesDefeated, reward: s.rewardPick, announce: s.announce && s.announce.id }; });
  const boot = async arena => { await page.goto(`http://127.0.0.1:${port}/?seed=31&qa=1&arena=${arena}`); await sleep(400); await page.getByTestId('play-button').click(); await sleep(250); await page.getByTestId('start-run').click(); await page.waitForFunction(() => Boolean(window.__KYNT_QA__)); await sleep(700); };
  const calm = () => qa(() => { const s = window.__KYNT_QA__.sim(); s.player.attackClock = 1e9; s.spawnTimer = 1e9; s.enemies.length = 0; if (!window.__heal) window.__heal = setInterval(() => { const q = window.__KYNT_QA__ && window.__KYNT_QA__.sim(); if (q && (q.phase === 'running' || q.phase === 'upgrade')) q.player.hp = q.player.maxHp; }, 100); });

  await boot('gloam'); await calm();
  // B10.1: the three circled icons as real common cards, then a mixed rarity row
  await qa(() => window.__KYNT_QA__.grantXp(['impact', 'plating', 'surgecell'])); await page.getByTestId('level-up').waitFor(); await sleep(1000); await shot('icons-1-circled-three');
  await page.getByTestId('upgrade-plating').hover(); await sleep(500); await shot('icons-2-hover');
  await page.keyboard.press('2'); await sleep(300);
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.level = 8; }); await qa(() => window.__KYNT_QA__.grantXp(['stride', 'richveins', 'twinbloom'])); await page.getByTestId('level-up').waitFor(); await sleep(900); await shot('icons-3-mixed'); await page.keyboard.press('1'); await sleep(300);
  // run progress + approach to the Warden
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.time = 455; }); await sleep(700); await shot('run-1-warden-soon');
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.time = 479.5; s.spawnTimer = 1e9; }); await sleep(3600); await shot('run-2-warden-intro-and-map');
  await qa(() => window.__KYNT_QA__.killBoss('warden')); await sleep(5200); flow.afterWardenKill = await st(); await shot('run-3-warden-reward-pick');
  await page.locator('.lv-card').first().click(); await sleep(400); flow.afterRewardPick = await st();
  // finale warning, finale boss, victory
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.enemies.length = 0; s.time = 870.3; }); await sleep(1400); flow.warn = await st(); await shot('finale-1-warning');
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.time = 899.6; s.spawnTimer = 1e9; }); await sleep(3800); await shot('finale-2-seraph-hud');
  await qa(() => window.__KYNT_QA__.killBoss('seraph')); await sleep(900); flow.victoryStart = await st(); await shot('victory-1-beat');
  await sleep(4200); flow.victoryResults = await qa(() => ({ results: !!document.querySelector('[data-testid=results-screen]'), outcome: document.querySelector('[data-testid=results-screen]')?.getAttribute('data-outcome') })); await shot('victory-2-results');
  const dmgAfter = await qa(() => { const s = window.__KYNT_QA__.sim(); return { hp: s.player.hp, enemies: s.enemies.length, hazards: s.hazards.length }; }); flow.afterVictory = dmgAfter;
  await page.getByText('RUN IT AGAIN').click(); await sleep(1500); flow.retry = await st();
  // defeat path
  await calm(); await qa(() => { const s = window.__KYNT_QA__.sim(); s.player.hp = 1; s.player.invulnerable = 0; s.enemies.push({ id: s.nextId++, kind: 'pursuer', x: s.player.x, y: s.player.y, hp: 25, maxHp: 25, radius: 17, speed: 0, damage: 99, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 99, aimX: 1, aimY: 0, stagger: 0, spawnedAt: s.time }); window.__heal && clearInterval(window.__heal); window.__heal = 0; });
  await page.getByTestId('results-screen').waitFor({ timeout: 8000 }); await sleep(600); flow.defeat = await qa(() => ({ outcome: document.querySelector('[data-testid=results-screen]')?.getAttribute('data-outcome') })); await shot('defeat-1-results');
  // ashen victory smoke
  await ctx.clearCookies(); await boot('ashen'); await calm();
  await qa(() => { const s = window.__KYNT_QA__.sim(); s.time = 899.6; s.encounter.spawned.warden = true; }); await sleep(3600); await shot('ashen-finale-hud'); await qa(() => window.__KYNT_QA__.killBoss('seraph')); await page.getByTestId('results-screen').waitFor({ timeout: 9000 }); flow.ashenVictory = await qa(() => document.querySelector('[data-testid=results-screen]')?.getAttribute('data-outcome')); await shot('ashen-victory-results');
  const boxes = await qa(() => [...document.querySelectorAll('.hud-health,.hud-clock,.hud-pause,.hud-slots,.hud-map,.boss-bar,.finale-banner')].map(e => { const r = e.getBoundingClientRect(); return [e.className.split(' ').slice(0, 2).join('.'), Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }));
  fs.writeFileSync(path.join(out, `evidence-b11-${W}x${H}.json`), JSON.stringify({ viewport: [W, H], note: 'SIMULATED/forced via QA hook; not human play. swiftshader, normal-speed motion and audio NOT verified.', flow, shots, consoleErrors: errors, hudBoxes: boxes }, null, 1));
  console.log(JSON.stringify({ flow, errors, boxes }));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

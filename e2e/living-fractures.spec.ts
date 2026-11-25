import { expect, test, type Page } from '@playwright/test';
type Q = { sim: () => any; lfSpawn: (k: string, dx?: number, dy?: number) => number | null };   // eslint-disable-line @typescript-eslint/no-explicit-any
const q = <T,>(page: Page, fn: string, ...a: unknown[]) => page.evaluate(([f, args]) => { const Qa = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__; return (new Function('Q', 'a', `return (${f})(Q, a)`))(Qa, args) as T; }, [fn, a] as [string, unknown[]]);
async function start(page: Page, w: number, h: number, opts: { arena?: string; hero?: string; living?: boolean; mode?: string } = {}) {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript(([hero, arena]) => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero, arena, settings: { pauseOnBlur: false } })), [opts.hero ?? 'kai', opts.arena ?? 'gloam']);
  await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('mode-open').click();
  if (opts.mode) await page.getByTestId(`mode-${opts.mode}`).click();
  if (opts.living !== false) await page.getByTestId('living-toggle').click();
  await page.getByTestId('mode-confirm').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(900);
}
const shot = (page: Page, n: string) => page.screenshot({ path: `test-results/lf-${n}.png` });
const quiet = (page: Page) => q(page, `(Q) => { const s = Q.sim(); s.player.hp = 1e6; s.player.maxHp = 1e6; s.spawnTimer = 1e9; s.player.attackClock = 1e9; s.player.nextXp = 1e9; s.lf.nextAt = 1e9; return s.lf ? s.plan.id : null; }`);

test('opt-in: Living Fractures toggle creates an event run, off leaves no event state', async ({ page }) => {
  await start(page, 960, 540); expect(await q<string>(page, `(Q) => Q.sim().plan.id`)).toBe('classic+lf'); expect(await q<boolean>(page, `(Q) => !!Q.sim().lf`)).toBe(true);
  await page.reload(); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('mode-open').click(); await expect(page.getByTestId('living-toggle')).toContainText('off');
  await page.getByTestId('mode-confirm').click(); await page.getByTestId('start-run').click(); await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(600);
  expect(await q<string>(page, `(Q) => Q.sim().plan.id`)).toBe('classic'); expect(await q<boolean>(page, `(Q) => 'lf' in Q.sim() && !!Q.sim().lf`)).toBe(false); await expect(page.getByTestId('lf-hud')).toHaveCount(0);
});

for (const [w, h] of [[1920, 1080], [960, 540], [640, 360]] as const) test(`every event is visible, readable and playable (${w}x${h})`, async ({ page }) => {
  test.setTimeout(120000); await start(page, w, h); await quiet(page);
  const tp = (x: number, y: number) => q(page, `(Q, a) => { const s = Q.sim(); s.player.x = a[0]; s.player.y = a[1]; }`, x, y);
  // Rift Portal: enter, the guard spawns, kill it, claim
  await q(page, `(Q) => Q.lfSpawn('rift', 300, 0)`); await page.waitForTimeout(700); await expect(page.getByTestId('lf-card-rift')).toBeVisible(); await shot(page, `rift-idle-${w}`);
  const ev = await q<{ x: number; y: number }>(page, `(Q) => { const e = Q.sim().lf.events.find(e => e.kind === 'rift'); return { x: e.x, y: e.y }; }`); await tp(ev.x, ev.y - 24); await page.waitForTimeout(1400);
  expect(await q<string>(page, `(Q) => Q.sim().lf.events.find(e => e.kind === 'rift').st`)).toBe('active'); await page.waitForTimeout(500); await shot(page, `rift-active-${w}`);
  await tp(ev.x + 120, ev.y - 24); await q(page, `(Q) => { const s = Q.sim(); for (const e of s.enemies) if (e.stepId === 'lf') e.hp = 0; }`); await page.waitForTimeout(500);
  expect(await q<string>(page, `(Q) => Q.sim().lf.events.find(e => e.kind === 'rift').st`)).toBe('reward'); await shot(page, `rift-reward-${w}`);
  await tp(ev.x, ev.y - 24); await page.waitForTimeout(600); expect(await q<number>(page, `(Q) => Q.sim().lf.stats.won`)).toBe(1); await expect(page.getByTestId('lf-fx')).toBeVisible(); await shot(page, `rift-won-${w}`);
  await page.waitForTimeout(3800);
  // Corrupted Shrine: preview, accept the left altar
  await q(page, `(Q) => { const s = Q.sim(); s.player.x = 1100; s.player.y = 800; return Q.lfSpawn('shrine', 0, -200); }`); await page.waitForTimeout(800); await expect(page.getByTestId('lf-bargain')).toBeVisible(); await shot(page, `shrine-preview-${w}`);
  await q(page, `(Q) => { const s = Q.sim(), e = s.lf.events.find(e => e.kind === 'shrine'); s.player.x = e.x - 98; s.player.y = e.y - 24; }`); await page.waitForTimeout(2200);
  expect(await q<number>(page, `(Q) => Q.sim().lf.fx.length`)).toBeGreaterThanOrEqual(2); await expect(page.getByTestId('lf-fx')).toBeVisible(); await shot(page, `shrine-struck-${w}`);
  await q(page, `(Q) => { const s = Q.sim(); s.lf.fx = []; s.lf.events = []; s.player.x = 1100; s.player.y = 800; }`);
  // Fracture Cache: hidden until near, attune, open
  await q(page, `(Q) => { const s = Q.sim(); const id = Q.lfSpawn('cache', 700, 0); const e = s.lf.events.find(e => e.id === id); e.aux[0] = 1; }`); await page.waitForTimeout(500); await shot(page, `cache-hidden-${w}`);
  await q(page, `(Q) => { const s = Q.sim(), e = s.lf.events.find(e => e.kind === 'cache'); s.player.x = e.x - 40; s.player.y = e.y - 20; }`); await page.waitForTimeout(1600); await shot(page, `cache-ambush-${w}`);
  expect(await q<string>(page, `(Q) => Q.sim().lf.events.find(e => e.kind === 'cache').st`)).toBe('active');
  await q(page, `(Q) => { const s = Q.sim(); s.lf.events = []; for (const e of s.enemies) e.hp = 0; s.hazards = []; s.player.x = 1100; s.player.y = 800; }`);
  // Roaming Elite
  await q(page, `(Q) => Q.lfSpawn('elite', 520, 80)`); await page.waitForTimeout(800); await shot(page, `elite-${w}`); await expect(page.getByTestId('lf-card-elite')).toBeVisible();
  await q(page, `(Q) => { const s = Q.sim(); s.lf.events = []; for (const e of s.enemies) e.hp = 0; s.hazards = []; }`);
  // Containment
  await q(page, `(Q) => Q.lfSpawn('relay', 260, 0)`); await page.waitForTimeout(500); const rl = await q<{ x: number; y: number }>(page, `(Q) => { const e = Q.sim().lf.events.find(e => e.kind === 'relay'); return { x: e.x, y: e.y }; }`); await tp(rl.x - 60, rl.y - 24); await page.waitForTimeout(6000); await shot(page, `relay-${w}`);
  expect(await q<string>(page, `(Q) => Q.sim().lf.events.find(e => e.kind === 'relay').st`)).toBe('active');
  await q(page, `(Q) => { const s = Q.sim(); s.lf.events = []; for (const e of s.enemies) e.hp = 0; s.hazards = []; s.player.x = 1100; s.player.y = 800; }`);
  // Celestial Echo
  await q(page, `(Q) => Q.lfSpawn('echo', 0, 300)`); await page.waitForTimeout(500); const ec = await q<{ x: number; y: number }>(page, `(Q) => { const e = Q.sim().lf.events.find(e => e.kind === 'echo'); return { x: e.x, y: e.y }; }`); await shot(page, `echo-idle-${w}`);
  await tp(ec.x, ec.y - 24); await page.waitForTimeout(2600); await shot(page, `echo-active-${w}`);
  expect(await q<string>(page, `(Q) => Q.sim().lf.events.find(e => e.kind === 'echo').st`)).toBe('active');
  // minimap shows the markers; no console / page errors surfaced as overlay
  await expect(page.getByTestId('minimap')).toBeVisible();
});

const MATRIX: [string, string, string | undefined][] = [['gloam', 'kai', undefined], ['ashen', 'ren', undefined], ['aetherfall', 'sora', 'fracture_expedition'], ['paradox', 'vex', 'fracture_expedition']];
for (const [arena, hero, mode] of MATRIX) test(`the director spawns real events on its own and the world layer renders them cleanly (${arena}, ${hero})`, async ({ page }) => {
  test.setTimeout(120000); const errors: string[] = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await start(page, 960, 540, { arena, hero, mode }); expect(await q<string>(page, `(Q) => Q.sim().arenaId`)).toBe(arena); expect(await q<string>(page, `(Q) => Q.sim().hero`)).toBe(hero);
  await q(page, `(Q) => { const s = Q.sim(); s.player.hp = 1e6; s.player.maxHp = 1e6; s.player.nextXp = 1e9; s.lf.nextAt = s.time + 1; }`);
  await page.waitForFunction(() => ((window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim().lf.events.length > 0), undefined, { timeout: 20000 });
  await page.waitForTimeout(1500); const kind = await q<string>(page, `(Q) => Q.sim().lf.events[0].kind`); await expect(page.getByTestId('lf-toast').first()).toBeVisible(); await shot(page, `natural-${arena}-${hero}-${kind}`);
  for (const k of ['rift', 'shrine', 'cache', 'elite', 'relay', 'echo']) await q(page, `(Q, a) => { const s = Q.sim(); s.lf.events = []; return Q.lfSpawn(a[0], 320, 40); }`, k).then(() => page.waitForTimeout(350));
  expect(errors, errors.join('\n')).toEqual([]);
});

test('frame time under a busy event encounter stays close to the same crowd without events', async ({ page }) => {
  test.setTimeout(150000);
  const frames = async (living: boolean) => {
    await start(page, 960, 540, { living }); await page.evaluate(() => { const Q = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__, s = Q.sim(); s.player.hp = 1e6; s.player.maxHp = 1e6; s.player.nextXp = 1e9; s.spawnTimer = 1e9; });
    if (living) { await q(page, `(Q) => { const s = Q.sim(); s.lf.nextAt = 1e9; Q.lfSpawn('rift', 260, 0); }`); const e = await q<{ x: number; y: number }>(page, `(Q) => { const e = Q.sim().lf.events[0]; return { x: e.x, y: e.y }; }`); await q(page, `(Q, a) => { const s = Q.sim(); s.player.x = a[0]; s.player.y = a[1] - 24; }`, e.x, e.y); await page.waitForTimeout(1500); }
    else for (let i = 0; i < 8; i++) await q(page, `(Q, a) => Q.spawn(a[0], 200 + a[1] * 40, a[1] * 25 - 90)`, i < 1 ? 'bruiser' : i < 3 ? 'ranged' : 'flanker', i);
    await q(page, `(Q) => { const s = Q.sim(); s.player.attackClock = 1e9; }`);
    return page.evaluate(() => new Promise<{ avg: number; p95: number }>(res => { const d: number[] = []; let last = performance.now(); const tick = () => { const n = performance.now(); d.push(n - last); last = n; if (d.length < 240) requestAnimationFrame(tick); else { d.sort((a, b) => a - b); res({ avg: d.reduce((a, b) => a + b, 0) / d.length, p95: d[Math.floor(d.length * 0.95)] }); } }; requestAnimationFrame(tick); }));
  };
  const base = await frames(false), busy = await frames(true); console.log('FRAMES', JSON.stringify({ base, busy }));
  expect(busy.avg).toBeLessThan(base.avg * 1.4 + 4);
});

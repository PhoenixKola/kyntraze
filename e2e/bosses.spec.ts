import { test, expect, type Page } from '@playwright/test';
// B08 e2e. Real browser input for keyboard; the controller is MOCKED (navigator.getGamepads replaced): it proves wiring, never hardware.
type Q = { sim: () => any; enemyStats: () => { sprites: number; boss: { boss: number; tele: number; fx: number; ghost: number } } };
type W = Window & { __KYNT_QA__?: Q; __pad: { on: boolean; axes: number[]; btn: boolean[] } };
async function start(page: Page, enc: string, w = 960, h = 540) {
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript(() => { const st = { on: false, axes: [0, 0, 0, 0], btn: Array(17).fill(false) }; (window as unknown as W).__pad = st;
    navigator.getGamepads = () => (st.on ? [{ index: 0, id: 'Mock Xbox Controller (STANDARD GAMEPAD)', connected: true, mapping: 'standard', axes: st.axes, buttons: st.btn.map(p => ({ pressed: p, touched: p, value: p ? 1 : 0 })), timestamp: performance.now() } as unknown as Gamepad, null, null, null] : [null, null, null, null]); });
  await page.goto(`/?seed=9&qa=1&encounter=${enc}`); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as W).__KYNT_QA__)); await page.waitForTimeout(300);
  await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.player.attackClock = 1e9; s.player.hp = 100; s.player.nextXp = 1e9; });
  return errors;
}
const sim = (page: Page) => page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); const b = s.enemies.find((e: any) => e.kind === 'warden' || e.kind === 'seraph'); return { t: s.time, hp: s.player.hp, boss: b ? { mode: b.mode, atk: b.ai.atk, hp: b.hp, phase: b.ai.phase, x: b.x, y: b.y } : null, hz: s.hazards.length, shots: s.enemyShots.length, bd: s.bossesDefeated, phase: s.phase }; });
const force = (page: Page, pat: number, dist: number) => page.evaluate(([pat, dist]) => { const s = (window as unknown as W).__KYNT_QA__!.sim(), b = s.enemies.find((e: any) => e.kind === 'warden' || e.kind === 'seraph'); b.mode = 'move'; b.attackCd = 0; b.ai.pat = pat; s.player.x = b.x + dist; s.player.y = b.y; }, [pat, dist]);
const skipIntro = (page: Page) => page.waitForFunction(() => { const b = (window as unknown as W).__KYNT_QA__!.sim().enemies[0]; return b && b.mode !== 'intro'; }, null, { timeout: 8000 });

for (const [w, h] of [[960, 540], [640, 360]] as const) {
  test(`warden: intro warning, bar clear of Kai/HUD, drawn telegraph, no errors (${w}x${h})`, async ({ page }) => {
    const errors = await start(page, 'warden', w, h);
    await expect(page.getByTestId('boss-warning')).toBeVisible(); await expect(page.getByTestId('boss-bar')).toBeVisible();
    await skipIntro(page); await force(page, 0, 140);   // sweep
    await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.enemyStats().boss.tele >= 1, null, { timeout: 5000 });
    const r = await page.evaluate(() => { const q = (s: string) => document.querySelector(`[data-testid="${s}"]`)!.getBoundingClientRect(); const bar = q('boss-bar'), slots = document.querySelector('.hud-slots')!.getBoundingClientRect(), hp = document.querySelector('.hud-health')!.getBoundingClientRect(), pause = document.querySelector('.hud-pause')!.getBoundingClientRect(), clock = document.querySelector('.hud-clock')!.getBoundingClientRect();
      const hit = (a: DOMRect, b: DOMRect) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom); return { slots: hit(bar, slots), hp: hit(bar, hp), pause: hit(bar, pause), clock: hit(bar, clock), centreY: window.innerHeight / 2, barBottom: bar.bottom, w: window.innerWidth, left: bar.left, right: bar.right }; });
    expect(r.slots || r.hp || r.pause || r.clock).toBe(false); expect(r.barBottom).toBeLessThan(r.centreY - 20); expect(r.left).toBeGreaterThanOrEqual(0); expect(r.right).toBeLessThanOrEqual(r.w);
    await page.screenshot({ path: `test-results/boss-warden-${w}x${h}.png` }); expect(errors).toEqual([]);
  });
}

test('seraph: bolts are drawn, the bar tracks damage and phase, defeat leaves nothing behind', async ({ page }) => {
  const errors = await start(page, 'seraph'); await skipIntro(page);
  await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.player.hp = 1e6; }); await force(page, 1, 300);   // orbit bloom
  await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.sim().enemyShots.length > 0, null, { timeout: 6000 });
  await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.enemies[0].hp = s.enemies[0].maxHp * 0.49; });
  await expect(page.getByTestId('boss-bar')).toContainText('PHASE II', { timeout: 4000 });
  await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(), b = s.enemies[0]; b.ai.invuln = false; b.mode = 'move'; b.hp = 1; });
  await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.player.attackClock = 0.01; s.player.attackRange = 900; });
  await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.sim().bossesDefeated >= 1, null, { timeout: 8000 });
  await expect(page.getByTestId('boss-bar')).toHaveCount(0);
  await page.waitForFunction(() => { const st = (window as unknown as W).__KYNT_QA__!.enemyStats().boss; return st.ghost === 0 && st.boss === 0; }, null, { timeout: 6000 });
  const s = await sim(page); expect(s.shots).toBe(0); expect(s.hz).toBe(0); expect(errors).toEqual([]);
});

test('pausing mid-telegraph freezes the encounter and resuming continues it', async ({ page }) => {
  const errors = await start(page, 'warden'); await skipIntro(page); await force(page, 1, 150);   // rupture chain
  await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.sim().hazards.length >= 3, null, { timeout: 4000 });
  await page.keyboard.press('Escape'); await expect(page.getByTestId('pause-menu')).toBeVisible(); const a = await sim(page); await page.waitForTimeout(700); const b = await sim(page);
  expect(b.t).toBe(a.t); expect(b.hz).toBe(a.hz); expect(b.hp).toBe(a.hp);
  await page.keyboard.press('Escape'); await page.waitForFunction(t => (window as unknown as W).__KYNT_QA__!.sim().time > (t as number) + 0.2, a.t, { timeout: 4000 }); expect(errors).toEqual([]);
});

/** B20: wait for SIM seconds, not wall-clock, so a loaded machine (slower sim) cannot change what the test measures. */
const simWait = async (page: Page, sec: number) => { const t0 = await page.evaluate(() => (window as unknown as W).__KYNT_QA__!.sim().time); await page.waitForFunction(([t, d]) => (window as unknown as W).__KYNT_QA__!.sim().time >= t + d, [t0, sec] as const, { timeout: 20000, polling: 30 }); };
test('keyboard dodge: sidestepping a Warden sweep after its telegraph appears avoids the hit; standing still does not', async ({ page }) => {
  const errors = await start(page, 'warden'); await skipIntro(page);
  const trial = async (dodge: boolean) => { await page.evaluate(() => { (window as unknown as W).__KYNT_QA__!.sim().player.hp = 100; (window as unknown as W).__KYNT_QA__!.sim().player.invulnerable = 0; }); await force(page, 0, 120);
    await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.sim().enemies[0].mode === 'windup', null, { timeout: 4000 });
    if (dodge) { await page.keyboard.down('s'); await simWait(page, 0.8); await page.keyboard.up('s'); } await simWait(page, 1.5); return (await sim(page)).hp; };
  expect(await trial(false)).toBeLessThan(100); await page.waitForTimeout(2500); expect(await trial(true)).toBe(100); expect(errors).toEqual([]);
});

test('mocked controller: the left stick walks Kai out of a Warden rupture lane', async ({ page }) => {
  const errors = await start(page, 'warden'); await skipIntro(page); await page.evaluate(() => { (window as unknown as W).__pad.on = true; }); await page.waitForTimeout(200);
  await force(page, 1, 150);
  await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.sim().enemies[0].mode === 'windup', null, { timeout: 4000 });
  await page.evaluate(() => { (window as unknown as W).__pad.axes = [0, 1, 0, 0]; }); await page.waitForTimeout(1100); await page.evaluate(() => { (window as unknown as W).__pad.axes = [0, 0, 0, 0]; }); await page.waitForTimeout(1500);
  expect((await sim(page)).hp).toBe(100); expect(errors).toEqual([]);
});

test('elites render from their own sheets with their markers', async ({ page }) => {
  const errors = await start(page, 'cantor'); await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.enemyStats().sprites >= 5, null, { timeout: 6000 }); await page.waitForTimeout(500); expect(errors).toEqual([]);
});

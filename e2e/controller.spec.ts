import { test, expect, type Page } from '@playwright/test';
// MOCKED controller: navigator.getGamepads is replaced by a scriptable standard-mapped pad. This proves the wiring, never hardware.
const IDX: Record<string, number> = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
type W = Window & { __pad: { on: boolean; axes: number[]; btn: boolean[] }; __KYNT_QA__?: { sim: () => { player: Record<string, number>; phase: string; cast: { kind: string } | null; enemies: unknown[]; kills: number }; grantXp: () => void } };
async function install(page: Page) {
  await page.addInitScript(() => {
    const st = { on: false, axes: [0, 0, 0, 0], btn: Array(17).fill(false) }; (window as unknown as W).__pad = st;
    navigator.getGamepads = () => (st.on ? [{ index: 0, id: 'Mock Xbox Controller (STANDARD GAMEPAD)', connected: true, mapping: 'standard', axes: st.axes, buttons: st.btn.map(p => ({ pressed: p, touched: p, value: p ? 1 : 0 })), timestamp: 0 } as unknown as Gamepad, null, null, null] : [null, null, null, null]);
  });
}
const connect = (page: Page, on = true) => page.evaluate(v => { (window as unknown as W).__pad.on = v; }, on);
const hold = (page: Page, b: string, down: boolean) => page.evaluate(([n, d, i]) => { (window as unknown as W).__pad.btn[i as number] = d as boolean; void n; }, [b, down, IDX[b]]);
const tap = async (page: Page, b: string, ms = 90) => { await hold(page, b, true); await page.waitForTimeout(ms); await hold(page, b, false); await page.waitForTimeout(60); };
const stick = (page: Page, x: number, y: number) => page.evaluate(([a, b]) => { (window as unknown as W).__pad.axes = [a, b, 0, 0]; }, [x, y]);
const sim = (page: Page) => page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); return { x: s.player.x, y: s.player.y, phase: s.phase, dashCd: s.player.dashCooldown, qCd: s.player.qCooldown, beamCd: s.player.beamCooldown, sphereCd: s.player.sphereCooldown, form: s.player.form, cast: s.cast?.kind ?? null, hp: s.player.hp }; });
const focusedTestId = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid ?? document.activeElement?.textContent?.slice(0, 24) ?? '');

for (const [w, h] of [[960, 540], [640, 360]] as const) test(`controller-only: the whole game at ${w}x${h} (mocked pad)`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: h }); await install(page); await page.goto('/?seed=61&qa=1');
  await connect(page); await expect(page.getByTestId('pad-badge')).toBeVisible();
  // title -> hero select -> deploy, with A only
  await tap(page, 'A'); await expect(page.getByTestId('hero-select')).toBeVisible(); await page.waitForTimeout(250);
  await page.screenshot({ path: `test-results/pad-heroselect-${w}x${h}.png` });
  await tap(page, 'A'); await expect(page.getByTestId('hud')).toBeVisible({ timeout: 20000 }); await page.waitForFunction(() => Boolean((window as unknown as W).__KYNT_QA__)); await page.waitForTimeout(300);
  await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.player.hp = 1e6; s.player.nextXp = 1e9; s.player.attackClock = 1e9; (s as unknown as { spawnTimer: number }).spawnTimer = 1e9; });
  // movement: left stick (analog, 8-way) and D-pad
  const a = await sim(page); await stick(page, 1, 0); await page.waitForTimeout(500); await stick(page, 0, 0); const b = await sim(page); expect(b.x).toBeGreaterThan(a.x + 30);
  await hold(page, 'DOWN', true); await page.waitForTimeout(400); await hold(page, 'DOWN', false); const c = await sim(page); expect(c.y).toBeGreaterThan(b.y + 20);
  await stick(page, 0.1, 0.12); await page.waitForTimeout(300); const d0 = await sim(page); await page.waitForTimeout(300); const d1 = await sim(page); expect(Math.hypot(d1.x - d0.x, d1.y - d0.y)).toBeLessThan(0.5); await stick(page, 0, 0);   // drift inside the deadzone: no movement
  // abilities, once per press
  await stick(page, 1, 0); await tap(page, 'A'); let s = await sim(page); expect(s.dashCd).toBeGreaterThan(2); await stick(page, 0, 0); await page.waitForTimeout(400);
  await tap(page, 'X'); s = await sim(page); expect(s.qCd).toBeGreaterThan(7);
  await tap(page, 'RB'); await page.waitForTimeout(150); s = await sim(page); expect(s.cast).toBe('beam'); expect(s.beamCd).toBeGreaterThan(5); await page.screenshot({ path: `test-results/pad-beam-${w}x${h}.png` }); await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.sim().cast === null, null, { timeout: 10000 });
  await tap(page, 'LB'); await page.waitForTimeout(250); s = await sim(page); expect(s.cast).toBe('sphere'); expect(s.sphereCd).toBeGreaterThan(10); await page.waitForTimeout(1500);
  await page.evaluate(() => { (window as unknown as W).__KYNT_QA__!.sim().player.drive = 100; }); await tap(page, 'Y'); await page.waitForTimeout(200); s = await sim(page); expect(s.form).toBe(1);
  // pause: START opens, menu navigates with the D-pad, B resumes
  await tap(page, 'START'); await expect(page.getByTestId('pause-menu')).toBeVisible(); expect((await sim(page)).phase).toBe('paused'); await page.waitForTimeout(250);
  await tap(page, 'DOWN'); await page.waitForTimeout(100); await page.screenshot({ path: `test-results/pad-pause-${w}x${h}.png` });
  await tap(page, 'A'); await expect(page.getByTestId('settings-menu')).toBeVisible(); await expect(page.getByTestId('settings-menu').getByTestId('pad-map')).toBeVisible(); await page.waitForTimeout(250);
  await page.screenshot({ path: `test-results/pad-settings-${w}x${h}.png` }); await tap(page, 'B'); await expect(page.getByTestId('settings-menu')).toHaveCount(0); await expect(page.getByTestId('pause-menu')).toBeVisible(); await page.waitForTimeout(250);
  await tap(page, 'B'); await expect(page.getByTestId('pause-menu')).toHaveCount(0); expect((await sim(page)).phase).toBe('running');
  await tap(page, 'START'); await expect(page.getByTestId('pause-menu')).toBeVisible(); await page.waitForTimeout(250); await tap(page, 'START'); await expect(page.getByTestId('pause-menu')).toHaveCount(0);
  // level-up: a held A when the screen opens must not choose anything; D-pad moves focus, A chooses once
  await hold(page, 'A', true); await page.evaluate(() => (window as unknown as W).__KYNT_QA__!.grantXp()); await expect(page.getByTestId('level-up')).toBeVisible(); await page.waitForTimeout(500);
  await expect(page.getByTestId('level-up')).toBeVisible(); await hold(page, 'A', false); await page.waitForTimeout(300);
  await tap(page, 'RIGHT'); await page.waitForTimeout(100); await page.screenshot({ path: `test-results/pad-levelup-${w}x${h}.png` }); const f0 = await focusedTestId(page); await tap(page, 'RIGHT'); const f1 = await focusedTestId(page); expect(f0).toContain('upgrade'); expect(f1).not.toBe(f0);
  await tap(page, 'A'); await expect(page.getByTestId('level-up')).toHaveCount(0); expect((await sim(page)).phase).toBe('running');
  // controller lost mid-run: auto-pause, keyboard still resumes
  await tap(page, 'A'); await page.waitForTimeout(100); await connect(page, false); await expect(page.getByTestId('pause-menu')).toBeVisible(); await expect(page.getByTestId('pad-badge')).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(page.getByTestId('pause-menu')).toHaveCount(0);
  await connect(page); await expect(page.getByTestId('pad-badge')).toBeVisible(); await stick(page, -1, 0); await page.waitForTimeout(300); await stick(page, 0, 0);   // reconnect: the same pad drives again
  // death -> results -> retry with A
  await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.player.hp = 1; s.player.invulnerable = 0; s.enemies.push({ id: 9999, kind: 'pursuer', x: s.player.x, y: s.player.y, hp: 25, maxHp: 25, radius: 17, speed: 0, damage: 60, touchCooldown: 0 } as never); });
  await expect(page.getByTestId('results-screen')).toBeVisible({ timeout: 8000 }); await page.waitForTimeout(500); await page.screenshot({ path: `test-results/pad-results-${w}x${h}.png` });
  await tap(page, 'A'); await expect(page.getByTestId('results-screen')).toHaveCount(0); await expect(page.getByTestId('hud')).toBeVisible({ timeout: 20000 }); await page.waitForFunction(() => Boolean((window as unknown as W).__KYNT_QA__)); await page.waitForTimeout(400); expect((await sim(page)).phase).toBe('running');
});

test('keyboard still works untouched while a controller is connected and idle', async ({ page }) => {
  await install(page); await page.goto('/?seed=62&qa=1'); await connect(page);
  await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click(); await page.waitForFunction(() => Boolean((window as unknown as W).__KYNT_QA__)); await page.waitForTimeout(300);
  const a = await sim(page); await page.keyboard.down('d'); await page.waitForTimeout(500); await page.keyboard.up('d'); expect((await sim(page)).x).toBeGreaterThan(a.x + 30);
  await page.keyboard.press('e'); await page.waitForTimeout(150); expect((await sim(page)).cast).toBe('beam'); await page.keyboard.press('Escape'); await expect(page.getByTestId('pause-menu')).toBeVisible();
});

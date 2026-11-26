import { test, expect, type Page } from '@playwright/test';
/** B36 visual sweep: Seraph Phoenix + Q + dash + HUD, Ren Eclipse E / R windup + dash. Stills in test-results/b36 (gitignored). */
type Q = { sim: () => { player: Record<string, number> }; spawn: (k: string, dx?: number, dy?: number) => void };
const boot = (page: Page) => page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__));
for (const hero of ['sora', 'ren'] as const) test(`B36 sweep ${hero}`, async ({ page }) => {
  test.setTimeout(150000); await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript((h) => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: h, settings: {}, unlocks: { cometheart: true, stillfire: true, ren: true, sora: true }, b22: { v: 1, soraF2: true, renF2: true } })), hero);
  await page.goto('/?qa=1&ascend=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click(); await boot(page); await page.waitForTimeout(1200);
  await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.player.hp = s.player.maxHp = 1e6; s.player.drive = 100; });
  await page.keyboard.press('f'); await page.waitForTimeout(400); await page.keyboard.press('2'); await page.waitForTimeout(6500);
  const shot = (n: string, full = false) => page.screenshot({ path: `test-results/b36/${hero}-${n}.png`, ...(full ? {} : { clip: { x: 340, y: 160, width: 600, height: 400 } }) });
  await page.evaluate(() => { const q = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__; for (let k = 0; k < 6; k++) q.spawn('pursuer', 120 + (k % 3) * 40, -60 + Math.floor(k / 3) * 80); for (const e of (q.sim() as unknown as { enemies: Array<Record<string, number>> }).enemies) { e.hp = e.maxHp = 1e6; e.speed = 0; } });
  await page.mouse.move(900, 330); await page.waitForTimeout(500);
  await page.keyboard.press('Shift'); await page.waitForTimeout(110); await shot('dash'); await page.waitForTimeout(900);
  await shot('hud', true);
  await page.keyboard.press('q'); await page.waitForTimeout(250); await shot('q1'); await page.waitForTimeout(250); await shot('q2'); await page.waitForTimeout(1200);
  await page.keyboard.press('e'); for (const [i, w] of [250, 250, 250].entries()) { await page.waitForTimeout(w); await shot(`e${i}`); } await page.waitForTimeout(1500);
  await page.keyboard.press('r'); for (const [i, w] of [250, 250, 250].entries()) { await page.waitForTimeout(w); await shot(`r${i}`); } await page.waitForTimeout(2500);
  await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.player.odMeter = 100; });
  await page.keyboard.press('g'); await page.waitForTimeout(1200); await shot('od'); await page.keyboard.down('d'); await page.waitForTimeout(700); await shot('od-right'); await page.keyboard.up('d'); await page.keyboard.down('w'); await page.waitForTimeout(600); await shot('od-north'); await page.keyboard.up('w');
  await page.keyboard.down('a'); await page.waitForTimeout(700); await shot('od-left'); await page.keyboard.up('a'); await page.keyboard.down('s'); await page.waitForTimeout(600); await shot('od-south'); await page.keyboard.up('s');
  expect(errors).toEqual([]);
});

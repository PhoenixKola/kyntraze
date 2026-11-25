import { test, expect, type Page } from '@playwright/test';
type Qa = { sim: () => { cast: { kind: string } | null; sphere: unknown; player: { beamCooldown: number; sphereCooldown: number; hp: number; nextXp: number }; enemies: unknown[]; phase: string }; heroPose: () => { clip: string } };
async function start(page: Page) {
  await page.goto('/?seed=21&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__));
  await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Qa }).__KYNT_QA__.sim(); s.player.nextXp = 1e9; });
}
const state = (page: Page) => page.evaluate(() => { const q = (window as unknown as { __KYNT_QA__: Qa }).__KYNT_QA__; const s = q.sim(); return { cast: s.cast?.kind ?? null, sphere: Boolean(s.sphere), bcd: s.player.beamCooldown, scd: s.player.sphereCooldown, clip: q.heroPose().clip, phase: s.phase }; });
test('E fires the beam with a real cast, cooldown and Beam clip; R launches the sphere', async ({ page }) => {
  await start(page);
  await page.keyboard.down('e'); await page.waitForTimeout(80); await page.keyboard.up('e');
  await page.waitForTimeout(250); let s = await state(page); expect(s.cast).toBe('beam'); expect(s.clip).toBe('Beam'); expect(s.bcd).toBeGreaterThan(5);
  await page.waitForFunction(() => { const q = (window as unknown as { __KYNT_QA__: Qa }).__KYNT_QA__; return q.sim().cast === null; }, null, { timeout: 10000 }); s = await state(page); expect(s.cast).toBeNull();
  await page.keyboard.down('r'); await page.waitForTimeout(80); await page.keyboard.up('r');
  await page.waitForTimeout(300); s = await state(page); expect(s.cast).toBe('sphere'); expect(s.clip).toBe('Sphere');
  await page.waitForTimeout(900); s = await state(page); expect(s.sphere || s.scd > 0).toBeTruthy(); expect(s.scd).toBeGreaterThan(10);
});
test('Shift cancels a cast, Escape freezes it', async ({ page }) => {
  await start(page);
  await page.keyboard.down('d'); await page.keyboard.down('e'); await page.waitForTimeout(80); await page.keyboard.up('e'); await page.waitForTimeout(150);
  await page.keyboard.down('Shift'); await page.waitForTimeout(60); await page.keyboard.up('Shift'); await page.waitForTimeout(100); await page.keyboard.up('d');
  expect((await state(page)).cast).toBeNull();
  await page.evaluate(() => { (window as unknown as { __KYNT_QA__: Qa }).__KYNT_QA__.sim().player.beamCooldown = 0; });
  await page.waitForTimeout(1000); await page.keyboard.press('e'); await page.waitForTimeout(150); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  expect((await state(page)).phase).toBe('paused');
});

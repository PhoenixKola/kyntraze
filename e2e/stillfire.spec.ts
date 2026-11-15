import { test, expect, type Page } from '@playwright/test';
type Sim = { phase: string; time: number; cinema: { t: number; to: number } | null; apexSeen: number; cast: { kind: string; released: boolean; t: number } | null; player: { form: number; drive: number; riftCooldown: number; reversalCooldown: number; x: number; y: number }; enemies: unknown[] };
type Qa = { sim: () => Sim; heroPose: () => { clip: string; visualForm: string } };
const qa = (page: Page) => page.evaluate(() => { const q = (window as unknown as { __KYNT_QA__: Qa }).__KYNT_QA__, s = q.sim(); return { phase: s.phase, time: s.time, cin: s.cinema ? s.cinema.t : null, to: s.cinema?.to ?? null, form: s.player.form, cast: s.cast?.kind ?? null, released: s.cast?.released ?? null, rcd: s.player.riftCooldown, x: s.player.x, clip: q.heroPose().clip, vis: q.heroPose().visualForm, seen: s.apexSeen }; });
async function start(page: Page) {
  await page.goto('/?seed=21&qa=1&form3=1'); await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__));
  await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Qa }).__KYNT_QA__.sim() as Sim & { spawnTimer: number }; s.spawnTimer = 1e9; s.enemies.length = 0; (s.player as unknown as { hp: number }).hp = 1e6; });
}
const cinemaDone = (page: Page) => page.waitForFunction(() => (window as unknown as { __KYNT_QA__: Qa }).__KYNT_QA__.sim().cinema === null, null, { timeout: 10000 });

test('holding F opens the form selector; releasing starts the chosen form (Cometheart stays reachable), tapping starts Stillfire Apex with the run frozen', async ({ page }) => {
  await start(page);
  await page.keyboard.down('f'); await page.waitForTimeout(700); await expect(page.getByTestId('form-selector')).toBeVisible(); await page.keyboard.up('f'); await page.waitForTimeout(200);
  let s = await qa(page); expect(s.to).toBe(2); await cinemaDone(page); expect((await qa(page)).form).toBe(2);
  await page.reload(); await start(page); const t0 = (await qa(page)).time;
  await page.keyboard.down('f'); await page.waitForTimeout(80); await page.keyboard.up('f'); await page.waitForTimeout(600); s = await qa(page);
  expect(s.to).toBe(3); expect(s.clip).toBe('Transform'); const tf = (await qa(page)).time; await page.waitForTimeout(500); expect(Math.abs((await qa(page)).time - tf)).toBeLessThan(0.02); expect(tf - t0).toBeLessThan(0.6);   // the run clock is frozen during the reveal
  await cinemaDone(page); s = await qa(page); expect(s.form).toBe(3); expect(s.vis).toBe('f3'); expect(s.seen).toBe(1);
});
test('E charges while Kai glides, release blinks and fires; R runs Instinct Reversal; both keep their own cooldowns', async ({ page }) => {
  await start(page); await page.keyboard.down('f'); await page.waitForTimeout(80); await page.keyboard.up('f'); await cinemaDone(page); await page.waitForTimeout(700);
  const x0 = (await qa(page)).x; await page.keyboard.down('d'); await page.keyboard.down('e'); await page.waitForTimeout(500);
  let s = await qa(page); expect(s.cast).toBe('rift'); expect(s.released).toBe(false); expect(s.x).toBeGreaterThan(x0 + 15);
  await page.keyboard.up('e'); await page.keyboard.up('d'); await page.waitForTimeout(250); s = await qa(page); expect(s.released).toBe(true); expect(s.rcd).toBeGreaterThan(5);
  await page.waitForFunction(() => (window as unknown as { __KYNT_QA__: Qa }).__KYNT_QA__.sim().cast === null, null, { timeout: 5000 });
  await page.keyboard.press('r'); await page.waitForTimeout(150); s = await qa(page); expect(s.cast).toBe('reversal'); expect(s.clip).toBe('Sphere');
});
test('retry during the Form III reveal starts a clean run', async ({ page }) => {
  await start(page); await page.keyboard.down('f'); await page.waitForTimeout(80); await page.keyboard.up('f'); await page.waitForTimeout(400);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('kyntraze-retry'))); await page.waitForFunction(() => { const q = (window as unknown as { __KYNT_QA__?: Qa }).__KYNT_QA__; return !!q && q.sim().time < 1 && q.sim().cinema === null; }, null, { timeout: 8000 });
  const s = await qa(page); expect(s.form).toBe(0); expect(s.cin).toBeNull(); expect(s.seen).toBe(0);
});

import { test, expect, type Page } from '@playwright/test';
type Sim = { phase: string; time: number; cinema: { t: number } | null; cometSeen: number; cast: { kind: string } | null; player: { form: number; drive: number; dragonCooldown: number; cometCooldown: number; beamCooldown: number; hp: number }; enemies: unknown[]; abilityEvents: Array<{ kind: string }> };
type Qa = { sim: () => Sim; heroPose: () => { clip: string; visualForm: string } };
async function start(page: Page) {
  await page.goto('/?seed=21&qa=1&form2=1'); await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__));
  await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Qa }).__KYNT_QA__.sim() as Sim & { spawnTimer: number }; s.spawnTimer = 1e9; s.enemies.length = 0; s.player.hp = 1e6; });
}
const read = (page: Page) => page.evaluate(() => { const q = (window as unknown as { __KYNT_QA__: Qa }).__KYNT_QA__, s = q.sim(); return { phase: s.phase, time: s.time, cin: s.cinema ? s.cinema.t : null, form: s.player.form, drive: s.player.drive, cast: s.cast?.kind ?? null, dcd: s.player.dragonCooldown, ccd: s.player.cometCooldown, bcd: s.player.beamCooldown, clip: q.heroPose().clip, vis: q.heroPose().visualForm, seen: s.cometSeen }; });

test('F at full Drive plays the Form II reveal with the run frozen, then Kai is Cometheart with its own E / R', async ({ page }) => {
  await start(page); const t0 = (await read(page)).time;
  await page.keyboard.press('f'); await page.waitForTimeout(500); let s = await read(page);
  expect(s.cin).not.toBeNull(); expect(s.clip).toBe('Transform'); expect(Math.abs(s.time - t0)).toBeLessThan(0.05);   // reveal running, run clock frozen
  await page.waitForFunction(() => (window as unknown as { __KYNT_QA__: Qa }).__KYNT_QA__.sim().cinema === null, null, { timeout: 8000 }); s = await read(page);
  expect(s.form).toBe(2); expect(s.vis).toBe('f2'); expect(s.seen).toBe(1);
  await page.keyboard.down('d'); await page.waitForTimeout(150); await page.keyboard.up('d');
  await page.keyboard.press('e'); await page.waitForTimeout(250); s = await read(page); expect(s.cast).toBe('dragon'); expect(s.clip).toBe('BasicPunch'); expect(s.dcd).toBeGreaterThan(7); expect(s.bcd).toBe(0);
  await page.waitForFunction(() => (window as unknown as { __KYNT_QA__: Qa }).__KYNT_QA__.sim().cast === null, null, { timeout: 5000 });
  await page.keyboard.press('r'); await page.waitForTimeout(300); s = await read(page); expect(s.cast).toBe('comet'); expect(s.clip).toBe('Beam'); expect(s.ccd).toBeGreaterThan(18);
});
test('Escape pauses the reveal and resuming continues it; cast voices follow', async ({ page }) => {
  await start(page); await page.keyboard.press('f'); await page.waitForTimeout(400);
  await page.keyboard.press('Escape'); await page.waitForTimeout(150); const a = await read(page); expect(a.phase).toBe('paused'); await page.waitForTimeout(600); const b = await read(page); expect(b.cin).toBe(a.cin);
  await page.keyboard.press('Escape'); await page.waitForFunction(() => (window as unknown as { __KYNT_QA__: Qa }).__KYNT_QA__.sim().cinema === null, null, { timeout: 8000 }); expect((await read(page)).form).toBe(2);
});
test('retry after Form II starts a clean run (no cinema, base form)', async ({ page }) => {
  await start(page); await page.keyboard.press('f'); await page.waitForTimeout(300);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('kyntraze-retry'))); await page.waitForFunction(() => { const q = (window as unknown as { __KYNT_QA__?: Qa }).__KYNT_QA__; return !!q && q.sim().time < 1 && q.sim().cinema === null; }, null, { timeout: 8000 });
  const s = await read(page); expect(s.form).toBe(0); expect(s.cin).toBeNull(); expect(s.seen).toBe(0);
});

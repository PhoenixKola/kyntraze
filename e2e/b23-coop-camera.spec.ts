import { test, expect } from '@playwright/test';
type Q = { sim: () => { player: { x: number; y: number }; party: { slots: { bag: { player: { x: number; y: number } } }[] } }; scene: () => { splitOn: boolean; cameras: { main: { width: number }; cameras: { visible: boolean }[] } } };
test('B23 co-op camera: splits when the partners are far apart, merges again when they return', async ({ page }) => {
  test.setTimeout(90000); await page.setViewportSize({ width: 1280, height: 720 }); await page.addInitScript(() => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'kai', settings: {} })));
  await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('mode-open').click(); await page.getByTestId('coop-sora').click(); await page.getByTestId('mode-confirm').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(1000);
  const split = () => page.evaluate(() => (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.scene().splitOn);
  expect(await split()).toBe(false);
  await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.party.slots[1].bag.player.x = 70; s.party.slots[1].bag.player.y = Math.min(1400, s.player.y + 520); s.player.hp = 1e6; });
  await page.waitForTimeout(600); expect(await split()).toBe(true); await page.screenshot({ path: 'test-results/b23-coop-split.png' });
  await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.party.slots[1].bag.player.x = s.player.x + 80; s.party.slots[1].bag.player.y = s.player.y; });
  await page.waitForTimeout(600); expect(await split()).toBe(false);
});

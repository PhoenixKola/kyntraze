import { test, expect } from '@playwright/test';
test('B22 local co-op starts with two fighters and both can be controlled (keyboard P1 + arrow keys P2)', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 }); await page.addInitScript(() => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'kai', settings: {} })));
  await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('mode-open').click(); await page.getByTestId('coop-sora').click(); await page.getByTestId('mode-confirm').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(800);
  await expect(page.getByTestId('hud-partner')).toBeVisible();
  const pos = () => page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: { sim: () => { player: { x: number }; party?: { slots: { bag: { player: { x: number } } }[] } } } }).__KYNT_QA__.sim(); return { p1: s.player.x, p2: s.party!.slots[1].bag.player.x }; });
  const a = await pos(); await page.keyboard.down('KeyD'); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(700); await page.keyboard.up('KeyD'); await page.keyboard.up('ArrowLeft'); const b = await pos();
  expect(b.p1).toBeGreaterThan(a.p1 + 40); expect(b.p2).toBeLessThan(a.p2 - 40); await page.screenshot({ path: 'test-results/b22-coop.png' });
});

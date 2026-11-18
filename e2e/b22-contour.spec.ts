import { test, type Page } from '@playwright/test';
const boot = (page: Page) => page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__));
type Q = { sim: () => { player: Record<string, number> } };
for (const [hero, form] of [['kai', 1], ['kai', 2], ['kai', 3], ['ren', 1], ['sora', 1], ['vex', 1], ['vex', 2]] as const) test(`contour ${hero} f${form}`, async ({ page }) => {
  test.setTimeout(90000); await page.setViewportSize({ width: 960, height: 540 });
  await page.addInitScript(h => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: h, settings: {} })), hero);
  await page.goto(`/?qa=1&hero=${hero}&ascend=1`); await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click(); await boot(page); await page.waitForTimeout(1200);
  await page.evaluate(f => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.player.form = f; s.player.drive = 100; s.player.hp = s.player.maxHp = 9999; }, form); await page.waitForTimeout(900);
  await page.keyboard.down('d'); await page.waitForTimeout(500);
  await page.screenshot({ path: `test-results/contour-${hero}-f${form}-run.png`, clip: { x: 330, y: 160, width: 300, height: 240 } }); await page.keyboard.up('d'); await page.waitForTimeout(500);
  await page.screenshot({ path: `test-results/contour-${hero}-f${form}-idle.png`, clip: { x: 330, y: 160, width: 300, height: 240 } });
});

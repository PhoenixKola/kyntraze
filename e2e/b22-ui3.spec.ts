import { test, type Page } from '@playwright/test';
const seed = (page: Page, extra: object = {}) => page.addInitScript(x => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'kai', settings: {}, ...(x as object) })), extra);
test('B22 UI 3 screens', async ({ page }) => {
  test.setTimeout(120000); await page.setViewportSize({ width: 1400, height: 800 }); await seed(page, { hero: 'sora' }); await page.goto('/?qa=1'); await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/b22-ui3-title.png' });
  await page.getByTestId('horizons-button').click(); await page.waitForTimeout(1800); await page.screenshot({ path: 'test-results/b22-ui3-archives.png' });
  await page.goto('/?qa=1'); await page.getByTestId('play-button').click(); await page.waitForTimeout(700); await page.screenshot({ path: 'test-results/b22-ui3-heroes.png' });
  await page.getByTestId('start-run').click(); await page.waitForTimeout(500); await page.screenshot({ path: 'test-results/b22-ui3-loading.png' });
});
test('B22 UI 3 progression', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 800 }); await seed(page); await page.goto('/?qa=1'); await page.getByTestId('play-button').click(); await page.getByText('ARMORY').first().click(); await page.getByTestId('tab-archives').click(); await page.waitForTimeout(400);
  await page.getByTestId('arena-aetherfall').scrollIntoViewIfNeeded(); await page.screenshot({ path: 'test-results/b22-ui3-arenas.png' });
  await page.getByTestId('tab-contracts').click(); await page.waitForTimeout(400); await page.screenshot({ path: 'test-results/b22-ui3-contracts.png' });
});

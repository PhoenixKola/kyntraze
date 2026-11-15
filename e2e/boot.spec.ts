import { test, expect } from '@playwright/test';
test('title, hero selection, battle HUD', async ({ page }) => {
  await page.goto('/?seed=123&qa=1');
  await expect(page.getByTestId('title-screen')).toBeVisible();
  await page.getByTestId('play-button').click();
  await expect(page.getByTestId('hero-select')).toBeVisible();
  await page.getByTestId('start-run').click();
  await expect(page.getByTestId('hud')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.arena-viewport canvas')).toBeVisible();
});

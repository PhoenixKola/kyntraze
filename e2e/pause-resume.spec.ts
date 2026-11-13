import { test, expect } from '@playwright/test';
test('Escape pauses, resume unpauses', async ({ page }) => {
  await page.goto('/?seed=123&qa=1');
  await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click();
  await expect(page.locator('.arena-viewport canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean((window as Window & { __KYNT_QA__?: unknown }).__KYNT_QA__)); // arena scene (and its Esc handler) exists only after Kai's sheets load
  await page.keyboard.press('Escape'); await expect(page.getByTestId('pause-menu')).toBeVisible();
  await page.getByRole('button', {name: /RESUME RUN/}).click(); await expect(page.getByTestId('pause-menu')).toHaveCount(0);
});

import { test, expect } from '@playwright/test';
test('dev-only QA hook shows three choices and selecting an upgrade resumes', async ({ page }) => {
  await page.goto('/?seed=123&qa=1');
  await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click();
  await expect(page.locator('.arena-viewport canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean((window as Window & { __KYNT_QA__?: unknown }).__KYNT_QA__));
  await page.evaluate(() => (window as Window & { __KYNT_QA__?: {grantXp:()=>void} }).__KYNT_QA__?.grantXp());
  await expect(page.getByTestId('level-up')).toBeVisible();
  await expect(page.locator('.upgrade-button')).toHaveCount(3);
  await page.getByTestId('upgrade-impact').click();
  await expect(page.getByTestId('level-up')).toHaveCount(0);
});

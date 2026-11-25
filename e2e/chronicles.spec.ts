import { expect, test } from '@playwright/test';

test('Fracture Chronicles: map, sealed chapters, scene skip, objective HUD, retry', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 }); await page.goto('/?qa=1&seed=9');
  await page.getByTestId('play-button').click(); await page.getByTestId('nexus-chronicles').click(); await expect(page.getByTestId('chronicles')).toBeVisible();
  await expect(page.getByTestId('chron-kai_2')).toHaveAttribute('data-state', 'locked'); await expect(page.getByTestId('chron-finale')).toHaveAttribute('data-state', 'locked');
  await page.getByTestId('chron-finale').click(); await expect(page.getByTestId('chron-lock')).toContainText('Finish every arc'); await expect(page.getByTestId('chron-begin')).toBeDisabled();
  await page.getByTestId('chron-kai_1').click(); await page.getByTestId('chron-begin').click(); await expect(page.getByTestId('story-panel')).toBeVisible();
  await page.getByTestId('story-next').click(); await page.getByTestId('story-back').click(); await page.keyboard.press('Escape');
  await expect(page.getByTestId('hud-objective')).toContainText(/HOLD|PREPARE/, { timeout: 60000 });
  await page.keyboard.press('Escape'); await expect(page.getByTestId('pause-menu')).toBeVisible();
});

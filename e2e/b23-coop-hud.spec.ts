import { test, expect } from '@playwright/test';
for (const [p1, p2] of [['kai', 'ren'], ['kai', 'sora'], ['ren', 'vex'], ['sora', 'kai']] as const) {
  test(`B23 co-op HUD: P2 (${p2}) has their own ability row and its cooldowns run (P1 ${p1})`, async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 540 }); await page.addInitScript(h => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: h, settings: {} })), p1);
    await page.goto(`/?seed=9&qa=1&hero=${p1}`); await page.getByTestId('play-button').click(); await page.getByTestId('mode-open').click(); await page.getByTestId(`coop-${p2}`).click(); await page.getByTestId('mode-confirm').click(); await page.getByTestId('start-run').click();
    await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(1200);
    await expect(page.getByTestId('hud-partner')).toBeVisible(); await expect(page.getByTestId('slots-p2-')).toBeVisible();
    for (const id of ['shift', 'q', 'e', 'r', 'f']) await expect(page.getByTestId(`cd-p2-${id}`)).toBeVisible();
    await expect(page.getByTestId('cd-p2-q')).not.toHaveClass(/cooling/);
    await page.keyboard.press('Comma'); await page.waitForTimeout(400);
    await expect(page.getByTestId('cd-p2-q')).toHaveClass(/cooling|active/);
    await expect(page.getByTestId('cd-q')).not.toHaveClass(/cooling/);   // P1's own Q is untouched
    await page.screenshot({ path: `test-results/b23-coop-hud-${p1}-${p2}.png` });
  });
}

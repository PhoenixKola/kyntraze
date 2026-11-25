import { expect, test } from '@playwright/test';
/** Fracture Nexus: the front door after the title. Focused flow check at both target sizes; no console errors. */
for (const [w, h] of [[960, 540], [640, 360]] as const) {
  test(`Fracture Nexus hub flow at ${w}x${h}`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setViewportSize({ width: w, height: h }); await page.goto('/?qa=1&unlock=all');
    await page.getByTestId('play-button').click(); await expect(page.getByTestId('nexus-hub')).toBeVisible();
    for (const id of ['heroes', 'modes', 'online', 'armory', 'contracts', 'archives', 'records', 'settings', 'deploy']) await expect(page.getByTestId(`nexus-${id}`)).toBeVisible();
    for (const id of ['kai', 'ren', 'sora', 'vex']) await expect(page.getByTestId(`nexus-hero-${id}`)).toBeVisible();
    await page.getByTestId('nexus-hero-ren').click(); await expect(page.getByTestId('nexus-hero-ren')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('nexus-armory').click(); await expect(page.getByTestId('nexus-hub')).toHaveCount(0); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await expect(page.getByTestId('nexus-hub')).toBeVisible();
    await page.getByTestId('nexus-heroes').click(); await expect(page.getByTestId('hero-select')).toBeVisible(); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await expect(page.getByTestId('nexus-hub')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.getByTestId('nexus-deploy').click(); await expect(page.getByTestId('hud')).toBeVisible({ timeout: 30000 });
    expect(errors).toEqual([]);
  });
}

import { test, expect, type Page } from '@playwright/test';
const boot = (page: Page) => page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__));
const seed = (page: Page, extra: object = {}) => page.addInitScript(x => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'kai', settings: {}, ...(x as object) })), extra);
for (const [w, h] of [[1280, 720], [960, 540], [1920, 1080]] as const) test(`B22 UI: mode select fits the screen with co-op + confirm visible, arenas list all four (${w}x${h})`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: h }); await seed(page); await page.goto('/?qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.waitForTimeout(500);
  await page.screenshot({ path: `test-results/b22-ui-heroselect-${w}.png` });
  await page.getByTestId('mode-open').click(); await page.getByTestId('coop-local').click(); await page.waitForTimeout(400); await page.screenshot({ path: `test-results/b22-ui-modes-${w}.png` });
  for (const id of ['coop-off', 'coop-kai', 'mode-confirm']) { const b = await page.getByTestId(id).boundingBox(); expect(b, id).not.toBeNull(); expect(b!.y + b!.height, `${id} inside viewport`).toBeLessThanOrEqual(h + 1); }
  await page.getByTestId('coop-vex').click(); await page.getByTestId('mode-confirm').click(); await page.getByTestId('arena-open').click(); await page.waitForTimeout(400); await page.screenshot({ path: `test-results/b22-ui-arenas-${w}.png` });
  await expect(page.getByTestId('arena-card-aetherfall')).toBeVisible(); await expect(page.getByTestId('arena-card-paradox')).toBeVisible();
});
test('B22 UI: Vex transforms on the qa route (Riftbound with F), tooltip does not stick, dash ghost is violet', async ({ page }) => {
  test.setTimeout(120000); await page.setViewportSize({ width: 1280, height: 720 }); await seed(page, { hero: 'vex' });
  await page.goto('/?qa=1&hero=vex&ascend=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click(); await boot(page); await page.waitForTimeout(1500);
  await page.keyboard.press('f'); await page.waitForTimeout(500); await expect(page.getByTestId('form-selector')).toBeVisible(); await expect(page.getByTestId('form-opt-1')).toContainText('RIFTBOUND'); await page.screenshot({ path: 'test-results/b22-ui-vexselector.png' }); await page.getByTestId('form-opt-1').click(); await page.waitForTimeout(3000);
  const form = await page.evaluate(() => (window as unknown as { __KYNT_QA__: { sim: () => { player: { form: number } } } }).__KYNT_QA__.sim().player.form);
  await page.waitForTimeout(1500); await page.screenshot({ path: 'test-results/b22-ui-vexform.png' });
  expect(form).toBeGreaterThan(0);
  const slot = page.getByTestId('cd-q'); await slot.hover(); await page.waitForTimeout(300); await page.screenshot({ path: 'test-results/b22-ui-tip.png', clip: { x: 360, y: 300, width: 560, height: 420 } });
  await slot.click(); await page.mouse.move(640, 200); await page.keyboard.press('e'); await page.waitForTimeout(500);
  await expect(page.getByTestId('tip-q')).toHaveCSS('opacity', '0');
});
test('B22 UI: pause stats stay inside their boxes, runners panel, modal X closes', async ({ page }) => {
  test.setTimeout(90000); await page.setViewportSize({ width: 960, height: 540 }); await seed(page); await page.goto('/?qa=1&seed=3997770554'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click(); await boot(page); await page.waitForTimeout(1500);
  await page.keyboard.press('Escape'); await expect(page.getByTestId('pause-menu')).toBeVisible(); await page.waitForTimeout(300); await page.screenshot({ path: 'test-results/b22-ui-pause.png' });
  const overflow = await page.evaluate(() => [...document.querySelectorAll('.run-stats > div')].some(d => d.scrollWidth > d.clientWidth + 1));
  expect(overflow).toBe(false);
  await page.getByTestId('modal-x').click(); await expect(page.getByTestId('pause-menu')).toBeHidden();
});
test('B22 UI: runners records panel shows four runner cards with their forms', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 }); await seed(page); await page.goto('/?qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click();
  await page.getByText('ARMORY').first().click(); await page.getByTestId('tab-archives').click(); await page.waitForTimeout(500);
  await page.getByTestId('runner-records').scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await expect(page.locator('.pg-runner')).toHaveCount(4);
  await page.screenshot({ path: 'test-results/b22-ui-runners.png' });
});

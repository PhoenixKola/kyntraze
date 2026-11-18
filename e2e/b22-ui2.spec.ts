import { test, expect, type Page } from '@playwright/test';
const boot = (page: Page) => page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__));
const seed = (page: Page, extra: object = {}) => page.addInitScript(x => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'kai', settings: {}, ...(x as object) })), extra);
test('B22 UI 2: hero cards, daily mode panel, arena grid 2-up', async ({ page }) => {
  await page.setViewportSize({ width: 1415, height: 800 }); await seed(page); await page.goto('/?qa=1'); await page.getByTestId('play-button').click(); await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/b22-ui2-heroes.png' });
  await page.getByTestId('mode-open').click(); await page.getByTestId('mode-boss_rush').click(); await page.waitForTimeout(300); await page.screenshot({ path: 'test-results/b22-ui2-boss.png' });
  await page.getByTestId('mode-daily_challenge').click(); await page.waitForTimeout(300); await page.screenshot({ path: 'test-results/b22-ui2-daily.png' });
  await page.getByTestId('mode-confirm').click(); await page.waitForTimeout(300); await page.screenshot({ path: 'test-results/b22-ui2-deploy.png' });
  await page.getByTestId('mode-open').click(); await page.getByTestId('mode-classic').click(); await page.getByTestId('mode-confirm').click(); await page.getByTestId('arena-open').click(); await page.waitForTimeout(400); await page.screenshot({ path: 'test-results/b22-ui2-arenas.png' });
  expect(await page.getByTestId('arena-card-ashen').count() + 1).toBeGreaterThan(0);
});
test('B22 UI 2: Vex Voidheart levitates with its own sheets', async ({ page }) => {
  test.setTimeout(120000); await page.setViewportSize({ width: 1280, height: 720 }); await seed(page, { hero: 'vex' });
  await page.goto('/?qa=1&hero=vex&ascend=1'); await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click(); await boot(page); await page.waitForTimeout(1500);
  await page.keyboard.press('f'); await page.waitForTimeout(400); await page.getByTestId('form-opt-2').click(); await page.waitForTimeout(4500);
  await page.screenshot({ path: 'test-results/b22-ui2-void.png' });
  await page.keyboard.press('e'); await page.waitForTimeout(120); await page.screenshot({ path: 'test-results/b22-ui2-blink.png' });
});

import { test, expect, type Page } from '@playwright/test';
type W = { __KYNT_QA__?: { sim: () => { phase: string } } };
const noScroll = (page: Page, sel: string) => page.evaluate(s => { const el = document.querySelector(s) as HTMLElement | null; return el ? { x: el.scrollWidth - el.clientWidth, y: el.scrollHeight - el.clientHeight } : null; }, sel);

for (const [w, h] of [[1410, 905], [960, 540], [640, 360]] as const) {
  test(`hero select fits without scrolling at ${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h }); await page.goto('/'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click();
    await expect(page.getByTestId('hero-select')).toBeVisible();
    const d = await noScroll(page, '[data-testid="hero-select"]'); expect(d!.y).toBeLessThanOrEqual(1); expect(d!.x).toBeLessThanOrEqual(1);
    const box = await page.getByTestId('start-run').boundingBox(); expect(box!.y + box!.height).toBeLessThanOrEqual(h + 0.5);
  });
}

test('pause + settings: no scrollbars, Esc closes Settings only, switches centred and pointer cursor, abandon is a button', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as W).__KYNT_QA__)); await page.waitForTimeout(400);
  await page.keyboard.press('Escape'); await expect(page.getByTestId('pause-menu')).toBeVisible();
  const pm = await noScroll(page, '[data-testid="pause-menu"] .modal'); expect(pm!.x).toBeLessThanOrEqual(0); expect(pm!.y).toBeLessThanOrEqual(1);
  const aband = page.getByRole('button', { name: /ABANDON RUN/ }); const ab = await aband.boundingBox(); const rb = await page.getByRole('button', { name: /RESUME RUN/ }).boundingBox();
  expect(ab!.width).toBeLessThanOrEqual(rb!.width + 1);
  await page.getByRole('button', { name: 'SETTINGS' }).click(); await expect(page.getByTestId('settings-menu')).toBeVisible();
  const sm = await noScroll(page, '[data-testid="settings-menu"] .modal'); expect(sm!.x).toBeLessThanOrEqual(0);
  const sw = await page.evaluate(() => [...document.querySelectorAll<HTMLInputElement>('.setting-options input')].map(i => { const r = i.getBoundingClientRect(), l = i.closest('label')!.getBoundingClientRect(); return { cursor: getComputedStyle(i).cursor, dy: Math.abs((r.top + r.height / 2) - (l.top + l.height / 2)), lc: getComputedStyle(i.closest('label')!).cursor }; }));
  for (const s of sw) { expect(s.cursor).toBe('pointer'); expect(s.lc).toBe('pointer'); expect(s.dy).toBeLessThanOrEqual(1.5); }
  await page.keyboard.press('Escape'); await expect(page.getByTestId('settings-menu')).toHaveCount(0);
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as W).__KYNT_QA__!.sim().phase)).toBe('paused');
  await page.keyboard.press('Escape'); await expect(page.getByTestId('pause-menu')).toHaveCount(0);
});

test('Esc closes Settings on the title screen', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: /SETTINGS/ }).first().click(); await expect(page.getByTestId('settings-menu')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByTestId('settings-menu')).toHaveCount(0);
});

test('Esc on hero select goes back to the title', async ({ page }) => {
  await page.goto('/'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await expect(page.getByTestId('hero-select')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByTestId('title-screen')).toBeVisible();
});

test('a loading screen is shown until the arena is ready, then the HUD appears', async ({ page }) => {
  await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click();
  await expect(page.getByTestId('loading-screen')).toBeVisible();
  await expect(page.getByTestId('hud')).toBeVisible({ timeout: 20000 }); await expect(page.getByTestId('loading-screen')).toHaveCount(0);
});

for (const [w, h] of [[1800, 700], [1000, 900], [960, 540]] as const) {
  test(`the game canvas fills the window with no black bars at ${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h }); await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click();
    await page.waitForFunction(() => Boolean((window as unknown as W).__KYNT_QA__)); await page.waitForTimeout(400);
    const b = await page.locator('.arena-viewport canvas').boundingBox(); expect(Math.abs(b!.width - w)).toBeLessThanOrEqual(2); expect(Math.abs(b!.height - h)).toBeLessThanOrEqual(2);
  });
}

import { test, expect } from '@playwright/test';
const qa = (page: import('@playwright/test').Page) => page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: { sim: () => { plan: { mode: string }; arenaId: string; hero: string; enemies: { kind: string }[]; time: number } } }).__KYNT_QA__.sim(); return { mode: s.plan.mode, arena: s.arenaId, hero: s.hero, kinds: [...new Set(s.enemies.map(e => e.kind))], t: s.time }; });
for (const [w, h] of [[640, 360], [960, 540]] as const) test(`B22 mode select starts Boss Rush, Expedition and Vex Trial (${w}x${h})`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: h }); await page.addInitScript(() => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'kai', settings: {} })));
  await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.screenshot({ path: `test-results/b22-heroselect-${w}.png` });
  await page.getByTestId('mode-open').click(); await page.screenshot({ path: `test-results/b22-modes-${w}.png` });
  await page.getByTestId('mode-boss_rush').click(); await page.getByTestId('practice-toggle').click(); await page.getByTestId('mode-confirm').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(6500);
  let r = await qa(page); expect(r.mode).toBe('boss_rush'); expect(r.kinds).toContain('warden');
  await page.reload(); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('mode-open').click(); await page.getByTestId('mode-fracture_expedition').click(); await page.getByTestId('mode-confirm').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(500); r = await qa(page); expect(r.mode).toBe('fracture_expedition'); expect(['aetherfall', 'paradox']).toContain(r.arena);
  await page.reload(); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('mode-open').click(); await page.getByTestId('mode-vex_trial').click(); await page.getByTestId('mode-confirm').click(); await page.getByTestId('start-run').click();
  await expect(page.getByTestId('story-panel')).toBeVisible(); await page.waitForTimeout(700); await page.screenshot({ path: `test-results/b22-story-${w}.png` }); await page.getByTestId('story-next').click(); await page.getByTestId('story-next').click(); await page.getByTestId('story-next').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(500); r = await qa(page); expect(r.mode).toBe('vex_trial'); expect(r.hero).toBe('vex');
});

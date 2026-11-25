import { test, expect } from '@playwright/test';
type Q = { sim: () => { player: Record<string, number>; run: { formsUsed: number[] }; time: number; spawnTimer: number }; encounter: (k: string) => void; killBoss: (k: string) => void };
test('B23 win screen shows the victory pose of the form reached (Kai Flarebound)', async ({ page }) => {
  test.setTimeout(90000); await page.setViewportSize({ width: 960, height: 540 }); await page.goto('/?seed=71&qa=1'); await page.evaluate(() => localStorage.removeItem('kyntraze-b00-v1-qa')); await page.goto('/?seed=71&qa=1');
  await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click(); await expect(page.getByTestId('hud')).toBeVisible({ timeout: 20000 });
  await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__));
  await page.evaluate(() => { const q = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__, s = q.sim(); s.spawnTimer = 1e9; s.time = 905; s.player.hp = 1e6; s.player.maxHp = 1e6; s.run.formsUsed.push(1); q.encounter('seraph'); });
  await page.waitForTimeout(600); await page.evaluate(() => (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.killBoss('seraph'));
  await expect(page.getByTestId('results-screen')).toBeVisible({ timeout: 20000 }); await expect(page.getByTestId('victory-pose')).toBeVisible({ timeout: 8000 });
  await expect(page.getByTestId('victory-pose')).toHaveAttribute('data-form', '1'); await page.waitForTimeout(500); await page.screenshot({ path: 'test-results/b23-victory-pose.png' });
});

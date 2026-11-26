import { test, expect } from '@playwright/test';
/** Hero select shows each hero's familiar in the colour of the inspected form; in a run the beast follows the live form. Stills in test-results/fam (gitignored). */
test('familiar on hero select and recoloured in a run', async ({ page }) => {
  test.setTimeout(120000); await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'kai', settings: {}, unlocks: { cometheart: true, stillfire: true, ren: true, sora: true }, b22: { v: 1, soraF2: true, renF2: true, vexForms: [true, true] } })));
  await page.goto('/?qa=1&ascend=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click();
  await expect(page.getByTestId('hs-familiar')).toBeVisible(); await page.waitForTimeout(600); await page.screenshot({ path: 'test-results/fam/select-kai-base.png' });
  await page.getByTestId('form-f1').click(); await page.waitForTimeout(400); await page.screenshot({ path: 'test-results/fam/select-kai-f1.png' });
  await page.getByTestId('form-f3').click(); await page.waitForTimeout(400); await page.screenshot({ path: 'test-results/fam/select-kai-f3.png' });
  await page.getByTestId('hero-card-ren').click(); await page.waitForTimeout(400); await page.screenshot({ path: 'test-results/fam/select-ren.png' });
  await page.getByTestId('hero-card-vex').click(); await page.getByTestId('form-f2').click(); await page.waitForTimeout(400); await page.screenshot({ path: 'test-results/fam/select-vex-f2.png' });
  await page.getByTestId('hero-card-kai').click(); await page.getByTestId('start-run').click(); await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(2200);
  for (const f of [0, 2, 3]) { await page.evaluate((form) => { const s = (window as unknown as { __KYNT_QA__: { sim: () => { player: Record<string, number> } } }).__KYNT_QA__.sim(); s.player.hp = s.player.maxHp = 1e6; s.player.form = form; s.player.drive = 100; }, f); await page.waitForTimeout(500); await page.screenshot({ path: `test-results/fam/run-kai-f${f}.png`, clip: { x: 400, y: 190, width: 480, height: 340 } }); }
  expect(errors).toEqual([]);
});

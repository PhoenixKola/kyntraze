import { test, expect, type Page } from '@playwright/test';
const boot = (page: Page) => page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__));
const open = async (page: Page, mode: string) => {
  await page.setViewportSize({ width: 1280, height: 720 }); await page.addInitScript(() => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'kai', settings: {} })));
  await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click(); await page.waitForTimeout(600); await page.screenshot({ path: 'test-results/b22-art-heroselect.png' });
  await page.getByTestId('mode-open').click(); await page.getByTestId(`mode-${mode}`).click(); await page.getByTestId('mode-confirm').click(); await page.getByTestId('start-run').click();
};
test('B22 art: Expedition realm floor, props and enemies', async ({ page }) => {
  test.setTimeout(150000); await open(page, 'fracture_expedition'); await boot(page);
  for (let i = 0; i < 40; i++) { await page.keyboard.press('1'); await page.waitForTimeout(1000); if (i === 24) await page.screenshot({ path: 'test-results/b22-art-expedition.png' }); }
});
test('B22 art: Vex trial story portrait and Oathkeeper duel', async ({ page }) => {
  test.setTimeout(90000); await open(page, 'vex_trial');
  await expect(page.getByTestId('story-panel')).toBeVisible({ timeout: 20000 }); await page.waitForTimeout(700); await page.screenshot({ path: 'test-results/b22-art-story.png' });
  for (let i = 0; i < 3; i++) await page.getByTestId('story-next').click();
  await boot(page); await page.waitForTimeout(6000); await page.screenshot({ path: 'test-results/b22-art-vex.png' });
});
type QA = { spawn: (k: string, dx?: number, dy?: number) => void };
const spawn = (page: Page, k: string, dx?: number, dy?: number) => page.evaluate(([a, b, c]) => (window as unknown as { __KYNT_QA__: QA }).__KYNT_QA__.spawn(a as string, b as number, c as number), [k, dx, dy]);
test('B22 art: every realm enemy and boss sprite in game', async ({ page }) => {
  test.setTimeout(240000); await open(page, 'fracture_expedition'); await boot(page); await page.waitForTimeout(800);
  await spawn(page, 'sky_lancer', 120, -60); await spawn(page, 'halo_scribe', 220, 40); await spawn(page, 'citadel_bulwark', -150, 30); await page.waitForTimeout(400); await page.screenshot({ path: 'test-results/b22-art-mobsA.png' });
  await spawn(page, 'castellan', 260, 0); await page.waitForTimeout(3600); await page.screenshot({ path: 'test-results/b22-art-castellan.png' });
});
test('B22 art: Paradox enemies and bosses', async ({ page }) => {
  test.setTimeout(240000); await open(page, 'vex_trial'); await expect(page.getByTestId('story-panel')).toBeVisible({ timeout: 20000 }); for (let i = 0; i < 3; i++) await page.getByTestId('story-next').click();
  await boot(page); await page.waitForTimeout(800);
  await spawn(page, 'rift_mimic', 120, -60); await spawn(page, 'phase_harrier', 220, 40); await spawn(page, 'singularity_husk', -150, 30); await page.waitForTimeout(400); await page.screenshot({ path: 'test-results/b22-art-mobsB.png' });
  for (const k of ['regent', 'mirror_tyrant', 'chronophage', 'hollow_choir', 'sovereign']) { await spawn(page, k, 300, 0); await page.waitForTimeout(3800); await page.screenshot({ path: `test-results/b22-art-${k}.png` }); }
});
test('B22 art: equipped outfit recolours the in-run hero', async ({ page }) => {
  test.setTimeout(90000); await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'kai', settings: {}, b22: { v: 1, owned: ['kai_celestial_wanderer'], equipped: { outfit: { kai: 'kai_celestial_wanderer' }, crest: null, aura: {} } } })));
  await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click(); await boot(page); await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/b22-art-outfit.png', clip: { x: 440, y: 220, width: 400, height: 280 } });
});
test('B22 art: Vex blade overlay during attacks', async ({ page }) => {
  test.setTimeout(90000); await open(page, 'vex_trial'); await expect(page.getByTestId('story-panel')).toBeVisible({ timeout: 20000 }); for (let i = 0; i < 3; i++) await page.getByTestId('story-next').click();
  await boot(page); await page.waitForTimeout(800); await spawn(page, 'rift_mimic', 90, 0); await spawn(page, 'rift_mimic', -90, 0);
  for (let i = 0; i < 4; i++) { await page.waitForTimeout(260); await page.screenshot({ path: `test-results/b22-art-vexblade${i}.png`, clip: { x: 440, y: 220, width: 400, height: 280 } }); }
});
test('B22 art: ultimate effect plate renders', async ({ page }) => {
  test.setTimeout(90000); await page.setViewportSize({ width: 1280, height: 720 }); await page.addInitScript(() => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'kai', settings: {} })));
  await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click(); await boot(page); await page.waitForTimeout(1500);
  await spawn(page, 'citadel_bulwark', 140, 0); await spawn(page, 'sky_lancer', -120, 40);
  await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: { sim: () => { b22: { ult: { unlocked: boolean; charge: number } } } } }).__KYNT_QA__.sim(); s.b22.ult.unlocked = true; s.b22.ult.charge = 100; });
  await page.keyboard.press('r'); for (let i = 0; i < 4; i++) { await page.waitForTimeout(450); await page.screenshot({ path: `test-results/b22-art-ult${i}.png` }); }
});

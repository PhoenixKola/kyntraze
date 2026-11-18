import { test, expect } from '@playwright/test';
type Q = { sim: () => { player: Record<string, number> }; scene: () => { entityRenderer: { debugPose: () => { texture: string; clip: string; hair: { x: number; y: number; live: boolean } } } } };
test.use({ deviceScaleFactor: 3 });
for (const [hero, form] of [['kai', 0], ['kai', 1], ['kai', 3], ['ren', 1], ['sora', 1], ['vex', 2]] as const) {
  test(`B23 hair is alive: ${hero} form ${form} moves with no input and trails the run`, async ({ page }) => {
    test.setTimeout(90000); await page.setViewportSize({ width: 960, height: 540 });
    await page.addInitScript(h => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: h, settings: {} })), hero);
    const errors: string[] = []; page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`/?qa=1&hero=${hero}&ascend=1&form3=1`); await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click();
    await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(1000);
    await page.evaluate(f => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.player.form = f; s.player.drive = 100; s.player.hp = s.player.maxHp = 9999; }, form); await page.waitForTimeout(1500);
    const sample = () => page.evaluate(() => (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.scene().entityRenderer.debugPose());
    const xs: number[] = []; let live = 0, n = 0;
    for (let i = 0; i < 24; i++) { const p = await sample(); xs.push(p.hair.x); n++; if (p.hair.live) live++; if (i === 8 || i === 14) await page.screenshot({ path: `test-results/b23-hair-${hero}-f${form}-idle${i}.png`, clip: { x: 430, y: 200, width: 100, height: 100 } }); await page.waitForTimeout(110); }
    expect(Math.max(...xs) - Math.min(...xs), 'idle hair travel (sheet px)').toBeGreaterThan(0.8); expect(live / n, 'frames drawn through the live hair texture').toBeGreaterThan(0.5);
    await page.keyboard.down('d'); await page.waitForTimeout(500); const rx: number[] = []; for (let i = 0; i < 10; i++) { rx.push((await sample()).hair.x); await page.waitForTimeout(60); } await page.screenshot({ path: `test-results/b23-hair-${hero}-f${form}-run.png`, clip: { x: 430, y: 200, width: 100, height: 100 } }); await page.keyboard.up('d');
    const mean = rx.reduce((a, b) => a + b, 0) / rx.length; expect(mean, 'hair trails behind a rightward run (mean over 0.6 s)').toBeLessThan(-0.6);
    expect(errors.filter(e => /failed|404|hair/i.test(e))).toEqual([]);
  });
}

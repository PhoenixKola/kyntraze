import { test, expect } from '@playwright/test';
type Qa = { scene: () => { partnerRenderer: { debugPose: () => { texture: string; clip: string; frameIndex: number; x: number; facing: string } } | null } };
for (const mate of ['ren', 'sora', 'vex'] as const) {
  test(`B23 local co-op: the ${mate} partner is drawn from their own sheets and plays Run while walking`, async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 540 }); await page.addInitScript(() => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'kai', settings: {} })));
    const errors: string[] = []; page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('mode-open').click(); await page.getByTestId(`coop-${mate}`).click(); await page.getByTestId('mode-confirm').click(); await page.getByTestId('start-run').click();
    await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(1000);
    const pose = () => page.evaluate(() => (window as unknown as { __KYNT_QA__: Qa }).__KYNT_QA__.scene().partnerRenderer!.debugPose());
    const idle = await pose();
    expect(idle.texture.startsWith(`${mate}-`), `idle texture ${idle.texture}`).toBe(true);
    await page.screenshot({ path: `test-results/b23-coop-${mate}-idle.png` });
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(500);
    const run = await pose();
    expect(run.clip).toBe('Run'); expect(run.texture.startsWith(`${mate}-`)).toBe(true); expect(run.facing).toBe('west');
    await page.screenshot({ path: `test-results/b23-coop-${mate}-run.png` });
    await page.keyboard.up('ArrowLeft');
    expect(errors.filter(e => /failed to load|404/i.test(e))).toEqual([]);
  });
}

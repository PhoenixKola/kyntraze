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
type Qa2 = { scene: () => { entityRenderer: { debugPose: () => { texture: string; clip: string } }; partnerRenderer: { debugPose: () => { texture: string; clip: string; facing: string } } } };
for (const [p1, p2] of [['ren', 'kai'], ['sora', 'kai'], ['vex', 'ren'], ['ren', 'vex']] as const) {
  test(`B23 local co-op: ${p1} (P1) + ${p2} (P2) both draw their own art and the partner runs`, async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 540 }); await page.addInitScript(h => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: h, settings: {} })), p1);
    await page.goto(`/?seed=9&qa=1&hero=${p1}`); await page.getByTestId('play-button').click(); await page.getByTestId('mode-open').click(); await page.getByTestId(`coop-${p2}`).click(); await page.getByTestId('mode-confirm').click(); await page.getByTestId('start-run').click();
    await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(1000);
    const both = () => page.evaluate(() => { const sc = (window as unknown as { __KYNT_QA__: Qa2 }).__KYNT_QA__.scene(); return { a: sc.entityRenderer.debugPose(), b: sc.partnerRenderer.debugPose() }; });
    const first = await both(); const stem = (t: string) => t.split('-')[0];
    expect(stem(first.a.texture).replace(/f[123]$/, '')).toBe(p1 === 'kai' ? 'kai' : p1); expect(stem(first.b.texture).replace(/f[123]$/, '')).toBe(p2);
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); const run = await both(); expect(run.b.clip).toBe('Run'); expect(run.b.facing).toBe('east'); await page.keyboard.up('ArrowRight');
    await page.screenshot({ path: `test-results/b23-coop-${p1}-${p2}.png` });
  });
}

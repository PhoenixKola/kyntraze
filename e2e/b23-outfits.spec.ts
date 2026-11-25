import { test, expect } from '@playwright/test';
type Q = { scene: () => { entityRenderer: { debugPose: () => { outfit: string | null; facing: string } } } };
test.use({ deviceScaleFactor: 3 });
const CASES = [['kai', 'kai_celestial_wanderer'], ['ren', 'ren_ember_ronin'], ['sora', 'sora_azure_artificer'], ['sora', 'sora_skybound_oracle'], ['vex', 'vex_eclipse_nomad'], ['vex', 'vex_oathkeepers_ruin']] as const;
for (const [hero, outfit] of CASES) {
  test(`B23 outfit geometry: ${outfit} draws its accessory in every facing`, async ({ page }) => {
    test.setTimeout(90000); await page.setViewportSize({ width: 960, height: 540 });
    await page.addInitScript(([h, o]) => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: h, settings: {}, b22: { v: 1, owned: [o], equipped: { outfit: { [h]: o }, crest: null, aura: {} } } })), [hero, outfit]);
    const errors: string[] = []; page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
    await page.goto(`/?qa=1&hero=${hero}`); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click();
    await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(1500);
    const pose = () => page.evaluate(() => (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.scene().entityRenderer.debugPose());
    const want = (f: string) => (f === 'south' ? /-front$/ : f === 'north' ? /-back$/ : /-side$/); const views = new Set<string>();
    for (const [key, name] of [['s', 'south'], ['d', 'east'], ['a', 'west'], ['w', 'north']] as const) {
      await page.keyboard.down(key); await page.waitForTimeout(450); const p = await pose(); views.add(p.facing); await page.screenshot({ path: `test-results/b23-outfit-${outfit}-${name}.png`, clip: { x: 400, y: 190, width: 160, height: 150 } }); await page.keyboard.up(key);
      expect(p.outfit, `${name}: accessory drawn for facing ${p.facing}`).toMatch(want(p.facing)); await page.waitForTimeout(250);
    }
    expect(views.size, 'at least two different facings were exercised').toBeGreaterThan(1);
    expect(errors.filter(e => /acc-|404|failed to load|texture/i.test(e))).toEqual([]);
  });
}

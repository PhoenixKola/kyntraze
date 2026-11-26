import { test, expect, type Page } from '@playwright/test';
/** B32: drives each reworked move through real keyboard input and captures a short strip at the player (test-results/b32/*, gitignored). Setup uses the QA hooks only to place the form and a crowd. */
type Q = { sim: () => { player: Record<string, number>; enemies: Array<Record<string, number>>; hx: Record<string, unknown>; cast: unknown; abilityEvents: Array<{ kind: string; n?: number }> }; spawn: (k: string, dx?: number, dy?: number) => void };
const boot = (page: Page) => page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__));
const CASES: Array<[string, number, string, string[], number[]]> = [
  ['kai', 2, 'meteor', ['q'], [60, 130, 130, 130, 130, 130, 150, 200]],
  ['kai', 3, 'echo', ['q'], [60, 150, 300, 400, 600]],
  ['kai', 0, 'surge', ['q'], [60, 200, 300, 400]],
  ['sora', 1, 'prison', ['q'], [60, 150, 300, 600, 600]],
  ['sora', 1, 'spears', ['e'], [60, 300, 300, 300, 300]],
  ['sora', 1, 'collapse', ['r'], [60, 300, 400, 500, 300]],
  ['ren', 1, 'cyclone', ['q'], [60, 300, 500, 400]],
  ['ren', 1, 'rampage', ['e'], [60, 250, 250, 250, 300]],
  ['ren', 1, 'catastrophe', ['r'], [60, 300, 300, 300, 300, 300]],
  ['vex', 1, 'guard', ['q'], [60, 200, 300]],
  ['vex', 1, 'execution', ['e'], [60, 200, 300, 300]],
  ['vex', 1, 'oath', ['r'], [60, 300, 300, 300, 300]],
];
for (const [hero, form, name, keys, times] of CASES) {
  test(`B32 strip: ${hero} ${name}`, async ({ page }) => {
    test.setTimeout(90000); await page.setViewportSize({ width: 1280, height: 720 });
    const errors: string[] = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(h => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: h, settings: {} })), hero);
    await page.goto('/?qa=1&ascend=1&unlock=all'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click(); await boot(page); await page.waitForTimeout(1200);
    await page.evaluate(f => { const q = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__; const s = q.sim(); s.player.form = f; s.player.drive = 100; s.player.hp = s.player.maxHp = 5000;
      for (let i = 0; i < 9; i++) q.spawn('pursuer', 190 + (i % 3) * 55, -80 + Math.floor(i / 3) * 70); for (const e of s.enemies) { e.hp = e.maxHp = 3000; } }, form);
    await page.waitForTimeout(500); await page.mouse.move(900, 330); await page.keyboard.press(keys[0]);
    let i = 0; for (const t of times) { await page.waitForTimeout(t); await page.screenshot({ path: `test-results/b32/${hero}-${name}-${i++}.png`, clip: { x: 340, y: 160, width: 600, height: 400 } }); }
    const kinds = await page.evaluate(() => (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim().abilityEvents.map(e => e.kind));
    expect(kinds.length).toBeGreaterThan(0); expect(errors).toEqual([]);
  });
}

test('B32: Left Alt lifts a transformed hero off and a second press lands; unlock=all opens every form', async ({ page }) => {
  test.setTimeout(90000); await page.setViewportSize({ width: 960, height: 540 });
  await page.addInitScript(() => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'kai', settings: {} })));
  await page.goto('/?qa=1&ascend=1&unlock=all'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click(); await boot(page); await page.waitForTimeout(1000);
  const st = () => page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); return { flyOn: s.player.flyOn, air: s.player.air, flyT: s.player.flyT }; });
  await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.player.form = 2; s.player.drive = 100; });
  await page.keyboard.press('Control'); await page.waitForTimeout(600); expect((await st()).flyOn).toBeFalsy();   // Ctrl is no longer the solo fly key
  await page.keyboard.press('Alt'); await page.waitForTimeout(900); const up = await st(); expect(up.flyOn).toBeTruthy(); expect(up.air).toBeGreaterThan(0.3);
  await page.keyboard.press('Alt'); await page.waitForTimeout(500); expect((await st()).flyOn).toBeFalsy();
});

import { test, expect, type Page } from '@playwright/test';
const boot = (page: Page) => page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__));
type Q = { sim: () => { player: Record<string, number>; enemies: Array<Record<string, number>>; hx: { kk?: Record<string, unknown> }; cast: unknown }; spawn: (k: string, dx?: number, dy?: number) => void };
const setup = (page: Page, form: number) => page.evaluate(f => {
  const q = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__; const s = q.sim(); s.player.form = f; s.player.drive = 100; s.player.hp = s.player.maxHp = 5000;
  for (let i = 0; i < 9; i++) q.spawn('pursuer', 190 + (i % 3) * 55, -80 + Math.floor(i / 3) * 70);
  for (const e of s.enemies) { e.hp = e.maxHp = 3000; }
}, form);
for (const [form, name, keys] of [[0, 'surge', ['q']], [1, 'scatter', ['q']], [1, 'rising', ['e']], [1, 'crucible', ['r']], [2, 'meteor', ['q']], [3, 'echo', ['q']]] as const) {
  test(`B22 Kai kit visuals: ${name}`, async ({ page }) => {
    test.setTimeout(90000); await page.setViewportSize({ width: 1280, height: 720 });
    await page.addInitScript(() => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'kai', settings: {} })));
    await page.goto('/?qa=1&ascend=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click(); await boot(page); await page.waitForTimeout(1200);
    await setup(page, form); await page.waitForTimeout(700);
    await page.mouse.move(900, 330); await page.keyboard.press(keys[0]);
    for (const t of [250, 350, 450]) { await page.waitForTimeout(t); await page.screenshot({ path: `test-results/kk-${name}-${t}.png` }); }
    const hp = await page.evaluate(() => (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim().enemies.reduce((a, e) => a + e.hp, 0)); void hp;
  });
}

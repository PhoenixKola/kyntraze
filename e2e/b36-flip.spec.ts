import { test, expect, type Page } from '@playwright/test';
/** B36: mirrored beast/phoenix layers while walking left, north mantle, auto feather and halo cut-outs. Stills go to test-results/b36 (gitignored). */
type Q = { sim: () => { player: Record<string, number> }; spawn: (k: string, dx?: number, dy?: number) => void };
const boot = (page: Page) => page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__));
for (const hero of ['sora'] as const) test(`B36 ${hero} form 2 overdrive, left / north / auto`, async ({ page }) => {
  test.setTimeout(120000); await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript((h) => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: h, settings: {}, unlocks: { cometheart: true, stillfire: true, ren: true, sora: true }, b22: { v: 1, soraF2: true, renF2: true } })), hero);
  await page.goto('/?qa=1&ascend=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click(); await boot(page); await page.waitForTimeout(1200);
  await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.player.hp = s.player.maxHp = 1e6; s.player.drive = 100; });
  await page.keyboard.press('f'); await page.waitForTimeout(400); await page.keyboard.press('2'); await page.waitForTimeout(6500);
  const shot = (n: string) => page.screenshot({ path: `test-results/b36/${hero}-${n}.png`, clip: { x: 340, y: 160, width: 600, height: 400 } });
  await page.keyboard.down('w'); await page.waitForTimeout(600); await shot('north-plain'); await page.keyboard.up('w'); await page.keyboard.press('Alt'); await page.keyboard.down('d'); await page.waitForTimeout(900); await shot('fly'); await page.keyboard.up('d'); await page.keyboard.press('Alt'); await page.waitForTimeout(700);
  await page.keyboard.down('a'); await page.waitForTimeout(900); await shot('left'); await page.keyboard.up('a');
  await page.keyboard.down('w'); await page.waitForTimeout(700); await shot('north'); await page.keyboard.up('w');
  await page.keyboard.down('d'); await page.waitForTimeout(700); await shot('right'); await page.keyboard.up('d');
  expect(errors).toEqual([]);
});

import { test, expect, type Page } from '@playwright/test';
/** Celestial Familiars visual sweep: idle / follow / assist / fusion / return for each hero. Stills in test-results/fam (gitignored). */
type Q = { sim: () => { player: Record<string, number>; fam?: { mode: string; x: number; y: number }; time: number }; spawn: (k: string, dx?: number, dy?: number) => void };
const boot = (page: Page) => page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__));
for (const hero of ['kai', 'ren', 'sora', 'vex'] as const) test(`familiar sweep ${hero}`, async ({ page }) => {
  test.setTimeout(150000); await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript((h) => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: h, settings: {}, unlocks: { cometheart: true, stillfire: true, ren: true, sora: true }, b22: { v: 1, soraF2: true, renF2: true, vexForms: [true, true] } })), hero);
  await page.goto(`/?qa=1&ascend=1&hero=${hero}`); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click(); await boot(page);
  const shot = (n: string, wide = false) => page.screenshot({ path: `test-results/fam/${hero}-${n}.png`, clip: wide ? { x: 240, y: 110, width: 800, height: 500 } : { x: 400, y: 190, width: 480, height: 340 } });
  const q = <T,>(fn: (s: ReturnType<Q['sim']>) => T) => page.evaluate(fn as never, undefined) as Promise<T>;
  void q;
  await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.player.hp = s.player.maxHp = 1e6; });
  await page.waitForTimeout(250); await shot('spawn0'); await page.waitForTimeout(350); await shot('spawn1'); await page.waitForTimeout(900); await shot('idle');
  await page.keyboard.down('d'); await page.waitForTimeout(700); await shot('move-right'); await page.keyboard.up('d'); await page.keyboard.down('a'); await page.waitForTimeout(700); await shot('move-left'); await page.keyboard.up('a');
  await page.evaluate(() => { const qa = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__; for (let k = 0; k < 3; k++) qa.spawn('pursuer', 150 + k * 40, -40 + k * 40); const st = qa.sim() as unknown as { enemies: { speed: number; damage: number; hp: number; maxHp: number }[] }; for (const e of st.enemies) { e.speed = 0; e.damage = 0; e.hp = e.maxHp = 1e6; } });
  for (let i = 0; i < 10; i++) { await page.waitForTimeout(220); await shot(`assist${String(i).padStart(2, '0')}`); }
  const mode = await page.evaluate(() => (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim().fam?.mode);
  expect(mode).toBeTruthy();
  await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.player.form = 1; s.player.drive = 100; s.player.odMeter = 100; });
  await page.waitForTimeout(500); await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.player.drive = 100; s.player.odMeter = 100; });
  await page.keyboard.press('g');
  for (let i = 0; i < 9; i++) { await page.waitForTimeout(110); await shot(`merge${i}`); }
  await page.waitForTimeout(600); await shot('fused', true);
  const fused = await page.evaluate(() => (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim().fam?.mode); expect(fused).toBe('gone');
  await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.player.odT = 0.05; });
  for (let i = 0; i < 10; i++) { await page.waitForTimeout(120); await shot(`return${i}`); }
  await page.waitForTimeout(900); await shot('after', true);
  const back = await page.evaluate(() => (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim().fam?.mode); expect(['follow', 'windup', 'strike', 'recover']).toContain(back);
  expect(errors).toEqual([]);
});

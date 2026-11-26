import { test, expect, type Page } from '@playwright/test';
/** B33: Ren's Ashen Eclipse through real key presses (F, pick card 2, the reveal, every move, Overdrive, flight, Form Shift). QA hooks only place the run and a crowd; strips go to test-results/b33 (gitignored). */
type Q = { sim: () => { player: Record<string, number>; enemies: Array<Record<string, number>>; hx: { act: { act: string } | null; brands?: unknown[] }; abilityEvents: Array<{ kind: string }>; cinema: unknown; renF2: boolean }; spawn: (k: string, dx?: number, dy?: number) => void };
const boot = (page: Page) => page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__));
const st = (page: Page) => page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); return { form: s.player.form, drive: s.player.drive, act: s.hx.act?.act ?? null, cinema: !!s.cinema, renF2: s.renF2, flyOn: s.player.flyOn, air: s.player.air, od: s.player.odT, brands: s.hx.brands?.length ?? 0, hp: s.player.hp }; });
const shot = (page: Page, n: string) => page.screenshot({ path: `test-results/b33/${n}.png`, clip: { x: 340, y: 160, width: 600, height: 400 } });
test('B33 Ashen Eclipse: reveal, kit, shift, Overdrive and flight with real input', async ({ page }) => {
  test.setTimeout(150000); await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'ren', settings: {}, unlocks: { cometheart: true, stillfire: true, ren: true, sora: true }, b22: { v: 1, renF2: true } })));
  await page.goto('/?qa=1&ascend=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click(); await boot(page); await page.waitForTimeout(1200);
  expect((await st(page)).renF2).toBe(true);
  await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.player.hp = s.player.maxHp = 1e6; s.player.drive = 100; });
  await page.keyboard.press('f'); await page.waitForTimeout(400); await expect(page.getByTestId('form-selector')).toBeVisible(); await shot(page, 'selector');
  await page.keyboard.press('2'); let i = 0; for (const t of [500, 700, 700, 700, 700]) { await page.waitForTimeout(t); await shot(page, `reveal-${i++}`); }
  await page.waitForTimeout(1200); const a = await st(page); expect(a.form).toBe(2); expect(a.cinema).toBe(false);
  await page.evaluate(() => { const q = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__; for (let k = 0; k < 8; k++) q.spawn('pursuer', 70 + (k % 4) * 38, -50 + Math.floor(k / 4) * 70); for (const e of q.sim().enemies) { e.hp = e.maxHp = 1e6; e.speed = 0; } });
  await page.mouse.move(900, 330); await page.waitForTimeout(2200); await shot(page, 'auto-0'); await page.waitForTimeout(300); await shot(page, 'auto-1'); await expect.poll(async () => (await st(page)).brands, { timeout: 4000, intervals: [60] }).toBeGreaterThan(0);
  for (const [name, key, waits] of [['q', 'q', [120, 200, 250]], ['e', 'e', [300, 350, 400]], ['r', 'r', [500, 400, 400]]] as const) {
    await page.keyboard.press(key); let k = 0; for (const w of waits) { await page.waitForTimeout(w); await shot(page, `${name}-${k++}`); } await page.waitForTimeout(900);
  }
  await page.keyboard.down('v'); await page.waitForTimeout(1900); await shot(page, 'v-charge'); await page.keyboard.up('v'); await page.waitForTimeout(160); await shot(page, 'v-release'); await page.waitForTimeout(260); await shot(page, 'v-hit'); await page.waitForTimeout(500); await shot(page, 'v-end');
  await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.player.odMeter = 100; s.player.drive = 100; });
  await page.keyboard.press('g'); await page.waitForTimeout(900); await shot(page, 'od-0'); expect((await st(page)).od).toBeGreaterThan(0); await page.waitForTimeout(500); await shot(page, 'od-1');
  await page.keyboard.press('Alt'); await page.waitForTimeout(900); await shot(page, 'fly'); expect((await st(page)).flyOn).toBeTruthy(); await page.keyboard.press('Alt'); await page.waitForTimeout(600);
  await page.keyboard.press('f'); await page.waitForTimeout(500); expect((await st(page)).form).toBe(1); await shot(page, 'shift-to-1'); await page.waitForTimeout(2600); await page.keyboard.press('f'); await page.waitForTimeout(500); expect((await st(page)).form).toBe(2);
  await page.screenshot({ path: 'test-results/b33/hud.png' }); expect(errors).toEqual([]);
});

test('B33: Hero Select shows Ashen Eclipse (unlock=all), its real kit and the HUD icons', async ({ page }) => {
  test.setTimeout(60000); await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => localStorage.setItem('kyntraze-b00-v1-unlockall', JSON.stringify({ version: 1, hero: 'ren', settings: {} })));
  await page.goto('/?unlock=all'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.waitForTimeout(800);
  await page.getByTestId('form-f2').click(); await page.waitForTimeout(500); await page.screenshot({ path: 'test-results/b33/heroselect.png' });
  await page.getByRole('tab', { name: 'Abilities' }).click(); await page.waitForTimeout(400); await page.screenshot({ path: 'test-results/b33/heroselect-kit.png' }); const kit = await page.getByTestId('hs-kit').innerText(); expect(kit).toContain('Cinderfang Chain'); expect(kit).toContain('Eclipse Maul'); expect(kit).toContain('Ninefold Rupture'); expect(kit).toContain('Ashen Cataclysm'); expect(kit).toContain('Eclipse Fang'); expect(kit).toContain('ALT');
  expect(errors).toEqual([]);
});

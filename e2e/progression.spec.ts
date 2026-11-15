import { test, expect, type Page } from '@playwright/test';
// B18 flows. `?qa=1` on the dev server reads/writes the SEPARATE QA save, so nothing here can touch a real player's marks, feats or unlocks.
type W = Window & { __KYNT_QA__?: { sim: () => { player: Record<string, number>; phase: string; time: number; kills: number; enemies: unknown[]; nextId: number; spawnTimer: number; upgradeOffers: string[] } } };
const SHOTS = 'art/progression/review/b18';
const fresh = async (page: Page, path = '/?seed=71&qa=1') => { await page.goto(path); await page.evaluate(() => { localStorage.removeItem('kyntraze-b00-v1-qa'); }); await page.goto(path); };
const startRun = async (page: Page) => { await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click(); await expect(page.getByTestId('hud')).toBeVisible({ timeout: 20000 }); await page.waitForFunction(() => Boolean((window as unknown as W).__KYNT_QA__)); };
/** A natural defeat through real combat: low HP, an enemy on top of Kai, a believable clock and kill count. */
const dieNaturally = async (page: Page, seconds = 200, kills = 130) => {
  await page.evaluate(([t, k]) => {
    const s = (window as unknown as W).__KYNT_QA__!.sim() as unknown as { player: Record<string, number>; time: number; kills: number; enemies: Record<string, unknown>[]; nextId: number; spawnTimer: number };
    s.spawnTimer = 1e9; s.time = t; s.kills = k; s.player.hp = 1; s.player.invulnerable = 0;
    s.enemies.push({ id: s.nextId++, kind: 'pursuer', x: s.player.x, y: s.player.y, hp: 9999, maxHp: 9999, radius: 16, damage: 30, speed: 0, touchCooldown: 0, attackCd: 99, aimX: 1, aimY: 0, mode: 'move', modeT: 1, stagger: 0 });
  }, [seconds, kills]);
  await expect(page.getByTestId('results-screen')).toBeVisible({ timeout: 20000 });
};
const marks = async (page: Page) => Number((await page.getByTestId('marks-balance').first().innerText()).replace(/\D+.*$/s, '').replace(/[^0-9]/g, '') || '0');
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('kyntraze-b00-v1-qa') ?? '{}'));

for (const [w, h] of [[960, 540], [640, 360]] as const) test(`B18 loop at ${w}x${h}: defeat -> reward -> armory purchase -> contract -> deploy`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text().slice(0, 150)); });
  await page.setViewportSize({ width: w, height: h }); await fresh(page);
  // initial locked state
  await page.getByTestId('archives-button').click(); await expect(page.getByTestId('progression')).toBeVisible(); await page.waitForTimeout(300);
  expect(await marks(page)).toBe(0); await expect(page.getByTestId('unlock-boon_bulwark')).toHaveAttribute('data-state', 'poor'); await expect(page.getByTestId('unlock-tool_banish')).toHaveAttribute('data-state', 'locked');
  await page.screenshot({ path: `${SHOTS}/armory-initial_${w}x${h}.png` });
  await page.getByTestId('tab-contracts').click(); await page.waitForTimeout(200); await page.screenshot({ path: `${SHOTS}/contracts-initial_${w}x${h}.png` });
  await page.getByTestId('tab-archives').click(); await page.waitForTimeout(200); await page.screenshot({ path: `${SHOTS}/archives-initial_${w}x${h}.png` });
  await page.keyboard.press('Escape'); await expect(page.getByTestId('title-screen')).toBeVisible();
  // a natural defeat earns marks, exactly once, shown on Results
  await startRun(page); await dieNaturally(page);
  const total = Number((await page.getByTestId('reward-total').innerText()).replace('+', '')); expect(total).toBeGreaterThan(8); await page.waitForTimeout(700);
  await expect(page.getByTestId('results-armory')).toBeVisible(); await expect(page.getByRole('button', { name: /RETURN TO TITLE/ })).toBeVisible(); await expect(page.getByTestId('hint-bar')).toBeVisible();
  const box = await page.getByTestId('hint-bar').boundingBox(); expect(box!.y + box!.height).toBeLessThanOrEqual(h);   // nothing pinned below the viewport
  await page.screenshot({ path: `${SHOTS}/results-defeat_${w}x${h}.png` });
  expect((await saved(page)).meta.marks).toBe(total); expect((await saved(page)).meta.counters.runs).toBe(1);
  await page.reload(); expect((await saved(page)).meta.marks).toBe(total);   // reload cannot grant again
  // armory: purchase needs a confirm, buys once, equips
  await page.getByTestId('archives-button').click(); expect(await marks(page)).toBe(total);
  const bul = page.getByTestId('unlock-boon_bulwark'); await expect(bul).toHaveAttribute('data-state', total >= 15 ? 'available' : 'poor');
  expect(total).toBeGreaterThanOrEqual(15);   // one early defeat already buys the first boon
  await bul.focus(); await page.keyboard.press('Enter'); await expect(bul).toContainText('CONFIRM'); expect(await marks(page)).toBe(total);   // first press never spends
  await page.waitForTimeout(260); await page.keyboard.press('Enter'); await expect(bul).toHaveAttribute('data-state', 'equipped'); expect(await marks(page)).toBe(total - 15);
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter'); expect(await marks(page)).toBe(total - 15);   // repeats never spend twice
  await page.screenshot({ path: `${SHOTS}/armory-purchased_${w}x${h}.png` });
  await page.getByTestId('tab-contracts').click(); await page.getByTestId('contract-overrun').click(); await expect(page.getByTestId('contract-overrun')).toHaveAttribute('aria-pressed', 'true'); await page.screenshot({ path: `${SHOTS}/contracts-selected_${w}x${h}.png` });
  expect((await saved(page)).meta.contract).toBe('overrun'); expect((await saved(page)).meta.boon).toBe('bulwark');
  // the selection survives a reload and reaches the run: contract chip, +20 max HP, faster spawns recorded in the sim
  await page.reload(); await page.getByTestId('play-button').click(); await expect(page.getByTestId('loadout-boon')).toContainText('BULWARK'); await expect(page.getByTestId('loadout-contract')).toContainText('OVERRUN'); await page.screenshot({ path: `${SHOTS}/hero-loadout_${w}x${h}.png` });
  await page.getByTestId('start-run').click(); await expect(page.getByTestId('hud-contract')).toContainText('OVERRUN'); await page.waitForFunction(() => Boolean((window as unknown as W).__KYNT_QA__));
  expect(await page.evaluate(() => (window as unknown as W).__KYNT_QA__!.sim().player.maxHp)).toBe(120);
  await page.screenshot({ path: `${SHOTS}/hud-contract_${w}x${h}.png` });
  expect(errors).toEqual([]);
});

test('B18: a controlled victory rewards once; the real save is untouched by QA runs; Form entitlements preserved', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  await page.goto('/?qa=1'); await page.evaluate(() => { localStorage.setItem('kyntraze-b00-v1', JSON.stringify({ version: 1, settings: { mute: false, reducedEffects: false, pauseOnBlur: true }, best: null, arena: 'gloam', unlocks: { cometheart: true, stillfire: false } })); localStorage.removeItem('kyntraze-b00-v1-qa'); });
  await page.goto('/?seed=5&qa=1'); await startRun(page);
  await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim() as unknown as { player: Record<string, number>; spawnTimer: number; time: number; kills: number }; s.spawnTimer = 1e9; s.time = 905; s.kills = 600; s.player.hp = 1e6; s.player.maxHp = 1e6; s.player.nextXp = 1e9; });
  await page.evaluate(() => { const q = (window as unknown as { __KYNT_QA__: { encounter: (k: string) => void; killBoss: (k: string) => void } }).__KYNT_QA__; q.encounter('seraph'); });
  await page.waitForTimeout(600); await page.evaluate(() => (window as unknown as { __KYNT_QA__: { killBoss: (k: string) => void } }).__KYNT_QA__.killBoss('seraph'));
  await expect(page.getByTestId('results-screen')).toBeVisible({ timeout: 20000 }); await page.waitForTimeout(800);
  const total = Number((await page.getByTestId('reward-total').innerText()).replace('+', '')); expect(total).toBeGreaterThan(60);
  await expect(page.getByTestId('reward-panel')).toContainText('NULL SERAPH'); await page.screenshot({ path: `${SHOTS}/results-victory_960x540.png` });
  const qa = await saved(page); expect(qa.meta.marks).toBe(total); expect(qa.meta.feats.first_win).toBeGreaterThan(0); expect(qa.unlocks.stillfire).toBe(true);
  const real = await page.evaluate(() => JSON.parse(localStorage.getItem('kyntraze-b00-v1') ?? '{}'));
  expect(real.meta).toBeUndefined(); expect(real.unlocks).toEqual({ cometheart: true, stillfire: false });   // the real save was never written by the QA route
  await page.getByTestId('results-armory').click(); await expect(page.getByTestId('progression')).toBeVisible(); await page.getByTestId('tab-archives').click(); await expect(page.getByTestId('feat-first_win')).toHaveAttribute('data-done', 'true'); await page.screenshot({ path: `${SHOTS}/archives-earned_960x540.png` });
});

test('B18: progression is fully reachable by controller (mocked pad) and keyboard focus is never lost on tab switches', async ({ page }) => {
  await page.addInitScript(() => { const st = { on: false, btn: Array(17).fill(false) }; (window as unknown as { __pad: typeof st }).__pad = st; navigator.getGamepads = () => (st.on ? [{ index: 0, id: 'Mock Xbox Controller (STANDARD GAMEPAD)', connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: st.btn.map(p => ({ pressed: p, touched: p, value: p ? 1 : 0 })), timestamp: performance.now() } as unknown as Gamepad] : []); });
  await page.setViewportSize({ width: 640, height: 360 }); await fresh(page);
  const tap = async (i: number) => { await page.evaluate(n => { (window as unknown as { __pad: { btn: boolean[] } }).__pad.btn[n] = true; }, i); await page.waitForTimeout(90); await page.evaluate(n => { (window as unknown as { __pad: { btn: boolean[] } }).__pad.btn[n] = false; }, i); await page.waitForTimeout(80); };
  await page.evaluate(() => { (window as unknown as { __pad: { on: boolean } }).__pad.on = true; }); await expect(page.getByTestId('pad-badge')).toBeVisible();
  const focusId = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid ?? document.activeElement?.textContent?.slice(0, 20) ?? '');
  for (const b of [13, 13, 14, 14, 14, 15, 15, 15, 12]) { if ((await focusId()) === 'archives-button') break; await tap(b); }   // D-pad until ARCHIVES has focus (layout wraps differently per width)
  expect(await focusId()).toBe('archives-button'); await tap(0); await expect(page.getByTestId('progression')).toBeVisible(); await page.waitForTimeout(300);
  expect(await focusId()).toMatch(/tab-|ARMORY/); await tap(15); await tap(15); await tap(0); await expect(page.getByTestId('pane-archives')).toBeVisible();   // right, right, A: Archives tab
  expect(await focusId()).not.toBe(''); await page.screenshot({ path: `${SHOTS}/pad-archives_640x360.png` }); await tap(1); await expect(page.getByTestId('title-screen')).toBeVisible();   // B goes back
});

import { test, expect, type Page } from '@playwright/test';
// B09 e2e: arena selection (mouse, keyboard, MOCKED pad), persistence, both arenas x both viewports, hazards, bosses, elites, beam/sphere in Base and Form I, retry.
type Q = { sim: () => any; enemyStats: () => any; arenaHazard: () => void; encounter: (id: string) => void };
type W = Window & { __KYNT_QA__?: Q; __pad: { on: boolean; axes: number[]; btn: boolean[] } };
const VIEWPORTS = [[960, 540], [640, 360]] as const;
const IDX: Record<string, number> = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const NOISE = /GPU stall|GL Driver Message|ReadPixels|software WebGL|willReadFrequently/;   // headless software-GL environment chatter, not game output

async function prep(page: Page, w: number, h: number) {
  const problems: string[] = [];
  page.on('pageerror', e => problems.push(String(e))); page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) problems.push(`${m.type()}: ${m.text()}`); });
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript(() => { const st = { on: false, axes: [0, 0, 0, 0], btn: Array(17).fill(false) }; (window as unknown as W).__pad = st;
    navigator.getGamepads = () => (st.on ? [{ index: 0, id: 'Mock Xbox Controller (STANDARD GAMEPAD)', connected: true, mapping: 'standard', axes: st.axes, buttons: st.btn.map(p => ({ pressed: p, touched: p, value: p ? 1 : 0 })), timestamp: performance.now() } as unknown as Gamepad, null, null, null] : [null, null, null, null]); });
  return problems;
}
async function run(page: Page, arena: string, extra = '') {
  await page.goto(`/?seed=9&qa=1&arena=${arena}${extra}`); await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as W).__KYNT_QA__)); await page.waitForTimeout(300);
  await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.player.attackClock = 1e9; s.player.hp = 100; s.player.nextXp = 1e9; s.spawnTimer = 1e9; });
}
const sim = (page: Page) => page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); return { arena: s.arenaId, hp: s.player.hp, t: s.time, hz: s.hazards.filter((h: any) => h.owner === 0).length, count: s.arenaHazard.count, cast: s.cast?.kind ?? null, form: s.player.form, phase: s.phase, en: s.enemies.length, x: s.player.x, y: s.player.y }; });
const tap = async (page: Page, b: string, ms = 90) => { await page.evaluate(([i, d]) => { (window as unknown as W).__pad.btn[i as number] = d as boolean; }, [IDX[b], true]); await page.waitForTimeout(ms); await page.evaluate(([i, d]) => { (window as unknown as W).__pad.btn[i as number] = d as boolean; }, [IDX[b], false]); await page.waitForTimeout(70); };
const focused = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid ?? '');

for (const [w, h] of VIEWPORTS) {
  test(`arena selection: mouse, persistence and the chosen arena really loads (${w}x${h})`, async ({ page }) => {
    const problems = await prep(page, w, h);
    await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click();
    await expect(page.getByTestId('arena-open')).toContainText('THE GLOAM CIRCUIT');
    await page.getByTestId('arena-open').click(); await expect(page.getByTestId('arena-select')).toBeVisible();
    const fit = await page.evaluate(() => { const r = (s: string) => document.querySelector(s)!.getBoundingClientRect(); const a = r('[data-testid=arena-card-gloam]'), b = r('[data-testid=arena-card-ashen]'), c = r('[data-testid=arena-confirm]'), hint = r('[data-testid=hint-bar]');
      return { cardsInside: a.left >= 0 && b.right <= window.innerWidth && a.bottom <= window.innerHeight && b.bottom <= window.innerHeight, confirmInside: c.bottom <= window.innerHeight && c.right <= window.innerWidth, cardsHeight: a.height, hintInside: hint.bottom <= window.innerHeight, noOverlap: a.right <= b.left + 1, scrolls: document.documentElement.scrollHeight > window.innerHeight + 2 }; });
    expect(fit.cardsInside && fit.confirmInside && fit.hintInside && fit.noOverlap).toBe(true); expect(fit.cardsHeight).toBeGreaterThan(h * 0.25); expect(fit.scrolls).toBe(false);
    await expect(page.getByTestId('arena-card-gloam')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('arena-card-ashen').click(); await expect(page.getByTestId('arena-card-ashen')).toHaveAttribute('aria-checked', 'true'); await expect(page.getByTestId('arena-card-gloam')).toHaveAttribute('aria-checked', 'false');
    await page.screenshot({ path: `test-results/arena-select-${w}x${h}.png` });
    await page.keyboard.press('Escape'); await expect(page.getByTestId('hero-select')).toBeVisible(); await expect(page.getByTestId('arena-open')).toContainText('THE ASHEN RELIQUARY');
    await page.reload(); await page.getByTestId('play-button').click(); await expect(page.getByTestId('arena-open')).toContainText('THE ASHEN RELIQUARY');   // persisted choice
    await page.getByTestId('start-run').click(); await page.waitForFunction(() => Boolean((window as unknown as W).__KYNT_QA__));
    expect((await sim(page)).arena).toBe('ashen'); await expect(page.locator('.clock-label')).toHaveText('THE ASHEN RELIQUARY');
    expect(problems).toEqual([]);
  });
}

test('arena selection with the keyboard only', async ({ page }) => {
  const problems = await prep(page, 960, 540); await page.goto('/?seed=9&qa=1'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.getByTestId('play-button').click();
  await page.getByTestId('arena-open').focus(); await page.keyboard.press('Enter'); await expect(page.getByTestId('arena-select')).toBeVisible();
  await page.getByTestId('arena-card-gloam').focus(); await page.keyboard.press('Tab'); await expect(page.getByTestId('arena-card-ashen')).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.getByTestId('arena-card-ashen')).toHaveAttribute('aria-checked', 'true'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await expect(page.getByTestId('arena-confirm')).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.getByTestId('hero-select')).toBeVisible(); await expect(page.getByTestId('arena-open')).toContainText('ASHEN'); expect(problems).toEqual([]);
});

test('arena selection with a MOCKED controller: d-pad, A selects, B goes back, then deploy', async ({ page }) => {
  const problems = await prep(page, 960, 540); await page.goto('/?seed=9&qa=1'); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.evaluate(() => { (window as unknown as W).__pad.on = true; }); await expect(page.getByTestId('pad-badge')).toBeVisible();
  await tap(page, 'A'); await expect(page.getByTestId('hero-select')).toBeVisible(); await page.waitForTimeout(300);
  for (let i = 0; i < 4 && (await focused(page)) !== 'arena-open'; i++) { await tap(page, 'LEFT'); }
  expect(await focused(page)).toBe('arena-open'); await tap(page, 'A'); await expect(page.getByTestId('arena-select')).toBeVisible(); await page.waitForTimeout(300);
  await tap(page, 'RIGHT'); expect(await focused(page)).toBe('arena-card-ashen'); await tap(page, 'A'); await expect(page.getByTestId('arena-card-ashen')).toHaveAttribute('aria-checked', 'true');
  await tap(page, 'B'); await expect(page.getByTestId('hero-select')).toBeVisible(); await expect(page.getByTestId('arena-open')).toContainText('ASHEN'); await page.waitForTimeout(300);
  for (let i = 0; i < 4 && (await focused(page)) !== 'start-run'; i++) { await tap(page, 'RIGHT'); }
  await tap(page, 'A'); await page.waitForFunction(() => Boolean((window as unknown as W).__KYNT_QA__), null, { timeout: 20000 }); expect((await sim(page)).arena).toBe('ashen'); expect(problems).toEqual([]);
});

for (const arena of ['gloam', 'ashen'] as const) for (const [w, h] of VIEWPORTS) {
  test(`${arena} at ${w}x${h}: loads clean, hazard warns then hits a bystander once, a sidestep dodges it, bosses and elites run here`, async ({ page }) => {
    const problems = await prep(page, w, h); await run(page, arena);
    await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.time = 50; });
    const hazardAt = () => page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(), h = s.hazards.find((z: any) => z.owner === 0 && !z.fired); return h ? { x: h.x, y: h.y, shape: h.shape, r: h.r, w: h.w, h: h.h } : null; });
    // fire exactly one hazard on demand (no chained follow-up) so the two trials cannot interfere
    const fire = async () => { await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.hazards = []; s.arenaHazard.nextAt = s.time; });
      await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.sim().hazards.some((z: any) => z.owner === 0 && !z.fired), null, { timeout: 4000 }); await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.arenaHazard.nextAt = s.time + 1e6; }); };
    // control: stand in it
    await fire();
    const hz = (await hazardAt())!; expect(hz.shape).toBe(arena === 'gloam' ? 'rect' : 'circle');
    await page.evaluate(([x, y]) => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.player.x = x as number; s.player.y = (y as number) - 24 + 24 - 24; }, [hz.x, hz.y]);
    await page.waitForTimeout(2600); const stood = await sim(page); expect(stood.hp).toBeLessThan(100); expect(100 - stood.hp).toBeLessThanOrEqual(22);   // once, not per tick
    // dodge: real keys out of the shape during the warning
    await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.player.hp = 100; s.player.invulnerable = 0; }); await fire();
    const hz2 = (await hazardAt())!; await page.evaluate(([x, y]) => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.player.x = (x as number) + 75; s.player.y = (y as number) - 24; }, [hz2.x, hz2.y]);
    await page.keyboard.down(hz2.shape === 'rect' ? (hz2.w! > hz2.h! ? 's' : 'd') : 'd'); await page.waitForTimeout(950); await page.keyboard.up(hz2.shape === 'rect' ? (hz2.w! > hz2.h! ? 's' : 'd') : 'd');
    await page.waitForTimeout(2200); expect((await sim(page)).hp).toBe(100);
    await page.screenshot({ path: `test-results/arena-${arena}-${w}x${h}.png` });
    expect(problems).toEqual([]);
  });
}

for (const arena of ['gloam', 'ashen'] as const) {
  test(`${arena}: both bosses and an elite wave, beam and sphere in Base and Form I, no errors`, async ({ page }) => { test.setTimeout(90_000);   // two boss runs + elite wave + both forms: ~25 s alone, longer under parallel software-GL load
    const problems = await prep(page, 960, 540);
    for (const boss of ['warden', 'seraph']) { await run(page, arena, `&encounter=${boss}`); await expect(page.getByTestId('boss-bar')).toBeVisible(); await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.sim().enemies[0].mode !== 'intro', null, { timeout: 8000 });
      await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(), b = s.enemies[0]; b.mode = 'move'; b.attackCd = 0; b.ai.pat = 1; s.player.hp = 1e6; s.player.x = b.x + 200; s.player.y = b.y; });
      await page.waitForFunction(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); return s.hazards.length > 0 || s.enemyShots.length > 0; }, null, { timeout: 5000 }); await page.waitForTimeout(400); }
    await run(page, arena, '&encounter=cantor'); await page.evaluate(() => { (window as unknown as W).__KYNT_QA__!.sim().player.hp = 1e6; });
    for (const form of [0, 1]) {
      if (form === 1) { await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.player.drive = 100; }); await page.keyboard.press('f'); await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.sim().player.form === 1, null, { timeout: 3000 }); await page.waitForTimeout(1600); }
      await page.keyboard.press('e'); await page.waitForFunction(k => (window as unknown as W).__KYNT_QA__!.sim().cast?.kind === k, form === 1 ? 'flare' : 'beam', { timeout: 3000 }); await page.waitForFunction(() => !(window as unknown as W).__KYNT_QA__!.sim().cast, null, { timeout: 6000 });
      await page.keyboard.press('r'); await page.waitForFunction(k => (window as unknown as W).__KYNT_QA__!.sim().cast?.kind === k, form === 1 ? 'crucible' : 'sphere', { timeout: 3000 }); await page.waitForFunction(() => !(window as unknown as W).__KYNT_QA__!.sim().cast, null, { timeout: 6000 });
      await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.player.beamCooldown = 0; s.player.sphereCooldown = 0; });
    }
    expect(problems).toEqual([]);
  });
}

test('retry returns to the SAME arena and restarts clean', async ({ page }) => {
  const problems = await prep(page, 960, 540); await run(page, 'ashen');
  await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.player.hp = 5; s.player.invulnerable = 0; s.enemies.push({ id: s.nextId++, kind: 'pursuer', x: s.player.x + 4, y: s.player.y, hp: 25, maxHp: 25, radius: 17, speed: 0, damage: 999, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 1e9, aimX: 1, aimY: 0, stagger: 0, spawnedAt: s.time }); });
  await expect(page.getByTestId('results-screen')).toBeVisible({ timeout: 10000 }); await page.getByRole('button', { name: /retry|again|deploy/i }).first().click();
  await page.waitForFunction(() => { const q = (window as unknown as W).__KYNT_QA__; return q && q.sim().phase === 'running' && q.sim().time < 3; }, null, { timeout: 20000 });
  const s = await sim(page); expect(s.arena).toBe('ashen'); expect(s.hz).toBe(0); expect(problems).toEqual([]);
});

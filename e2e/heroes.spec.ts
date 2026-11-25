import { test, expect, type Page } from '@playwright/test';
type S = { hero: string; time: number; phase: string; hx: { act: { act: string } | null; bolts: unknown[]; orbs: unknown[] }; player: { hp: number; maxHp: number; form: number; drive: number; qCooldown: number; beamCooldown: number; sphereCooldown: number; x: number; y: number }; enemies: { hp: number; x: number; y: number }[]; heroFormUnlocked: boolean; cinema: unknown; arenaId: string };
const sim = (page: Page) => page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: { sim: () => S } }).__KYNT_QA__.sim(); return { hero: s.hero, time: s.time, phase: s.phase, act: s.hx.act?.act ?? null, bolts: s.hx.bolts.length, orbs: s.hx.orbs.length, hp: s.player.hp, form: s.player.form, q: s.player.qCooldown, e: s.player.beamCooldown, r: s.player.sphereCooldown, cinema: !!s.cinema, unlocked: s.heroFormUnlocked, arena: s.arenaId, foes: s.enemies.length }; });
const crowd = (page: Page) => page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: { sim: () => S } }).__KYNT_QA__.sim(), p = s.player as unknown as Record<string, number>; (s as unknown as { spawnTimer: number }).spawnTimer = 1e9; p.hp = 1e6; p.maxHp = 1e6; (p as unknown as Record<string, number>).nextXp = 1e9; s.enemies.length = 0; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; (s.enemies as unknown[]).push({ id: 800 + i, kind: 'pursuer', x: p.x + Math.cos(a) * 140, y: p.y + Math.sin(a) * 110, hp: 900, maxHp: 900, radius: 17, speed: 0, damage: 0, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 99, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 }); } p.qCooldown = 0; p.beamCooldown = 0; p.sphereCooldown = 0; });
async function pick(page: Page, hero: 'ren' | 'sora', arena?: string) {
  await page.goto('/?seed=21&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click();
  if (arena) { await page.getByTestId('arena-open').click(); await page.getByTestId(`arena-card-${arena}`).click(); await page.getByTestId('arena-confirm').click(); }
  await page.getByTestId(`hero-card-${hero}`).click(); await expect(page.getByTestId(`hero-card-${hero}`)).toHaveAttribute('aria-pressed', 'true'); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(500);
}
for (const [W, H] of [[960, 540], [640, 360]]) {
  test.describe(`B19 heroes @${W}x${H}`, () => {
    test.use({ viewport: { width: W, height: H } });
    test('Ren: real selection deploys Ren; Q / E / R run their own moves; HUD slots are Ren\'s; no console errors', async ({ page }) => {
      const errs: string[] = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/failed to load|404|favicon/i.test(m.text())) errs.push(m.text()); });
      await pick(page, 'ren'); expect((await sim(page)).hero).toBe('ren'); await crowd(page);
      await expect(page.getByTestId('cd-q')).toHaveAttribute('aria-label', /Crimson Break/); await expect(page.getByTestId('cd-e')).toHaveAttribute('aria-label', /Meteor Rush/); await expect(page.getByTestId('cd-r')).toHaveAttribute('aria-label', /Bloodstar Impact/); await expect(page.getByTestId('cd-f')).toHaveAttribute('aria-label', /Crimson Ascendant/);
      await page.keyboard.press('q'); await page.waitForTimeout(150); expect((await sim(page)).act).toBe('crimson_break'); await page.waitForTimeout(1000);
      await page.keyboard.press('e'); await page.waitForTimeout(150); expect((await sim(page)).act).toBe('meteor_rush'); await page.waitForTimeout(1500);
      await page.keyboard.press('r'); await page.waitForTimeout(200); expect((await sim(page)).act).toBe('bloodstar'); await page.waitForTimeout(1800);
      const s = await sim(page); expect(s.q).toBeGreaterThan(0); expect(s.e).toBeGreaterThan(0); expect(s.r).toBeGreaterThan(0); expect(errs).toEqual([]);
    });
    test('Sora: Q fires bolts, E charges while held and fires on release, R summons orbs; transformation locked until earned, then F reveals it (frozen clock)', async ({ page }) => {
      await pick(page, 'sora'); await crowd(page);
      await page.keyboard.press('q'); await page.waitForTimeout(450); const q = await sim(page); expect(q.bolts + (q.q > 0 ? 1 : 0)).toBeGreaterThan(0); await page.waitForTimeout(900);
      await page.keyboard.down('e'); await page.waitForTimeout(400); expect((await sim(page)).act).toBe('celestial_lance'); await page.keyboard.up('e'); await page.waitForTimeout(1200); expect((await sim(page)).e).toBeGreaterThan(5);
      await page.keyboard.press('r'); await page.waitForTimeout(300); expect((await sim(page)).orbs).toBeGreaterThan(0); await page.waitForTimeout(2200);
      await page.evaluate(() => { (window as unknown as { __KYNT_QA__: { sim: () => S } }).__KYNT_QA__.sim().player.drive = 100; }); await page.keyboard.press('f'); await page.waitForTimeout(250); expect((await sim(page)).cinema).toBe(false);   // sealed: nothing happens
      await page.evaluate(() => { (window as unknown as { __KYNT_QA__: { sim: () => S } }).__KYNT_QA__.sim().heroFormUnlocked = true; }); await page.keyboard.press('f'); await page.waitForTimeout(300);
      const a = await sim(page); expect(a.cinema).toBe(true); await page.waitForTimeout(500); const b = await sim(page); expect(b.time).toBeCloseTo(a.time, 1);
      await page.waitForFunction(() => !(window as unknown as { __KYNT_QA__: { sim: () => S } }).__KYNT_QA__.sim().cinema, null, { timeout: 8000 }); expect((await sim(page)).form).toBe(1);
    });
    test('death shows the Results with the hero name, Retry keeps the hero and the arena', async ({ page }) => {
      await pick(page, 'ren', 'ashen'); const before = await sim(page);
      await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: { sim: () => S } }).__KYNT_QA__.sim(); s.player.hp = 0.0001; (s as unknown as { enemies: unknown[] }).enemies.push({ id: 7, kind: 'pursuer', x: s.player.x, y: s.player.y, hp: 50, maxHp: 50, radius: 17, speed: 0, damage: 500, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 99, aimX: 1, aimY: 0, stagger: 0, spawnedAt: 0 }); });
      await expect(page.getByTestId('results-screen')).toBeVisible({ timeout: 15000 }); await expect(page.getByTestId('result-hero')).toContainText('REN');
      await page.getByRole('button', { name: /RETRY SAME SEED|RUN IT AGAIN/ }).first().click(); await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(800); const after = await sim(page); expect(after.hero).toBe('ren'); expect(after.arena).toBe(before.arena); expect(after.phase).toBe('running');
    });
  });
}

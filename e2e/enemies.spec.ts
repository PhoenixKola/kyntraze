import { test, expect, type Page } from '@playwright/test';
type W = { __KYNT_QA__?: { sim: () => any; enemyStats: () => { sprites: number; bolts: number; ghosts: number; fx: number; tele: number } } };
const DEF = { pursuer: { hp: 25, r: 17, sp: 74, dmg: 10 }, flanker: { hp: 18, r: 15, sp: 118, dmg: 7 }, bruiser: { hp: 150, r: 26, sp: 46, dmg: 12 }, ranged: { hp: 20, r: 16, sp: 66, dmg: 6 } };
async function start(page: Page) {
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as W).__KYNT_QA__)); await page.waitForTimeout(500);
  await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); s.enemies.length = 0; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.attackClock = 1e9; s.player.hp = 100; });
  return errors;
}
const add = (page: Page, kind: keyof typeof DEF, dx: number, extra: object = {}) => page.evaluate(([kind, dx, extra, DEF]) => { const s = (window as unknown as W).__KYNT_QA__!.sim(), p = s.player, d = (DEF as any)[kind as string];
  s.enemies.push({ id: s.nextId++, kind, x: p.x + (dx as number), y: p.y, hp: d.hp, maxHp: d.hp, radius: d.r, speed: d.sp, damage: d.dmg, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 0.1, aimX: -1, aimY: 0, stagger: 0, spawnedAt: s.time, ...(extra as object) }); }, [kind, dx, extra, DEF] as const);

test('every archetype renders from its own sheet and shows its telegraph during the windup', async ({ page }) => {
  const errors = await start(page);
  await add(page, 'bruiser', 100); await add(page, 'ranged', 330, { speed: 0 }); await add(page, 'pursuer', -60); await add(page, 'flanker', -150, { speed: 0, attackCd: 1e9 });
  await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.enemyStats().sprites === 4);
  await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.enemyStats().tele >= 1, null, { timeout: 8000 });
  expect(errors).toEqual([]);
});

test('a ranged bolt is drawn while it flies, a kill leaves a visible death frame, and nothing lingers afterwards', async ({ page }) => {
  const errors = await start(page);
  await add(page, 'ranged', 330, { speed: 0 });
  await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.enemyStats().bolts === 1, null, { timeout: 8000 });
  await page.evaluate(() => { const s = (window as unknown as W).__KYNT_QA__!.sim(); const e = s.enemies[0]; s.enemyEvents.push({ id: s.nextId++, kind: 'enemy_death', enemy: e.kind, enemyId: e.id, x: e.x, y: e.y, dirX: 1, dirY: 0 }); e.hp = 0; });
  await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.enemyStats().ghosts >= 1);
  await page.waitForFunction(() => { const st = (window as unknown as W).__KYNT_QA__!.enemyStats(); return st.ghosts === 0 && st.sprites === 0; }, null, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test('a crowd at the enemy cap renders every enemy without errors', async ({ page }) => {
  const errors = await start(page);
  await page.evaluate(([DEF]) => { const s = (window as unknown as W).__KYNT_QA__!.sim(), p = s.player; const ks = ['pursuer', 'flanker', 'bruiser', 'ranged'] as const;
    for (let i = 0; i < 115; i++) { const k = ks[i % 4], d = (DEF as any)[k], a = i * 2.399, r = 150 + (i * 53) % 420; s.enemies.push({ id: s.nextId++, kind: k, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.8, hp: d.hp, maxHp: d.hp, radius: d.r, speed: 0, damage: d.dmg, touchCooldown: 0, mode: 'move', modeT: 0, attackCd: 1e9, aimX: 1, aimY: 0, stagger: 0, spawnedAt: s.time }); } }, [DEF] as const);
  await page.waitForFunction(() => (window as unknown as W).__KYNT_QA__!.enemyStats().sprites === 115, null, { timeout: 8000 });
  await page.waitForTimeout(800); expect(errors).toEqual([]);
});

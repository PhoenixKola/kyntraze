import { test, expect } from '@playwright/test';
const SAVE = { version: 1, meta: { v: 1, marks: 0, lifetime: 0, owned: [], boon: null, contract: 'overrun', crest: null, feats: {}, mastery: {}, counters: { runs: 3, wins: 0, deaths: 0, kills: 0, wardenKills: 0, seraphKills: 0 }, arenas: {}, granted: [], introSeen: true, legacyGift: 0, heroes: {} }, settings: {}, best: null };
for (const [w, h] of [[640, 360], [960, 540]] as const) test(`B22 HUD: contract sits inside the clock panel and ability tiles show a tooltip and can be clicked (${w}x${h})`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript(s => { try { localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify(s)); } catch { /* */ } }, SAVE);
  await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(500);
  const c = await page.evaluate(() => { const r = (q: string) => { const b = document.querySelector(q)?.getBoundingClientRect(); return b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null; }; return { clock: r('.hud-clock'), contract: r('[data-testid="hud-contract"]'), next: r('.clock-next'), kills: r('.clock-kills') }; });
  expect(c.contract).not.toBeNull(); const k = c.clock!, ct = c.contract!;
  expect(ct.y).toBeGreaterThanOrEqual(k.y); expect(ct.y + ct.h).toBeLessThanOrEqual(k.y + k.h + 1); expect(ct.x).toBeGreaterThanOrEqual(k.x - 1); expect(ct.x + ct.w).toBeLessThanOrEqual(k.x + k.w + 1);
  if (c.kills) expect(ct.y).toBeGreaterThanOrEqual(c.kills.y + c.kills.h - 2);
  await page.getByTestId('cd-q').hover(); await page.waitForTimeout(250);
  await expect(page.getByTestId('tip-q')).toBeVisible(); await expect(page.getByTestId('tip-q')).toContainText('Surge Step'); await expect(page.getByTestId('tip-q')).toContainText('Speed');
  await page.screenshot({ path: `test-results/b22-hud-${w}x${h}.png` });
  const before = await page.evaluate(() => (window as unknown as { __KYNT_QA__: { sim: () => { player: { qCooldown: number } } } }).__KYNT_QA__.sim().player.qCooldown);
  await page.getByTestId('cd-q').click(); await page.waitForTimeout(300);
  const after = await page.evaluate(() => (window as unknown as { __KYNT_QA__: { sim: () => { player: { qCooldown: number } } } }).__KYNT_QA__.sim().player.qCooldown);
  expect(before).toBe(0); expect(after).toBeGreaterThan(5);
});

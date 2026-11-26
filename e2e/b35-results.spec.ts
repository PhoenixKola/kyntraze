import { test, expect, type Page } from '@playwright/test';
// B35: redesigned WIN and DEFEAT Results at short viewports. Uses the isolated ?qa=1 save.
type S = { player: Record<string, number>; time: number; kills: number; spawnTimer: number; enemies: Record<string, unknown>[]; nextId: number };
type Q = { sim: () => S; encounter: (k: string) => void; killBoss: (k: string) => void };
const q = (page: Page) => page.evaluate(() => Boolean((window as unknown as { __KYNT_QA__?: Q }).__KYNT_QA__));
const SHOTS = 'test-results/b35';
const start = async (page: Page, w: number, h: number) => {
  await page.setViewportSize({ width: w, height: h }); await page.goto('/?seed=71&qa=1'); await page.evaluate(() => localStorage.removeItem('kyntraze-b00-v1-qa')); await page.goto('/?seed=71&qa=1');
  await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click(); await expect(page.getByTestId('hud')).toBeVisible({ timeout: 20000 });
  await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: Q }).__KYNT_QA__));
};
const checkResults = async (page: Page, w: number, h: number, name: string) => {
  await expect(page.getByTestId('results-screen')).toBeVisible({ timeout: 20000 }); await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/${name}_${w}x${h}.png` });
  const r = await page.evaluate(() => {
    const vis = [...document.querySelectorAll('[data-testid="results-screen"] button, [data-testid="hint-bar"]')].map(e => { const b = e.getBoundingClientRect(); return { t: (e.textContent ?? '').trim().slice(0, 24), l: b.left, tp: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; });
    const root = document.querySelector('[data-testid="results-screen"]') as HTMLElement;
    return { vis, docX: document.documentElement.scrollWidth - innerWidth, docY: document.documentElement.scrollHeight - innerHeight, rootX: root.scrollWidth - root.clientWidth };
  });
  expect(r.docX).toBeLessThanOrEqual(1); expect(r.rootX).toBeLessThanOrEqual(1);
  for (const v of r.vis) { expect(v.h, v.t).toBeGreaterThan(4); expect(v.l, v.t).toBeGreaterThanOrEqual(-0.5); expect(v.r, v.t).toBeLessThanOrEqual(w + 0.5); expect(v.b, `${v.t} below viewport`).toBeLessThanOrEqual(h + 0.5); expect(v.tp, v.t).toBeGreaterThanOrEqual(-0.5); }
  expect(r.vis.length).toBeGreaterThan(2);
};
for (const [w, h] of [[1920, 1080], [1280, 720], [960, 540], [640, 360], [640, 320]] as const) {
  test(`DEFEAT results keep every action and hint visible at ${w}x${h}`, async ({ page }) => {
    await start(page, w, h);
    await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.time = 400; s.kills = 321; s.player.hp = 1; s.player.invulnerable = 0; s.enemies.push({ id: s.nextId++, kind: 'pursuer', x: s.player.x, y: s.player.y, hp: 9999, maxHp: 9999, radius: 16, damage: 30, speed: 0, touchCooldown: 0, attackCd: 99, aimX: 1, aimY: 0, mode: 'move', modeT: 1, stagger: 0 }); });
    await checkResults(page, w, h, 'defeat');
  });
  test(`WIN results keep every action and hint visible at ${w}x${h}`, async ({ page }) => {
    await start(page, w, h);
    await page.evaluate(() => { const s = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.sim(); s.spawnTimer = 1e9; s.time = 905; s.kills = 640; s.player.hp = 1e6; s.player.maxHp = 1e6; s.player.nextXp = 1e9; (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.encounter('seraph'); });
    await page.waitForTimeout(600); await page.evaluate(() => (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__.killBoss('seraph'));
    await checkResults(page, w, h, 'win');
  });
}

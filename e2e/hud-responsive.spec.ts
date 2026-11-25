import { test, expect, type Page } from '@playwright/test';
async function start(page: Page) {
  await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(400);
}
for (const [w, h] of [[640, 360], [960, 540]] as const) test(`cooldown tiles, XP panel and viewport edges do not overlap at ${w}x${h}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: h }); await start(page);
  const boxes = await page.evaluate(() => { const r = (el: Element | null) => { const b = el?.getBoundingClientRect(); return b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null; };
    return { tiles: ['cd-shift', 'cd-q', 'cd-e', 'cd-r', 'cd-f'].map(id => r(document.querySelector(`[data-testid="${id}"]`))), panels: ['.hud-health', '.hud-clock', '.hud-pause'].map(q => r(document.querySelector(q))), vw: innerWidth, vh: innerHeight }; });
  const t = boxes.tiles; for (const b of t) expect(b).not.toBeNull();
  const tiles = t as { x: number; y: number; w: number; h: number }[];
  for (let i = 0; i < tiles.length; i++) { expect(tiles[i].x).toBeGreaterThanOrEqual(0); expect(tiles[i].x + tiles[i].w).toBeLessThanOrEqual(boxes.vw + 0.5); expect(tiles[i].y + tiles[i].h).toBeLessThanOrEqual(boxes.vh + 0.5);
    for (let j = i + 1; j < tiles.length; j++) { const a = tiles[i], b = tiles[j]; const ov = a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5; expect(ov, `tiles ${i} and ${j} overlap`).toBe(false); } }
  for (const pn of boxes.panels) { expect(pn).not.toBeNull(); const q = pn!; expect(q.x).toBeGreaterThanOrEqual(0); expect(q.x + q.w).toBeLessThanOrEqual(boxes.vw + 0.5);
    for (const t of tiles) expect(q.x < t.x + t.w && t.x < q.x + q.w && q.y < t.y + t.h && t.y < q.y + q.h, 'HUD panel overlaps ability tiles').toBe(false); }
  const [hp, clock, pause] = boxes.panels as { x: number; y: number; w: number; h: number }[]; expect(hp.x + hp.w).toBeLessThanOrEqual(clock.x + 0.5); expect(clock.x + clock.w).toBeLessThanOrEqual(pause.x + 0.5);
  await page.screenshot({ path: `test-results/hud-${w}x${h}.png` });
});

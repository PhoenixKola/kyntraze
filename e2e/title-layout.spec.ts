import { test, expect } from '@playwright/test';

const VIEWPORTS = [[640, 360], [960, 540], [1280, 720], [1440, 900], [1920, 1080], [2560, 1080], [3440, 1440]] as const;

for (const [w, h] of VIEWPORTS) {
  test(`title: buttons, copy and Kai never overlap at ${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h }); await page.goto('/');
    await expect(page.getByTestId('title-screen')).toBeVisible();
    const r = await page.evaluate(() => {
      const box = (s: string) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
      return { kai: box('.title-kai'), btns: [...document.querySelectorAll('.title-content > *')].map(e => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; }), content: box('.title-content'), best: box('.best-run') };
    });
    const hit = (a: { l: number; t: number; r: number; b: number }, k: { l: number; t: number; r: number; b: number }) => a.l < k.r && a.r > k.l && a.t < k.b && a.b > k.t;
    for (const b of r.btns) { expect(b.r).toBeLessThanOrEqual(w + 0.5); expect(b.b).toBeLessThanOrEqual(h + 0.5); expect(b.t).toBeGreaterThanOrEqual(0); expect(hit(b, r.kai!), `button ${JSON.stringify(b)} overlaps Kai ${JSON.stringify(r.kai)}`).toBe(false); }
    expect(r.best!.b).toBeLessThanOrEqual(h);
  });
}

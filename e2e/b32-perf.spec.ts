import { test } from '@playwright/test';
/** B32 frame-time comparison (headless software GL, so only the before/after delta means anything): Cometheart Meteor Drive spam into a 40-enemy crowd, with and without the B32 layer. */
type Q = { sim: () => { player: Record<string, number>; enemies: Array<Record<string, number>> }; spawn: (k: string, dx?: number, dy?: number) => void };
for (const off of [false, true]) {
  test(`B32 frame time ${off ? 'without' : 'with'} the layer`, async ({ page }) => {
    test.setTimeout(90000); await page.setViewportSize({ width: 1280, height: 720 }); const errs: string[] = []; page.on('pageerror', e => errs.push(String(e)));
    await page.addInitScript(o => { localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'kai', settings: {} })); if (o) (window as unknown as { __KYNT_NO_B32__: boolean }).__KYNT_NO_B32__ = true; }, off);
    await page.goto('/?qa=1&ascend=1&unlock=all'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click(); await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(1200);
    await page.evaluate(() => { const q = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__; const s = q.sim(); s.player.form = 2; s.player.drive = 100; s.player.hp = s.player.maxHp = 1e6; for (let i = 0; i < 40; i++) q.spawn('pursuer', 160 + (i % 8) * 40, -140 + Math.floor(i / 8) * 60); for (const e of s.enemies) e.hp = e.maxHp = 1e6; });
    await page.waitForTimeout(600); await page.mouse.move(900, 330);
    const ft = await page.evaluate(async () => { const out: number[] = []; let last = performance.now(); const t0 = last; const key = (c: string) => window.dispatchEvent(new KeyboardEvent('keydown', { code: c })); let nextQ = 0;
      await new Promise<void>(res => { const tick = (n: number) => { out.push(n - last); last = n; if (n > nextQ) { key('KeyQ'); nextQ = n + 1300; } if (n - t0 < 7000) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
      out.sort((a, b) => a - b); return { avg: out.reduce((a, b) => a + b, 0) / out.length, p95: out[Math.floor(out.length * 0.95)], n: out.length }; });
    if (errs.length) throw new Error(errs.join('; '));
    console.log(`B32 PERF ${off ? 'off' : 'on'}: avg ${ft.avg.toFixed(1)} ms, p95 ${ft.p95.toFixed(1)} ms over ${ft.n} frames`);
  });
}

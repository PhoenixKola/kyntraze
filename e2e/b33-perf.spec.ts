import { test } from '@playwright/test';
/** B33 frame-time comparison (headless software GL: only the delta between the Ascendant and the Eclipse in the same crowd means anything). */
type Q = { sim: () => { player: Record<string, number>; enemies: Array<Record<string, number>> }; spawn: (k: string, dx?: number, dy?: number) => void };
for (const form of [1, 2]) {
  test(`B33 frame time, form ${form}`, async ({ page }) => {
    test.setTimeout(90000); await page.setViewportSize({ width: 1280, height: 720 }); const errs: string[] = []; page.on('pageerror', e => errs.push(String(e)));
    await page.addInitScript(() => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'ren', settings: {}, unlocks: { cometheart: true, stillfire: true, ren: true, sora: true }, b22: { v: 1, renF2: true } })));
    await page.goto('/?qa=1&ascend=1'); await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId('start-run').click(); await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(1200);
    await page.evaluate(f => { const q = (window as unknown as { __KYNT_QA__: Q }).__KYNT_QA__; const s = q.sim(); s.player.form = f; s.player.drive = 100; s.player.hp = s.player.maxHp = 1e6; for (let i = 0; i < 40; i++) q.spawn('pursuer', 60 + (i % 8) * 34, -130 + Math.floor(i / 8) * 55); for (const e of s.enemies) { e.hp = e.maxHp = 1e6; e.speed = 0; } }, form);
    await page.waitForTimeout(500); await page.mouse.move(900, 330);
    const ft = await page.evaluate(async () => { const out: number[] = []; let last = performance.now(); const t0 = last; const key = (c: string) => window.dispatchEvent(new KeyboardEvent('keydown', { code: c })); let nq = 0, ne = 0, nr = 0;
      await new Promise<void>(res => { const tick = (n: number) => { out.push(n - last); last = n; if (n > nq) { key('KeyQ'); nq = n + 900; } if (n > ne) { key('KeyE'); ne = n + 1300; } if (n > nr) { key('KeyR'); nr = n + 2500; } if (n - t0 < 8000) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
      out.sort((a, b) => a - b); return { avg: out.reduce((a, b) => a + b, 0) / out.length, p95: out[Math.floor(out.length * 0.95)], n: out.length }; });
    if (errs.length) throw new Error(errs.join('; '));
    console.log(`B33 PERF form ${form}: avg ${ft.avg.toFixed(1)} ms, p95 ${ft.p95.toFixed(1)} ms over ${ft.n} frames`);
  });
}

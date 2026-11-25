import { test, expect } from '@playwright/test';
// B20: run against the production preview only:  npm run build && npx vite preview --port 4173  then  PROD_URL=http://127.0.0.1:4173 npx playwright test e2e/prod-smoke.spec.ts
const PROD = process.env.PROD_URL;
test.skip(!PROD, 'set PROD_URL to a vite preview server');
test.use({ baseURL: PROD });

for (const hero of ['kai', 'ren', 'sora'] as const) test(`production: ${hero} boots, plays 6s with no failed requests or console errors, and no QA hooks leak (even with ?qa=1)`, async ({ page }) => {
  const bad: string[] = [];
  page.on('pageerror', e => bad.push('pageerror ' + e)); page.on('console', m => { if (m.type() === 'error') bad.push('console ' + m.text().slice(0, 160)); });
  page.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); }); page.on('requestfailed', r => bad.push('failed ' + r.url()));
  await page.setViewportSize({ width: 960, height: 540 }); await page.goto('/?qa=1&seed=3&debug=hit&hero=' + hero);
  await page.getByTestId('play-button').click(); await page.getByTestId('nexus-heroes').click(); await page.getByTestId(`hero-card-${hero}`).click();
  await page.getByTestId('start-run').click(); await expect(page.getByTestId('hud')).toBeVisible({ timeout: 20000 });
  await page.keyboard.down('d'); await page.waitForTimeout(3000); await page.keyboard.up('d'); await page.keyboard.press('q'); await page.keyboard.press('e'); await page.waitForTimeout(3000);
  expect(await page.evaluate(() => (window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)).toBeUndefined();
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.endsWith('-qa')))).toEqual([]);
  expect(bad).toEqual([]);
});

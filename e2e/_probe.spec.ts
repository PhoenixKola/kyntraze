import { test } from '@playwright/test';
for (const [arena, hero, boss] of [['aetherfall', 'kai', 'castellan'], ['paradox', 'vex', 'regent']] as const) test('probe ' + arena, async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  const errs: string[] = []; page.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 200))); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 160)); });
  await page.addInitScript(h => { localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: h, settings: {} })); }, hero);
  await page.goto(`/?seed=9&qa=1&arena=${arena}`); await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click();
  await page.waitForFunction(() => Boolean((window as unknown as { __KYNT_QA__?: unknown }).__KYNT_QA__)); await page.waitForTimeout(2500);
  await page.screenshot({ path: `test-results/probe-${arena}.png` });
  await page.evaluate(b => (window as unknown as { __KYNT_QA__: { encounter: (k: string) => void } }).__KYNT_QA__.encounter(b), boss); await page.waitForTimeout(5000);
  await page.screenshot({ path: `test-results/probe-${arena}-boss.png` });
  console.log('RESULT ' + arena + ' ' + JSON.stringify(errs.slice(0, 5)));
});

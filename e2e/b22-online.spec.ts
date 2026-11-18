import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
let srv: ChildProcess;
test.beforeAll(async () => { srv = spawn('npx', ['vite-node', 'src/server/main.ts'], { shell: true, env: { ...process.env, PORT: '2599' } }); await new Promise<void>(res => { srv.stdout?.on('data', d => { if (String(d).includes('listening')) res(); }); setTimeout(res, 20000); }); });
test.afterAll(() => { srv.kill(); spawn('taskkill', ['/pid', String(srv.pid), '/T', '/F'], { shell: true }); });
test('B22 online co-op: two browser contexts, one real server, one shared run', async ({ browser }) => {
  test.setTimeout(120000);
  const mk = async () => { const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } }); const page = await ctx.newPage(); await page.addInitScript(() => localStorage.setItem('kyntraze-b00-v1-qa', JSON.stringify({ version: 1, hero: 'kai', settings: {} }))); await page.goto('/?seed=9&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('mode-open').click(); await page.getByTestId('coop-online').click(); await page.getByTestId('server-url').fill('ws://127.0.0.1:2599'); await page.getByTestId('connect').click(); return page; };
  const a = await mk(), b = await mk();
  await a.getByTestId('create-room').click(); await expect(a.getByTestId('room-view')).toBeVisible(); const code = (await a.locator('h2.large-heading').innerText()).replace('ROOM ', '').trim();
  await b.getByTestId('room-code').fill(code); await b.getByTestId('join-room').click(); await expect(b.getByTestId('room-view')).toBeVisible();
  await a.getByTestId('ready').click(); await b.getByTestId('ready').click();
  await expect(a.getByTestId('hud')).toBeVisible({ timeout: 20000 }); await expect(b.getByTestId('hud')).toBeVisible({ timeout: 20000 });
  await a.waitForTimeout(2500); await expect(a.getByTestId('hud-partner')).toBeVisible(); await expect(b.getByTestId('hud-partner')).toBeVisible();
  await a.screenshot({ path: 'test-results/b22-online-a.png' }); await b.screenshot({ path: 'test-results/b22-online-b.png' });
});

import { defineConfig, devices } from '@playwright/test';
export default defineConfig({ testDir: './e2e', timeout: 60000, workers: 1, use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5199' }, webServer: { command: 'npx vite --host 127.0.0.1 --port 5199 --strictPort', url: 'http://127.0.0.1:5199', reuseExistingServer: false, timeout: 60000 } });

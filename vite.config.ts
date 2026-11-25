import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
const version = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], define: { __APP_VERSION__: JSON.stringify(version) }, base: './', server: { host: '127.0.0.1', port: 5173, strictPort: true }, build: { target: 'es2022' } });

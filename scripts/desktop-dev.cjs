const cleanEnv = o => { const e = { ...o }; delete e.ELECTRON_RUN_AS_NODE; return e; };   // VS Code-hosted shells export ELECTRON_RUN_AS_NODE=1, which would run Electron as plain Node
// desktop:dev — start Vite on loopback, open Electron against it, and stop Vite when the window closes (no orphan servers on Windows).
const { spawn, spawnSync } = require('node:child_process'); const net = require('node:net'); const path = require('node:path');
const root = path.join(__dirname, '..'), PORT = 5174;
const vite = spawn(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'inherit' });
const stopVite = () => { if (vite.exitCode === null) { if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(vite.pid), '/t', '/f']); else vite.kill(); } };
const wait = (left = 100) => new Promise((res, rej) => { const s = net.connect(PORT, '127.0.0.1', () => { s.end(); res(); }); s.on('error', () => { s.destroy(); left <= 0 ? rej(new Error('vite did not start')) : setTimeout(() => wait(left - 1).then(res, rej), 200); }); });
wait().then(() => {
  const electron = require('electron');
  const app = spawn(electron, [root], { cwd: root, stdio: 'inherit', env: cleanEnv({...process.env, KYNT_DEV_URL: `http://127.0.0.1:${PORT}`}) });
  app.on('exit', code => { stopVite(); process.exit(code ?? 0); });
  process.on('SIGINT', () => { app.kill(); stopVite(); });
}).catch(e => { console.error(e.message); stopVite(); process.exit(1); });

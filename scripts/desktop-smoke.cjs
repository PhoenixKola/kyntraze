const cleanEnv = o => { const e = { ...o }; delete e.ELECTRON_RUN_AS_NODE; return e; };   // VS Code-hosted shells export ELECTRON_RUN_AS_NODE=1, which would run Electron as plain Node
// desktop:smoke — run the built dist/ (or a packed app via KYNT_EXE) twice against a throwaway profile: both launches must load with zero failed requests, no Node in the page, no QA hook, and the second launch must see the first launch's localStorage marker.
const { spawnSync } = require('node:child_process'); const path = require('node:path'); const fs = require('node:fs'); const os = require('node:os');
const root = path.join(__dirname, '..'), exe = process.env.KYNT_EXE || require('electron');
const args = process.env.KYNT_EXE ? [] : [root], prof = fs.mkdtempSync(path.join(os.tmpdir(), 'kyntraze smoke ünï-'));
const run = () => { const r = spawnSync(exe, args, { env: cleanEnv({...process.env, KYNT_SMOKE: '1', KYNT_USER_DATA: prof}), encoding: 'utf8', timeout: 90000 }); const line = (r.stdout || '').split('\n').find(l => l.startsWith('SMOKE ')); return { code: r.status, res: line ? JSON.parse(line.slice(6)) : { ok: false, raw: (r.stdout + r.stderr).slice(-400) } }; };
const a = run(), b = run();
console.log('launch 1', JSON.stringify(a.res)); console.log('launch 2', JSON.stringify(b.res));
const persisted = b.res.had === 'ok', ok = a.res.ok && b.res.ok && persisted && a.res.had === null;
console.log(ok ? 'DESKTOP SMOKE PASS (profile persisted across launches)' : 'DESKTOP SMOKE FAIL');
fs.rmSync(prof, { recursive: true, force: true }); process.exit(ok ? 0 : 1);

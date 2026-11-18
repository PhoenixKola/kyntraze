'use strict';
/** KYNTRAZE desktop shell. No gameplay lives here: it only hosts the same Vite build (dist/) in a locked-down window.
 *  Packaged: dist/ is served from a private app://kyntraze origin (standard + secure + fetch-capable), so the game's absolute /art and /audio URLs resolve exactly like on a web server and localStorage has one stable origin across launches and updates.
 *  Dev: only the loopback Vite server (127.0.0.1) is ever loaded. No preload and no IPC: the renderer needs no native API. */
const { app, BrowserWindow, Menu, protocol, session, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const APP_ORIGIN = 'app://kyntraze';
const DEV_URL = process.env.KYNT_DEV_URL || '';          // desktop:dev sets this to http://127.0.0.1:<port>
const SMOKE = process.env.KYNT_SMOKE === '1';
const DIST = path.join(__dirname, '..', 'dist');

if (DEV_URL && !/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(DEV_URL)) { console.error('KYNT_DEV_URL must be a loopback 127.0.0.1 URL'); process.exit(2); }
if (SMOKE && process.env.KYNT_USER_DATA) app.setPath('userData', process.env.KYNT_USER_DATA);

app.setName('KYNTRAZE FRACTURE RUSH');
if (process.platform === 'win32') app.setAppUserModelId('com.kyntraze.fracturerush');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

/** B22 online co-op: ONE explicitly configured game server may be reached. Only wss://host[:port] (or ws:// to loopback for development) is accepted, validated here in the main process; the CSP and the request filter allow exactly that host and nothing else. Offline play requests no network. */
const NET_FILE = () => path.join(app.getPath('userData'), 'b22-net.json');
function safeServer(raw) {
  if (typeof raw !== 'string' || raw.length > 200) return '';
  try { const u = new URL(raw.trim()); const loop = u.hostname === '127.0.0.1' || u.hostname === 'localhost'; if (u.protocol === 'wss:' || (u.protocol === 'ws:' && loop)) return `${u.protocol}//${u.host}`; } catch { /* not a URL */ }
  return '';
}
let serverOrigin = '';
function loadServer() { try { serverOrigin = safeServer(JSON.parse(fs.readFileSync(NET_FILE(), 'utf8')).url); } catch { serverOrigin = ''; } if (process.env.KYNT_SERVER_URL) serverOrigin = safeServer(process.env.KYNT_SERVER_URL) || serverOrigin; }
const httpOf = o => (o ? o.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:') : '');
const CSP_BASE = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:", "media-src 'self' blob: data:", "@@CONNECT@@", "worker-src 'self' blob:", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
];
const cspNow = () => CSP_BASE.map(d => (d === '@@CONNECT@@' ? `connect-src 'self' blob: data:${serverOrigin ? ` ${serverOrigin} ${httpOf(serverOrigin)}` : ''}` : d)).join('; ');

/** Map an app:// request to a file inside dist/ and refuse anything that escapes it. */
function resolveInDist(requestUrl) {
  const u = new URL(requestUrl);
  if (u.host !== 'kyntraze') return null;
  let rel; try { rel = decodeURIComponent(u.pathname); } catch { return null; }
  if (rel === '/' || rel === '') rel = '/index.html';
  const abs = path.normalize(path.join(DIST, rel));
  if (abs !== DIST && !abs.startsWith(DIST + path.sep)) return null;
  return abs;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

function registerAppProtocol() {
  protocol.handle('app', async request => {
    const abs = resolveInDist(request.url);
    let st; try { st = abs && fs.statSync(abs); } catch { st = null; }
    if (!abs || !st || !st.isFile()) return new Response('Not found', { status: 404 });
    const body = await fs.promises.readFile(abs);
    return new Response(body, { status: 200, headers: { 'Content-Type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream', 'Content-Length': String(body.length), 'Content-Security-Policy': cspNow(), 'X-Content-Type-Options': 'nosniff' } });
  });
}

const isLocal = url => (DEV_URL ? url.startsWith(new URL(DEV_URL).origin + '/') || url === new URL(DEV_URL).origin : url.startsWith(APP_ORIGIN + '/'));

let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 640, minHeight: 360, show: false, backgroundColor: '#0a111e', title: 'KYNTRAZE: FRACTURE RUSH',
    icon: path.join(__dirname, '..', 'build', 'icons', 'icon.ico'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, allowRunningInsecureContent: false, webviewTag: false, spellcheck: false, devTools: !app.isPackaged || process.env.KYNT_DEVTOOLS === '1', backgroundThrottling: false },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.on('will-navigate', (e, url) => { if (!isLocal(url)) e.preventDefault(); });
  win.webContents.on('will-redirect', (e, url) => { if (!isLocal(url)) e.preventDefault(); });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  win.on('closed', () => { win = null; });
  win.loadURL(DEV_URL || `${APP_ORIGIN}/index.html`);
}

function lockDownSession() {
  loadServer();
  ipcMain.handle('kyntraze:get-server', () => serverOrigin);
  ipcMain.handle('kyntraze:set-server', (e, url) => { const f = e.senderFrame && e.senderFrame.url || ''; if (!f.startsWith(APP_ORIGIN) && !(DEV_URL && f.startsWith(DEV_URL))) return { ok: false }; const v = url === '' ? '' : safeServer(url); if (url !== '' && !v) return { ok: false }; try { fs.writeFileSync(NET_FILE(), JSON.stringify({ url: v })); } catch { return { ok: false }; } serverOrigin = v; return { ok: true, url: v }; });
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  ses.setPermissionCheckHandler(() => false);
  ses.webRequest.onBeforeRequest((details, cb) => {   // nothing but the local game is ever fetched: no remote scripts, images, fonts or XHR
    const u = details.url;
    const ok = u.startsWith('app://') || u.startsWith('blob:') || u.startsWith('data:') || u.startsWith('devtools:') || (DEV_URL && u.startsWith(new URL(DEV_URL).origin)) || (DEV_URL && u.startsWith('ws://127.0.0.1:')) || (serverOrigin && (u.startsWith(serverOrigin + '/') || u === serverOrigin || u.startsWith(httpOf(serverOrigin) + '/')));
    cb({ cancel: !ok });
  });
}

if (!app.requestSingleInstanceLock() && !SMOKE) { app.quit(); }
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    registerAppProtocol(); lockDownSession(); createWindow();
    if (SMOKE) require('./smoke.cjs').run(win, app, DEV_URL ? 'dev' : 'packaged');
  });
  app.on('window-all-closed', () => app.quit());
  app.on('web-contents-created', (_e, contents) => { contents.on('will-attach-webview', e => e.preventDefault()); });
}

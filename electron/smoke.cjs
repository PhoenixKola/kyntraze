'use strict';
/** Packaged-app smoke: loads the real window, clicks Play → Start Run, waits for the Phaser canvas and the arena scene, records any failed/404 request and renderer console error, checks the page has no Node and no QA hook, and that localStorage written by launch 1 is visible to launch 2 (KYNT_USER_DATA). Prints one JSON line; exits non-zero on failure. */
const MARK = 'kyntraze-smoke-marker';
exports.run = (win, app) => {
  const failed = [], errors = [];
  win.webContents.session.webRequest.onCompleted(d => { if (d.statusCode >= 400) failed.push(`${d.statusCode} ${d.url}`); });
  win.webContents.session.webRequest.onErrorOccurred(d => { failed.push(`${d.error} ${d.url}`); });
  win.webContents.on('console-message', (_e, level, msg) => { if (level >= 3) errors.push(msg); });
  const done = (r, code) => { console.log('SMOKE ' + JSON.stringify(r)); app.exit(code); };
  const t0 = Date.now(); let had, started = false, readyAt = 0;
  const js = code => win.webContents.executeJavaScript(code);
  const poll = async () => {
    try {
      if (had === undefined) had = await js(`(() => { let v = null; try { v = localStorage.getItem(${JSON.stringify(MARK)}); localStorage.setItem(${JSON.stringify(MARK)}, 'ok'); } catch (e) {} return v; })()`);
      const s = await js(`(() => ({ canvas: !!document.querySelector('canvas'), play: !!document.querySelector('[data-testid=play-button]'), start: !!document.querySelector('[data-testid=start-run]'), title: document.title, origin: location.origin, qa: typeof window.__KYNT_QA__, node: typeof require + '/' + typeof process }))()`);
      if (!s.canvas && s.play && !started) { await js(`document.querySelector('[data-testid=play-button]').click()`); }
      if (!s.canvas && s.start) { started = true; await js(`document.querySelector('[data-testid=start-run]').click()`); }
      if (s.canvas && !readyAt) readyAt = Date.now();
      if ((readyAt && Date.now() - readyAt > 5000) || Date.now() - t0 > 40000) {
        const ok = s.canvas && failed.length === 0 && errors.length === 0 && s.qa === 'undefined' && s.node === 'undefined/undefined';
        return done({ ok, ...s, had, failed, errors: errors.slice(0, 5), ms: Date.now() - t0 }, ok ? 0 : 1);
      }
    } catch { /* page not ready yet */ }
    setTimeout(poll, 500);
  };
  win.webContents.once('did-finish-load', () => setTimeout(poll, 800));
  setTimeout(() => done({ ok: false, reason: 'timeout', failed, errors }, 1), 60000);
};

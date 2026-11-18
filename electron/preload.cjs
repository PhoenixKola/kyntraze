/** B22: the ONLY thing the renderer may ask of the main process: read / set the single allowed game-server address. The main process validates it (wss:// or loopback ws://); nothing else is exposed. */
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('kyntrazeNet', { getServer: () => ipcRenderer.invoke('kyntraze:get-server'), setServer: url => ipcRenderer.invoke('kyntraze:set-server', String(url ?? '')) });

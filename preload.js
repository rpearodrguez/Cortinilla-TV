const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cortinilla', {
  show: data => ipcRenderer.send('show', data),
  hide: () => ipcRenderer.send('hide'),
  showTicker: data => ipcRenderer.send('ticker', data),
  hideTicker: () => ipcRenderer.send('ticker-hide'),
  quit: () => ipcRenderer.send('quit'),
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  setDisplay: id => ipcRenderer.send('set-display', id),
  pickLogo: () => ipcRenderer.invoke('pick-logo'),
  onShow: cb => ipcRenderer.on('show', (_e, data) => cb(data)),
  onHide: cb => ipcRenderer.on('hide', () => cb()),
  onTicker: cb => ipcRenderer.on('ticker', (_e, data) => cb(data)),
  onTickerHide: cb => ipcRenderer.on('ticker-hide', () => cb())
});

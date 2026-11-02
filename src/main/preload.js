const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cortinilla', {
  // panel → gráficos
  show: data => ipcRenderer.send('show', data),
  hide: () => ipcRenderer.send('hide'),
  showTicker: data => ipcRenderer.send('ticker', data),
  hideTicker: () => ipcRenderer.send('ticker-hide'),
  showSignoff: data => ipcRenderer.send('signoff', data),
  hideSignoff: () => ipcRenderer.send('signoff-hide'),
  quit: () => ipcRenderer.send('quit'),
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  setDisplay: id => ipcRenderer.send('set-display', id),
  pickLogo: () => ipcRenderer.invoke('pick-logo'),

  // panel → ventana de captura
  sceneIsOpen: () => ipcRenderer.invoke('scene-is-open'),
  configSave: json => ipcRenderer.invoke('config-save', json),
  configLoad: () => ipcRenderer.invoke('config-load'),
  sceneOpen: () => ipcRenderer.send('scene-open'),
  sceneClose: () => ipcRenderer.send('scene-close'),
  sceneFullscreen: () => ipcRenderer.send('scene-fullscreen'),
  sceneGetSources: () => ipcRenderer.invoke('scene-sources'),
  sceneCapture: opts => ipcRenderer.send('scene-capture', opts),
  sceneStop: () => ipcRenderer.send('scene-stop'),
  onSceneState: cb => ipcRenderer.on('scene-state', (_e, open) => cb(open)),
  onSceneNow: cb => ipcRenderer.on('scene-now', (_e, info) => cb(info)),

  // overlay / captura: reciben los gráficos
  onShow: cb => ipcRenderer.on('show', (_e, data) => cb(data)),
  onHide: cb => ipcRenderer.on('hide', () => cb()),
  onTicker: cb => ipcRenderer.on('ticker', (_e, data) => cb(data)),
  onTickerHide: cb => ipcRenderer.on('ticker-hide', () => cb()),
  onSignoff: cb => ipcRenderer.on('signoff', (_e, data) => cb(data)),
  onSignoffHide: cb => ipcRenderer.on('signoff-hide', () => cb()),

  // captura: recibe qué capturar y avisa del estado
  onSceneCapture: cb => ipcRenderer.on('scene-capture', (_e, opts) => cb(opts)),
  onSceneStop: cb => ipcRenderer.on('scene-stop', () => cb()),
  onSceneAudio: cb => ipcRenderer.on('scene-audio', (_e, bytes) => cb(bytes)),
  sceneNow: info => ipcRenderer.send('scene-now', info)
});

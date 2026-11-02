// Mensajes entre el panel y las demás ventanas.
const { app, ipcMain, screen, dialog, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const win = require('./windows');
const { startAppAudio, stopAppAudio } = require('./app-audio');

function registerIpc() {
  // ---------- gráficos: del panel al overlay o a la ventana de captura ----------
  ipcMain.on('show', (_e, data) => win.sendFx('show', data));
  ipcMain.on('hide', () => win.sendFx('hide'));
  ipcMain.on('ticker', (_e, data) => win.sendFx('ticker', data));
  ipcMain.on('ticker-hide', () => win.sendFx('ticker-hide'));
  ipcMain.on('signoff', (_e, data) => win.sendFx('signoff', data));
  ipcMain.on('signoff-hide', () => win.sendFx('signoff-hide'));

  // ---------- pantalla del overlay ----------
  ipcMain.handle('get-displays', () => {
    const primary = screen.getPrimaryDisplay();
    const current = win.overlay && screen.getDisplayMatching(win.overlay.getBounds());
    return {
      current: current && current.id,
      displays: screen.getAllDisplays().map(d => ({
        id: d.id,
        size: `${d.bounds.width}x${d.bounds.height}`,
        primary: d.id === primary.id
      }))
    };
  });
  ipcMain.on('set-display', (_e, id) => {
    const d = screen.getAllDisplays().find(d => d.id === id);
    if (d) win.placeOverlay(d);
  });

  // ---------- logos ----------
  ipcMain.handle('pick-logo', async () => {
    const r = await dialog.showOpenDialog(win.panel, {
      title: 'Elegir logo',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }]
    });
    if (r.canceled) return [];
    return r.filePaths.map(file => {
      const ext = path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg').replace('svg', 'svg+xml');
      return {
        name: path.basename(file, path.extname(file)),
        data: `data:image/${ext};base64,${fs.readFileSync(file).toString('base64')}`
      };
    });
  });

  // ---------- captura (ventana compartible; internamente "scene") ----------
  // ventanas y pantallas que se pueden capturar (sin las de esta misma app)
  const OWN_TITLES = ['Cortinilla TV', 'Captura - Cortinilla TV', 'Overlay'];
  ipcMain.handle('scene-sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['window', 'screen'], thumbnailSize: { width: 320, height: 180 } });
    return sources
      .filter(s => s.name.trim() && !OWN_TITLES.includes(s.name))
      .map(s => ({ id: s.id, name: s.name, screen: s.id.startsWith('screen:'), thumb: s.thumbnail.toDataURL() }));
  });

  ipcMain.handle('scene-is-open', () => win.alive(win.scene));
  ipcMain.on('scene-open', () => win.createScene());
  ipcMain.on('scene-close', () => { if (win.alive(win.scene)) win.scene.close(); });
  ipcMain.on('scene-fullscreen', () => { if (win.alive(win.scene)) win.scene.setFullScreen(!win.scene.isFullScreen()); });

  ipcMain.on('scene-capture', async (_e, opts) => {
    stopAppAudio();
    const forward = chunk => { if (win.alive(win.scene)) win.scene.webContents.send('scene-audio', chunk); };
    const status = opts.audio ? await startAppAudio(opts.id, forward) : 'none';
    if (opts.audio && status !== 'ok') win.toPanel('scene-now', { kind: 'audio-error', title: status });
    win.withScene(w => w.webContents.send('scene-capture', { ...opts, audio: status === 'ok' }));
  });
  ipcMain.on('scene-stop', () => {
    stopAppAudio();
    if (win.alive(win.scene)) win.scene.webContents.send('scene-stop');
  });
  ipcMain.on('scene-now', (_e, info) => win.toPanel('scene-now', info));

  // ---------- configuración: guardar / cargar en un archivo .json ----------
  const CONFIG_FILTER = [{ name: 'Configuración de Cortinilla TV', extensions: ['json'] }];
  const MAX_CONFIG_BYTES = 60 * 1024 * 1024;

  ipcMain.handle('config-save', async (_e, json) => {
    const r = await dialog.showSaveDialog(win.panel, {
      title: 'Guardar configuración', defaultPath: 'cortinilla-config.json', filters: CONFIG_FILTER
    });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    try {
      fs.writeFileSync(r.filePath, String(json), 'utf8');
      return { ok: true, file: path.basename(r.filePath) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('config-load', async () => {
    const r = await dialog.showOpenDialog(win.panel, {
      title: 'Cargar configuración', properties: ['openFile'], filters: CONFIG_FILTER
    });
    if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
    try {
      const file = r.filePaths[0];
      if (fs.statSync(file).size > MAX_CONFIG_BYTES) return { ok: false, error: 'too-big' };
      return { ok: true, file: path.basename(file), json: fs.readFileSync(file, 'utf8') };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.on('quit', () => app.quit());
}

module.exports = { registerIpc };

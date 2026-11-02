const { app, BrowserWindow, screen, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let overlay, panel;

// la app no necesita caché de shaders en disco; evita errores de permisos en Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

// por defecto, la primera pantalla que no sea la principal (si existe)
function defaultDisplay() {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().find(d => d.id !== primary.id) || primary;
}

// Con monitores de distinta escala (DPI), Windows deforma el tamaño de la ventana
// al crearla o moverla; reaplicar los límites una vez colocada la corrige.
function placeOverlay(display) {
  if (!overlay) return;
  overlay.setBounds(display.bounds);
  setTimeout(() => overlay && overlay.setBounds(display.bounds), 150);
}

function createOverlay() {
  const display = defaultDisplay();
  const { x, y, width, height } = display.bounds;
  overlay = new BrowserWindow({
    x, y, width, height,
    transparent: true, frame: false, resizable: false, movable: false,
    focusable: false, skipTaskbar: true, hasShadow: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), autoplayPolicy: 'no-user-gesture-required' }
  });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setIgnoreMouseEvents(true);
  overlay.loadFile('overlay.html');
  overlay.webContents.once('did-finish-load', () => placeOverlay(display));
}

function createPanel() {
  const work = screen.getPrimaryDisplay().workAreaSize;
  panel = new BrowserWindow({
    width: Math.min(920, work.width), height: Math.min(560, work.height),
    minWidth: 820, minHeight: 520, resizable: true, title: 'Cortinilla TV',
    useContentSize: true, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  panel.loadFile('panel.html');
  panel.on('closed', () => app.quit());
}

// Una sola instancia: si ya hay una abierta (el overlay es invisible y no sale en la
// barra de tareas), la segunda no arranca y solo trae el panel al frente. Dos instancias
// compiten por la caché de Chromium y dan errores "Unable to move the cache".
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!panel) return;
    if (panel.isMinimized()) panel.restore();
    panel.focus();
  });
  app.whenReady().then(() => {
    createOverlay();
    createPanel();
  });
}

ipcMain.on('show', (_e, data) => overlay && overlay.webContents.send('show', data));
ipcMain.on('ticker', (_e, data) => overlay && overlay.webContents.send('ticker', data));
ipcMain.on('ticker-hide', () => overlay && overlay.webContents.send('ticker-hide'));
ipcMain.on('signoff', (_e, data) => overlay && overlay.webContents.send('signoff', data));
ipcMain.on('signoff-hide', () => overlay && overlay.webContents.send('signoff-hide'));
ipcMain.handle('get-displays', () => {
  const primary = screen.getPrimaryDisplay();
  const current = overlay && screen.getDisplayMatching(overlay.getBounds());
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
  if (d) placeOverlay(d);
});

ipcMain.handle('pick-logo', async () => {
  const r = await dialog.showOpenDialog(panel, {
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

ipcMain.on('hide', () => overlay && overlay.webContents.send('hide'));
ipcMain.on('quit', () => app.quit());
app.on('window-all-closed', () => app.quit());

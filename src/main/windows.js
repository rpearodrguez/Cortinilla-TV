// Las tres ventanas de la app: overlay (sobre la pantalla), panel de control y ventana de captura compartible.
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

const PRELOAD = path.join(__dirname, 'preload.js');
const page = (...parts) => path.join(__dirname, '..', ...parts); // relativo a src/

let overlay = null, panel = null, scene = null;
const sceneClosedListeners = [];

let quitting = false;
app.on('before-quit', () => { quitting = true; });

const alive = w => !!w && !w.isDestroyed();
const toPanel = (channel, data) => { if (alive(panel)) panel.webContents.send(channel, data); };

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
    webPreferences: { preload: PRELOAD, autoplayPolicy: 'no-user-gesture-required' }
  });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setIgnoreMouseEvents(true);
  overlay.loadFile(page('overlay', 'overlay.html'));
  overlay.webContents.once('did-finish-load', () => placeOverlay(display));
}

function createPanel() {
  const work = screen.getPrimaryDisplay().workAreaSize;
  panel = new BrowserWindow({
    width: Math.min(920, work.width), height: Math.min(560, work.height),
    minWidth: 820, minHeight: 520, resizable: true, title: 'Cortinilla TV',
    useContentSize: true, autoHideMenuBar: true,
    webPreferences: { preload: PRELOAD }
  });
  panel.loadFile(page('panel', 'panel.html'));
  panel.on('closed', () => app.quit());
}

// Captura (internamente "scene"): ventana compartible con el programa elegido + gráficos encima
function createScene() {
  if (alive(scene)) { scene.focus(); return scene; }
  scene = new BrowserWindow({
    width: 1280, height: 720, minWidth: 480, minHeight: 270,
    title: 'Captura - Cortinilla TV', backgroundColor: '#000000', autoHideMenuBar: true,
    webPreferences: { preload: PRELOAD, autoplayPolicy: 'no-user-gesture-required' }
  });
  scene.loadFile(page('capture', 'capture.html'));
  // mientras la captura está abierta los gráficos salen en ella, no sobre la pantalla
  if (alive(overlay)) overlay.hide();
  toPanel('scene-state', true);
  scene.on('closed', () => {
    scene = null;
    sceneClosedListeners.forEach(fn => fn());
    if (alive(overlay)) overlay.showInactive();
    if (!quitting) toPanel('scene-state', false); // al cerrar la app no se pierde el modo guardado
  });
  return scene;
}

// ejecuta fn cuando la ventana de captura ya cargó (la abre si hace falta)
function withScene(fn) {
  const existed = alive(scene);
  const w = createScene();
  if (existed) fn(w); else w.webContents.once('did-finish-load', () => fn(w));
}

// los gráficos van a la ventana de captura si está abierta; si no, al overlay sobre la pantalla
function sendFx(channel, data) {
  const w = alive(scene) ? scene : overlay;
  if (alive(w)) w.webContents.send(channel, data);
}

module.exports = {
  get overlay() { return overlay; },
  get panel() { return panel; },
  get scene() { return scene; },
  alive, toPanel, sendFx, withScene,
  defaultDisplay, placeOverlay,
  createOverlay, createPanel, createScene,
  onSceneClosed: fn => sceneClosedListeners.push(fn)
};

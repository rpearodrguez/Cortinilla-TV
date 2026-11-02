// Punto de entrada de Electron: ciclo de vida de la app. El resto vive en módulos:
//   windows.js    → overlay, panel y ventana de captura
//   app-audio.js  → captura de audio por programa (ayudante nativo)
//   ipc.js        → mensajes entre el panel y las demás ventanas
const { app } = require('electron');
const win = require('./windows');
const { stopAppAudio } = require('./app-audio');
const { registerIpc } = require('./ipc');

// la app no necesita caché de shaders en disco; evita errores de permisos en Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

// Una sola instancia: si ya hay una abierta (el overlay es invisible y no sale en la
// barra de tareas), la segunda no arranca y solo trae el panel al frente. Dos instancias
// compiten por la caché de Chromium y dan errores "Unable to move the cache".
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const panel = win.panel;
    if (!panel) return;
    if (panel.isMinimized()) panel.restore();
    panel.focus();
  });

  registerIpc();
  win.onSceneClosed(stopAppAudio);

  app.whenReady().then(() => {
    win.createOverlay();
    win.createPanel();
  });
}

app.on('before-quit', stopAppAudio);
app.on('window-all-closed', () => app.quit());

// Audio por programa: usa el ayudante nativo propio (native/ProcessLoopback.cs), que captura solo el
// audio de una ventana y sus procesos hijos con la API "process loopback" de Windows.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');

const NATIVE_DIR = path.join(__dirname, '..', '..', 'native');
const SRC = path.join(NATIVE_DIR, 'ProcessLoopback.cs');

let child = null; // proceso del ayudante mientras captura

function stopAppAudio() {
  if (!child) return;
  try { child.kill(); } catch (e) {}
  child = null;
}

// Compila el ayudante con el csc.exe que trae Windows y devuelve la ruta del .exe (o null).
// El nombre lleva un resumen del código: así, si el código cambia, no se intenta sobrescribir un
// ayudante que otra copia de la app tenga en uso, y los .exe viejos se borran cuando se puede.
function ensureHelper() {
  return new Promise(resolve => {
    let hash;
    try { hash = crypto.createHash('sha1').update(fs.readFileSync(SRC)).digest('hex').slice(0, 8); } catch (e) { return resolve(null); }
    const name = `ProcessLoopback-${hash}.exe`;
    const exe = path.join(NATIVE_DIR, name);
    if (fs.existsSync(exe)) return resolve(exe);
    const csc = path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
    execFile(csc, ['-nologo', '-platform:x64', '-target:exe', '-optimize', `-out:${name}`, 'ProcessLoopback.cs'],
      { cwd: NATIVE_DIR, windowsHide: true }, err => {
        if (err || !fs.existsSync(exe)) return resolve(null);
        for (const f of fs.readdirSync(NATIVE_DIR)) {
          if (/^ProcessLoopback.*\.exe$/.test(f) && f !== name) { try { fs.unlinkSync(path.join(NATIVE_DIR, f)); } catch (e) { /* en uso */ } }
        }
        resolve(exe);
      });
  });
}

// Empieza a capturar el audio de la ventana `sourceId` (id de desktopCapturer) y entrega
// el PCM (48 kHz, estéreo, 16 bits) a onChunk. Devuelve 'ok' o el motivo por el que no hay audio.
async function startAppAudio(sourceId, onChunk) {
  stopAppAudio();
  if (process.platform !== 'win32' || !/^window:\d+:/.test(sourceId)) return 'unavailable'; // las pantallas no tienen un proceso
  const EXE = await ensureHelper();
  if (!EXE) return 'nohelper';
  const pid = await new Promise(res => execFile(EXE, ['pid-of-hwnd', sourceId.split(':')[1]], { windowsHide: true },
    (err, out) => res(err ? null : String(out).trim())));
  if (!pid) return 'nopid';
  const proc = spawn(EXE, ['capture', pid], { windowsHide: true });
  child = proc;
  proc.stdout.on('data', chunk => { if (child === proc) onChunk(chunk); });
  proc.on('exit', () => { if (child === proc) child = null; });
  return 'ok';
}

module.exports = { startAppAudio, stopAppAudio };

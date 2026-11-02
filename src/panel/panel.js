const $ = id => document.getElementById(id);

// ---------- Idiomas ----------
let lang = 'es';
try { lang = localStorage.getItem('cortinilla-lang') || (navigator.language.startsWith('en') ? 'en' : 'es'); } catch (e) {}
if (!I18N[lang]) lang = 'es';
const t = () => I18N[lang];
const styleKey = () => $('style').value || 'bumper';
const st = () => t().styles[styleKey()];

// reconstruye un <select> conservando el valor elegido
function fillSelect(el, items) {
  const prev = el.value;
  el.innerHTML = items.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  if (items.some(([v]) => String(v) === prev)) el.value = prev;
}

let displaysCache = null;
function renderDisplays() {
  if (!displaysCache) return;
  fillSelect($('display'), displaysCache.displays.map((d, i) =>
    [d.id, `${t().screen} ${i + 1} (${d.size})${d.primary ? ' - ' + t().main : ''}`]));
  $('display').value = displaysCache.current;
}

// textos que dependen del estilo elegido
function refreshStyle() {
  const s = st();
  $('lblPrefix').textContent = s.prefix;
  $('lblName').textContent = s.name;
  $('show').placeholder = s.namePh;
  fillSelect($('prefix'), [...s.phrases.map((p, i) => [i, p]), ['-1', t().custom]]);
  $('prefixCustom').style.display = $('prefix').value === '-1' ? 'block' : 'none';
  $('rowSub').style.display = styleKey() === 'bumper' ? 'none' : '';
  $('rowSub').firstElementChild.textContent = s.subLabel || t().sub;
}

function applyLang() {
  document.documentElement.lang = lang;
  $('langEs').classList.toggle('active', lang === 'es');
  $('langEn').classList.toggle('active', lang === 'en');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = t()[el.dataset.i18n];
    if (typeof v === 'string') el.textContent = v;
  });
  fillSelect($('style'), Object.entries(t().styles).map(([k, s]) => [k, s.label]));
  fillSelect($('animIn'), t().animInList);
  fillSelect($('animOut'), t().animOutList);
  fillSelect($('tkPos'), [['bottom', t().tkBottom], ['top', t().tkTop]]);
  fillSelect($('tkLabelSel'), [...t().tkPhrases.map((p, i) => [i, p]), ['-1', t().custom]]);
  fillSelect($('tkIcon'), t().tkIconList);
  $('tkLabelCustom').placeholder = t().customPh;
  fillSelect($('soType'), t().soTypeList);
  fillSelect($('soSound'), t().soSoundList);
  fillSelect($('scAudio'), t().scAudioList);
  renderSinks();
  renderSceneState();
  $('soCaption').placeholder = $('soType').value === 'noise' ? t().soCaptionNoisePh : t().soCaptionDefault;
  $('tkLabelCustom').style.display = $('tkLabelSel').value === '-1' ? 'block' : 'none';
  document.querySelectorAll('.posbtn').forEach(b => { b.title = t().posNames[b.dataset.pos]; });
  $('prefixCustom').placeholder = t().customPh;
  $('tkText').placeholder = t().tkTextPh;
  refreshStyle();
  renderDisplays();
  updatePreview();
}

function setLang(l) {
  lang = l;
  try { localStorage.setItem('cortinilla-lang', lang); } catch (e) {}
  applyLang();
}
$('langEs').onclick = () => setLang('es');
$('langEn').onclick = () => setLang('en');

// ---------- Pestañas ----------
let tab = 'titles';
function setTab(name) {
  tab = name;
  document.querySelectorAll('.tabbtn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + name));
  try { localStorage.setItem('cortinilla-tab', name); } catch (e) {}
  updatePreview();
  if (name === 'scene') refreshSources();
}
document.querySelectorAll('.tabbtn').forEach(b => { b.onclick = () => setTab(b.dataset.tab); });

// ---------- Posición ----------
let pos = 'b';
function setPos(p) {
  pos = p;
  document.querySelectorAll('.posbtn').forEach(b => b.classList.toggle('active', b.dataset.pos === p));
  updatePreview();
}
document.querySelectorAll('.posbtn').forEach(b => { b.onclick = () => setPos(b.dataset.pos); });

$('style').onchange = () => {
  if ($('prefix').value !== '-1') $('prefix').value = '0'; // nuevo estilo → primera frase de su lista
  refreshStyle();
  if ($('prefix').value !== '-1') $('prefix').value = '0';
  updatePreview();
};
$('tkLabelSel').onchange = () => {
  $('tkLabelCustom').style.display = $('tkLabelSel').value === '-1' ? 'block' : 'none';
  if ($('tkLabelSel').value === '-1') $('tkLabelCustom').focus();
};
$('prefix').onchange = () => {
  $('prefixCustom').style.display = $('prefix').value === '-1' ? 'block' : 'none';
  if ($('prefix').value === '-1') $('prefixCustom').focus();
};

// ---------- Datos actuales ----------
function prefixText() {
  const v = $('prefix').value;
  const raw = v === '-1' ? $('prefixCustom').value.trim() : (st().phrases[Number(v)] || '');
  // en "Auspicio", {serie} / {show} se reemplaza por el campo de la serie
  return raw.replace(/\{(serie|show)\}/gi, $('sub').value.trim() || t().fallbackShow);
}
const colors = () => ({ bar: $('cBar').value, pre: $('cPre').value, title: $('cTitle').value, logo: $('cLogo').value });
const speed = () => parseFloat($('speed').value) || 0.7;

function currentData() {
  return {
    style: styleKey(), pos,
    prefix: prefixText(),
    name: $('show').value.trim(),
    sub: ['news', 'morning'].includes(styleKey()) ? $('sub').value.trim() : '',
    logo: $('logo').value || 'TV', logoImg,
    colors: colors(),
    animIn: $('animIn').value, animOut: $('animOut').value, speed: speed(),
    dur: parseFloat($('dur').value) || 0
  };
}
function tkLabelText() {
  const v = $('tkLabelSel').value;
  return v === '-1' ? $('tkLabelCustom').value.trim() : (t().tkPhrases[Number(v)] || '');
}
// ícono de la etiqueta: emoji, o el logo del canal (imagen si la hay, si no su texto)
function tkIconData() {
  const v = $('tkIcon').value;
  if (!v) return {};
  if (v === 'logo') return logoImg ? { img: logoImg } : { text: $('logo').value || 'TV' };
  return { text: v };
}
const currentSignoff = () => {
  const type = $('soType').value;
  const typed = $('soCaption').value.trim();
  return {
    type, logo: $('logo').value || 'TV', logoImg,
    // en las barras, si no escribes nada va el texto de fábrica; en la nieve el texto es opcional
    caption: type === 'noise' ? typed : (typed || t().soCaptionDefault),
    sound: $('soSound').value
  };
};
const currentTicker = () => ({ text: $('tkText').value.trim(), label: tkLabelText(), icon: tkIconData(), pos: $('tkPos').value, colors: colors() });

// ---------- Vista previa ----------
const stage = $('preview');
Lower.mount(stage);
let previewTimers = [];
const stopPreviewAnim = () => { previewTimers.forEach(clearTimeout); previewTimers = []; };

function previewData() {
  const d = currentData();
  return { ...d, name: d.name || t().previewShow };
}
function updatePreview() {
  stopPreviewAnim();
  Lower.fill(stage, previewData(), 'static');
  const tk = currentTicker();
  if (tk.text) Lower.fillTicker(stage, tk, 'static'); else Lower.clearTicker(stage);
  Lower.previewSignoff(stage, tab === 'signoff' ? currentSignoff() : null);
  $('speedVal').textContent = speed().toFixed(1) + ' s';
  persist();
}
// prueba: entrada → pausa → salida → vuelve al estado fijo
function playPreview() {
  stopPreviewAnim();
  Lower.show(stage, previewData());
  const s = speed();
  previewTimers.push(setTimeout(() => Lower.hide(stage), (s + 1.6) * 1000));
  previewTimers.push(setTimeout(updatePreview, (s + 1.6 + s * 0.85 + 0.4) * 1000));
}
stage.onclick = playPreview;
$('playAnim').onclick = playPreview;
document.addEventListener('input', updatePreview);
document.addEventListener('change', updatePreview);

// ---------- Preferencias ----------
function persist() {
  try {
    localStorage.setItem('cortinilla', JSON.stringify({
      style: $('style').value, pos, prefix: $('prefix').value, prefixCustom: $('prefixCustom').value,
      logo: $('logo').value, dur: $('dur').value, tkLabelSel: $('tkLabelSel').value, tkLabelCustom: $('tkLabelCustom').value, tkIcon: $('tkIcon').value, tkPos: $('tkPos').value,
      animIn: $('animIn').value, animOut: $('animOut').value, speed: $('speed').value,
      soCaption: $('soCaption').value, soType: $('soType').value, soSound: $('soSound').value,
      scAudio: $('scAudio').value, scSink: $('scSink').value, scDelay: $('scDelay').value
    }));
    localStorage.setItem('cortinilla-colors', JSON.stringify(colors()));
  } catch (e) {}
}

const COLORS = { cBar: '#1f5fd1', cPre: '#ffd84a', cTitle: '#ffffff', cLogo: '#f5a800' };
$('resetColors').onclick = () => { for (const k in COLORS) $(k).value = COLORS[k]; updatePreview(); };

// ---------- Logos (biblioteca guardada) ----------
const MAX_LOGOS = 30;
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let logos = [];      // [{ id, name, data }]
let logoId = '';     // logo elegido ('' = sin imagen, se usa el texto)
var logoImg = null;  // data URL del logo elegido

function saveLogos() {
  try {
    localStorage.setItem('cortinilla-logos', JSON.stringify(logos));
    localStorage.setItem('cortinilla-logo-id', logoId);
    $('logoMsg').textContent = '';
    return true;
  } catch (e) {
    $('logoMsg').textContent = t().logoFull;
    return false;
  }
}
try {
  logos = JSON.parse(localStorage.getItem('cortinilla-logos') || '[]');
  logoId = localStorage.getItem('cortinilla-logo-id') || '';
  // migración: versiones anteriores guardaban un solo logo
  const old = localStorage.getItem('cortinilla-logo');
  if (old) {
    let l = logos.find(x => x.data === old);
    if (!l) { l = { id: newId(), name: 'Logo', data: old }; logos.push(l); }
    logoId = l.id;
    localStorage.removeItem('cortinilla-logo');
    saveLogos();
  }
} catch (e) { logos = []; }

// imágenes grandes se reducen para no agotar el almacenamiento local
function shrink(data) {
  if (data.length < 500000) return Promise.resolve(data);
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 512 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve(data);
    img.src = data;
  });
}

function renderLogo() {
  const sel = logos.find(l => l.id === logoId);
  if (!sel) logoId = '';
  logoImg = sel ? sel.data : null;

  const gal = $('logoGallery');
  gal.textContent = '';
  const none = document.createElement('div');
  none.className = 'logo-item' + (logoImg ? '' : ' active');
  none.textContent = t().logoNone;
  none.onclick = () => selectLogo('');
  gal.appendChild(none);
  for (const l of logos) {
    const item = document.createElement('div');
    item.className = 'logo-item' + (l.id === logoId ? ' active' : '');
    item.title = l.name;
    const img = document.createElement('img');
    img.src = l.data; img.alt = l.name;
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '×'; del.title = t().logoDel;
    del.onclick = e => { e.stopPropagation(); deleteLogo(l.id); };
    item.onclick = () => selectLogo(l.id);
    item.append(img, del);
    gal.appendChild(item);
  }
  updatePreview();
}
function selectLogo(id) { logoId = id; saveLogos(); renderLogo(); }
function deleteLogo(id) {
  if (!confirm(t().logoDelConfirm)) return;
  logos = logos.filter(l => l.id !== id);
  if (logoId === id) logoId = '';
  saveLogos(); renderLogo();
}

$('pickLogo').onclick = async () => {
  const files = await cortinilla.pickLogo();
  for (const f of files || []) {
    const data = await shrink(f.data);
    let l = logos.find(x => x.data === data); // si ya está guardado, solo se elige
    if (!l) {
      if (logos.length >= MAX_LOGOS) { $('logoMsg').textContent = t().logoFull; break; }
      l = { id: newId(), name: f.name, data };
      logos.push(l);
    }
    logoId = l.id;
  }
  saveLogos(); renderLogo();
};

// ---------- Pantallas ----------
async function loadDisplays() {
  displaysCache = await cortinilla.getDisplays();
  renderDisplays();
}
$('display').onchange = () => cortinilla.setDisplay(Number($('display').value));
$('display').onmousedown = loadDisplays;

// ---------- Captura (un programa normal + gráficos encima; solo en modo captura) ----------
let sources = [], srcId = '', sceneOpen = false, sceneNow = null;

function renderSceneState() {
  renderMode();
  $('scState').textContent = sceneOpen ? t().scOpenState : '';
  const n = sceneNow;
  $('scNow').textContent = !n ? '' : n.kind === 'live' ? t().scLive : n.kind === 'ended' ? t().scEnded
    : n.kind === 'audio-error' ? (t().scAudioErr[n.title] || n.title)
    : `${t().scError}: ${n.title || ''}`;
}
function renderSources() {
  const box = $('scSources');
  box.textContent = '';
  for (const s of sources) {
    const item = document.createElement('div');
    item.className = 'src' + (s.id === srcId ? ' active' : '');
    item.title = s.name;
    const img = new Image();
    img.src = s.thumb; img.alt = '';
    const name = document.createElement('div');
    name.textContent = (s.screen ? '🖥 ' : '') + s.name;
    item.append(img, name);
    item.onclick = () => startCapture(s.id);
    box.appendChild(item);
  }
}
// dispositivos de salida de audio (sin los alias "default"/"communications")
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let pendingSink = ''; // dispositivo guardado, a la espera de que cargue la lista
async function renderSinks() {
  let devs = [];
  try {
    const outs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audiooutput');
    const def = outs.find(d => d.deviceId === 'default');
    // fuera los alias "default"/"communications" y el dispositivo físico que ya es el predeterminado
    devs = outs.filter(d => d.deviceId !== 'default' && d.deviceId !== 'communications' && (!def || d.groupId !== def.groupId));
  } catch (e) {}
  fillSelect($('scSink'), [['', t().scSinkDefault], ...devs.map(d => [d.deviceId, esc(d.label || d.deviceId)])]);
  if (pendingSink) {
    if ([...$('scSink').options].some(o => o.value === pendingSink)) $('scSink').value = pendingSink;
    pendingSink = '';
  }
  $('scNoSink').style.display = devs.length ? 'none' : 'block'; // sin otro dispositivo se oirá doble
}
const restartCapture = () => { if (srcId) startCapture(srcId); }; // aplica el cambio de audio a la captura en curso
$('scAudio').onchange = restartCapture;
$('scSink').onchange = restartCapture;
$('scDelay').onchange = restartCapture;
$('scDelay').oninput = () => { $('scDelayVal').textContent = $('scDelay').value + ' ms'; };
$('scDelayVal').textContent = '0 ms';

async function refreshSources() {
  renderSinks();
  try { sources = await cortinilla.sceneGetSources(); } catch (e) { sources = []; }
  renderSources();
}
function startCapture(id) {
  srcId = id;
  renderSources();
  cortinilla.sceneCapture({ id, audio: $('scAudio').value === 'app', sinkId: $('scSink').value, delayMs: Number($('scDelay').value) });
}
$('scRefresh').onclick = refreshSources;
$('scFull').onclick = () => cortinilla.sceneFullscreen();
function renderMode() {
  // lo de la pestaña Captura (programa, audio, retraso) solo existe en modo captura;
  // y la pantalla del overlay solo cuenta en modo pantalla completa
  document.querySelector('[data-tab="scene"]').style.display = sceneOpen ? '' : 'none';
  if (!sceneOpen && tab === 'scene') setTab('titles');
  $('display').disabled = sceneOpen;
  $('displayNote').style.display = sceneOpen ? 'block' : 'none';
  $('modeFull').classList.toggle('active', !sceneOpen);
  $('modeCapture').classList.toggle('active', sceneOpen);
  $('modeHint').textContent = sceneOpen ? t().modeHintCapture : t().modeHintFull;
}
$('modeFull').onclick = () => { if (sceneOpen) cortinilla.sceneClose(); };
$('modeCapture').onclick = () => { if (!sceneOpen) { cortinilla.sceneOpen(); setTab('scene'); } };
cortinilla.onSceneState(open => {
  sceneOpen = open;
  try { localStorage.setItem('cortinilla-mode', open ? 'capture' : 'fullscreen'); } catch (e) {}
  if (!open) { sceneNow = null; srcId = ''; renderSources(); }
  renderSceneState();
});
cortinilla.onSceneNow(info => { sceneNow = info; renderSceneState(); });

// ---------- Configuración: guardar / cargar / restablecer ----------
// Todo lo que el panel recuerda vive en estas claves del almacenamiento local.
const CFG_KEYS = ['cortinilla', 'cortinilla-colors', 'cortinilla-logos', 'cortinilla-logo-id',
  'cortinilla-lang', 'cortinilla-tab', 'cortinilla-mode'];
const cfgMsg = text => { $('cfgMsg').textContent = text; };

$('cfgSave').onclick = async () => {
  persist();
  try { localStorage.setItem('cortinilla-mode', sceneOpen ? 'capture' : 'fullscreen'); } catch (e) {}
  const settings = {};
  for (const k of CFG_KEYS) { const v = localStorage.getItem(k); if (v != null) settings[k] = v; }
  const r = await cortinilla.configSave(JSON.stringify({ app: 'cortinilla-tv', version: 1, savedAt: new Date().toISOString(), settings }, null, 1));
  if (r.canceled) return;
  cfgMsg(r.ok ? `${t().cfgSaved} ${r.file}` : `${t().cfgErr}: ${r.error || ''}`);
};

$('cfgLoad').onclick = async () => {
  const r = await cortinilla.configLoad();
  if (r.canceled) return;
  if (!r.ok) return cfgMsg(`${t().cfgErr}: ${r.error || ''}`);
  let data;
  try { data = JSON.parse(r.json); } catch (e) { return cfgMsg(t().cfgBad); }
  if (!data || data.app !== 'cortinilla-tv' || !data.settings || typeof data.settings !== 'object') return cfgMsg(t().cfgBad);
  // solo se aceptan las claves conocidas, y como texto que se pueda leer como JSON
  const incoming = {};
  for (const k of CFG_KEYS) {
    const v = data.settings[k];
    if (typeof v !== 'string') continue;
    if (k !== 'cortinilla-tab' && k !== 'cortinilla-lang' && k !== 'cortinilla-mode' && k !== 'cortinilla-logo-id') {
      try { JSON.parse(v); } catch (e) { return cfgMsg(t().cfgBad); }
    }
    incoming[k] = v;
  }
  try {
    for (const k of CFG_KEYS) localStorage.removeItem(k);
    for (const k in incoming) localStorage.setItem(k, incoming[k]);
  } catch (e) { return cfgMsg(`${t().cfgErr}: ${e.message}`); }
  sessionStorage.setItem('cortinilla-notice', `${t().cfgLoaded} ${r.file}`);
  location.reload(); // al arrancar, el panel lee las opciones y aplica también el modo
};

$('cfgReset').onclick = () => {
  if (!confirm(t().cfgConfirmReset)) return;
  try {
    for (const k of CFG_KEYS) if (k !== 'cortinilla-logos') localStorage.removeItem(k); // los logos son datos, no opciones
    sessionStorage.setItem('cortinilla-notice', t().cfgResetDone);
  } catch (e) {}
  if (sceneOpen) cortinilla.sceneClose(); // modo por defecto: pantalla completa
  location.reload();
};

// ---------- Mostrar / ocultar ----------
function show() {
  const d = currentData();
  if (!d.name) { setTab('titles'); $('show').focus(); return; }
  cortinilla.show(d);
}
function showTicker() {
  const tk = currentTicker();
  if (!tk.text) { setTab('ticker'); $('tkText').focus(); return; }
  cortinilla.showTicker(tk);
}
$('go').onclick = show;
$('stop').onclick = () => cortinilla.hide();
$('tkGo').onclick = showTicker;
$('tkStop').onclick = () => cortinilla.hideTicker();
$('soType').onchange = () => {
  $('soCaption').placeholder = $('soType').value === 'noise' ? t().soCaptionNoisePh : t().soCaptionDefault;
};
$('soGo').onclick = () => cortinilla.showSignoff(currentSignoff());
$('soStop').onclick = () => cortinilla.hideSignoff();
$('quit').onclick = () => cortinilla.quit();

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'BUTTON') return; // el botón enfocado ya reacciona a Enter
  if (e.key === 'Escape') cortinilla.hide();
  else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
    if (tab === 'ticker') showTicker(); else if (tab === 'signoff') cortinilla.showSignoff(currentSignoff()); else if (tab !== 'scene') show();
  } else if (e.key === 'Enter' && e.ctrlKey) showTicker();
});

// ---------- Arranque ----------
// Se lee lo guardado antes de applyLang(): este llama a updatePreview() → persist(), que escribiría
// los valores de fábrica encima de lo que se quiere restaurar.
const savedMain = localStorage.getItem('cortinilla');
const savedColors = localStorage.getItem('cortinilla-colors');
applyLang();
try {
  const s = JSON.parse(savedMain || '{}');
  if (s.style && t().styles[s.style]) { $('style').value = s.style; refreshStyle(); }
  if (s.prefix != null && [...$('prefix').options].some(o => o.value === String(s.prefix))) $('prefix').value = s.prefix;
  if (s.prefixCustom) $('prefixCustom').value = s.prefixCustom;
  $('prefixCustom').style.display = $('prefix').value === '-1' ? 'block' : 'none';
  if (s.logo) $('logo').value = s.logo;
  if (s.dur != null) $('dur').value = s.dur;
  if (s.tkLabelSel != null && [...$('tkLabelSel').options].some(o => o.value === String(s.tkLabelSel))) $('tkLabelSel').value = s.tkLabelSel;
  if (s.tkLabelCustom) $('tkLabelCustom').value = s.tkLabelCustom;
  $('tkLabelCustom').style.display = $('tkLabelSel').value === '-1' ? 'block' : 'none';
  if (s.tkIcon != null && [...$('tkIcon').options].some(o => o.value === s.tkIcon)) $('tkIcon').value = s.tkIcon;
  if (s.tkPos) $('tkPos').value = s.tkPos;
  if (s.animIn) $('animIn').value = s.animIn;
  if (s.animOut) $('animOut').value = s.animOut;
  if (s.speed) $('speed').value = s.speed;
  if (s.soCaption) $('soCaption').value = s.soCaption;
  if (s.soType && [...$('soType').options].some(o => o.value === s.soType)) $('soType').value = s.soType;
  if (s.soSound && [...$('soSound').options].some(o => o.value === s.soSound)) $('soSound').value = s.soSound;
  $('soCaption').placeholder = $('soType').value === 'noise' ? t().soCaptionNoisePh : t().soCaptionDefault;
  if (s.pos) pos = s.pos;
  if (s.scAudio && [...$('scAudio').options].some(o => o.value === s.scAudio)) $('scAudio').value = s.scAudio;
  if (s.scDelay != null) { $('scDelay').value = s.scDelay; $('scDelayVal').textContent = s.scDelay + ' ms'; }
  pendingSink = s.scSink || '';
  const c = JSON.parse(savedColors || '{}');
  for (const k in COLORS) $(k).value = c[k.replace(/^c/, '').toLowerCase()] || COLORS[k];
  tab = localStorage.getItem('cortinilla-tab') || 'titles';
} catch (e) {}
setTab(tab);
setPos(pos);
renderLogo();
loadDisplays();
$('show').focus();

// aviso tras cargar / restablecer (el panel se recarga)
try {
  const notice = sessionStorage.getItem('cortinilla-notice');
  if (notice) { sessionStorage.removeItem('cortinilla-notice'); cfgMsg(notice); }
} catch (e) {}

// modo guardado: la ventana de captura puede seguir abierta si solo se recargó el panel
(async () => {
  try {
    sceneOpen = await cortinilla.sceneIsOpen();
    renderSceneState();
    const mode = localStorage.getItem('cortinilla-mode');
    if (mode === 'capture' && !sceneOpen) cortinilla.sceneOpen();
    else if (mode === 'fullscreen' && sceneOpen) cortinilla.sceneClose();
  } catch (e) {}
})();

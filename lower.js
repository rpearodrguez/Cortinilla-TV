// Lógica compartida de los gráficos (overlay y vista previa del panel).
(function () {
  const TICKER_H = '6.5cqh'; // alto del cintillo; los gráficos del mismo lado se apilan encima

  // posición → clases CSS
  const POS = {
    tl: 'top left', t: 'top wide', tr: 'top right',
    bl: 'bottom left', b: 'bottom wide', br: 'bottom right'
  };

  const HTML = `
    <div class="lower">
      <div class="lt-logo"><span class="lt-logo-text">TV</span><img class="lt-logo-img" alt=""></div>
      <div class="lt-bar">
        <div class="lt-pre"></div>
        <div class="lt-title"></div>
        <div class="lt-sub"></div>
      </div>
    </div>
    <div class="ticker bottom">
      <div class="tk-label"></div>
      <div class="tk-track"><div class="tk-text"></div></div>
    </div>`;

  // mezcla dos colores hex (t = 0..1)
  function mix(a, b, t) {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [p(a), p(b)];
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  // aplica los colores como variables CSS sobre el elemento (cada gráfico lleva los suyos)
  function applyColors(el, c) {
    if (!c) return;
    const s = el.style;
    s.setProperty('--bar', c.bar);
    s.setProperty('--bar-hi', mix(c.bar, '#ffffff', .45));
    s.setProperty('--bar-mid', mix(c.bar, '#000000', .3));
    s.setProperty('--bar-lo', mix(c.bar, '#000000', .62));
    s.setProperty('--bar-border', mix(c.bar, '#ffffff', .8));
    s.setProperty('--pre', c.pre);
    s.setProperty('--title', c.title);
    s.setProperty('--logo', c.logo);
    s.setProperty('--logo-hi', mix(c.logo, '#ffffff', .55));
    s.setProperty('--logo-lo', mix(c.logo, '#000000', .45));
  }

  function mount(stage) {
    stage.classList.add('stage');
    stage.innerHTML = HTML;
  }

  const lowerOf = stage => stage.querySelector('.lower');
  const tickerOf = stage => stage.querySelector('.ticker');

  // ---------- cortinilla / generador de caracteres ----------
  // state: '' (a la espera de .in), 'static' (vista previa)
  function fill(stage, d, state) {
    const lower = lowerOf(stage);
    applyColors(lower, d.colors);
    const pos = POS[d.pos] ? d.pos : 'b';
    const right = pos === 'tr' || pos === 'br', left = pos === 'tl' || pos === 'bl';
    // "auto": entra y sale por el lado de la posición elegida
    const ai = !d.animIn || d.animIn === 'auto' ? (right ? 'right' : 'left') : d.animIn;
    const ao = !d.animOut || d.animOut === 'auto' ? (left ? 'left' : 'right') : d.animOut;
    const speed = d.speed > 0 ? d.speed : 0.7;
    lower.style.setProperty('--d-in', speed + 's');
    lower.style.setProperty('--d-out', (speed * 0.85) + 's');
    lower.className = `lower s-${d.style || 'bumper'} ${POS[pos]} ai-${ai} ao-${ao}${state ? ' ' + state : ''}`;
    lower.querySelector('.lt-pre').textContent = d.prefix || '';
    lower.querySelector('.lt-title').textContent = d.name || '';
    lower.querySelector('.lt-sub').textContent = d.sub || '';
    lower.querySelector('.lt-logo-text').textContent = d.logo || 'TV';
    const logo = lower.querySelector('.lt-logo');
    logo.classList.toggle('custom', !!d.logoImg);
    if (d.logoImg) lower.querySelector('.lt-logo-img').src = d.logoImg;
  }

  function show(stage, d) {
    fill(stage, d, '');
    const lower = lowerOf(stage);
    void lower.offsetWidth; // reinicia la animación
    lower.classList.add('in');
  }

  function hide(stage) {
    const lower = lowerOf(stage);
    if (lower.classList.contains('in')) {
      lower.classList.remove('in');
      lower.classList.add('out');
    }
  }

  // ---------- cintillo ----------
  function setStack(stage, pos, active) {
    stage.style.setProperty('--tk-b', pos === 'top' || !active ? '0cqh' : TICKER_H);
    stage.style.setProperty('--tk-t', pos === 'top' && active ? TICKER_H : '0cqh');
  }

  function fillTicker(stage, t, state) {
    const tk = tickerOf(stage);
    const pos = t.pos === 'top' ? 'top' : 'bottom';
    applyColors(tk, t.colors);
    tk.className = `ticker ${pos}${state ? ' ' + state : ''}`;
    tk.querySelector('.tk-label').textContent = t.label || '';

    // el desplazamiento depende del ancho del texto: se recalcula solo si algo cambió
    const txt = tk.querySelector('.tk-text');
    const track = tk.querySelector('.tk-track');
    const key = `${t.text}|${t.label}|${stage.clientWidth}`;
    if (txt._key !== key) {
      txt._key = key;
      txt.textContent = t.text || '';
      const from = track.clientWidth || stage.clientWidth;
      const to = -txt.offsetWidth;
      const speed = stage.clientWidth * 0.09; // px por segundo, proporcional al ancho de pantalla
      txt.style.setProperty('--from', from + 'px');
      txt.style.setProperty('--to', to + 'px');
      txt.style.animation = 'none';
      void txt.offsetWidth;
      txt.style.animation = `tkscroll ${Math.max(4, (from - to) / speed)}s linear infinite`;
    }
    setStack(stage, pos, true);
  }

  function showTicker(stage, t) {
    fillTicker(stage, t, '');
    const tk = tickerOf(stage);
    void tk.offsetWidth;
    tk.classList.add('in');
  }

  function hideTicker(stage) {
    const tk = tickerOf(stage);
    if (tk.classList.contains('in') || tk.classList.contains('static')) {
      tk.classList.remove('in', 'static');
      tk.classList.add('out');
    }
    setStack(stage, tk.classList.contains('top') ? 'top' : 'bottom', false);
  }

  // vista previa: oculta el cintillo sin animación
  function clearTicker(stage) {
    const tk = tickerOf(stage);
    tk.classList.remove('in', 'out', 'static');
    setStack(stage, 'bottom', false);
  }

  window.Lower = { mount, fill, show, hide, fillTicker, showTicker, hideTicker, clearTicker };
})();

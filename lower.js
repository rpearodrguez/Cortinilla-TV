// Lógica compartida de la cortinilla (overlay y vista previa del panel).
(function () {
  // mezcla dos colores hex (t = 0..1)
  function mix(a, b, t) {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [p(a), p(b)];
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  // aplica los colores como variables CSS sobre el elemento .stage
  function applyColors(stage, c) {
    if (!c) return;
    const s = stage.style;
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

  // rellena textos, logo y colores de la cortinilla dentro de .stage
  function fill(stage, d) {
    applyColors(stage, d.colors);
    stage.querySelector('.lt-pre').textContent = d.prefix;
    stage.querySelector('.lt-title').textContent = d.name;
    stage.querySelector('.lt-logo-text').textContent = d.logo;
    const logo = stage.querySelector('.lt-logo');
    logo.classList.toggle('custom', !!d.logoImg);
    if (d.logoImg) stage.querySelector('.lt-logo-img').src = d.logoImg;
  }

  window.Lower = { fill };
})();

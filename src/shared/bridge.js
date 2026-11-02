// Conecta los mensajes del panel (mostrar/ocultar cortinilla, cintillo, pantallas de cierre)
// con un .stage. Lo usan el overlay sobre la pantalla y la ventana de captura.
(function () {
  function attach(stage) {
    let timer = null;

    cortinilla.onShow(d => {
      clearTimeout(timer);
      Lower.show(stage, d);
      if (d.dur > 0) timer = setTimeout(hide, d.dur * 1000);
    });
    function hide() {
      clearTimeout(timer);
      Lower.hide(stage);
    }
    cortinilla.onHide(hide);

    cortinilla.onTicker(t => Lower.showTicker(stage, t));
    cortinilla.onTickerHide(() => Lower.hideTicker(stage));

    // pantallas de cierre: sonido opcional (tono de 1 kHz o siseo de estática)
    let sound = null;
    function stopSound() {
      if (!sound) return;
      try { sound.src.stop(); sound.ctx.close(); } catch (e) {}
      sound = null;
    }
    function startSound(kind) {
      stopSound();
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      let src;
      if (kind === 'hiss') {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); // 2 s de ruido blanco en bucle
        const ch = buf.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
        src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        gain.gain.value = 0.06;
      } else {
        src = ctx.createOscillator();
        src.frequency.value = 1000;
        gain.gain.value = 0.04; // bajo: es solo ambientación
      }
      src.connect(gain).connect(ctx.destination);
      src.start();
      sound = { ctx, src };
    }
    cortinilla.onSignoff(d => {
      Lower.showSignoff(stage, d);
      if (d.sound === 'tone' || d.sound === 'hiss') startSound(d.sound); else stopSound();
    });
    cortinilla.onSignoffHide(() => {
      Lower.hideSignoff(stage);
      stopSound();
    });
  }

  window.Bridge = { attach };
})();

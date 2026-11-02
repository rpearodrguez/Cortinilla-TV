// AudioWorklet de la ventana de captura: reproduce el PCM (48 kHz, estéreo, 16 bits) que llega del ayudante
// de captura por programa. Mantiene un pequeño colchón (target) para absorber los saltos de red
// interna, y si se acumula demasiado retraso lo recorta para no ir quedándose atrás.
class PcmPlayer extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];        // trozos Int16Array entrelazados L,R
    this.cur = null;        // trozo en curso
    this.pos = 0;           // posición dentro del trozo (en muestras)
    this.buffered = 0;      // fotogramas pendientes
    this.target = 2880;     // colchón objetivo en fotogramas (60 ms a 48 kHz)
    this.started = false;
    this.port.onmessage = e => {
      const m = e.data;
      if (m.type === 'pcm') {
        this.queue.push(m.data);
        this.buffered += m.data.length >> 1;
        // demasiado acumulado (+250 ms sobre el objetivo): se descartan los trozos más viejos
        const max = this.target + 12000;
        while (this.buffered > max && this.queue.length > 1) this.buffered -= this.queue.shift().length >> 1;
      } else if (m.type === 'target') {
        this.target = Math.max(960, m.frames | 0);
      }
    };
  }

  process(inputs, outputs) {
    const L = outputs[0][0], R = outputs[0][1] || outputs[0][0];
    const n = L.length;
    if (!this.started) {
      if (this.buffered < this.target) { L.fill(0); R.fill(0); return true; }
      this.started = true;
    }
    for (let i = 0; i < n; i++) {
      if (!this.cur || this.pos >= this.cur.length) {
        this.cur = this.queue.shift();
        this.pos = 0;
        if (!this.cur) { // se acabó el audio: silencio hasta volver a llenar el colchón
          this.started = false;
          for (let j = i; j < n; j++) { L[j] = 0; R[j] = 0; }
          return true;
        }
      }
      L[i] = this.cur[this.pos] / 32768;
      R[i] = this.cur[this.pos + 1] / 32768;
      this.pos += 2;
      this.buffered--;
    }
    return true;
  }
}
registerProcessor('pcm-player', PcmPlayer);

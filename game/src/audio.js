// audio.js — every sound is synthesized with WebAudio. No audio files.
// Engine hum follows speed, the siren follows the nearest patrol car,
// gunfire is a noise burst, and a little bassline loop plays underneath.
export function createAudio() {
  const A = {
    ctx: null, master: null, muted: false, musicOn: true,
    engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null,
    musicTimer: null, musicStep: 0,
    init() {
      if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        A.ctx = new Ctx();
        A.master = A.ctx.createGain();
        A.master.gain.value = 0.5;
        A.master.connect(A.ctx.destination);
        // Engine: a quiet sawtooth whose pitch follows speed.
        A.engineOsc = A.ctx.createOscillator();
        A.engineOsc.type = 'sawtooth';
        A.engineOsc.frequency.value = 55;
        A.engineGain = A.ctx.createGain();
        A.engineGain.gain.value = 0;
        const engFilter = A.ctx.createBiquadFilter();
        engFilter.type = 'lowpass'; engFilter.frequency.value = 420;
        A.engineOsc.connect(engFilter);
        engFilter.connect(A.engineGain);
        A.engineGain.connect(A.master);
        A.engineOsc.start();
        // Siren: two-tone triangle, pitch wobbles on a timer in update().
        A.sirenOsc = A.ctx.createOscillator();
        A.sirenOsc.type = 'triangle';
        A.sirenOsc.frequency.value = 700;
        A.sirenGain = A.ctx.createGain();
        A.sirenGain.gain.value = 0;
        A.sirenOsc.connect(A.sirenGain);
        A.sirenGain.connect(A.master);
        A.sirenOsc.start();
        A.startMusic();
      } catch (e) { A.ctx = null; }
    },
    setMuted(m) {
      A.muted = m;
      if (A.master) A.master.gain.value = m ? 0 : 0.5;
    },
    engine(speedFrac) {
      if (!A.ctx || !A.engineGain) return;
      A.engineOsc.frequency.value = 52 + speedFrac * 130;
      A.engineGain.gain.value = speedFrac > 0.02 ? 0.028 + speedFrac * 0.035 : 0;
    },
    siren(dist) {
      if (!A.ctx || !A.sirenGain) return;
      if (dist === null || dist > 900) { A.sirenGain.gain.value = 0; return; }
      const vol = 0.05 * (1 - dist / 900);
      A.sirenGain.gain.value = vol;
      const t = A.ctx.currentTime;
      A.sirenOsc.frequency.setValueAtTime(t % 0.7 < 0.35 ? 660 : 880, t);
    },
    blip(freq, dur, type, vol) {
      if (!A.ctx) return;
      const t = A.ctx.currentTime;
      const o = A.ctx.createOscillator();
      o.type = type || 'sine';
      o.frequency.value = freq;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.12));
      o.connect(g); g.connect(A.master);
      o.start(t); o.stop(t + (dur || 0.12) + 0.02);
    },
    shot() {
      if (!A.ctx) return;
      const t = A.ctx.currentTime;
      const len = Math.floor(A.ctx.sampleRate * 0.09);
      const buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = A.ctx.createBufferSource();
      src.buffer = buf;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      const f = A.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 2400;
      src.connect(f); f.connect(g); g.connect(A.master);
      src.start(t);
    },
    punch() { A.blip(120, 0.08, 'square', 0.1); },
    pickup() { A.blip(880, 0.1, 'sine', 0.12); setTimeout(() => A.blip(1320, 0.14, 'sine', 0.1), 70); },
    pass() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => setTimeout(() => A.blip(f, 0.22, 'triangle', 0.14), i * 110));
    },
    fail() {
      const notes = [392, 330, 262];
      notes.forEach((f, i) => setTimeout(() => A.blip(f, 0.25, 'sawtooth', 0.08), i * 140));
    },
    busted() { A.blip(220, 0.5, 'sawtooth', 0.1); },
    startMusic() {
      if (!A.ctx || A.musicTimer) return;
      // A minor-key bassline with a hat tick, one step every 170ms.
      const bass = [110, 0, 110, 0, 130.8, 0, 98, 0, 110, 0, 110, 0, 164.8, 0, 146.8, 0];
      A.musicTimer = setInterval(() => {
        if (!A.ctx || A.muted || !A.musicOn) return;
        const step = A.musicStep % 16;
        const f = bass[step];
        if (f) A.blip(f, 0.16, 'triangle', 0.05);
        if (step % 2 === 0) A.blip(6000, 0.02, 'square', 0.012);
        A.musicStep++;
      }, 170);
    },
    stopMusic() { if (A.musicTimer) { clearInterval(A.musicTimer); A.musicTimer = null; } },
  };
  return A;
}

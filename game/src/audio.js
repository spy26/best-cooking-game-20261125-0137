// Tiny synth sound effects: every sound is generated with WebAudio, no audio files.
// Silent until the first user gesture (browsers block audio before that) and
// completely inert in screenshot mode, where no gesture ever happens.
export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (ctx || muted) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { muted = true; return null; }
      ctx = new AC();
    } catch {
      muted = true;
      return null;
    }
    return ctx;
  }

  function tone(freq, dur, type, gain, when = 0) {
    const c = ensure();
    if (!c) return;
    try {
      const t0 = c.currentTime + when;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch { /* audio is decoration; a failure never breaks the game */ }
  }

  function noise(dur, gain, filterFreq) {
    const c = ensure();
    if (!c) return;
    try {
      const t0 = c.currentTime;
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const g = c.createGain();
      g.gain.value = gain;
      src.connect(filter).connect(g).connect(c.destination);
      src.start(t0);
    } catch { /* decoration only */ }
  }

  return {
    /** Call from any real input so later sounds are allowed to play. */
    unlock() { ensure(); },
    chop() { noise(0.09, 0.5, 900); tone(180, 0.08, 'square', 0.12); },
    pickup() { tone(520, 0.07, 'sine', 0.15); },
    place() { tone(300, 0.08, 'triangle', 0.18); tone(420, 0.06, 'triangle', 0.12, 0.05); },
    sizzle() { noise(0.25, 0.12, 3200); },
    ding() { tone(880, 0.16, 'sine', 0.2); tone(1318, 0.22, 'sine', 0.16, 0.09); },
    serve() { tone(660, 0.1, 'sine', 0.2); tone(880, 0.1, 'sine', 0.2, 0.08); tone(1320, 0.18, 'sine', 0.18, 0.16); },
    bad() { tone(220, 0.18, 'sawtooth', 0.14); tone(165, 0.24, 'sawtooth', 0.12, 0.1); },
    tick() { tone(1200, 0.04, 'square', 0.07); },
    rush() { tone(392, 0.12, 'square', 0.14); tone(523, 0.12, 'square', 0.14, 0.11); tone(659, 0.2, 'square', 0.14, 0.22); },
  };
}

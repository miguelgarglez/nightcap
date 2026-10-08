// tiny procedural voices for the ghost. everything is synthesized; no assets.
// muted by default — the caller flips `enabled` and calls ensure() on a gesture.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let humOsc: OscillatorNode | null = null;
let humGain: GainNode | null = null;
export const audio = { enabled: false };

function ensure(): AudioContext | null {
  if (!audio.enabled) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function noiseBuffer(c: AudioContext, dur: number): AudioBuffer {
  const b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

// a breath swelling in — the ghost condensing
export function sfxMaterialize() {
  const c = ensure(); if (!c || !master) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.7);
  const f = c.createBiquadFilter();
  f.type = "bandpass"; f.frequency.setValueAtTime(900, c.currentTime);
  f.frequency.exponentialRampToValueAtTime(320, c.currentTime + 0.55);
  f.Q.value = 1.2;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.22, c.currentTime + 0.16);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.7);
  src.connect(f).connect(g).connect(master);
  src.start();
}

// a soft porcelain tap — a drink landing on the counter
export function sfxDrop() {
  const c = ensure(); if (!c || !master) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = "sine"; o.frequency.setValueAtTime(340, t);
  o.frequency.exponentialRampToValueAtTime(160, t + 0.09);
  const g = c.createGain();
  g.gain.setValueAtTime(0.28, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.13);
  const n = c.createBufferSource(); n.buffer = noiseBuffer(c, 0.04);
  const nf = c.createBiquadFilter(); nf.type = "highpass"; nf.frequency.value = 2400;
  const ng = c.createGain(); ng.gain.setValueAtTime(0.12, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  n.connect(nf).connect(ng).connect(master); n.start(t);
}

// a relieved sigh — the ghost dissolving
export function sfxDissolve() {
  const c = ensure(); if (!c || !master) return;
  const t = c.currentTime;
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 0.9);
  const f = c.createBiquadFilter();
  f.type = "bandpass"; f.frequency.setValueAtTime(320, t);
  f.frequency.exponentialRampToValueAtTime(1100, t + 0.75);
  f.Q.value = 1.6;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
  src.connect(f).connect(g).connect(master); src.start();
}

// a low room-tone that thickens with the haunting — call on score change
export function setHum(level: number) {
  const c = ensure(); if (!c || !master) return;
  if (!humOsc) {
    humOsc = c.createOscillator();
    humOsc.type = "sine"; humOsc.frequency.value = 55;
    const hum2 = c.createOscillator();
    hum2.type = "sine"; hum2.frequency.value = 110.4;
    humGain = c.createGain(); humGain.gain.value = 0;
    const g2 = c.createGain(); g2.gain.value = 0.35;
    humOsc.connect(humGain); hum2.connect(g2).connect(humGain);
    humGain.connect(master);
    humOsc.start(); hum2.start();
  }
  humGain!.gain.setTargetAtTime(Math.min(0.06, level * 0.0006), c.currentTime, 0.4);
}

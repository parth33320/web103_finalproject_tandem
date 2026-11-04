// Synthesized sound effects (Web Audio API) — no downloaded files needed.
let ctx = null;
let muted = false;

function audio() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Turn every sound effect on or off. */
export function setSfxMuted(m) { muted = !!m; }

function tone(freq, start, dur, { type = "sine", gain = 0.2, to } = {}) {
  const a = audio();
  if (!a || muted) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** Card swoosh: a short burst of filtered noise sweeping down. */
export function playSwoosh() {
  const a = audio();
  if (!a || muted) return;
  const len = Math.floor(a.sampleRate * 0.35);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(3000, a.currentTime);
  f.frequency.exponentialRampToValueAtTime(400, a.currentTime + 0.35);
  const g = a.createGain();
  g.gain.value = 0.35;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

/** Clock tick. */
export function playTick() { tone(1500, 0, 0.05, { type: "square", gain: 0.08 }); }

/** Correct: bright rising chime. */
export function playCorrect() {
  tone(880, 0, 0.25, { gain: 0.18 });
  tone(1320, 0.1, 0.35, { gain: 0.15 });
  tone(1760, 0.2, 0.5, { gain: 0.1 });
}

/** Wrong: low buzzer. */
export function playWrong() {
  tone(180, 0, 0.45, { type: "sawtooth", gain: 0.12, to: 110 });
}

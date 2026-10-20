/**
 * Tiny synthesized sound set — no audio files, so the offline build stays
 * self-contained. Every cue is a short envelope over one or two oscillators
 * or a filtered noise burst.
 */

export type Cue =
  | 'card'
  | 'hit'
  | 'block'
  | 'heal'
  | 'gain'
  | 'turn'
  | 'down'
  | 'phase'
  | 'select';

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  a: AudioContext,
  freq: number,
  start: number,
  length: number,
  type: OscillatorType,
  gain: number,
  slideTo?: number,
) {
  const osc = a.createOscillator();
  const env = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo)
    osc.frequency.exponentialRampToValueAtTime(slideTo, start + length);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(env).connect(a.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

function noise(
  a: AudioContext,
  start: number,
  length: number,
  gain: number,
  cutoff: number,
) {
  const buffer = a.createBuffer(
    1,
    Math.ceil(a.sampleRate * length),
    a.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  const src = a.createBufferSource();
  const filter = a.createBiquadFilter();
  const env = a.createGain();
  src.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  env.gain.value = gain;
  src.connect(filter).connect(env).connect(a.destination);
  src.start(start);
}

export function play(cue: Cue) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  switch (cue) {
    case 'select':
      tone(a, 880, t, 0.06, 'triangle', 0.03);
      break;
    case 'card':
      noise(a, t, 0.09, 0.12, 2400);
      tone(a, 520, t, 0.08, 'triangle', 0.025, 340);
      break;
    case 'hit':
      noise(a, t, 0.22, 0.32, 900);
      tone(a, 120, t, 0.22, 'sawtooth', 0.06, 55);
      break;
    case 'block':
      tone(a, 660, t, 0.18, 'square', 0.025, 990);
      noise(a, t, 0.05, 0.08, 5000);
      break;
    case 'heal':
      tone(a, 523, t, 0.18, 'sine', 0.05);
      tone(a, 784, t + 0.08, 0.24, 'sine', 0.04);
      break;
    case 'gain':
      tone(a, 988, t, 0.12, 'triangle', 0.035);
      tone(a, 1319, t + 0.06, 0.2, 'triangle', 0.03);
      break;
    case 'turn':
      tone(a, 392, t, 0.35, 'sine', 0.05);
      tone(a, 587, t + 0.12, 0.45, 'sine', 0.04);
      break;
    case 'down':
      tone(a, 220, t, 0.7, 'sawtooth', 0.05, 70);
      noise(a, t, 0.4, 0.2, 500);
      break;
    case 'phase':
      tone(a, 147, t, 1.4, 'sine', 0.08);
      tone(a, 220, t + 0.1, 1.3, 'sine', 0.05);
      tone(a, 294, t + 0.25, 1.2, 'sine', 0.035);
      break;
  }
}

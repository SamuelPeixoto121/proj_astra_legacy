// Efeitos sonoros gerados por código (Web Audio API), sem arquivos de áudio.
// Cada som é uma combinação de "tons" (osciladores) e "chiados" (ruído
// filtrado), com volume subindo e descendo rapidamente.

export type SfxName =
  | "swing" // golpe de espada
  | "hit" // golpe acertou
  | "enemyDeath" // inimigo ou chefe derrotado
  | "hurt" // herói recebeu dano
  | "roll" // rolamento
  | "shrine" // Pedra Astral ativada / barreira desfeita
  | "tick" // diálogo
  | "bossAppear" // chefe apareceu/despertou
  | "warning" // aviso de ataque (investida, golpe no chão)
  | "slam" // impacto pesado
  | "fragment" // Fragmento Astral
  | "victory"
  | "defeat";

interface ToneOptions {
  freq: number;
  /** Frequência final (desliza até ela). */
  to?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  /** Atraso (s) para começar. */
  delay?: number;
}

interface NoiseOptions {
  duration: number;
  gain: number;
  filter: BiquadFilterType;
  freq: number;
  /** Frequência final do filtro (desliza até ela). */
  to?: number;
  q?: number;
  delay?: number;
}

function tone(ctx: AudioContext, out: AudioNode, options: ToneOptions): void {
  const {
    freq,
    to,
    duration,
    type = "sine",
    gain = 0.2,
    attack = 0.005,
    delay = 0,
  } = options;
  const start = ctx.currentTime + delay;

  const osc = ctx.createOscillator();
  const volume = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  if (to) {
    osc.frequency.exponentialRampToValueAtTime(to, start + duration);
  }

  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(gain, start + attack);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(volume).connect(out);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function noise(
  ctx: AudioContext,
  out: AudioNode,
  buffer: AudioBuffer,
  options: NoiseOptions,
): void {
  const { duration, gain, filter, freq, to, q = 1, delay = 0 } = options;
  const start = ctx.currentTime + delay;

  const source = ctx.createBufferSource();
  const biquad = ctx.createBiquadFilter();
  const volume = ctx.createGain();

  source.buffer = buffer;
  biquad.type = filter;
  biquad.Q.value = q;
  biquad.frequency.setValueAtTime(freq, start);

  if (to) {
    biquad.frequency.exponentialRampToValueAtTime(to, start + duration);
  }

  volume.gain.setValueAtTime(gain, start);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(biquad).connect(volume).connect(out);
  source.start(start);
  source.stop(start + duration + 0.05);
}

/** Sequência de notas de sino (arpejo). */
function chime(
  ctx: AudioContext,
  out: AudioNode,
  freqs: number[],
  spacing: number,
  options: { gain: number; duration: number; delay?: number },
): void {
  freqs.forEach((freq, index) => {
    const delay = (options.delay ?? 0) + index * spacing;

    tone(ctx, out, { freq, duration: options.duration, gain: options.gain, delay });
    tone(ctx, out, {
      freq: freq * 2,
      duration: options.duration * 0.6,
      gain: options.gain * 0.3,
      delay,
    });
  });
}

/** Toca um efeito sonoro. */
export function playSfx(
  ctx: AudioContext,
  out: AudioNode,
  noiseBuffer: AudioBuffer,
  name: SfxName,
): void {
  switch (name) {
    case "swing":
      noise(ctx, out, noiseBuffer, {
        duration: 0.13,
        gain: 0.22,
        filter: "bandpass",
        freq: 1600,
        to: 4200,
        q: 1.5,
      });
      return;

    case "hit":
      tone(ctx, out, { freq: 170, to: 70, duration: 0.12, type: "square", gain: 0.14 });
      noise(ctx, out, noiseBuffer, {
        duration: 0.06,
        gain: 0.18,
        filter: "highpass",
        freq: 2200,
      });
      return;

    case "enemyDeath":
      tone(ctx, out, { freq: 320, to: 55, duration: 0.45, type: "sawtooth", gain: 0.1 });
      noise(ctx, out, noiseBuffer, {
        duration: 0.4,
        gain: 0.16,
        filter: "lowpass",
        freq: 1200,
        to: 200,
      });
      return;

    case "hurt":
      tone(ctx, out, { freq: 240, to: 110, duration: 0.22, type: "square", gain: 0.13 });
      return;

    case "roll":
      noise(ctx, out, noiseBuffer, {
        duration: 0.26,
        gain: 0.16,
        filter: "bandpass",
        freq: 450,
        to: 1500,
        q: 0.8,
      });
      return;

    case "shrine":
      chime(ctx, out, [660, 880, 1320], 0.09, { gain: 0.1, duration: 0.7 });
      return;

    case "tick":
      tone(ctx, out, { freq: 1250, duration: 0.05, gain: 0.04 });
      return;

    case "bossAppear":
      tone(ctx, out, {
        freq: 70,
        to: 42,
        duration: 1.4,
        type: "sawtooth",
        gain: 0.14,
        attack: 0.2,
      });
      noise(ctx, out, noiseBuffer, {
        duration: 1.2,
        gain: 0.12,
        filter: "lowpass",
        freq: 300,
        to: 80,
      });
      return;

    case "warning":
      tone(ctx, out, {
        freq: 420,
        to: 900,
        duration: 0.42,
        type: "triangle",
        gain: 0.08,
        attack: 0.05,
      });
      return;

    case "slam":
      tone(ctx, out, { freq: 95, to: 32, duration: 0.55, gain: 0.38 });
      noise(ctx, out, noiseBuffer, {
        duration: 0.45,
        gain: 0.26,
        filter: "lowpass",
        freq: 500,
        to: 90,
      });
      return;

    case "fragment":
      chime(ctx, out, [880, 1109, 1319, 1760], 0.08, { gain: 0.1, duration: 1 });
      return;

    case "victory":
      chime(ctx, out, [523, 659, 784, 1047, 1319], 0.16, {
        gain: 0.11,
        duration: 1.6,
        delay: 0.45,
      });
      return;

    case "defeat":
      [330, 294, 262, 196].forEach((freq, index) => {
        tone(ctx, out, {
          freq,
          duration: 0.6,
          type: "triangle",
          gain: 0.1,
          delay: index * 0.28,
        });
      });
      return;
  }
}

// Efeitos sonoros gerados por código (Web Audio API), sem arquivos de áudio.
// Cada som é uma combinação de "tons" (osciladores) e "chiados" (ruído
// filtrado), com volume subindo e descendo rapidamente.

export type SfxName =
  | "swing" // golpe de espada
  | "punch" // soco (herói sem arma)
  | "hit" // golpe acertou
  | "enemyDeath" // inimigo ou chefe derrotado
  | "hurt" // herói recebeu dano
  | "roll" // rolamento
  | "shrine" // Pedra Astral ativada / barreira desfeita
  | "tick" // diálogo
  | "bossAppear" // chefe apareceu/despertou
  | "warning" // aviso de ataque (investida, golpe no chão)
  | "slam" // impacto pesado
  | "shoot" // projétil disparado
  | "deflect" // projétil rebatido pela espada
  | "teleport" // chefe some e reaparece
  | "potion" // beber poção
  | "pickup" // pegar item do chão
  | "block" // golpe bloqueado por escudo
  | "shatter" // gelo se partindo (espinhos, armadura do Colosso)
  | "fuse" // pavio aceso (Brasa Viva prestes a explodir)
  | "explosion" // explosão
  | "flame" // coluna de fogo subindo
  | "roar" // rugido distante de Ignis
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

    case "punch":
      // "Tum" abafado: um tom grave curto e um sopro rápido.
      tone(ctx, out, { freq: 140, to: 60, duration: 0.09, type: "sine", gain: 0.22 });
      noise(ctx, out, noiseBuffer, {
        duration: 0.08,
        gain: 0.14,
        filter: "lowpass",
        freq: 900,
        to: 300,
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

    case "shoot":
      tone(ctx, out, { freq: 520, to: 980, duration: 0.18, type: "sine", gain: 0.07 });
      noise(ctx, out, noiseBuffer, {
        duration: 0.15,
        gain: 0.06,
        filter: "bandpass",
        freq: 2400,
        to: 900,
        q: 2,
      });
      return;

    case "deflect":
      tone(ctx, out, { freq: 1400, to: 700, duration: 0.12, type: "triangle", gain: 0.1 });
      tone(ctx, out, { freq: 2100, duration: 0.08, gain: 0.05 });
      return;

    case "teleport":
      tone(ctx, out, { freq: 900, to: 180, duration: 0.3, type: "sine", gain: 0.08 });
      tone(ctx, out, { freq: 260, to: 1300, duration: 0.3, type: "triangle", gain: 0.05, delay: 0.12 });
      noise(ctx, out, noiseBuffer, {
        duration: 0.35,
        gain: 0.07,
        filter: "bandpass",
        freq: 3000,
        to: 600,
        q: 3,
      });
      return;

    case "potion":
      // Goles borbulhando e um brilho subindo no fim.
      [300, 360, 330].forEach((freq, index) => {
        tone(ctx, out, {
          freq,
          to: freq * 1.6,
          duration: 0.09,
          type: "sine",
          gain: 0.09,
          delay: index * 0.11,
        });
      });
      chime(ctx, out, [784, 1175], 0.07, { gain: 0.06, duration: 0.5, delay: 0.36 });
      return;

    case "pickup":
      chime(ctx, out, [988, 1319], 0.06, { gain: 0.08, duration: 0.35 });
      return;

    case "block":
      // Batida metálica: dois tons agudos e um chiado curto.
      tone(ctx, out, { freq: 1900, to: 1500, duration: 0.12, type: "square", gain: 0.06 });
      tone(ctx, out, { freq: 2850, duration: 0.18, type: "triangle", gain: 0.05 });
      noise(ctx, out, noiseBuffer, {
        duration: 0.08,
        gain: 0.12,
        filter: "highpass",
        freq: 3500,
      });
      return;

    case "shatter":
      // Vidro quebrando: estalos agudos e um chiado que cai.
      [2600, 3400, 2200].forEach((freq, index) => {
        tone(ctx, out, {
          freq,
          to: freq * 0.7,
          duration: 0.07,
          type: "triangle",
          gain: 0.05,
          delay: index * 0.04,
        });
      });
      noise(ctx, out, noiseBuffer, {
        duration: 0.3,
        gain: 0.12,
        filter: "highpass",
        freq: 5000,
        to: 1800,
      });
      return;

    case "fuse":
      // Chiado que sobe, como um pavio queimando.
      noise(ctx, out, noiseBuffer, {
        duration: 0.85,
        gain: 0.08,
        filter: "bandpass",
        freq: 900,
        to: 4200,
        q: 2,
      });
      tone(ctx, out, { freq: 300, to: 900, duration: 0.85, type: "triangle", gain: 0.04 });
      return;

    case "explosion":
      // Estrondo grave com um chiado longo de fogo.
      tone(ctx, out, { freq: 110, to: 28, duration: 0.7, gain: 0.4 });
      noise(ctx, out, noiseBuffer, {
        duration: 0.7,
        gain: 0.32,
        filter: "lowpass",
        freq: 2200,
        to: 120,
      });
      return;

    case "flame":
      // Labareda: um sopro que sobe e um rugido grave.
      noise(ctx, out, noiseBuffer, {
        duration: 0.5,
        gain: 0.18,
        filter: "bandpass",
        freq: 400,
        to: 1800,
        q: 0.8,
      });
      tone(ctx, out, { freq: 90, to: 140, duration: 0.4, type: "sawtooth", gain: 0.05 });
      return;

    case "roar":
      // Rugido longe: grave, áspero e abafado.
      tone(ctx, out, { freq: 70, to: 45, duration: 1.6, type: "sawtooth", gain: 0.09, attack: 0.25 });
      tone(ctx, out, { freq: 105, to: 60, duration: 1.4, type: "square", gain: 0.03, attack: 0.3 });
      noise(ctx, out, noiseBuffer, {
        duration: 1.6,
        gain: 0.12,
        filter: "lowpass",
        freq: 500,
        to: 150,
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

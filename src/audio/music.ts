// Música ambiente gerada por código. Cada compasso toca um acorde suave
// (pad), uma nota grave (baixo) e, às vezes, notas de sino sorteadas da
// escala — por isso a música nunca se repete exatamente igual.
// Nas lutas contra chefes, uma batida de tambor entra por cima.

export type MusicTrackId =
  | "forest"
  | "ruins"
  | "swamp"
  | "peaks"
  | "volcano"
  | "graveyard";

interface MusicTrack {
  /** Duração de um compasso (s). */
  barSeconds: number;
  /** Acordes em sequência (notas MIDI: 60 = dó central). */
  chords: number[][];
  /** Notas que a melodia pode sortear. */
  melodyScale: number[];
  /** Chance (0 a 1) de tocar uma nota de melodia em cada meio compasso. */
  melodyChance: number;
  padType: OscillatorType;
  /** Frequência do filtro do pad: menor = som mais abafado. */
  padFilter: number;
  padGain: number;
  bassGain: number;
  melodyGain: number;
}

export const MUSIC_TRACKS: Record<MusicTrackId, MusicTrack> = {
  // Floresta: lá menor (Am – F – Dm – Mi), misteriosa mas calma.
  forest: {
    barSeconds: 3.6,
    chords: [
      [57, 60, 64],
      [53, 57, 60],
      [50, 53, 57],
      [52, 56, 59],
    ],
    melodyScale: [69, 72, 74, 76, 79, 81],
    melodyChance: 0.55,
    padType: "triangle",
    padFilter: 1100,
    padGain: 0.035,
    bassGain: 0.05,
    melodyGain: 0.035,
  },
  // Pântano: mi frígio (Em – F – Em – Dm), lenta e sinistra.
  swamp: {
    barSeconds: 5,
    chords: [
      [52, 55, 59],
      [53, 57, 60],
      [52, 55, 59],
      [50, 53, 57],
    ],
    melodyScale: [64, 65, 67, 71, 72, 76],
    melodyChance: 0.3,
    padType: "sine",
    padFilter: 800,
    padGain: 0.045,
    bassGain: 0.06,
    melodyGain: 0.03,
  },
  // Picos: si menor com sétima maior no topo (Bm – G – Em – F#), notas
  // agudas e espaçadas, como cristais de gelo.
  peaks: {
    barSeconds: 4.8,
    chords: [
      [47, 50, 54],
      [43, 47, 50],
      [40, 43, 47],
      [42, 46, 49],
    ],
    melodyScale: [71, 74, 76, 78, 81, 83, 86],
    melodyChance: 0.45,
    padType: "sine",
    padFilter: 1400,
    padGain: 0.04,
    bassGain: 0.045,
    melodyGain: 0.03,
  },
  // Terras Vulcânicas: mi frígio (Em – F – Dm – Mi), grave e tenso, com o
  // semitom mi–fá dando a sensação de ameaça.
  volcano: {
    barSeconds: 4.2,
    chords: [
      [40, 43, 47],
      [41, 45, 48],
      [38, 41, 45],
      [40, 44, 47],
    ],
    melodyScale: [64, 65, 67, 69, 71, 72, 76],
    melodyChance: 0.3,
    padType: "sawtooth",
    padFilter: 520,
    padGain: 0.035,
    bassGain: 0.06,
    melodyGain: 0.03,
  },
  // Cemitério de Dragões: dó menor com acorde diminuto (Cm – Ab – Fm – Bdim),
  // bem lenta e espaçada, com notas soltas como sinos distantes.
  graveyard: {
    barSeconds: 5.6,
    chords: [
      [48, 51, 55],
      [44, 48, 51],
      [41, 44, 48],
      [47, 50, 53],
    ],
    melodyScale: [72, 75, 77, 79, 80, 84],
    melodyChance: 0.25,
    padType: "triangle",
    padFilter: 800,
    padGain: 0.04,
    bassGain: 0.05,
    melodyGain: 0.035,
  },
  // Ruínas: ré menor (Dm – Sib – Gm – Lá), mais grave e lenta.
  ruins: {
    barSeconds: 4.4,
    chords: [
      [50, 53, 57],
      [46, 50, 53],
      [43, 46, 50],
      [45, 49, 52],
    ],
    melodyScale: [62, 65, 67, 69, 72, 74],
    melodyChance: 0.35,
    padType: "sawtooth",
    padFilter: 650,
    padGain: 0.03,
    bassGain: 0.055,
    melodyGain: 0.03,
  },
};

const midiToFreq = (note: number): number => 440 * 2 ** ((note - 69) / 12);

/** Agenda um compasso inteiro para começar em `time` (relógio do áudio). */
export function scheduleBar(
  ctx: AudioContext,
  out: AudioNode,
  noiseBuffer: AudioBuffer,
  track: MusicTrack,
  barIndex: number,
  time: number,
  withDrums: boolean,
): void {
  const chord = track.chords[barIndex % track.chords.length];
  const bar = track.barSeconds;

  for (const note of chord) {
    padNote(ctx, out, track, midiToFreq(note), time, bar);
  }

  bassNote(ctx, out, midiToFreq(chord[0] - 12), time, bar, track.bassGain);

  for (let half = 0; half < 2; half++) {
    if (Math.random() < track.melodyChance) {
      const note =
        track.melodyScale[Math.floor(Math.random() * track.melodyScale.length)];

      bellNote(ctx, out, midiToFreq(note), time + half * (bar / 2), track.melodyGain);
    }
  }

  if (withDrums) {
    for (let beat = 0; beat < 4; beat++) {
      const beatTime = time + beat * (bar / 4);

      kick(ctx, out, beatTime);
      hat(ctx, out, noiseBuffer, beatTime + bar / 8);
    }
  }
}

/** Acorde suave: dois osciladores levemente desafinados, filtrados. */
function padNote(
  ctx: AudioContext,
  out: AudioNode,
  track: MusicTrack,
  freq: number,
  time: number,
  length: number,
): void {
  const filter = ctx.createBiquadFilter();
  const volume = ctx.createGain();

  filter.type = "lowpass";
  filter.frequency.value = track.padFilter;

  volume.gain.setValueAtTime(0.0001, time);
  volume.gain.linearRampToValueAtTime(track.padGain, time + 0.9);
  volume.gain.setValueAtTime(track.padGain, time + length - 0.2);
  volume.gain.linearRampToValueAtTime(0.0001, time + length + 0.7);

  filter.connect(volume).connect(out);

  for (const detune of [-6, 6]) {
    const osc = ctx.createOscillator();

    osc.type = track.padType;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(filter);
    osc.start(time);
    osc.stop(time + length + 0.8);
  }
}

function bassNote(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  time: number,
  length: number,
  gain: number,
): void {
  const osc = ctx.createOscillator();
  const volume = ctx.createGain();

  osc.frequency.value = freq;

  volume.gain.setValueAtTime(0.0001, time);
  volume.gain.linearRampToValueAtTime(gain, time + 0.3);
  volume.gain.linearRampToValueAtTime(0.0001, time + length);

  osc.connect(volume).connect(out);
  osc.start(time);
  osc.stop(time + length + 0.05);
}

/** Nota de sino: ataque rápido e som que some devagar. */
function bellNote(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  time: number,
  gain: number,
): void {
  for (const [multiplier, level] of [
    [1, 1],
    [2, 0.25],
  ]) {
    const osc = ctx.createOscillator();
    const volume = ctx.createGain();

    osc.frequency.value = freq * multiplier;

    volume.gain.setValueAtTime(0.0001, time);
    volume.gain.exponentialRampToValueAtTime(gain * level, time + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, time + 2.4);

    osc.connect(volume).connect(out);
    osc.start(time);
    osc.stop(time + 2.5);
  }
}

/** Bumbo: tom grave que desce rápido. */
function kick(ctx: AudioContext, out: AudioNode, time: number): void {
  const osc = ctx.createOscillator();
  const volume = ctx.createGain();

  osc.frequency.setValueAtTime(120, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.2);

  volume.gain.setValueAtTime(0.3, time);
  volume.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);

  osc.connect(volume).connect(out);
  osc.start(time);
  osc.stop(time + 0.35);
}

/** Chimbal: chiado agudo bem curto. */
function hat(
  ctx: AudioContext,
  out: AudioNode,
  noiseBuffer: AudioBuffer,
  time: number,
): void {
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const volume = ctx.createGain();

  source.buffer = noiseBuffer;
  filter.type = "highpass";
  filter.frequency.value = 6500;

  volume.gain.setValueAtTime(0.035, time);
  volume.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

  source.connect(filter).connect(volume).connect(out);
  source.start(time);
  source.stop(time + 0.08);
}

// Motor de áudio do jogo: volume, liga/desliga (tecla M), efeitos e música.
// O jogo usa apenas o objeto `audio` exportado aqui, por exemplo:
//   audio.play("swing");
//   audio.setMusic("forest");
//
// Os navegadores só permitem tocar som depois que a pessoa aperta uma tecla
// ou clica na página. Por isso o som "destrava" em audio.unlock(), chamado
// no primeiro toque (ver main.ts).

import { playSfx, type SfxName } from "./sfx";
import { MUSIC_TRACKS, scheduleBar, type MusicTrackId } from "./music";

const MUTE_KEY = "astra-legacy:muted";

const VOLUME = {
  master: 0.8,
  music: 0.55,
  sfx: 0.8,
  /** Eco suave na música (deixa o som mais "ambiente"). */
  echo: 0.22,
};

/** Quantos segundos de música ficam agendados à frente. */
const MUSIC_LOOKAHEAD = 1.5;

interface PlayingTrack {
  id: MusicTrackId;
  gain: GainNode;
  nextBarTime: number;
  barIndex: number;
}

class AudioEngine {
  private ctx?: AudioContext;
  private master?: GainNode;
  private sfxBus?: GainNode;
  private musicBus?: GainNode;
  private noiseBuffer?: AudioBuffer;

  private muted = readMutedPreference();
  private wantedTrack: MusicTrackId | null = null;
  private track?: PlayingTrack;
  private drums = false;
  private musicTimer?: number;
  private disposed = false;

  /** Cria/retoma o áudio. Chamado a cada tecla ou clique (é barato). */
  unlock(): void {
    if (this.disposed) {
      return;
    }

    if (!this.ctx) {
      this.createContext();
    }

    if (this.ctx?.state === "suspended") {
      void this.ctx.resume();
    }

    if (this.wantedTrack && !this.track) {
      this.startTrack(this.wantedTrack);
    }
  }

  play(name: SfxName): void {
    if (
      this.disposed ||
      this.muted ||
      !this.ctx ||
      !this.sfxBus ||
      !this.noiseBuffer
    ) {
      return;
    }

    playSfx(this.ctx, this.sfxBus, this.noiseBuffer, name);
  }

  /** Troca a música (com transição suave). Mesma música: continua tocando. */
  setMusic(id: MusicTrackId): void {
    this.wantedTrack = id;

    if (this.disposed || !this.ctx || this.track?.id === id) {
      return;
    }

    this.stopTrack(1.5);
    this.startTrack(id);
  }

  /** Para a música devagar (ex.: tela de fim de jogo). */
  stopMusic(): void {
    this.wantedTrack = null;
    this.stopTrack(1.2);
  }

  /** Liga/desliga a batida de tambor das lutas contra chefes. */
  setDrums(on: boolean): void {
    this.drums = on;
  }

  /**
   * Desliga o áudio de vez. Usado quando o Vite recarrega o jogo durante o
   * desenvolvimento, para a música antiga não tocar junto com a nova.
   */
  dispose(): void {
    this.disposed = true;
    window.clearInterval(this.musicTimer);
    void this.ctx?.close();
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Liga/desliga todo o som. Devolve true se ficou mudo. */
  toggleMute(): boolean {
    this.muted = !this.muted;
    saveMutedPreference(this.muted);

    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : VOLUME.master,
        this.ctx.currentTime,
        0.05,
      );
    }

    return this.muted;
  }

  private createContext(): void {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      return; // Navegador sem Web Audio: o jogo segue sem som.
    }

    const ctx = new AudioContextClass();

    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : VOLUME.master;
    this.master.connect(ctx.destination);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = VOLUME.sfx;
    this.sfxBus.connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = VOLUME.music;
    this.musicBus.connect(this.master);
    this.connectEcho(ctx, this.musicBus, this.master);

    // 1 segundo de ruído branco, reaproveitado por todos os "chiados".
    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 200);
  }

  /** Eco: a música volta repetida, cada vez mais baixa. */
  private connectEcho(ctx: AudioContext, input: AudioNode, output: AudioNode): void {
    const delay = ctx.createDelay();
    const feedback = ctx.createGain();
    const wet = ctx.createGain();

    delay.delayTime.value = 0.38;
    feedback.gain.value = 0.3;
    wet.gain.value = VOLUME.echo;

    input.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(output);
  }

  private startTrack(id: MusicTrackId): void {
    if (!this.ctx || !this.musicBus) {
      return;
    }

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(1, now + 2);
    gain.connect(this.musicBus);

    this.track = { id, gain, nextBarTime: now + 0.1, barIndex: 0 };
  }

  private stopTrack(fadeSeconds: number): void {
    if (!this.ctx || !this.track) {
      return;
    }

    const { gain } = this.track;
    const now = this.ctx.currentTime;

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);

    window.setTimeout(() => gain.disconnect(), (fadeSeconds + 3) * 1000);

    this.track = undefined;
  }

  /** Mantém sempre alguns segundos de música agendados à frente. */
  private scheduleMusic(): void {
    if (!this.ctx || !this.track || !this.noiseBuffer) {
      return;
    }

    const now = this.ctx.currentTime;
    const track = this.track;
    const definition = MUSIC_TRACKS[track.id];

    // Se a aba ficou escondida por um tempo, recomeça daqui (sem "atropelo").
    if (track.nextBarTime < now) {
      track.nextBarTime = now + 0.05;
    }

    while (track.nextBarTime < now + MUSIC_LOOKAHEAD) {
      scheduleBar(
        this.ctx,
        track.gain,
        this.noiseBuffer,
        definition,
        track.barIndex,
        track.nextBarTime,
        this.drums,
      );

      track.nextBarTime += definition.barSeconds;
      track.barIndex += 1;
    }
  }
}

function readMutedPreference(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveMutedPreference(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // Armazenamento bloqueado: a preferência vale só nesta sessão.
  }
}

/** O áudio do jogo (um só para todas as cenas). */
export const audio = new AudioEngine();

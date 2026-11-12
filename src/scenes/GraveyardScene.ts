// Cemitério de Dragões: Capítulo 5.
// Chega-se aqui pela trilha a oeste da vila, depois que o Ancião rompe o
// Selo Astral. Missão: atravessar o cemitério até a arena, a oeste, derrotar
// o guardião (próximas etapas) e pegar o quinto Fragmento Astral.
//
// Está escuro: o herói enxerga só ao redor de si e das tochas que acende
// (E). Cada tocha acesa clareia um pouco o cemitério inteiro; com todas
// acesas, a escuridão quase some. As tochas ficam acesas enquanto o jogo
// estiver aberto. De tempos em
// tempos, a sombra de Ignis cruza o céu, com um rugido distante.

import Phaser from "phaser";
import {
  GRAVEYARD_HEIGHT,
  GRAVEYARD_SHRINE_POSITION,
  GRAVEYARD_TORCHES,
  GRAVEYARD_WIDTH,
  IGNIS_SHADOW,
  TORCH_STATS,
} from "../config";
import { TEXTS } from "../i18n/texts";
import { progress, saveProgress } from "../systems/progress";
import { createGraveyardWorld } from "../world/graveyard";
import { createDarkness, type Darkness } from "../world/darkness";
import { createTorch, lightTorch, type Torch } from "../world/torch";
import { flyIgnisShadow } from "../world/ignisShadow";
import { audio } from "../audio/engine";
import { AREA_SCENE_KEYS } from "./areas";
import { AreaScene } from "./AreaScene";

/**
 * Quanta escuridão cobre o mapa (0 = nenhuma, 1 = preto total): com
 * nenhuma tocha acesa e com todas acesas. Entre os dois, cada tocha
 * acesa clareia um pouco.
 */
const DARKNESS_NO_TORCHES = 0.78;
const DARKNESS_ALL_TORCHES = 0.3;
/** Quanto a escuridão muda por segundo (a transição é suave). */
const DARKNESS_FADE_SPEED = 0.5;
/** Raio da luz em volta do herói. */
const HERO_LIGHT_RADIUS = 160;

export class GraveyardScene extends AreaScene {
  protected readonly areaId = "graveyard";
  protected readonly worldWidth = GRAVEYARD_WIDTH;
  protected readonly worldHeight = GRAVEYARD_HEIGHT;
  protected readonly areaName = TEXTS.places.graveyard;
  protected readonly musicTrack = "graveyard";

  private sign!: Phaser.GameObjects.Text;
  private darkness!: Darkness;
  private torches: Torch[] = [];
  /**
   * Índices das tochas já acesas. Fica fora do create(): assim as tochas
   * continuam acesas ao voltar do checkpoint (até recarregar a página).
   */
  private readonly litTorches = new Set<number>();
  private nextShadowAt = 0;
  private shadowHintShown = false;

  constructor() {
    super(AREA_SCENE_KEYS.graveyard);
  }

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  protected createWorld(): Phaser.GameObjects.Rectangle[] {
    const { obstacles, sign } = createGraveyardWorld(this);

    this.sign = sign;
    this.shadowHintShown = false;
    // O relógio da cena só começa a contar no primeiro quadro (ver update).
    this.nextShadowAt = 0;

    this.addShrine(
      GRAVEYARD_SHRINE_POSITION.x,
      GRAVEYARD_SHRINE_POSITION.y,
      "graveyardShrine",
    );

    this.torches = GRAVEYARD_TORCHES.map(({ x, y }, index) => {
      const torch = createTorch(this, x, y);

      if (this.litTorches.has(index)) {
        lightTorch(this, torch, false);
      }

      return torch;
    });

    this.darkness = createDarkness(this, this.getTargetDarkness());

    // Borda leste: volta para a trilha a oeste da Floresta.
    this.addExit({
      x: GRAVEYARD_WIDTH - 40,
      y: 620,
      width: 40,
      height: 160,
      target: "forestWest",
      isOpen: () => true,
    });

    return obstacles;
  }

  protected createActors(): void {
    // Os inimigos do cemitério chegam na próxima etapa.
  }

  protected onAreaEntered(): void {
    // Atravessar o selo cumpre o objetivo "seguir a trilha a oeste".
    if (progress.questStage === "passage") {
      progress.questStage = "knight";
      saveProgress();
    }
  }

  protected applyAreaLanguage(): void {
    this.sign.setText(this.t(TEXTS.places.graveyard));
  }

  // ---------------------------------------------------------------------------
  // A cada quadro
  // ---------------------------------------------------------------------------

  protected updateArea(): void {
    this.updateTorches();
    this.updateIgnisShadow();
    this.updateDarkness();
  }

  // ---------------------------------------------------------------------------
  // Tochas e escuridão
  // ---------------------------------------------------------------------------

  /** Mostra "E • Acender tocha" perto de uma tocha apagada e acende com E. */
  private updateTorches(): void {
    const index = this.torches.findIndex(
      (torch) =>
        !torch.lit &&
        this.distanceToPlayer(torch.x, torch.y) <= TORCH_STATS.lightRange,
    );

    if (index < 0) {
      this.hideInteractionHint();
      return;
    }

    const torch = this.torches[index];

    this.showInteractionHint(
      this.t(TEXTS.chapter5.lightTorch),
      torch.x,
      torch.y - 52,
    );

    if (this.justPressedInteract()) {
      lightTorch(this, torch, true);
      this.litTorches.add(index);
      this.hideInteractionHint();
      audio.play("flame");

      const allLit = this.litTorches.size === this.torches.length;

      if (allLit) {
        audio.play("shrine");
      }

      this.statusText.setText(
        this.t(
          allLit ? TEXTS.chapter5.allTorchesLit : TEXTS.chapter5.torchLit,
        ),
      );
    }
  }

  /** Escuridão que o mapa deve ter com as tochas acesas agora. */
  private getTargetDarkness(): number {
    const litFraction = this.litTorches.size / GRAVEYARD_TORCHES.length;

    return Phaser.Math.Linear(
      DARKNESS_NO_TORCHES,
      DARKNESS_ALL_TORCHES,
      litFraction,
    );
  }

  private updateDarkness(): void {
    const { x, y } = this.player.body;

    // Clareia (ou escurece) aos poucos até a escuridão certa.
    const step = (DARKNESS_FADE_SPEED * this.game.loop.delta) / 1000;
    const target = this.getTargetDarkness();
    const current = this.darkness.alpha;

    this.darkness.alpha =
      current > target
        ? Math.max(target, current - step)
        : Math.min(target, current + step);

    this.darkness.update([
      { x, y, radius: HERO_LIGHT_RADIUS },
      ...this.torches
        .filter((torch) => torch.lit)
        .map((torch) => ({
          x: torch.x,
          y: torch.y,
          radius: TORCH_STATS.lightRadius,
        })),
    ]);
  }

  // ---------------------------------------------------------------------------
  // A sombra de Ignis
  // ---------------------------------------------------------------------------

  private updateIgnisShadow(): void {
    const now = this.time.now;

    // Primeiro quadro na área: marca quando a sombra passa pela primeira vez.
    if (this.nextShadowAt === 0) {
      this.nextShadowAt = now + IGNIS_SHADOW.firstDelay;
      return;
    }

    if (now < this.nextShadowAt) {
      return;
    }

    this.nextShadowAt =
      now +
      IGNIS_SHADOW.duration +
      Phaser.Math.Between(IGNIS_SHADOW.minDelay, IGNIS_SHADOW.maxDelay);

    flyIgnisShadow(this, IGNIS_SHADOW.duration);
    audio.play("roar");
    this.cameras.main.shake(IGNIS_SHADOW.duration * 0.6, 0.002);

    // A mensagem aparece só na primeira passagem de cada visita.
    if (!this.shadowHintShown) {
      this.shadowHintShown = true;
      this.statusText.setText(this.t(TEXTS.chapter5.ignisShadow));
    }
  }
}

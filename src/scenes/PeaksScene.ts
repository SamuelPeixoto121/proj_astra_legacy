// Picos Congelados: Capítulo 3.
// Chega-se aqui pelo portal gelado na clareira do Pântano Sombrio.
// Missão: subir até o platô do topo, derrotar o chefe (próxima etapa) e
// pegar o terceiro Fragmento Astral.
//
// Placas de gelo fazem o herói escorregar (demora para frear e virar);
// a nevasca deixa as bordas da tela esbranquiçadas.

import type Phaser from "phaser";
import {
  PEAKS_HEIGHT,
  PEAKS_ICE_TRACTION,
  PEAKS_RETURN_PORTAL_POSITION,
  PEAKS_SHRINE_POSITION,
  PEAKS_WIDTH,
  PEAKS_WOLF_SPAWNS,
} from "../config";
import { TEXTS } from "../i18n/texts";
import { progress, saveProgress } from "../systems/progress";
import { spawnEnemy } from "../systems/enemies";
import { createPeaksWorld, isOnIce } from "../world/peaks";
import { createPortal, openPortal } from "../world/portal";
import { AREA_SCENE_KEYS } from "./areas";
import { AreaScene } from "./AreaScene";

export class PeaksScene extends AreaScene {
  protected readonly areaId = "peaks";
  protected readonly worldWidth = PEAKS_WIDTH;
  protected readonly worldHeight = PEAKS_HEIGHT;
  protected readonly areaName = TEXTS.places.peaks;
  protected readonly musicTrack = "peaks";

  private sign!: Phaser.GameObjects.Text;
  /** A dica sobre o gelo aparece só na primeira vez em cada visita. */
  private iceHintShown = false;

  constructor() {
    super(AREA_SCENE_KEYS.peaks);
  }

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  protected createWorld(): Phaser.GameObjects.Rectangle[] {
    const { obstacles, sign } = createPeaksWorld(this);

    this.sign = sign;
    this.iceHintShown = false;

    this.addShrine(
      PEAKS_SHRINE_POSITION.x,
      PEAKS_SHRINE_POSITION.y,
      "peaksShrine",
    );

    // Portal de volta para o Pântano (sempre aberto).
    const { x, y } = PEAKS_RETURN_PORTAL_POSITION;

    openPortal(this, createPortal(this, x, y), false);

    this.addExit({
      x: x - 40,
      y: y - 30,
      width: 80,
      height: 60,
      target: "swampPortal",
      isOpen: () => true,
    });

    return obstacles;
  }

  protected createActors(): void {
    const wolves = PEAKS_WOLF_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "wolf", x, y),
    );

    this.enemies.push(...wolves);
  }

  protected onAreaEntered(): void {
    // Atravessar o portal cumpre o objetivo "atravessar o portal gelado".
    if (progress.questStage === "portal2") {
      progress.questStage = "winter";
      saveProgress();
    }
  }

  protected applyAreaLanguage(): void {
    this.sign.setText(this.t(TEXTS.places.peaks));
  }

  // ---------------------------------------------------------------------------
  // Gelo
  // ---------------------------------------------------------------------------

  protected getPlayerTraction(): number {
    const { x, y } = this.player.body;

    if (!isOnIce(x, y)) {
      return 1;
    }

    if (!this.iceHintShown) {
      this.iceHintShown = true;
      this.statusText.setText(this.t(TEXTS.chapter3.ice));
    }

    return PEAKS_ICE_TRACTION;
  }
}

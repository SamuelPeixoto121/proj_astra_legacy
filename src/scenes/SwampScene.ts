// Pântano Sombrio: Capítulo 2.
// Chega-se aqui pelo portal atrás do altar das Ruínas.
// Missão: encontrar e derrotar a feiticeira que guarda o segundo Fragmento
// Astral (a feiticeira e os espíritos entram nas próximas etapas).
//
// Poças de lama deixam o herói mais lento; rolar não é afetado.

import type Phaser from "phaser";
import {
  SWAMP_HEIGHT,
  SWAMP_MUD_SPEED,
  SWAMP_RETURN_PORTAL_POSITION,
  SWAMP_SHRINE_POSITION,
  SWAMP_SPIDER_SPAWNS,
  SWAMP_WIDTH,
} from "../config";
import { TEXTS } from "../i18n/texts";
import { progress, saveProgress } from "../systems/progress";
import { spawnEnemy } from "../systems/enemies";
import { createSwampWorld, isInMud } from "../world/swamp";
import { createPortal, openPortal } from "../world/portal";
import { AREA_SCENE_KEYS } from "./areas";
import { AreaScene } from "./AreaScene";

export class SwampScene extends AreaScene {
  protected readonly areaId = "swamp";
  protected readonly worldWidth = SWAMP_WIDTH;
  protected readonly worldHeight = SWAMP_HEIGHT;
  protected readonly areaName = TEXTS.places.swamp;
  protected readonly musicTrack = "swamp";

  private sign!: Phaser.GameObjects.Text;
  /** A dica sobre a lama aparece só na primeira vez em cada visita. */
  private mudHintShown = false;

  constructor() {
    super(AREA_SCENE_KEYS.swamp);
  }

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  protected createWorld(): Phaser.GameObjects.Rectangle[] {
    const { obstacles, sign } = createSwampWorld(this);

    this.sign = sign;
    this.mudHintShown = false;

    this.addShrine(
      SWAMP_SHRINE_POSITION.x,
      SWAMP_SHRINE_POSITION.y,
      "swampShrine",
    );

    // Portal de volta para as Ruínas (sempre aberto).
    const { x, y } = SWAMP_RETURN_PORTAL_POSITION;

    openPortal(this, createPortal(this, x, y), false);

    this.addExit({
      x: x - 40,
      y: y - 30,
      width: 80,
      height: 60,
      target: "ruinsPortal",
      isOpen: () => true,
    });

    return obstacles;
  }

  protected createActors(): void {
    const spiders = SWAMP_SPIDER_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "spider", x, y),
    );

    this.enemies.push(...spiders);
  }

  protected onAreaEntered(): void {
    // Atravessar o portal cumpre o objetivo "atravessar o portal".
    if (progress.questStage === "portal") {
      progress.questStage = "witch";
      saveProgress();
    }
  }

  protected applyAreaLanguage(): void {
    this.sign.setText(this.t(TEXTS.places.swamp));
  }

  // ---------------------------------------------------------------------------
  // Lama
  // ---------------------------------------------------------------------------

  protected getPlayerSpeedMultiplier(): number {
    const { x, y } = this.player.body;

    if (!isInMud(x, y)) {
      return 1;
    }

    if (!this.mudHintShown) {
      this.mudHintShown = true;
      this.statusText.setText(this.t(TEXTS.chapter2.mud));
    }

    return SWAMP_MUD_SPEED;
  }
}

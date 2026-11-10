// Ruínas do Santuário: Capítulo 1.
// Missão: encontrar e derrotar o guardião que protege o primeiro
// Fragmento Astral (o guardião entra na próxima etapa).

import type Phaser from "phaser";
import { RUINS_HEIGHT, RUINS_WIDTH } from "../config";
import { TEXTS } from "../i18n/texts";
import { progress, saveProgress } from "../systems/progress";
import { createRuinsWorld } from "../world/ruins";
import { AREA_SCENE_KEYS } from "./areas";
import { AreaScene } from "./AreaScene";

export class RuinsScene extends AreaScene {
  protected readonly areaId = "ruins";
  protected readonly worldWidth = RUINS_WIDTH;
  protected readonly worldHeight = RUINS_HEIGHT;

  private sign!: Phaser.GameObjects.Text;

  constructor() {
    super(AREA_SCENE_KEYS.ruins);
  }

  protected createWorld(): Phaser.GameObjects.Rectangle[] {
    const { obstacles, sign } = createRuinsWorld(this);

    this.sign = sign;

    // Borda de baixo: volta para a trilha ao norte da Floresta.
    this.addExit({
      x: RUINS_WIDTH / 2 - 90,
      y: RUINS_HEIGHT - 40,
      width: 180,
      height: 40,
      target: "forestNorth",
      isOpen: () => true,
    });

    return obstacles;
  }

  protected createActors(): void {
    // Guardião e inimigos das Ruínas: próxima etapa.
  }

  protected onAreaEntered(): void {
    // Chegar às Ruínas cumpre o objetivo "ir às Ruínas".
    if (progress.questStage === "ruins") {
      progress.questStage = "guardian";
      saveProgress();
    }
  }

  protected applyAreaLanguage(): void {
    this.sign.setText(this.t(TEXTS.places.ruins));
  }
}

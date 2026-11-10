// Ligação entre as áreas do jogo e as cenas do Phaser.

import type Phaser from "phaser";
import { CHECKPOINTS } from "../config";
import { TEXTS } from "../i18n/texts";
import { loadProgress, progress, resetProgress } from "../systems/progress";
import type { AreaId } from "../types";

/** Nome (chave) da cena de cada área. */
export const AREA_SCENE_KEYS: Record<AreaId, string> = {
  forest: "ForestScene",
  ruins: "RuinsScene",
};

/**
 * Carrega o save e abre a área do último checkpoint.
 * Sem save, começa um jogo novo na Floresta.
 * Usado ao abrir o jogo e ao apertar R depois de uma derrota ou vitória.
 */
export function startFromSave(scene: Phaser.Scene): void {
  const loaded = loadProgress();

  if (!loaded) {
    resetProgress();
  }

  const area = CHECKPOINTS[progress.checkpointId].area;

  scene.scene.start(AREA_SCENE_KEYS[area], {
    statusMessage: loaded ? TEXTS.save.progressLoaded : undefined,
  });
}

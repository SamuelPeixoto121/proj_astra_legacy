// Terras Vulcânicas: Capítulo 4.
// Chega-se aqui pelo portal de fogo no topo dos Picos Congelados.
// Missão: atravessar os rios de lava até a cratera, a leste, derrotar o
// Arauto de Ignis (próxima etapa) e pegar o quarto Fragmento Astral.
//
// Pisar na lava queima (dano a cada pouco tempo); rolar por cima é seguro,
// porque o herói fica invencível durante o rolamento. Cinzas caem, brasas
// sobem e as bordas da tela ficam avermelhadas pelo calor.

import type Phaser from "phaser";
import {
  VOLCANO_HEIGHT,
  VOLCANO_LAVA_DAMAGE,
  VOLCANO_RETURN_PORTAL_POSITION,
  VOLCANO_SHRINE_POSITION,
  VOLCANO_SPIDER_SPAWNS,
  VOLCANO_WIDTH,
  VOLCANO_WOLF_SPAWNS,
} from "../config";
import { TEXTS } from "../i18n/texts";
import { progress, saveProgress } from "../systems/progress";
import { spawnEnemy } from "../systems/enemies";
import { createVolcanoWorld, isOnLava } from "../world/volcano";
import { PORTAL_COLORS, createPortal, openPortal } from "../world/portal";
import { createImpactEffect } from "../effects/combatEffects";
import { AREA_SCENE_KEYS } from "./areas";
import { AreaScene } from "./AreaScene";

/** Intervalo (ms) entre as chamas nos pés do herói quando pisa na lava. */
const BURN_EFFECT_INTERVAL = 140;

export class VolcanoScene extends AreaScene {
  protected readonly areaId = "volcano";
  protected readonly worldWidth = VOLCANO_WIDTH;
  protected readonly worldHeight = VOLCANO_HEIGHT;
  protected readonly areaName = TEXTS.places.volcano;
  protected readonly musicTrack = "volcano";

  private sign!: Phaser.GameObjects.Text;
  /** A dica sobre a lava aparece só na primeira vez em cada visita. */
  private lavaHintShown = false;
  private lastBurnEffectAt = 0;

  constructor() {
    super(AREA_SCENE_KEYS.volcano);
  }

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  protected createWorld(): Phaser.GameObjects.Rectangle[] {
    const { obstacles, sign } = createVolcanoWorld(this);

    this.sign = sign;
    this.lavaHintShown = false;

    this.addShrine(
      VOLCANO_SHRINE_POSITION.x,
      VOLCANO_SHRINE_POSITION.y,
      "volcanoShrine",
    );

    // Portal de fogo de volta para os Picos (sempre aberto).
    const { x, y } = VOLCANO_RETURN_PORTAL_POSITION;

    openPortal(this, createPortal(this, x, y, PORTAL_COLORS.fire), false);

    this.addExit({
      x: x - 40,
      y: y - 30,
      width: 80,
      height: 60,
      target: "peaksPortal",
      isOpen: () => true,
    });

    return obstacles;
  }

  protected createActors(): void {
    const spiders = VOLCANO_SPIDER_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "spider", x, y),
    );

    const wolves = VOLCANO_WOLF_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "wolf", x, y),
    );

    this.enemies.push(...spiders, ...wolves);
  }

  protected onAreaEntered(): void {
    // Atravessar o portal cumpre o objetivo "atravessar o portal de fogo".
    if (progress.questStage === "portal3") {
      progress.questStage = "herald";
      saveProgress();
    }
  }

  protected applyAreaLanguage(): void {
    this.sign.setText(this.t(TEXTS.places.volcano));
  }

  // ---------------------------------------------------------------------------
  // A cada quadro
  // ---------------------------------------------------------------------------

  protected updateArea(): void {
    this.updateLava();
  }

  // ---------------------------------------------------------------------------
  // Lava
  // ---------------------------------------------------------------------------

  /** Pisar na lava queima; rolando, o herói passa sem se machucar. */
  private updateLava(): void {
    const { x, y } = this.player.body;

    if (!isOnLava(x, y) || this.isRolling()) {
      return;
    }

    // Chamas nos pés enquanto estiver na lava.
    const now = this.time.now;

    if (now - this.lastBurnEffectAt >= BURN_EFFECT_INTERVAL) {
      this.lastBurnEffectAt = now;
      createImpactEffect(this, x, y + 8, 0xff7a2a, 5, 16);
    }

    // O próprio damagePlayer espera o tempo de invencibilidade entre danos.
    this.damagePlayer(VOLCANO_LAVA_DAMAGE);

    // Depois do dano, para a dica não ser trocada pela mensagem de dano.
    if (!this.lavaHintShown) {
      this.lavaHintShown = true;
      this.statusText.setText(this.t(TEXTS.chapter4.lava));
    }
  }
}

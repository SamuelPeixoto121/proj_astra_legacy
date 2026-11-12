// Cidadela em Ruínas: Capítulo 6, o final.
// Chega-se aqui pelo Portal Astral dourado da vila, aberto pelo Ancião com
// os cinco fragmentos. A antiga capital de Astra ainda arde desde a noite
// em que Ignis destruiu o Fragmento Central.
// Missão: subir as ruas até o pátio do castelo e entrar pelo portão: lá
// dentro, no Salão do Tesouro, Ignis espera.
//
// Fogo nos escombros queima ao pisar (rolar por cima é seguro). Brasas
// Vivas, Espíritos e lobos guardam as ruínas. A sombra de Ignis cruza o céu
// de tempos em tempos.

import type Phaser from "phaser";
import {
  CITADEL_CASTLE_GATE,
  CITADEL_EMBER_SPAWNS,
  CITADEL_FIRE_DAMAGE,
  CITADEL_HEIGHT,
  CITADEL_RETURN_PORTAL_POSITION,
  CITADEL_SHRINE_POSITION,
  CITADEL_WIDTH,
  CITADEL_WISP_SPAWNS,
  CITADEL_WOLF_SPAWNS,
} from "../config";
import { TEXTS } from "../i18n/texts";
import { progress, reachedStage, saveProgress } from "../systems/progress";
import { spawnEnemy } from "../systems/enemies";
import { createCitadelWorld, isOnCitadelFire } from "../world/citadel";
import { PORTAL_COLORS, createPortal, openPortal } from "../world/portal";
import {
  scheduleIgnisShadow,
  type IgnisShadowSchedule,
} from "../world/ignisShadow";
import { AREA_SCENE_KEYS } from "./areas";
import { AreaScene } from "./AreaScene";

export class CitadelScene extends AreaScene {
  protected readonly areaId = "citadel";
  protected readonly worldWidth = CITADEL_WIDTH;
  protected readonly worldHeight = CITADEL_HEIGHT;
  protected readonly areaName = TEXTS.places.citadel;
  protected readonly musicTrack = "citadel";

  private sign!: Phaser.GameObjects.Text;
  private ignisShadow!: IgnisShadowSchedule;
  private shadowHintShown = false;

  constructor() {
    super(AREA_SCENE_KEYS.citadel);
  }

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  protected createWorld(): Phaser.GameObjects.Rectangle[] {
    const { obstacles, sign } = createCitadelWorld(this);

    this.sign = sign;
    this.shadowHintShown = false;
    // Depois que Ignis é derrotado, a sombra dele não passa mais.
    this.ignisShadow = scheduleIgnisShadow(this, () => !reachedStage("complete"));

    this.addShrine(
      CITADEL_SHRINE_POSITION.x,
      CITADEL_SHRINE_POSITION.y,
      "citadelShrine",
    );

    // Portão do castelo: entra no Salão do Tesouro, onde Ignis espera.
    const gate = CITADEL_CASTLE_GATE;

    this.addExit({
      x: gate.x - gate.width / 2,
      y: gate.y - 15,
      width: gate.width,
      height: 30,
      target: "hoardEntrance",
      isOpen: () => reachedStage("ignis"),
    });

    // Portal Astral de volta para a vila (sempre aberto).
    const { x, y } = CITADEL_RETURN_PORTAL_POSITION;

    openPortal(this, createPortal(this, x, y, PORTAL_COLORS.astral), false);

    this.addExit({
      x: x - 40,
      y: y - 30,
      width: 80,
      height: 60,
      target: "villageGate",
      isOpen: () => true,
    });

    return obstacles;
  }

  protected createActors(): void {
    const embers = CITADEL_EMBER_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "ember", x, y),
    );

    const wisps = CITADEL_WISP_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "wisp", x, y),
    );

    const wolves = CITADEL_WOLF_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "wolf", x, y),
    );

    this.enemies.push(...embers, ...wisps, ...wolves);
  }

  protected onAreaEntered(): void {
    // Atravessar o Portal Astral cumpre o objetivo "atravessar o portal".
    if (progress.questStage === "citadel") {
      progress.questStage = "ignis";
      saveProgress();
    }
  }

  protected applyAreaLanguage(): void {
    this.sign.setText(this.t(TEXTS.places.citadel));
  }

  // ---------------------------------------------------------------------------
  // A cada quadro
  // ---------------------------------------------------------------------------

  protected updateArea(): void {
    const { x, y } = this.player.body;

    if (isOnCitadelFire(x, y)) {
      this.burnPlayer(CITADEL_FIRE_DAMAGE, TEXTS.chapter6.fire);
    }

    // A mensagem aparece só na primeira passagem de cada visita.
    if (this.ignisShadow.update() && !this.shadowHintShown) {
      this.shadowHintShown = true;
      this.statusText.setText(this.t(TEXTS.chapter5.ignisShadow));
    }
  }
}

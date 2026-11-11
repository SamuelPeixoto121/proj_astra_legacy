// Floresta Sussurrante: o prólogo.
// Missão: falar com o Ancião → derrotar o Lobo Corrompido → derrotar Kael.
// Derrotar Kael desfaz a barreira ao norte, que leva às Ruínas do Santuário.
//
// Herói, HUD, combate, checkpoints e saídas ficam na cena-base (AreaScene).

import type Phaser from "phaser";
import {
  ELDER_TALK_RANGE,
  KAEL_STATS,
  NORTH_BARRIER,
  SHRINE_POSITION,
  SPIDER_SPAWNS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "../config";
import { TEXTS } from "../i18n/texts";
import { progress, saveProgress } from "../systems/progress";
import { spawnEnemy, type Enemy } from "../systems/enemies";
import {
  createBoss,
  destroyBoss,
  drawBossHealthBar,
  showBossUi,
  type Boss,
} from "../systems/bosses";
import { createForestWorld, type ForestWorld } from "../world/forest";
import {
  createCorruptionBarrier,
  openCorruptionBarrier,
  type CorruptionBarrier,
} from "../world/corruptionBarrier";
import { createElder, type ElderSprite } from "../characters/elder";
import { createKael } from "../characters/kael";
import { createDeathBurst } from "../effects/combatEffects";
import { AREA_SCENE_KEYS } from "./areas";
import { AreaScene } from "./AreaScene";

export class ForestScene extends AreaScene {
  protected readonly areaId = "forest";
  protected readonly worldWidth = WORLD_WIDTH;
  protected readonly worldHeight = WORLD_HEIGHT;
  protected readonly areaName = TEXTS.places.forest;

  private signs!: ForestWorld["signs"];
  private northBarrier!: CorruptionBarrier;
  private elder!: ElderSprite;
  /** O lobo da missão: derrotá-lo avança a história. */
  private wolf!: Enemy;

  private kael!: Boss;
  private lastKaelAttackAt = -10000;

  constructor() {
    super(AREA_SCENE_KEYS.forest);
  }

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  protected createWorld(): Phaser.GameObjects.Rectangle[] {
    const { treeColliders, signs } = createForestWorld(this);

    this.signs = signs;

    this.addShrine(SHRINE_POSITION.x, SHRINE_POSITION.y, "shrine");

    this.northBarrier = createCorruptionBarrier(
      this,
      NORTH_BARRIER.x,
      NORTH_BARRIER.y,
      NORTH_BARRIER.width,
    );

    // Topo da trilha ao norte: leva às Ruínas, depois de derrotar Kael.
    this.addExit({
      x: NORTH_BARRIER.x - 80,
      y: 0,
      width: 160,
      height: 50,
      target: "ruinsEntrance",
      isOpen: () => progress.kaelDefeated,
    });

    return [...treeColliders, this.northBarrier.collider];
  }

  protected createActors(): void {
    this.elder = createElder(this, 650, 960);

    this.wolf = spawnEnemy(this, "wolf", 850, 790);

    const spiders = SPIDER_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "spider", x, y),
    );

    this.enemies.push(this.wolf, ...spiders);

    this.kael = createBoss(this, createKael(this, 850, 380), KAEL_STATS, {
      barWidth: 100,
      barOffsetY: 53,
      nameOffsetY: 76,
      nameColor: "#ff8293",
      barColor: 0xe43e62,
      barBackColor: 0x562038,
      impactColor: 0xff5267,
      damageTextColor: "#ff8293",
      deathColor: 0x8d264e,
    });
    this.lastKaelAttackAt = -10000;
  }

  protected setupAreaPhysics(obstacles: Phaser.GameObjects.Rectangle[]): void {
    const kaelBody = this.kael.sprite.body;

    this.physics.add.collider(kaelBody, obstacles);
    this.physics.add.collider(this.player.body, this.elder.body);

    this.physics.add.overlap(this.player.body, kaelBody, () => {
      if (progress.kaelUnlocked && !progress.kaelDefeated) {
        this.damagePlayer(KAEL_STATS.damage);
      }
    });
  }

  /** Deixa a floresta igual ao progresso salvo. */
  protected restoreAreaState(): void {
    // As aranhas sempre reaparecem; só o lobo da missão fica derrotado.
    if (progress.wolfDefeated) {
      this.removeEnemy(this.wolf);
    }

    if (progress.kaelDefeated) {
      this.removeKael();
      openCorruptionBarrier(this, this.northBarrier, false);
    } else if (progress.kaelUnlocked) {
      this.revealKael();
    }
  }

  protected applyAreaLanguage(): void {
    this.signs.trail.setText(this.t(TEXTS.places.trail));
    this.signs.forest.setText(this.t(TEXTS.places.forest));
    this.elder.label.setText(this.t(TEXTS.elder.label));

    if (!progress.kaelDefeated) {
      this.kael.nameText.setText(this.t(TEXTS.bosses.kael.name));
    }
  }

  // ---------------------------------------------------------------------------
  // A cada quadro
  // ---------------------------------------------------------------------------

  protected updateArea(): void {
    this.updateElderInteraction();

    if (progress.kaelUnlocked && !progress.kaelDefeated) {
      this.updateKael();
      drawBossHealthBar(this.kael);
    }
  }

  // ---------------------------------------------------------------------------
  // Ancião e progressão da missão
  // ---------------------------------------------------------------------------

  private updateElderInteraction(): void {
    const { x, y } = this.elder.body;

    if (this.distanceToPlayer(x, y) > ELDER_TALK_RANGE) {
      this.hideInteractionHint();
      return;
    }

    this.showInteractionHint(
      this.t(TEXTS.hints.talk),
      this.elder.container.x,
      this.elder.container.y - 42,
    );

    if (this.justPressedInteract()) {
      this.openDialogue(
        () => ({
          name: this.t(TEXTS.elder.name),
          lines: this.getElderDialogueLines(),
        }),
        () => this.onElderDialogueClosed(),
      );
    }
  }

  /** Falas do Ancião de acordo com o progresso da missão. */
  private getElderDialogueLines(): string[] {
    const dialogue = TEXTS.elderDialogue;

    if (!progress.elderTalked) return this.t(dialogue.intro);
    if (progress.kaelDefeated) return this.t(dialogue.bossDefeated);
    if (progress.kaelUnlocked) return this.t(dialogue.bossAwake);
    if (progress.wolfDefeated) return this.t(dialogue.wolfDefeated);

    return this.t(dialogue.reminder);
  }

  private onElderDialogueClosed(): void {
    if (!progress.elderTalked) {
      progress.elderTalked = true;
      progress.questStage = progress.wolfDefeated ? "boss" : "hunt";
    }

    this.unlockKaelIfReady();
    this.updateQuestDisplay();
    saveProgress();
  }

  protected onEnemyDefeated(enemy: Enemy): void {
    if (enemy !== this.wolf) {
      super.onEnemyDefeated(enemy);
      return;
    }

    // O lobo é o alvo da missão: derrotá-lo avança a história.
    progress.wolfDefeated = true;

    this.unlockKaelIfReady();

    if (!progress.kaelUnlocked) {
      this.statusText.setText(this.t(TEXTS.enemies.wolf.defeated));
    }

    saveProgress();
  }

  // ---------------------------------------------------------------------------
  // Kael (chefe do prólogo)
  // ---------------------------------------------------------------------------

  /** Kael aparece só depois de falar com o Ancião E derrotar o lobo. */
  private unlockKaelIfReady(): void {
    if (
      !progress.elderTalked ||
      !progress.wolfDefeated ||
      progress.kaelUnlocked
    ) {
      return;
    }

    progress.kaelUnlocked = true;
    progress.questStage = "boss";

    this.revealKael();

    this.statusText.setText(this.t(TEXTS.bosses.kael.appeared));

    this.updateQuestDisplay();
  }

  /** Mostra Kael e liga a física dele. */
  private revealKael(): void {
    const body = this.getPhysicsBody(this.kael.sprite);

    body.enable = true;
    body.setVelocity(0, 0);

    this.kael.sprite.body.setActive(true);
    this.kael.sprite.container.setVisible(true);

    showBossUi(this.kael);
  }

  protected attackSpecialTarget(): boolean {
    if (!progress.kaelUnlocked || progress.kaelDefeated) {
      return false;
    }

    if (this.strikeBoss(this.kael, TEXTS.bosses.kael)) {
      this.defeatKael();
    }

    return true;
  }

  private updateKael(): void {
    const distance = this.chasePlayer(
      this.kael.sprite,
      KAEL_STATS.speed,
      48,
      650,
      20,
    );

    if (
      distance <= 65 &&
      this.time.now - this.lastKaelAttackAt >= KAEL_STATS.attackCooldown
    ) {
      this.lastKaelAttackAt = this.time.now;
      this.damagePlayer(KAEL_STATS.damage);
    }
  }

  /** Derrotar Kael desfaz a barreira e envia o herói às Ruínas. */
  private defeatKael(): void {
    progress.kaelDefeated = true;
    progress.questStage = "ruins";

    const { x, y } = this.kael.sprite.body;

    createDeathBurst(this, x, y, this.kael.style.deathColor);
    this.removeKael();

    openCorruptionBarrier(this, this.northBarrier, true);

    this.updateQuestDisplay();
    this.statusText.setText(this.t(TEXTS.bosses.kael.defeated));

    saveProgress();
  }

  /** Tira Kael do mapa (ao derrotá-lo ou ao carregar um save). */
  private removeKael(): void {
    this.disableCharacter(this.kael.sprite);
    destroyBoss(this.kael);
  }
}

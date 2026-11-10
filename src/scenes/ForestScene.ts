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
  PLAYER_STATS,
  SHRINE_POSITION,
  SPIDER_SPAWNS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "../config";
import { TEXTS } from "../i18n/texts";
import { progress, saveProgress } from "../systems/progress";
import { spawnEnemy, type Enemy } from "../systems/enemies";
import { createForestWorld, type ForestWorld } from "../world/forest";
import {
  createCorruptionBarrier,
  openCorruptionBarrier,
  type CorruptionBarrier,
} from "../world/corruptionBarrier";
import { createElder, type ElderSprite } from "../characters/elder";
import { createKael } from "../characters/kael";
import type { CharacterSprite } from "../characters/types";
import {
  createDeathBurst,
  createImpactEffect,
  showDamageNumber,
} from "../effects/combatEffects";
import { AREA_SCENE_KEYS } from "./areas";
import { AreaScene } from "./AreaScene";

export class ForestScene extends AreaScene {
  protected readonly areaId = "forest";
  protected readonly worldWidth = WORLD_WIDTH;
  protected readonly worldHeight = WORLD_HEIGHT;

  private signs!: ForestWorld["signs"];
  private northBarrier!: CorruptionBarrier;
  private elder!: ElderSprite;
  /** O lobo da missão: derrotá-lo avança a história. */
  private wolf!: Enemy;

  private kael!: CharacterSprite;
  private kaelHealthGraphics!: Phaser.GameObjects.Graphics;
  private kaelNameText!: Phaser.GameObjects.Text;
  private kaelHealth: number = KAEL_STATS.maxHealth;
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

    this.createKael();
  }

  private createKael(): void {
    this.kael = createKael(this, 850, 380);
    this.kaelHealth = KAEL_STATS.maxHealth;
    this.lastKaelAttackAt = -10000;

    this.kaelHealthGraphics = this.add.graphics();
    this.kaelHealthGraphics.setDepth(3000);
    this.kaelHealthGraphics.setVisible(false);

    this.kaelNameText = this.add.text(850, 325, "KAEL", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#ff8293",
      stroke: "#160d1c",
      strokeThickness: 5,
    });

    this.kaelNameText.setOrigin(0.5);
    this.kaelNameText.setDepth(3000);
    this.kaelNameText.setVisible(false);
  }

  protected setupAreaPhysics(obstacles: Phaser.GameObjects.Rectangle[]): void {
    this.physics.add.collider(this.kael.body, obstacles);
    this.physics.add.collider(this.player.body, this.elder.body);

    this.physics.add.overlap(this.player.body, this.kael.body, () => {
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
  }

  // ---------------------------------------------------------------------------
  // A cada quadro
  // ---------------------------------------------------------------------------

  protected updateArea(): void {
    this.updateElderInteraction();

    if (progress.kaelUnlocked && !progress.kaelDefeated) {
      this.updateKael();
      this.drawKaelHealthBar();
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

    this.statusText.setText(this.t(TEXTS.combat.bossAppeared));

    this.updateQuestDisplay();
  }

  /** Mostra Kael e liga a física dele. */
  private revealKael(): void {
    const body = this.getPhysicsBody(this.kael);

    body.enable = true;
    body.setVelocity(0, 0);

    this.kael.body.setActive(true);
    this.kael.container.setVisible(true);
    this.kaelHealthGraphics.setVisible(true);
    this.kaelNameText.setVisible(true);

    this.drawKaelHealthBar();
  }

  protected attackSpecialTarget(): boolean {
    if (!progress.kaelUnlocked || progress.kaelDefeated) {
      return false;
    }

    this.attackKael();
    return true;
  }

  private attackKael(): void {
    const { x, y } = this.kael.body;
    const damage = PLAYER_STATS.attackDamage;

    if (!this.isTargetInFront(x, y, KAEL_STATS.hitRange)) {
      this.statusText.setText(this.t(TEXTS.combat.kaelMissed));
      return;
    }

    this.kaelHealth = Math.max(0, this.kaelHealth - damage);

    createImpactEffect(this, x, y, 0xff5267);
    showDamageNumber(this, x, y, damage, "#ff8293");

    this.statusText.setText(this.t(TEXTS.combat.kaelHit(damage)));

    this.kael.container.setAlpha(0.45);

    this.time.delayedCall(100, () => {
      if (this.kael.container.active && !progress.kaelDefeated) {
        this.kael.container.setAlpha(1);
      }
    });

    this.drawKaelHealthBar();

    if (this.kaelHealth <= 0) {
      this.defeatKael();
    }
  }

  private updateKael(): void {
    const distance = this.chasePlayer(this.kael, KAEL_STATS.speed, 48, 650, 20);

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

    createDeathBurst(this, this.kael.body.x, this.kael.body.y, 0x8d264e);
    this.removeKael();

    openCorruptionBarrier(this, this.northBarrier, true);

    this.updateQuestDisplay();
    this.statusText.setText(this.t(TEXTS.combat.kaelDefeated));

    saveProgress();
  }

  /** Tira Kael do mapa (ao derrotá-lo ou ao carregar um save). */
  private removeKael(): void {
    this.disableCharacter(this.kael);
    this.kael.container.destroy();
    this.kaelHealthGraphics.destroy();
    this.kaelNameText.destroy();
  }

  private drawKaelHealthBar(): void {
    if (!progress.kaelUnlocked || progress.kaelDefeated) {
      return;
    }

    const width = 100;
    const x = this.kael.body.x - width / 2;
    const y = this.kael.body.y - 53;
    const bar = this.kaelHealthGraphics;

    bar.clear();

    bar.fillStyle(0x100c16, 0.95);
    bar.fillRect(x, y, width, 10);

    bar.fillStyle(0x562038, 1);
    bar.fillRect(x + 1, y + 1, width - 2, 8);

    const healthWidth = (width - 2) * (this.kaelHealth / KAEL_STATS.maxHealth);

    if (healthWidth > 0) {
      bar.fillStyle(0xe43e62, 1);
      bar.fillRect(x + 1, y + 1, healthWidth, 8);
    }

    this.kaelNameText.setPosition(this.kael.body.x, this.kael.body.y - 76);
  }
}

// Floresta Sussurrante: o prólogo.
// Missão: falar com o Ancião → derrotar o Lobo Corrompido → derrotar Kael.
// Derrotar Kael desfaz a barreira ao norte, que leva às Ruínas do Santuário.
//
// Capítulo 5: o herói volta pelo portal de luz da vila e o Ancião rompe o
// Selo Astral a oeste, abrindo a trilha para o Cemitério de Dragões. O
// portal da vila leva de volta à cratera das Terras Vulcânicas.
//
// Herói, HUD, combate, checkpoints e saídas ficam na cena-base (AreaScene).

import type Phaser from "phaser";
import {
  ASTRAL_SEAL,
  ELDER_TALK_RANGE,
  KAEL_POSITION,
  KAEL_STATS,
  NORTH_BARRIER,
  SHRINE_POSITION,
  SPIDER_SPAWNS,
  VILLAGE_PORTAL_POSITION,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "../config";
import { TEXTS } from "../i18n/texts";
import { progress, reachedStage, saveProgress } from "../systems/progress";
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
import {
  createAstralSeal,
  openAstralSeal,
  type AstralSeal,
} from "../world/astralSeal";
import { createPortal, openPortal, type AstralPortal } from "../world/portal";
import { createElder, type ElderSprite } from "../characters/elder";
import { createKael } from "../characters/kael";
import {
  createChargeWarning,
  createDeathBurst,
  createImpactEffect,
} from "../effects/combatEffects";
import { audio } from "../audio/engine";
import { AREA_SCENE_KEYS } from "./areas";
import { AreaScene } from "./AreaScene";

/**
 * Estados de Kael:
 * hidden (escondido) → chasing (persegue) → windup (prepara a investida)
 * → charging (corre em linha reta) → recovering (parado) → chasing ...
 * → defeated (derrotado).
 */
type KaelState =
  | "hidden"
  | "chasing"
  | "windup"
  | "charging"
  | "recovering"
  | "defeated";

export class ForestScene extends AreaScene {
  protected readonly areaId = "forest";
  protected readonly worldWidth = WORLD_WIDTH;
  protected readonly worldHeight = WORLD_HEIGHT;
  protected readonly areaName = TEXTS.places.forest;
  protected readonly musicTrack = "forest";

  private signs!: ForestWorld["signs"];
  private northBarrier!: CorruptionBarrier;
  private astralSeal!: AstralSeal;
  private sealSign!: Phaser.GameObjects.Text;
  private villagePortal!: AstralPortal;
  private elder!: ElderSprite;
  /** O lobo da missão: derrotá-lo avança a história. */
  private wolf!: Enemy;

  private kael!: Boss;
  private kaelState: KaelState = "hidden";
  private lastKaelAttackAt = -10000;
  private lastChargeAt = -10000;
  /** Direção da investida, travada no momento do aviso. */
  private chargeDirection = { x: 0, y: 0 };

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

    // Selo Astral a oeste: leva ao Cemitério de Dragões depois de rompido.
    const seal = ASTRAL_SEAL;

    this.astralSeal = createAstralSeal(this, seal.x, seal.y, seal.height);
    this.sealSign = this.add
      .text(seal.x + 70, seal.y - seal.height / 2 - 20, "", {
        fontFamily: "Georgia, serif",
        fontSize: "15px",
        color: "#dbe6ff",
        stroke: "#15251a",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(2000);

    this.addExit({
      x: 0,
      y: seal.y - seal.height / 2,
      width: 40,
      height: seal.height,
      target: "graveyardEntrance",
      isOpen: () => reachedStage("passage"),
    });

    // Portal de luz da vila: volta para a cratera das Terras Vulcânicas.
    const portal = VILLAGE_PORTAL_POSITION;

    this.villagePortal = createPortal(this, portal.x, portal.y);

    this.addExit({
      x: portal.x - 40,
      y: portal.y - 30,
      width: 80,
      height: 60,
      target: "volcanoCrater",
      isOpen: () => reachedStage("return"),
    });

    return [
      ...treeColliders,
      this.northBarrier.collider,
      this.astralSeal.collider,
    ];
  }

  protected createActors(): void {
    this.elder = createElder(this, 650, 960);

    this.wolf = spawnEnemy(this, "wolf", 850, 790);

    const spiders = SPIDER_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "spider", x, y),
    );

    this.enemies.push(this.wolf, ...spiders);

    this.kael = createBoss(this, createKael(this, KAEL_POSITION.x, KAEL_POSITION.y), KAEL_STATS, {
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

    this.kaelState = "hidden";
    this.lastKaelAttackAt = -10000;
    this.lastChargeAt = -10000;
  }

  protected setupAreaPhysics(obstacles: Phaser.GameObjects.Rectangle[]): void {
    const kaelBody = this.kael.sprite.body;

    this.physics.add.collider(kaelBody, obstacles);
    this.physics.add.collider(this.player.body, this.elder.body);

    // Encostar em Kael machuca; durante a investida, machuca mais.
    // Escondido, derrotado ou se recuperando (janela para atacar): não machuca.
    this.physics.add.overlap(this.player.body, kaelBody, () => {
      if (
        this.kaelState === "hidden" ||
        this.kaelState === "defeated" ||
        this.kaelState === "recovering"
      ) {
        return;
      }

      this.damagePlayer(
        this.kaelState === "charging"
          ? KAEL_STATS.chargeDamage
          : KAEL_STATS.damage,
      );
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
      // A espada de Kael fica onde ele surgiu até o herói pegá-la.
      this.placeItem("corruptedBlade", KAEL_POSITION.x, KAEL_POSITION.y);
    } else if (progress.kaelUnlocked) {
      this.revealKael();
    }

    if (reachedStage("return")) {
      openPortal(this, this.villagePortal, false);
    }

    if (reachedStage("passage")) {
      openAstralSeal(this, this.astralSeal, false);
    }
  }

  protected applyAreaLanguage(): void {
    this.signs.trail.setText(this.t(TEXTS.places.trail));
    this.signs.forest.setText(this.t(TEXTS.places.forest));
    this.elder.label.setText(this.t(TEXTS.elder.label));
    this.sealSign.setText(this.t(TEXTS.places.seal));

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
    if (reachedStage("passage")) return this.t(dialogue.sealOpen);
    if (reachedStage("return")) return this.t(dialogue.fourthFragment);
    if (reachedStage("portal3")) return this.t(dialogue.thirdFragment);
    if (reachedStage("portal2")) return this.t(dialogue.secondFragment);
    if (reachedStage("portal")) return this.t(dialogue.firstFragment);
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
    this.breakSealIfReady();
    saveProgress();
  }

  /** Depois da conversa da volta (Capítulo 5), o Ancião rompe o selo. */
  private breakSealIfReady(): void {
    if (progress.questStage !== "return") {
      return;
    }

    progress.questStage = "passage";

    openAstralSeal(this, this.astralSeal, true);
    this.cameras.main.flash(500, 220, 235, 255);
    audio.play("shrine");

    this.updateQuestDisplay();
    this.statusText.setText(this.t(TEXTS.chapter5.sealOpened));
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
      this.statusText.setText(this.t(TEXTS.hints.wolfQuestDone));
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
    audio.play("bossAppear");

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

    this.kaelState = "chasing";

    showBossUi(this.kael);
    audio.setDrums(true);
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
    switch (this.kaelState) {
      case "chasing":
        this.updateKaelChasing();
        return;

      case "windup":
      case "recovering":
        // Parado: preparando a investida ou se recuperando dela.
        this.getPhysicsBody(this.kael.sprite).setVelocity(0, 0);
        this.syncKaelSprite();
        return;

      case "charging":
        this.syncKaelSprite();

        // Bateu numa árvore (ou na borda do mapa): fica atordoado.
        if (!this.getPhysicsBody(this.kael.sprite).blocked.none) {
          this.endCharge(true);
        }
        return;

      case "hidden":
      case "defeated":
        return;
    }
  }

  private updateKaelChasing(): void {
    const now = this.time.now;
    const distance = this.chasePlayer(
      this.kael.sprite,
      KAEL_STATS.speed,
      KAEL_STATS.stopDistance,
      KAEL_STATS.sightRange,
      20,
    );

    // Ataque de perto.
    if (
      distance <= KAEL_STATS.meleeReach &&
      now - this.lastKaelAttackAt >= KAEL_STATS.attackCooldown
    ) {
      this.lastKaelAttackAt = now;
      this.damagePlayer(KAEL_STATS.damage);
      return;
    }

    // Distância média: prepara a investida.
    if (
      distance >= KAEL_STATS.chargeMinRange &&
      distance <= KAEL_STATS.chargeMaxRange &&
      now - this.lastChargeAt >= KAEL_STATS.chargeCooldown
    ) {
      this.startChargeWindup(distance);
    }
  }

  /** Para, mostra a faixa de aviso e trava a direção da investida. */
  private startChargeWindup(distance: number): void {
    this.kaelState = "windup";
    this.lastChargeAt = this.time.now;

    const { x, y } = this.kael.sprite.body;
    const dx = this.player.body.x - x;
    const dy = this.player.body.y - y;

    this.chargeDirection = { x: dx / distance, y: dy / distance };

    this.getPhysicsBody(this.kael.sprite).setVelocity(0, 0);

    const chargeLength =
      (KAEL_STATS.chargeSpeed * KAEL_STATS.chargeDuration) / 1000;

    createChargeWarning(
      this,
      x,
      y,
      Math.atan2(dy, dx),
      chargeLength + 20,
      40,
      KAEL_STATS.chargeWindup,
    );

    // Kael "se agacha" enquanto prepara a investida.
    this.tweens.add({
      targets: this.kael.sprite.container,
      scaleX: 1.1,
      scaleY: 0.85,
      duration: KAEL_STATS.chargeWindup,
      ease: "Quad.In",
    });

    this.statusText.setText(this.t(TEXTS.bosses.kael.charging));
    audio.play("warning");

    this.time.delayedCall(KAEL_STATS.chargeWindup, () => this.startCharge());
  }

  private startCharge(): void {
    // Pode ter sido derrotado durante o aviso.
    if (this.kaelState !== "windup") {
      return;
    }

    this.kaelState = "charging";

    const { container, body } = this.kael.sprite;

    this.tweens.killTweensOf(container);
    container.setScale(1);

    this.getPhysicsBody(this.kael.sprite).setVelocity(
      this.chargeDirection.x * KAEL_STATS.chargeSpeed,
      this.chargeDirection.y * KAEL_STATS.chargeSpeed,
    );

    // Poeira na largada.
    createImpactEffect(this, body.x, body.y + 12, 0x8a7a6a, 8, 26);

    this.time.delayedCall(KAEL_STATS.chargeDuration, () => this.endCharge(false));
  }

  /** Termina a investida. Se bateu em algo, fica atordoado por mais tempo. */
  private endCharge(crashed: boolean): void {
    if (this.kaelState !== "charging") {
      return;
    }

    this.kaelState = "recovering";

    const { container, body } = this.kael.sprite;

    this.getPhysicsBody(this.kael.sprite).setVelocity(0, 0);

    if (crashed) {
      this.cameras.main.shake(200, 0.007);
      audio.play("slam");
      createImpactEffect(this, body.x, body.y, 0xd9c8ff, 10, 32);
      this.statusText.setText(this.t(TEXTS.bosses.kael.stunned));

      // Balança tonto enquanto está atordoado.
      this.tweens.add({
        targets: container,
        angle: { from: -8, to: 8 },
        duration: 160,
        yoyo: true,
        repeat: -1,
      });
    }

    const recoverTime = crashed ? KAEL_STATS.stunTime : KAEL_STATS.recoverTime;

    this.time.delayedCall(recoverTime, () => {
      if (this.kaelState !== "recovering") {
        return;
      }

      this.tweens.killTweensOf(container);
      container.setAngle(0);
      this.kaelState = "chasing";
    });
  }

  /** Mantém o desenho de Kael junto do corpo físico. */
  private syncKaelSprite(): void {
    const { container, body } = this.kael.sprite;

    container.setPosition(body.x, body.y);
    container.setDepth(body.y + 20);
  }

  /** Derrotar Kael desfaz a barreira e envia o herói às Ruínas. */
  private defeatKael(): void {
    progress.kaelDefeated = true;
    progress.questStage = "ruins";

    const { x, y } = this.kael.sprite.body;

    createDeathBurst(this, x, y, this.kael.style.deathColor);
    audio.play("enemyDeath");
    this.removeKael();
    this.placeItem("corruptedBlade", x, y);
    this.dropPotion(x + 40, y + 10);

    openCorruptionBarrier(this, this.northBarrier, true);
    audio.play("shrine");

    this.updateQuestDisplay();
    this.statusText.setText(this.t(TEXTS.bosses.kael.defeated));

    saveProgress();
  }

  /** Tira Kael do mapa (ao derrotá-lo ou ao carregar um save). */
  private removeKael(): void {
    this.kaelState = "defeated";
    audio.setDrums(false);
    this.tweens.killTweensOf(this.kael.sprite.container);
    this.disableCharacter(this.kael.sprite);
    destroyBoss(this.kael);
  }
}

// Salão do Tesouro: dentro do castelo da Cidadela, a batalha final.
// Só Ignis está aqui. Quando o herói chega perto do centro do salão, a cena
// da descida começa: o herói para, uma sombra enorme cresce no chão e Ignis
// desce do céu pelo buraco no teto, pousando no meio do ouro.
//
// Fase 1 (no chão): Ignis vira devagar para encarar o herói e ataca com
// - garras: golpe à frente quando o herói está perto;
// - cauda: um giro que acerta em volta, se o herói fica atrás ou do lado;
// - sopro de fogo: um cone à frente, com aviso no chão.
// (As fases 2 e 3 chegam nas próximas etapas.)

import Phaser from "phaser";
import {
  HOARD_HEIGHT,
  HOARD_WIDTH,
  IGNIS_DESCENT,
  IGNIS_LANDING,
  IGNIS_STATS,
} from "../config";
import { TEXTS } from "../i18n/texts";
import { progress, reachedStage, saveProgress } from "../systems/progress";
import {
  createBoss,
  destroyBoss,
  drawBossHealthBar,
  showBossUi,
  type Boss,
} from "../systems/bosses";
import { HOARD_DOOR, createCoinBurst, createHoardWorld } from "../world/hoard";
import {
  createIgnis,
  setIgnisFacing,
  setIgnisWings,
  type IgnisSprite,
} from "../characters/ignis";
import {
  createConeWarning,
  createDeathBurst,
  createShockwave,
  createSlashEffect,
} from "../effects/combatEffects";
import { audio } from "../audio/engine";
import { AREA_SCENE_KEYS } from "./areas";
import { AreaScene } from "./AreaScene";

/**
 * Estados de Ignis:
 * waiting (ainda no céu) → descending (a cena da descida) → idle (encara o
 * herói e decide o ataque) ⇄ claw / tail / breathWindup → breathing /
 * recovering → defeated.
 */
type IgnisState =
  | "waiting"
  | "descending"
  | "idle"
  | "claw"
  | "tail"
  | "breathWindup"
  | "breathing"
  | "recovering"
  | "defeated";

const FIRE_COLORS = [0xff6a2a, 0xffb347, 0xffe0a0, 0xff4a2a];
/** Distância do centro do corpo até a boca (onde o fogo sai). */
const HEAD_OFFSET = 140;

export class HoardScene extends AreaScene {
  protected readonly areaId = "hoard";
  protected readonly worldWidth = HOARD_WIDTH;
  protected readonly worldHeight = HOARD_HEIGHT;
  protected readonly areaName = TEXTS.places.hoard;
  protected readonly musicTrack = "citadel";

  private ignisSprite!: IgnisSprite;
  private ignis!: Boss;
  private ignisState: IgnisState = "waiting";
  /** Para onde Ignis olha (radianos; 0 = direita). */
  private facing = Math.PI / 2;
  private lastClawAt = 0;
  private lastTailAt = 0;
  private lastBreathAt = 0;
  private breathEndsAt = 0;
  private lastFireParticleAt = 0;

  constructor() {
    super(AREA_SCENE_KEYS.hoard);
  }

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  protected createWorld(): Phaser.GameObjects.Rectangle[] {
    const obstacles = createHoardWorld(this);

    // Porta (embaixo): volta para o pátio da Cidadela.
    this.addExit({ ...HOARD_DOOR, target: "citadelGate", isOpen: () => true });

    return obstacles;
  }

  protected createActors(): void {
    // Só Ignis: nenhum outro inimigo dentro do castelo.
    this.ignisSprite = createIgnis(this, IGNIS_LANDING.x, IGNIS_LANDING.y);

    this.ignis = createBoss(this, this.ignisSprite, IGNIS_STATS, {
      // Ignis é enorme: a barra fica fixa embaixo da tela.
      screenBar: true,
      barWidth: 520,
      barOffsetY: 0,
      nameOffsetY: 0,
      nameColor: "#ffb070",
      barColor: 0xd8402a,
      barBackColor: 0x3a0e0a,
      impactColor: 0xffd0a0,
      damageTextColor: "#ffe0c0",
      deathColor: 0xff7a2a,
    });

    this.ignisState = "waiting";
    this.facing = Math.PI / 2;
    setIgnisFacing(this.ignisSprite, this.facing);

    // Ainda está no céu: invisível e sem corpo físico até pousar.
    this.ignisSprite.container.setVisible(false);
    this.getPhysicsBody(this.ignisSprite).enable = false;
  }

  protected setupAreaPhysics(): void {
    // O herói não atravessa Ignis.
    this.physics.add.collider(this.player.body, this.ignis.sprite.body);
  }

  /** Ignis já derrotado: o salão fica em paz. */
  protected restoreAreaState(): void {
    if (reachedStage("complete")) {
      this.removeIgnis();
    }
  }

  protected applyAreaLanguage(): void {
    if (this.ignisState !== "defeated") {
      this.ignis.nameText.setText(this.t(TEXTS.bosses.ignis.name));
    }
  }

  // ---------------------------------------------------------------------------
  // A cada quadro
  // ---------------------------------------------------------------------------

  protected updateArea(): void {
    this.updateIgnis();
  }

  // ---------------------------------------------------------------------------
  // A descida de Ignis
  // ---------------------------------------------------------------------------

  /** O herói para, a câmera mostra o centro e Ignis desce pelo teto. */
  private startDescent(): void {
    this.ignisState = "descending";
    this.playerFrozen = true;

    const { x, y } = IGNIS_LANDING;
    const { shadowTime, flightTime } = IGNIS_DESCENT;
    const camera = this.cameras.main;
    const { container } = this.ignisSprite;

    // A câmera vai até o centro do salão para mostrar a descida.
    camera.stopFollow();
    // (O pan da câmera usa o nome completo da suavização.)
    camera.pan(x, y + 60, 700, "Sine.easeInOut");

    this.statusText.setText(this.t(TEXTS.bosses.ignis.descending));
    audio.play("roar");
    camera.shake(shadowTime + flightTime, 0.004);

    // A sombra cresce no chão: algo enorme está chegando.
    const shadow = this.add
      .ellipse(x, y + 10, 260, 120, 0x000000, 0)
      .setScale(0.2)
      .setDepth(y - 10);

    this.tweens.add({
      targets: shadow,
      scale: 1,
      fillAlpha: 0.5,
      duration: shadowTime + flightTime,
      ease: "Quad.In",
    });

    // Ignis desce do céu: começa grande e alto, com as asas abertas.
    this.time.delayedCall(shadowTime, () => {
      setIgnisWings(this.ignisSprite, true);
      container.setVisible(true).setPosition(x, y - 420).setScale(2.2).setAlpha(0.2);

      this.tweens.add({
        targets: this.ignisSprite.wingsSpread,
        scaleY: { from: 1, to: 0.6 },
        duration: 260,
        yoyo: true,
        repeat: -1,
      });

      this.tweens.add({
        targets: container,
        y,
        scale: 1,
        alpha: 1,
        duration: flightTime,
        ease: "Quad.In",
        onComplete: () => {
          shadow.destroy();
          this.land();
        },
      });
    });
  }

  /** O pouso: impacto, moedas voando, e a batalha começa. */
  private land(): void {
    const { x, y } = IGNIS_LANDING;
    const now = this.time.now;
    const camera = this.cameras.main;

    this.tweens.killTweensOf(this.ignisSprite.wingsSpread);
    this.ignisSprite.wingsSpread.setScale(1);
    setIgnisWings(this.ignisSprite, false);
    this.ignisSprite.container.setDepth(y + 60);

    const body = this.getPhysicsBody(this.ignisSprite);

    body.enable = true;
    body.reset(x, y);

    createShockwave(this, x, y, 230);
    createCoinBurst(this, x, y, 50, 280);
    camera.shake(500, 0.012);
    audio.play("slam");
    audio.play("explosion");
    audio.play("roar");

    this.ignis.nameText.setText(this.t(TEXTS.bosses.ignis.name));
    showBossUi(this.ignis);
    this.statusText.setText(this.t(TEXTS.bosses.ignis.landed));
    audio.setDrums(true);

    // A câmera volta a seguir o herói, e o herói pode se mexer.
    camera.startFollow(this.player.body, true, 0.08, 0.08);
    this.playerFrozen = false;

    this.ignisState = "idle";
    this.lastClawAt = now;
    this.lastTailAt = now;
    this.lastBreathAt = now - IGNIS_STATS.breathCooldown + 1500;
  }

  // ---------------------------------------------------------------------------
  // Ignis: fase 1
  // ---------------------------------------------------------------------------

  private angleToPlayer(): number {
    const { x, y } = this.ignis.sprite.body;

    return Math.atan2(this.player.body.y - y, this.player.body.x - x);
  }

  /** Diferença (0 a π) entre para onde ele olha e onde o herói está. */
  private angleOffPlayer(): number {
    return Math.abs(Phaser.Math.Angle.Wrap(this.angleToPlayer() - this.facing));
  }

  /** Vira devagar na direção do herói (velocidade turnSpeed). */
  private turnTowardPlayer(): void {
    const maxStep = (IGNIS_STATS.turnSpeed * this.game.loop.delta) / 1000;

    this.facing = Phaser.Math.Angle.RotateTo(
      this.facing,
      this.angleToPlayer(),
      maxStep,
    );
    setIgnisFacing(this.ignisSprite, this.facing);
  }

  /** Onde fica a boca (de onde sai o fogo). */
  private headPosition(): { x: number; y: number } {
    const { x, y } = this.ignis.sprite.body;

    return {
      x: x + Math.cos(this.facing) * HEAD_OFFSET,
      y: y + Math.sin(this.facing) * HEAD_OFFSET,
    };
  }

  private updateIgnis(): void {
    const now = this.time.now;
    const stats = IGNIS_STATS;

    switch (this.ignisState) {
      case "waiting":
        if (
          progress.questStage === "ignis" &&
          this.distanceToPlayer(IGNIS_LANDING.x, IGNIS_LANDING.y) <=
            stats.triggerRange
        ) {
          this.startDescent();
        }
        return;

      case "idle": {
        const distance = this.chasePlayer(
          this.ignis.sprite,
          stats.speed,
          stats.stopDistance,
          stats.sightRange,
          60,
        );

        this.turnTowardPlayer();
        drawBossHealthBar(this.ignis);

        const off = this.angleOffPlayer();

        if (
          distance <= stats.tailRange &&
          off > 1.9 &&
          now - this.lastTailAt >= stats.tailCooldown
        ) {
          this.startTail();
        } else if (
          distance <= stats.clawRange &&
          off <= stats.clawArc &&
          now - this.lastClawAt >= stats.clawCooldown
        ) {
          this.startClaw();
        } else if (
          distance >= stats.breathMinRange &&
          distance <= stats.breathRange &&
          off <= 0.5 &&
          now - this.lastBreathAt >= stats.breathCooldown
        ) {
          this.startBreath();
        }
        return;
      }

      case "breathing":
        this.getPhysicsBody(this.ignis.sprite).setVelocity(0, 0);
        drawBossHealthBar(this.ignis);
        this.updateBreath();
        return;

      case "claw":
      case "tail":
      case "breathWindup":
      case "recovering":
        this.getPhysicsBody(this.ignis.sprite).setVelocity(0, 0);
        this.syncCharacter(this.ignis.sprite, 60);
        drawBossHealthBar(this.ignis);
        return;

      case "descending":
      case "defeated":
        return;
    }
  }

  /** Fica parado um pouco depois de atacar (a brecha) e volta a agir. */
  private recover(): void {
    this.ignisState = "recovering";

    this.time.delayedCall(IGNIS_STATS.recover, () => {
      if (this.ignisState === "recovering") {
        this.ignisState = "idle";
      }
    });
  }

  // --- Garras ------------------------------------------------------------------

  private startClaw(): void {
    this.ignisState = "claw";

    const { rig } = this.ignisSprite;

    // Recua o corpo antes do golpe (o aviso).
    this.tweens.add({
      targets: rig,
      scaleX: 0.9,
      duration: IGNIS_STATS.clawWindup,
      ease: "Quad.In",
    });

    this.time.delayedCall(IGNIS_STATS.clawWindup, () => this.claw());
  }

  private claw(): void {
    if (this.ignisState !== "claw") {
      return;
    }

    const stats = IGNIS_STATS;
    const { x, y } = this.ignis.sprite.body;
    const dirX = Math.cos(this.facing);
    const dirY = Math.sin(this.facing);

    this.lastClawAt = this.time.now;
    this.tweens.killTweensOf(this.ignisSprite.rig);
    this.ignisSprite.rig.setScale(1);

    createSlashEffect(this, x + dirX * 80, y + dirY * 80, dirX, dirY);
    createSlashEffect(this, x + dirX * 95 - dirY * 25, y + dirY * 95 + dirX * 25, dirX, dirY);
    audio.play("swing");
    this.cameras.main.shake(100, 0.004);

    if (
      this.distanceToPlayer(x, y) <= stats.clawRange + 20 &&
      this.angleOffPlayer() <= stats.clawArc
    ) {
      this.damagePlayer(stats.clawDamage);
    }

    this.recover();
  }

  // --- Cauda ---------------------------------------------------------------------

  private startTail(): void {
    this.ignisState = "tail";

    const stats = IGNIS_STATS;
    const { rig } = this.ignisSprite;

    this.statusText.setText(this.t(TEXTS.bosses.ignis.tail));
    audio.play("warning");

    // Torce o corpo para trás (aviso) e depois gira uma volta inteira.
    this.tweens.add({
      targets: rig,
      rotation: this.facing - 0.6,
      duration: stats.tailWindup,
      ease: "Quad.In",
      onComplete: () => {
        if (this.ignisState !== "tail") {
          return;
        }

        this.tailSweep();

        this.tweens.add({
          targets: rig,
          rotation: this.facing - 0.6 + Math.PI * 2,
          duration: 420,
          ease: "Quad.Out",
          onComplete: () => {
            setIgnisFacing(this.ignisSprite, this.facing);
            this.recover();
          },
        });
      },
    });
  }

  private tailSweep(): void {
    const stats = IGNIS_STATS;
    const { x, y } = this.ignis.sprite.body;

    this.lastTailAt = this.time.now;

    createShockwave(this, x, y, stats.tailRadius);
    createCoinBurst(this, x, y, 16, stats.tailRadius);
    audio.play("slam");

    if (this.distanceToPlayer(x, y) <= stats.tailRadius) {
      this.damagePlayer(stats.tailDamage);
    }
  }

  // --- Sopro de fogo -------------------------------------------------------------

  /** Trava a direção, mostra o cone no chão e enche a boca de fogo. */
  private startBreath(): void {
    this.ignisState = "breathWindup";

    const stats = IGNIS_STATS;
    const head = this.headPosition();

    createConeWarning(
      this,
      head.x,
      head.y,
      this.facing,
      stats.breathRange,
      stats.breathArc,
      stats.breathWindup,
    );

    this.statusText.setText(this.t(TEXTS.bosses.ignis.breath));
    audio.play("warning");

    this.tweens.add({
      targets: this.ignisSprite.mouthGlow,
      scale: 2.2,
      fillAlpha: 0.9,
      duration: stats.breathWindup,
      ease: "Quad.In",
    });

    this.time.delayedCall(stats.breathWindup, () => {
      if (this.ignisState !== "breathWindup") {
        return;
      }

      this.ignisState = "breathing";
      this.breathEndsAt = this.time.now + stats.breathTime;
      audio.play("flame");
      audio.play("explosion");
    });
  }

  /** Enquanto sopra: solta chamas no cone e queima quem estiver nele. */
  private updateBreath(): void {
    const stats = IGNIS_STATS;
    const now = this.time.now;
    const head = this.headPosition();

    if (now >= this.breathEndsAt) {
      this.lastBreathAt = now;
      this.tweens.killTweensOf(this.ignisSprite.mouthGlow);
      this.ignisSprite.mouthGlow.setScale(1).setFillStyle(0xffa040, 0);
      this.recover();
      return;
    }

    if (now - this.lastFireParticleAt >= 35) {
      this.lastFireParticleAt = now;
      this.spawnFireParticle(head.x, head.y);
    }

    // Herói dentro do cone: queima (o damagePlayer espera a invencibilidade).
    const dx = this.player.body.x - head.x;
    const dy = this.player.body.y - head.y;
    const angle = Math.atan2(dy, dx);

    if (
      Math.hypot(dx, dy) <= stats.breathRange &&
      Math.abs(Phaser.Math.Angle.Wrap(angle - this.facing)) <= stats.breathArc
    ) {
      this.damagePlayer(stats.breathDamage);
    }
  }

  /** Uma bola de fogo que sai da boca e se espalha pelo cone. */
  private spawnFireParticle(x: number, y: number): void {
    const stats = IGNIS_STATS;
    const angle =
      this.facing + Phaser.Math.FloatBetween(-stats.breathArc, stats.breathArc);
    const distance = stats.breathRange * Phaser.Math.FloatBetween(0.5, 1);
    const flame = this.add
      .circle(x, y, Phaser.Math.Between(6, 11), Phaser.Utils.Array.GetRandom(FIRE_COLORS), 0.9)
      .setDepth(y + 150);

    this.tweens.add({
      targets: flame,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      scale: 2.6,
      alpha: 0,
      duration: 420,
      ease: "Quad.Out",
      onComplete: () => flame.destroy(),
    });
  }

  // --- Golpes do herói -------------------------------------------------------------

  protected attackSpecialTarget(): boolean {
    if (
      this.ignisState === "waiting" ||
      this.ignisState === "descending" ||
      this.ignisState === "defeated"
    ) {
      return false;
    }

    if (this.strikeBoss(this.ignis, TEXTS.bosses.ignis)) {
      this.defeatIgnis();
    }

    return true;
  }

  /**
   * Ignis derrotado. (O final de verdade, com o Fragmento Central e os
   * créditos, chega numa etapa seguinte; por enquanto, a tela de vitória.)
   */
  private defeatIgnis(): void {
    progress.questStage = "complete";

    const { x, y } = this.ignis.sprite.body;

    createDeathBurst(this, x, y, this.ignis.style.deathColor);
    createCoinBurst(this, x, y, 60, 300);
    this.cameras.main.shake(800, 0.012);
    audio.play("roar");
    audio.play("explosion");
    this.removeIgnis();

    this.updateQuestDisplay();
    this.statusText.setText(this.t(TEXTS.bosses.ignis.defeated));
    saveProgress();

    this.time.delayedCall(1500, () => this.showGameOver(true));
  }

  /** Tira Ignis do salão (ao derrotá-lo ou ao carregar um save). */
  private removeIgnis(): void {
    this.ignisState = "defeated";
    audio.setDrums(false);
    this.tweens.killTweensOf(this.ignisSprite.container);
    this.tweens.killTweensOf(this.ignisSprite.rig);
    this.tweens.killTweensOf(this.ignisSprite.mouthGlow);
    this.disableCharacter(this.ignis.sprite);
    destroyBoss(this.ignis);
  }
}

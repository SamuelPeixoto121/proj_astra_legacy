// Salão do Tesouro: dentro do castelo da Cidadela, a batalha final.
// Só Ignis está aqui. Quando o herói chega perto do centro do salão, a cena
// da descida começa: o herói para, uma sombra enorme cresce no chão e Ignis
// desce do céu pelo buraco no teto, pousando no meio do ouro.
//
// Fase 1 (no chão): Ignis vira devagar para encarar o herói e ataca com
// - garras: golpe à frente quando o herói está perto;
// - cauda: um giro que acerta em volta, se o herói fica atrás ou do lado;
// - sopro de fogo: um cone à frente, com aviso no chão.
//
// Fase 2 (no ar, com 2/3 da vida): voa em volta do salão sem poder ser
// atingido; solta bolas de fogo onde o herói está e mergulha em linha reta.
// Depois do mergulho fica pousado um tempo: é a hora de atacar.
//
// Fase 3 (furioso, com 1/3 da vida): volta ao chão de vez, ataca mais rápido
// e quebra o chão: fendas de fogo que ficam para sempre e queimam quem pisa.

import Phaser from "phaser";
import {
  HOARD_ARENA,
  HOARD_HEIGHT,
  HOARD_WIDTH,
  IGNIS_DESCENT,
  IGNIS_LANDING,
  IGNIS_PHASES,
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
  createChargeWarning,
  createConeWarning,
  createDeathBurst,
  createImpactEffect,
  createShockwave,
  createSlamWarning,
  createSlashEffect,
} from "../effects/combatEffects";
import { audio } from "../audio/engine";
import { AREA_SCENE_KEYS } from "./areas";
import { AreaScene } from "./AreaScene";

/**
 * Estados de Ignis:
 * waiting (ainda no céu) → descending (a cena da descida)
 * → fase 1/3 no chão: idle ⇄ claw / tail / breathWindup → breathing /
 *   recovering
 * → fase 2 no ar: takeoff → flying ⇄ barrage / diveWindup → diving
 *   → grounded (pousado: a brecha) → takeoff ...
 * → phaseShift (mudando para a fase 3) → defeated.
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
  | "takeoff"
  | "flying"
  | "barrage"
  | "diveWindup"
  | "diving"
  | "grounded"
  | "phaseShift"
  | "defeated";

/** Fenda de fogo no chão (fase 3): fica para sempre e queima quem pisa. */
interface FloorCrack {
  x: number;
  y: number;
}

const FIRE_COLORS = [0xff6a2a, 0xffb347, 0xffe0a0, 0xff4a2a];
/** Distância do centro do corpo até a boca (onde o fogo sai). */
const HEAD_OFFSET = 140;
/** Profundidade de Ignis no ar (por cima de tudo, menos o HUD). */
const FLYING_DEPTH = 2500;

export class HoardScene extends AreaScene {
  protected readonly areaId = "hoard";
  protected readonly worldWidth = HOARD_WIDTH;
  protected readonly worldHeight = HOARD_HEIGHT;
  protected readonly areaName = TEXTS.places.hoard;
  protected readonly musicTrack = "citadel";

  private ignisSprite!: IgnisSprite;
  private ignis!: Boss;
  private ignisState: IgnisState = "waiting";
  private phase: 1 | 2 | 3 = 1;
  /** Para onde Ignis olha (radianos; 0 = direita). */
  private facing = Math.PI / 2;
  private lastClawAt = 0;
  private lastTailAt = 0;
  private lastBreathAt = 0;
  private breathEndsAt = 0;
  private lastFireParticleAt = 0;

  /** Fase 2: posição na volta pelo salão (radianos). */
  private flyAngle = 0;
  private flyShadow?: Phaser.GameObjects.Ellipse;
  private nextFlyAttackAt = 0;
  /** Alterna entre bolas de fogo e mergulho. */
  private nextFlyAttack: "barrage" | "dive" = "barrage";
  private groundedUntil = 0;

  /** Fase 3: fendas de fogo no chão. */
  private cracks: FloorCrack[] = [];
  private nextCrackAt = 0;

  constructor() {
    super(AREA_SCENE_KEYS.hoard);
  }

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  protected createWorld(): Phaser.GameObjects.Rectangle[] {
    const obstacles = createHoardWorld(this);

    this.cracks = [];

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
    this.phase = 1;
    this.flyShadow = undefined;
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
    this.updateCracks();
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
    // (O pan da câmera usa o nome completo da suavização.)
    camera.stopFollow();
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
      this.spreadWings(true);
      container
        .setVisible(true)
        .setPosition(x, y - 420)
        .setScale(2.2)
        .setAlpha(0.2);

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

    this.spreadWings(false);
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

  /** Abre as asas (batendo) para voar ou dobra para ficar no chão. */
  private spreadWings(spread: boolean): void {
    const wings = this.ignisSprite.wingsSpread;

    this.tweens.killTweensOf(wings);
    wings.setScale(1);
    setIgnisWings(this.ignisSprite, spread);

    if (spread) {
      this.tweens.add({
        targets: wings,
        scaleY: { from: 1, to: 0.6 },
        duration: 260,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Ignis: comum a todas as fases
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

  /** Tempo de espera entre ataques (menor na fase 3, furioso). */
  private cooldown(base: number): number {
    return this.phase === 3 ? base * IGNIS_PHASES.enragedFactor : base;
  }

  private updateIgnis(): void {
    switch (this.ignisState) {
      case "waiting":
        if (
          progress.questStage === "ignis" &&
          this.distanceToPlayer(IGNIS_LANDING.x, IGNIS_LANDING.y) <=
            IGNIS_STATS.triggerRange
        ) {
          this.startDescent();
        }
        return;

      case "descending":
      case "defeated":
        return;

      case "idle":
        this.updateGroundIdle();
        break;

      case "breathing":
        this.getPhysicsBody(this.ignis.sprite).setVelocity(0, 0);
        this.updateBreath();
        break;

      case "flying":
      case "barrage":
        this.updateFlight();
        break;

      case "diving":
        this.updateDive();
        break;

      case "grounded":
        this.getPhysicsBody(this.ignis.sprite).setVelocity(0, 0);

        if (this.time.now >= this.groundedUntil) {
          this.startTakeoff();
        }
        break;

      case "claw":
      case "tail":
      case "breathWindup":
      case "recovering":
      case "phaseShift":
        this.getPhysicsBody(this.ignis.sprite).setVelocity(0, 0);
        this.syncCharacter(this.ignis.sprite, 60);
        break;

      case "takeoff":
      case "diveWindup":
        break;
    }

    drawBossHealthBar(this.ignis);
  }

  // ---------------------------------------------------------------------------
  // Fases 1 e 3: no chão
  // ---------------------------------------------------------------------------

  private updateGroundIdle(): void {
    const stats = IGNIS_STATS;
    const now = this.time.now;
    const speed =
      this.phase === 3 ? stats.speed * IGNIS_PHASES.enragedSpeed : stats.speed;
    const distance = this.chasePlayer(
      this.ignis.sprite,
      speed,
      stats.stopDistance,
      stats.sightRange,
      60,
    );

    this.turnTowardPlayer();

    const off = this.angleOffPlayer();

    if (
      distance <= stats.tailRange &&
      off > 1.9 &&
      now - this.lastTailAt >= this.cooldown(stats.tailCooldown)
    ) {
      this.startTail();
    } else if (
      distance <= stats.clawRange &&
      off <= stats.clawArc &&
      now - this.lastClawAt >= this.cooldown(stats.clawCooldown)
    ) {
      this.startClaw();
    } else if (
      distance >= stats.breathMinRange &&
      distance <= stats.breathRange &&
      off <= 0.5 &&
      now - this.lastBreathAt >= this.cooldown(stats.breathCooldown)
    ) {
      this.startBreath();
    }
  }

  /** Fica parado um pouco depois de atacar (a brecha) e volta a agir. */
  private recover(): void {
    this.ignisState = "recovering";

    this.time.delayedCall(this.cooldown(IGNIS_STATS.recover), () => {
      if (this.ignisState === "recovering") {
        this.ignisState = "idle";
      }
    });
  }

  // --- Garras ------------------------------------------------------------------

  private startClaw(): void {
    this.ignisState = "claw";

    const windup = this.cooldown(IGNIS_STATS.clawWindup);

    // Recua o corpo antes do golpe (o aviso).
    this.tweens.add({
      targets: this.ignisSprite.rig,
      scaleX: 0.9,
      duration: windup,
      ease: "Quad.In",
    });

    this.time.delayedCall(windup, () => this.claw());
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
    createSlashEffect(
      this,
      x + dirX * 95 - dirY * 25,
      y + dirY * 95 + dirX * 25,
      dirX,
      dirY,
    );
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

    const { rig } = this.ignisSprite;

    this.statusText.setText(this.t(TEXTS.bosses.ignis.tail));
    audio.play("warning");

    // Torce o corpo para trás (aviso) e depois gira uma volta inteira.
    this.tweens.add({
      targets: rig,
      rotation: this.facing - 0.6,
      duration: this.cooldown(IGNIS_STATS.tailWindup),
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

            if (this.ignisState === "tail") {
              this.recover();
            }
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
    const windup = this.cooldown(stats.breathWindup);

    createConeWarning(
      this,
      head.x,
      head.y,
      this.facing,
      stats.breathRange,
      stats.breathArc,
      windup,
    );

    this.statusText.setText(this.t(TEXTS.bosses.ignis.breath));
    audio.play("warning");

    this.tweens.add({
      targets: this.ignisSprite.mouthGlow,
      scale: 2.2,
      fillAlpha: 0.9,
      duration: windup,
      ease: "Quad.In",
    });

    this.time.delayedCall(windup, () => {
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
      this.resetMouth();
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

  private resetMouth(): void {
    const { mouthGlow } = this.ignisSprite;

    this.tweens.killTweensOf(mouthGlow);
    mouthGlow.setScale(1).setFillStyle(0xffa040, 0);
  }

  /** Uma bola de fogo que sai da boca e se espalha pelo cone. */
  private spawnFireParticle(x: number, y: number): void {
    const stats = IGNIS_STATS;
    const angle =
      this.facing + Phaser.Math.FloatBetween(-stats.breathArc, stats.breathArc);
    const distance = stats.breathRange * Phaser.Math.FloatBetween(0.5, 1);
    const flame = this.add
      .circle(
        x,
        y,
        Phaser.Math.Between(6, 11),
        Phaser.Utils.Array.GetRandom(FIRE_COLORS),
        0.9,
      )
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

  // ---------------------------------------------------------------------------
  // Fase 2: no ar
  // ---------------------------------------------------------------------------

  /** Ponto da volta pelo salão para um ângulo da volta. */
  private flightPoint(angle: number): { x: number; y: number } {
    return {
      x: HOARD_ARENA.x + Math.cos(angle) * IGNIS_PHASES.flyRadiusX,
      y: HOARD_ARENA.y + Math.sin(angle) * IGNIS_PHASES.flyRadiusY,
    };
  }

  /** Levanta voo até a volta pelo salão (não pode ser atingido no ar). */
  private startTakeoff(): void {
    this.ignisState = "takeoff";

    const phases = IGNIS_PHASES;
    const { container } = this.ignisSprite;
    const { x, y } = this.ignis.sprite.body;

    this.tweens.killTweensOf(this.ignisSprite.rig);
    this.ignisSprite.rig.setScale(1);
    this.resetMouth();

    // Começa a volta no ponto mais perto de onde ele está.
    this.flyAngle = Math.atan2(
      (y - HOARD_ARENA.y) / phases.flyRadiusY,
      (x - HOARD_ARENA.x) / phases.flyRadiusX,
    );

    const target = this.flightPoint(this.flyAngle);
    const body = this.getPhysicsBody(this.ignisSprite);

    body.setVelocity(0, 0);
    body.enable = false;

    this.spreadWings(true);
    container.setDepth(FLYING_DEPTH);
    audio.play("roar");
    createShockwave(this, x, y, 160);
    createCoinBurst(this, x, y, 24, 200);

    // Sombra no chão, embaixo dele, enquanto voa.
    this.flyShadow = this.add
      .ellipse(x, y + 20, 220, 100, 0x000000, 0.35)
      .setDepth(5);

    this.tweens.add({
      targets: container,
      x: target.x,
      y: target.y,
      scale: phases.flyScale,
      duration: phases.takeoffTime,
      ease: "Sine.InOut",
      onComplete: () => {
        if (this.ignisState !== "takeoff") {
          return;
        }

        this.ignisState = "flying";
        this.nextFlyAttackAt = this.time.now + phases.attackDelay;
      },
    });
  }

  /** Dá a volta pelo salão olhando para a frente e decide os ataques. */
  private updateFlight(): void {
    const phases = IGNIS_PHASES;
    const delta = this.game.loop.delta / 1000;

    this.flyAngle += phases.flySpeed * delta;

    const point = this.flightPoint(this.flyAngle);

    this.moveInAir(point.x, point.y);

    // Olha na direção em que voa (tangente da volta).
    const next = this.flightPoint(this.flyAngle + 0.05);

    this.facing = Math.atan2(next.y - point.y, next.x - point.x);
    setIgnisFacing(this.ignisSprite, this.facing);

    if (this.ignisState !== "flying" || this.time.now < this.nextFlyAttackAt) {
      return;
    }

    if (this.nextFlyAttack === "barrage") {
      this.nextFlyAttack = "dive";
      this.startBarrage();
    } else {
      this.nextFlyAttack = "barrage";
      this.startDiveWindup();
    }
  }

  /** Move o desenho no ar (e a sombra no chão junto). */
  private moveInAir(x: number, y: number): void {
    this.ignisSprite.container.setPosition(x, y);
    this.flyShadow?.setPosition(x, y + 20);
  }

  // --- Bolas de fogo -------------------------------------------------------------

  private startBarrage(): void {
    this.ignisState = "barrage";

    const phases = IGNIS_PHASES;

    this.statusText.setText(this.t(TEXTS.bosses.ignis.barrage));
    audio.play("warning");

    for (let i = 0; i < phases.barrageCount; i++) {
      this.time.delayedCall(i * phases.barrageInterval, () => this.markFireball());
    }

    // Volta a só voar depois da última bola de fogo.
    const total =
      (phases.barrageCount - 1) * phases.barrageInterval + phases.barrageWindup;

    this.time.delayedCall(total, () => {
      if (this.ignisState === "barrage") {
        this.ignisState = "flying";
        this.nextFlyAttackAt = this.time.now + phases.attackDelay;
      }
    });
  }

  /** Marca o chão onde o herói está; a bola de fogo cai lá depois do aviso. */
  private markFireball(): void {
    if (this.ignisState !== "barrage") {
      return;
    }

    const phases = IGNIS_PHASES;
    const { x, y } = this.player.body;

    createSlamWarning(this, x, y, phases.fireballRadius, phases.barrageWindup);

    // A bola de fogo cai do alto nos últimos instantes do aviso.
    const fireball = this.add
      .circle(x, y - 320, 14, 0xff6a2a)
      .setStrokeStyle(4, 0xffc15a)
      .setDepth(FLYING_DEPTH - 1)
      .setAlpha(0);

    this.tweens.add({
      targets: fireball,
      y,
      alpha: 1,
      delay: phases.barrageWindup - 300,
      duration: 300,
      ease: "Quad.In",
      onComplete: () => {
        fireball.destroy();

        if (this.ignisState === "defeated") {
          return;
        }

        createImpactEffect(this, x, y, 0xff7a2a, 12, phases.fireballRadius);
        createShockwave(this, x, y, phases.fireballRadius);
        audio.play("slam");

        if (this.distanceToPlayer(x, y) <= phases.fireballRadius) {
          this.damagePlayer(phases.fireballDamage);
        }
      },
    });
  }

  // --- Mergulho --------------------------------------------------------------------

  /** Para no ar, mira no herói e marca o caminho do mergulho no chão. */
  private startDiveWindup(): void {
    this.ignisState = "diveWindup";

    const phases = IGNIS_PHASES;
    const { x, y } = this.ignisSprite.container;
    const angle = Math.atan2(this.player.body.y - y, this.player.body.x - x);

    this.facing = angle;
    setIgnisFacing(this.ignisSprite, angle);

    // O fim do mergulho fica sempre dentro do salão.
    const end = {
      x: Phaser.Math.Clamp(x + Math.cos(angle) * phases.diveLength, 150, HOARD_WIDTH - 150),
      y: Phaser.Math.Clamp(y + Math.sin(angle) * phases.diveLength, 150, HOARD_HEIGHT - 150),
    };
    const length = Phaser.Math.Distance.Between(x, y, end.x, end.y);

    createChargeWarning(this, x, y, angle, length, 110, phases.diveWindup);
    this.statusText.setText(this.t(TEXTS.bosses.ignis.dive));
    audio.play("warning");

    this.time.delayedCall(phases.diveWindup, () => this.dive(end));
  }

  private dive(end: { x: number; y: number }): void {
    if (this.ignisState !== "diveWindup") {
      return;
    }

    this.ignisState = "diving";

    const { container } = this.ignisSprite;

    audio.play("roar");

    // Desce enquanto avança: termina no chão, no fim do caminho.
    this.tweens.add({
      targets: container,
      x: end.x,
      y: end.y,
      scale: 1,
      duration: IGNIS_PHASES.diveTime,
      ease: "Quad.In",
      onUpdate: () => this.flyShadow?.setPosition(container.x, container.y + 20),
      onComplete: () => this.landAfterDive(),
    });
  }

  /** Durante o mergulho: encostar no herói machuca. */
  private updateDive(): void {
    const { x, y } = this.ignisSprite.container;

    if (this.distanceToPlayer(x, y) <= IGNIS_PHASES.diveHitRange) {
      this.damagePlayer(IGNIS_PHASES.diveDamage);
    }
  }

  /** Pousa no fim do mergulho e fica um tempo no chão: a brecha. */
  private landAfterDive(): void {
    if (this.ignisState !== "diving") {
      return;
    }

    this.landHere();
    this.ignisState = "grounded";
    this.groundedUntil = this.time.now + IGNIS_PHASES.groundedTime;
    this.statusText.setText(this.t(TEXTS.bosses.ignis.grounded));
  }

  /** Coloca Ignis no chão onde o desenho está (corpo físico de volta). */
  private landHere(): void {
    const { container } = this.ignisSprite;
    const { x, y } = container;
    const body = this.getPhysicsBody(this.ignisSprite);

    this.tweens.killTweensOf(container);
    container.setScale(1).setDepth(y + 60);
    this.spreadWings(false);
    this.flyShadow?.destroy();
    this.flyShadow = undefined;

    body.enable = true;
    body.reset(x, y);

    createShockwave(this, x, y, 180);
    createCoinBurst(this, x, y, 30, 220);
    audio.play("slam");
    this.cameras.main.shake(250, 0.008);
  }

  // ---------------------------------------------------------------------------
  // Fase 3: furioso, o chão se quebra
  // ---------------------------------------------------------------------------

  private startPhase3(): void {
    this.phase = 3;
    this.ignisState = "phaseShift";
    this.resetMouth();

    // Se ainda estava no ar (não deveria, mas por garantia), pousa.
    if (this.flyShadow) {
      this.landHere();
    }

    this.cameras.main.flash(500, 255, 60, 30);
    this.cameras.main.shake(700, 0.01);
    audio.play("roar");
    audio.play("explosion");
    this.statusText.setText(this.t(TEXTS.bosses.ignis.enraged));

    // Olhos e brilho da boca vermelhos de raiva por um instante.
    this.ignisSprite.mouthGlow.setFillStyle(0xff3a1a, 0.6).setScale(1.6);

    this.time.delayedCall(1200, () => {
      if (this.ignisState !== "phaseShift") {
        return;
      }

      this.resetMouth();
      this.ignisState = "idle";
      this.nextCrackAt = this.time.now + 800;
    });
  }

  /** Fase 3: de tempos em tempos o chão racha; e as fendas queimam. */
  private updateCracks(): void {
    const { x, y } = this.player.body;

    if (this.isOnCrack(x, y)) {
      this.burnPlayer(IGNIS_PHASES.crackDamage, TEXTS.bosses.ignis.cracks);
    }

    if (
      this.phase !== 3 ||
      this.ignisState === "defeated" ||
      this.ignisState === "phaseShift" ||
      this.time.now < this.nextCrackAt
    ) {
      return;
    }

    this.nextCrackAt = this.time.now + IGNIS_PHASES.crackInterval;
    this.breakFloor();
  }

  private isOnCrack(x: number, y: number): boolean {
    return this.cracks.some(
      (crack) =>
        Phaser.Math.Distance.Between(x, y, crack.x, crack.y) <=
        IGNIS_PHASES.crackRadius,
    );
  }

  /** Marca alguns pontos (um deles onde o herói está) e o chão se abre lá. */
  private breakFloor(): void {
    const phases = IGNIS_PHASES;
    const free = phases.maxCracks - this.cracks.length;

    if (free <= 0) {
      return;
    }

    const points = [{ x: this.player.body.x, y: this.player.body.y }];

    while (points.length < Math.min(phases.crackCount, free)) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.FloatBetween(0.2, 0.9);

      points.push({
        x: HOARD_ARENA.x + Math.cos(angle) * HOARD_ARENA.rx * distance,
        y: HOARD_ARENA.y + Math.sin(angle) * HOARD_ARENA.ry * distance,
      });
    }

    audio.play("warning");

    for (const point of points) {
      createSlamWarning(this, point.x, point.y, phases.crackRadius, phases.crackWindup);

      this.time.delayedCall(phases.crackWindup, () => {
        if (this.ignisState === "defeated") {
          return;
        }

        this.openCrack(point.x, point.y);
      });
    }
  }

  /** Abre uma fenda de fogo no chão (fica para sempre). */
  private openCrack(x: number, y: number): void {
    const radius = IGNIS_PHASES.crackRadius;
    const crack = this.add.container(x, y).setDepth(4);

    // Buraco escuro com lava lá embaixo e rachaduras em volta.
    const cracksAround = this.add.graphics();

    cracksAround.lineStyle(3, 0x0e0a08, 0.9);

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + Phaser.Math.FloatBetween(-0.3, 0.3);

      cracksAround.lineBetween(
        Math.cos(angle) * radius * 0.8,
        Math.sin(angle) * radius * 0.5,
        Math.cos(angle) * radius * 1.4,
        Math.sin(angle) * radius * 0.9,
      );
    }

    const lava = this.add.ellipse(0, 2, radius * 1.4, radius * 0.8, 0xff5a1f, 0.9);

    crack.add([
      cracksAround,
      this.add.ellipse(0, 0, radius * 2, radius * 1.2, 0x0e0a08),
      lava,
      this.add.ellipse(0, 2, radius * 0.7, radius * 0.4, 0xffc15a, 0.8),
    ]);

    this.tweens.add({
      targets: lava,
      alpha: { from: 0.6, to: 1 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.cracks.push({ x, y });

    createImpactEffect(this, x, y, 0xff7a2a, 10, radius);
    createCoinBurst(this, x, y, 10, radius * 1.5);
    audio.play("slam");
    this.cameras.main.shake(150, 0.006);
  }

  // ---------------------------------------------------------------------------
  // Golpes do herói
  // ---------------------------------------------------------------------------

  protected attackSpecialTarget(): boolean {
    if (
      this.ignisState === "waiting" ||
      this.ignisState === "descending" ||
      this.ignisState === "defeated"
    ) {
      return false;
    }

    // No ar (fase 2): não dá para acertá-lo.
    if (
      this.ignisState === "takeoff" ||
      this.ignisState === "flying" ||
      this.ignisState === "barrage" ||
      this.ignisState === "diveWindup" ||
      this.ignisState === "diving"
    ) {
      this.statusText.setText(this.t(TEXTS.bosses.ignis.airborne));
      return true;
    }

    if (this.strikeBoss(this.ignis, TEXTS.bosses.ignis)) {
      this.defeatIgnis();
      return true;
    }

    this.checkPhaseChange();

    return true;
  }

  /** Muda de fase quando a vida passa dos limites (2/3 e 1/3). */
  private checkPhaseChange(): void {
    const fraction = this.ignis.health / this.ignis.maxHealth;

    if (this.phase === 1 && fraction <= IGNIS_PHASES.phase2At) {
      this.phase = 2;
      this.statusText.setText(this.t(TEXTS.bosses.ignis.takeoff));
      this.startTakeoff();
    } else if (this.phase === 2 && fraction <= IGNIS_PHASES.phase3At) {
      this.startPhase3();
    }
  }

  /**
   * Ignis derrotado. (O final de verdade, com o Fragmento Central e os
   * créditos, chega na próxima etapa; por enquanto, a tela de vitória.)
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
    this.tweens.killTweensOf(this.ignisSprite.wingsSpread);
    this.tweens.killTweensOf(this.ignisSprite.mouthGlow);
    this.flyShadow?.destroy();
    this.flyShadow = undefined;
    this.disableCharacter(this.ignis.sprite);
    destroyBoss(this.ignis);
  }
}

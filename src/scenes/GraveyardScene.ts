// Cemitério de Dragões: Capítulo 5.
// Chega-se aqui pela trilha a oeste da vila, depois que o Ancião rompe o
// Selo Astral. Missão: atravessar o cemitério até a arena, a oeste, derrotar
// o Cavaleiro Dracônico e pegar o quinto Fragmento Astral, o que conclui o
// Capítulo 5.
//
// Está escuro: o herói enxerga só ao redor de si e das tochas que acende
// (E). Cada tocha acesa clareia um pouco o cemitério inteiro; com todas
// acesas, a escuridão quase some. As tochas ficam acesas enquanto o jogo
// estiver aberto. De tempos em tempos, a sombra de Ignis cruza o céu, com
// um rugido distante.
//
// Espectros flutuam pelo cemitério: no escuro são intangíveis (os golpes
// atravessam); só na luz de uma tocha acesa podem ser atingidos. A luz do
// herói não conta: é preciso atraí-los para perto das tochas.
//
// O Cavaleiro Dracônico é um duelo (a arena se ilumina quando ele desperta):
// - combo de 3 golpes à frente, com aviso curto; depois fica parado: brecha;
// - guarda: golpeá-lo nessa hora faz ele aparar e contra-atacar;
// - salto: se o herói se afasta, ele salta até onde o herói está.
// Com metade da vida fica furioso: avisos mais curtos.

import Phaser from "phaser";
import {
  ARENA_LIGHT_RADIUS,
  DRAGON_KNIGHT_ITEM_POSITION,
  DRAGON_KNIGHT_POSITION,
  DRAGON_KNIGHT_STATS,
  FRAGMENT_COLLECT_RANGE,
  GRAVEYARD_ARENA,
  GRAVEYARD_FRAGMENT_POSITION,
  GRAVEYARD_HEIGHT,
  GRAVEYARD_SHRINE_POSITION,
  GRAVEYARD_SPECTRE_SPAWNS,
  GRAVEYARD_TORCHES,
  GRAVEYARD_WIDTH,
  IGNIS_SHADOW,
  SPECTRE_REVEAL_FACTOR,
  TORCH_STATS,
} from "../config";
import { TEXTS } from "../i18n/texts";
import { progress, reachedStage, saveProgress } from "../systems/progress";
import { spawnEnemy } from "../systems/enemies";
import {
  createBoss,
  destroyBoss,
  drawBossHealthBar,
  showBossUi,
  type Boss,
} from "../systems/bosses";
import { createGraveyardWorld } from "../world/graveyard";
import { createDarkness, type Darkness } from "../world/darkness";
import { createTorch, lightTorch, type Torch } from "../world/torch";
import { flyIgnisShadow } from "../world/ignisShadow";
import { isInEllipse } from "../world/geometry";
import {
  createAstralFragment,
  revealAstralFragment,
  type AstralFragment,
} from "../world/astralFragment";
import {
  createDragonKnight,
  setDragonKnightAwake,
  setDragonKnightPose,
  type DragonKnightPose,
  type DragonKnightSprite,
} from "../characters/dragonKnight";
import {
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
 * Quanta escuridão cobre o mapa (0 = nenhuma, 1 = preto total): com
 * nenhuma tocha acesa e com todas acesas. Entre os dois, cada tocha
 * acesa clareia um pouco.
 */
const DARKNESS_NO_TORCHES = 0.78;
const DARKNESS_ALL_TORCHES = 0.3;
/** Quanto a escuridão muda por segundo (a transição é suave). */
const DARKNESS_FADE_SPEED = 0.5;
/** Raio da luz em volta do herói. */
const HERO_LIGHT_RADIUS = 160;

/**
 * Estados do Cavaleiro Dracônico:
 * dormant (esperando) → stalking (anda até o herói)
 * ⇄ combo (sequência de golpes) / guard (aparando) / leaping (saltando)
 * / recovering (parado depois de atacar: a brecha) → defeated.
 */
type KnightState =
  | "dormant"
  | "stalking"
  | "combo"
  | "guard"
  | "leaping"
  | "recovering"
  | "defeated";

const KNIGHT_COLOR = 0xff4a3a;

export class GraveyardScene extends AreaScene {
  protected readonly areaId = "graveyard";
  protected readonly worldWidth = GRAVEYARD_WIDTH;
  protected readonly worldHeight = GRAVEYARD_HEIGHT;
  protected readonly areaName = TEXTS.places.graveyard;
  protected readonly musicTrack = "graveyard";

  private sign!: Phaser.GameObjects.Text;
  private darkness!: Darkness;
  private torches: Torch[] = [];
  /**
   * Índices das tochas já acesas. Fica fora do create(): assim as tochas
   * continuam acesas ao voltar do checkpoint (até recarregar a página).
   */
  private readonly litTorches = new Set<number>();
  private nextShadowAt = 0;
  private shadowHintShown = false;
  /** true quando a arena está iluminada (duelo começou ou já acabou). */
  private arenaLit = false;
  private fragment!: AstralFragment;

  private knightSprite!: DragonKnightSprite;
  private knight!: Boss;
  private knightState: KnightState = "dormant";
  private enraged = false;
  /** Para onde o Cavaleiro olha (radianos; 0 = direita). */
  private knightFacing = 0;
  private comboIndex = 0;
  private lastComboAt = 0;
  private lastGuardAt = 0;
  private lastLeapAt = 0;

  constructor() {
    super(AREA_SCENE_KEYS.graveyard);
  }

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  protected createWorld(): Phaser.GameObjects.Rectangle[] {
    const { obstacles, sign } = createGraveyardWorld(this);

    this.sign = sign;
    this.shadowHintShown = false;
    this.arenaLit = false;
    // O relógio da cena só começa a contar no primeiro quadro (ver update).
    this.nextShadowAt = 0;

    this.addShrine(
      GRAVEYARD_SHRINE_POSITION.x,
      GRAVEYARD_SHRINE_POSITION.y,
      "graveyardShrine",
    );

    this.torches = GRAVEYARD_TORCHES.map(({ x, y }, index) => {
      const torch = createTorch(this, x, y);

      if (this.litTorches.has(index)) {
        lightTorch(this, torch, false);
      }

      return torch;
    });

    this.fragment = createAstralFragment(
      this,
      GRAVEYARD_FRAGMENT_POSITION.x,
      GRAVEYARD_FRAGMENT_POSITION.y,
    );

    this.darkness = createDarkness(this, this.getTargetDarkness());

    // Borda leste: volta para a trilha a oeste da Floresta.
    this.addExit({
      x: GRAVEYARD_WIDTH - 40,
      y: 620,
      width: 40,
      height: 160,
      target: "forestWest",
      isOpen: () => true,
    });

    return obstacles;
  }

  protected createActors(): void {
    const spectres = GRAVEYARD_SPECTRE_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "spectre", x, y),
    );

    this.enemies.push(...spectres);

    this.knightSprite = createDragonKnight(
      this,
      DRAGON_KNIGHT_POSITION.x,
      DRAGON_KNIGHT_POSITION.y,
    );

    this.knight = createBoss(this, this.knightSprite, DRAGON_KNIGHT_STATS, {
      barWidth: 110,
      barOffsetY: 70,
      nameOffsetY: 90,
      nameColor: "#ff9a8a",
      barColor: 0xd83a3a,
      barBackColor: 0x3a1414,
      impactColor: 0xffd0c8,
      damageTextColor: "#ffe0d8",
      deathColor: KNIGHT_COLOR,
    });

    this.knightState = "dormant";
    this.enraged = false;
    // Olhando para a entrada da arena (leste).
    this.knightFacing = 0;
    setDragonKnightPose(this.knightSprite, this.knightFacing, "idle");
  }

  protected setupAreaPhysics(): void {
    // O herói não atravessa o Cavaleiro.
    this.physics.add.collider(this.player.body, this.knight.sprite.body);
  }

  /** Deixa o cemitério igual ao progresso salvo. */
  protected restoreAreaState(): void {
    if (!reachedStage("fragment5")) {
      return;
    }

    // Cavaleiro já derrotado: a arena fica iluminada e o item no chão.
    this.removeKnight();
    this.lightArena();
    this.placeKnightItem();

    if (progress.questStage === "fragment5") {
      revealAstralFragment(this, this.fragment, false);
    }
  }

  /** Espectros só ficam tangíveis na luz de uma tocha acesa. */
  protected isRevealed(x: number, y: number): boolean {
    const range = TORCH_STATS.lightRadius * SPECTRE_REVEAL_FACTOR;

    return this.torches.some(
      (torch) =>
        torch.lit && Phaser.Math.Distance.Between(x, y, torch.x, torch.y) <= range,
    );
  }

  protected onAreaEntered(): void {
    // Atravessar o selo cumpre o objetivo "seguir a trilha a oeste".
    if (progress.questStage === "passage") {
      progress.questStage = "knight";
      saveProgress();
    }
  }

  protected applyAreaLanguage(): void {
    this.sign.setText(this.t(TEXTS.places.graveyard));

    if (this.knightState !== "defeated") {
      this.knight.nameText.setText(this.t(TEXTS.bosses.dragonKnight.name));
    }
  }

  // ---------------------------------------------------------------------------
  // A cada quadro
  // ---------------------------------------------------------------------------

  protected updateArea(): void {
    this.updateTorches();
    this.updateIgnisShadow();
    this.updateKnight();
    this.updateFragment();
    this.updateDarkness();
  }

  // ---------------------------------------------------------------------------
  // Tochas e escuridão
  // ---------------------------------------------------------------------------

  /** Mostra "E • Acender tocha" perto de uma tocha apagada e acende com E. */
  private updateTorches(): void {
    const index = this.torches.findIndex(
      (torch) =>
        !torch.lit &&
        this.distanceToPlayer(torch.x, torch.y) <= TORCH_STATS.lightRange,
    );

    if (index < 0) {
      this.hideInteractionHint();
      return;
    }

    const torch = this.torches[index];

    this.showInteractionHint(
      this.t(TEXTS.chapter5.lightTorch),
      torch.x,
      torch.y - 52,
    );

    if (this.justPressedInteract()) {
      this.hideInteractionHint();
      this.lightTorchAt(index);

      const allLit = this.litTorches.size === this.torches.length;

      this.statusText.setText(
        this.t(
          allLit ? TEXTS.chapter5.allTorchesLit : TEXTS.chapter5.torchLit,
        ),
      );
    }
  }

  /** Acende a tocha de índice `index` (com som; a última toca um sino). */
  private lightTorchAt(index: number): void {
    const torch = this.torches[index];

    if (torch.lit) {
      return;
    }

    lightTorch(this, torch, true);
    this.litTorches.add(index);
    audio.play("flame");

    if (this.litTorches.size === this.torches.length) {
      audio.play("shrine");
    }
  }

  /** Ilumina a arena: acende as tochas dela e abre uma luz grande no centro. */
  private lightArena(): void {
    this.arenaLit = true;

    this.torches.forEach((torch, index) => {
      if (isInEllipse(torch.x, torch.y, GRAVEYARD_ARENA, 60)) {
        this.lightTorchAt(index);
      }
    });
  }

  /** Escuridão que o mapa deve ter com as tochas acesas agora. */
  private getTargetDarkness(): number {
    const litFraction = this.litTorches.size / GRAVEYARD_TORCHES.length;

    return Phaser.Math.Linear(
      DARKNESS_NO_TORCHES,
      DARKNESS_ALL_TORCHES,
      litFraction,
    );
  }

  private updateDarkness(): void {
    const { x, y } = this.player.body;

    // Clareia (ou escurece) aos poucos até a escuridão certa.
    const step = (DARKNESS_FADE_SPEED * this.game.loop.delta) / 1000;
    const target = this.getTargetDarkness();
    const current = this.darkness.alpha;

    this.darkness.alpha =
      current > target
        ? Math.max(target, current - step)
        : Math.min(target, current + step);

    const arena = GRAVEYARD_ARENA;

    this.darkness.update([
      { x, y, radius: HERO_LIGHT_RADIUS },
      ...this.torches
        .filter((torch) => torch.lit)
        .map((torch) => ({
          x: torch.x,
          y: torch.y,
          radius: TORCH_STATS.lightRadius,
        })),
      ...(this.arenaLit
        ? [{ x: arena.x, y: arena.y, radius: ARENA_LIGHT_RADIUS }]
        : []),
    ]);
  }

  // ---------------------------------------------------------------------------
  // A sombra de Ignis
  // ---------------------------------------------------------------------------

  private updateIgnisShadow(): void {
    const now = this.time.now;

    // Primeiro quadro na área: marca quando a sombra passa pela primeira vez.
    if (this.nextShadowAt === 0) {
      this.nextShadowAt = now + IGNIS_SHADOW.firstDelay;
      return;
    }

    if (now < this.nextShadowAt) {
      return;
    }

    this.nextShadowAt =
      now +
      IGNIS_SHADOW.duration +
      Phaser.Math.Between(IGNIS_SHADOW.minDelay, IGNIS_SHADOW.maxDelay);

    flyIgnisShadow(this, IGNIS_SHADOW.duration);
    audio.play("roar");
    this.cameras.main.shake(IGNIS_SHADOW.duration * 0.6, 0.002);

    // A mensagem aparece só na primeira passagem de cada visita.
    if (!this.shadowHintShown) {
      this.shadowHintShown = true;
      this.statusText.setText(this.t(TEXTS.chapter5.ignisShadow));
    }
  }

  // ---------------------------------------------------------------------------
  // Cavaleiro Dracônico
  // ---------------------------------------------------------------------------

  /** Tempo de um aviso (menor quando ele está furioso). */
  private windup(base: number): number {
    return this.enraged ? base * DRAGON_KNIGHT_STATS.enragedSpeedFactor : base;
  }

  private angleToPlayer(): number {
    const { x, y } = this.knight.sprite.body;

    return Math.atan2(this.player.body.y - y, this.player.body.x - x);
  }

  private setPose(pose: DragonKnightPose): void {
    setDragonKnightPose(this.knightSprite, this.knightFacing, pose);
  }

  private updateKnight(): void {
    const { x, y } = this.knight.sprite.body;
    const now = this.time.now;
    const stats = DRAGON_KNIGHT_STATS;

    switch (this.knightState) {
      case "dormant":
        if (
          progress.questStage === "knight" &&
          this.distanceToPlayer(x, y) <= stats.wakeRange
        ) {
          this.wakeKnight();
        }
        return;

      case "stalking": {
        const distance = this.chasePlayer(
          this.knight.sprite,
          stats.speed,
          stats.stopDistance,
          stats.sightRange,
          20,
        );

        this.knightFacing = this.angleToPlayer();
        this.setPose("idle");
        drawBossHealthBar(this.knight);

        if (
          distance >= stats.leapMinRange &&
          now - this.lastLeapAt >= stats.leapCooldown
        ) {
          this.startLeap();
        } else if (
          distance <= stats.comboRange &&
          now - this.lastComboAt >= stats.comboCooldown
        ) {
          // Às vezes, em vez de atacar, ele se põe em guarda.
          const canGuard = now - this.lastGuardAt >= stats.guardCooldown;

          if (canGuard && Math.random() < stats.guardChance) {
            this.startGuard();
          } else {
            this.startCombo();
          }
        }
        return;
      }

      case "leaping":
        this.syncCharacter(this.knight.sprite, 20);
        drawBossHealthBar(this.knight);
        return;

      case "combo":
      case "guard":
      case "recovering":
        // Parado (atacando, aparando ou na brecha).
        this.getPhysicsBody(this.knight.sprite).setVelocity(0, 0);
        drawBossHealthBar(this.knight);
        return;

      case "defeated":
        return;
    }
  }

  private wakeKnight(): void {
    const now = this.time.now;

    this.knightState = "stalking";
    this.lastComboAt = now - DRAGON_KNIGHT_STATS.comboCooldown;
    this.lastGuardAt = now;
    this.lastLeapAt = now;

    // A arena se ilumina para o duelo.
    this.lightArena();
    this.cameras.main.flash(400, 255, 120, 90);

    setDragonKnightAwake(this.knightSprite, true);
    this.knight.nameText.setText(this.t(TEXTS.bosses.dragonKnight.name));
    showBossUi(this.knight);

    this.cameras.main.shake(250, 0.006);
    this.statusText.setText(this.t(TEXTS.bosses.dragonKnight.appeared));

    audio.play("bossAppear");
    audio.setDrums(true);
  }

  /** Fica parado um tempo (a brecha) e volta a andar até o herói. */
  private recover(duration: number, showOpening: boolean): void {
    this.knightState = "recovering";
    this.setPose("idle");

    if (showOpening) {
      this.statusText.setText(this.t(TEXTS.bosses.dragonKnight.opening));
    }

    this.time.delayedCall(duration, () => {
      if (this.knightState === "recovering") {
        this.knightState = "stalking";
      }
    });
  }

  // --- Combo -----------------------------------------------------------------

  private startCombo(): void {
    this.knightState = "combo";
    this.comboIndex = 0;
    this.comboStep();
  }

  /** Prepara um golpe do combo (trava a direção, ergue a espada). */
  private comboStep(): void {
    if (this.knightState !== "combo") {
      return;
    }

    const stats = DRAGON_KNIGHT_STATS;
    const isFinisher = this.comboIndex === stats.comboHits - 1;
    const windup = this.windup(
      isFinisher ? stats.comboFinisherWindup : stats.comboWindup,
    );

    this.knightFacing = this.angleToPlayer();
    this.setPose("raised");

    if (isFinisher) {
      audio.play("warning");
    }

    this.time.delayedCall(windup, () => this.comboStrike(isFinisher));
  }

  /** O golpe: avança um pouco e acerta quem estiver à frente. */
  private comboStrike(isFinisher: boolean): void {
    if (this.knightState !== "combo") {
      return;
    }

    const stats = DRAGON_KNIGHT_STATS;
    const body = this.getPhysicsBody(this.knight.sprite);
    const facingX = Math.cos(this.knightFacing);
    const facingY = Math.sin(this.knightFacing);

    // Avança um passo na direção do golpe.
    body.reset(
      this.knight.sprite.body.x + facingX * stats.comboLunge,
      this.knight.sprite.body.y + facingY * stats.comboLunge,
    );
    this.syncCharacter(this.knight.sprite, 20);
    this.setPose("idle");

    const { x, y } = this.knight.sprite.body;

    createSlashEffect(this, x, y, facingX, facingY);
    audio.play("swing");

    if (isFinisher) {
      createImpactEffect(
        this,
        x + facingX * 50,
        y + facingY * 50,
        KNIGHT_COLOR,
        10,
        40,
      );
      this.cameras.main.shake(140, 0.006);
    }

    if (this.isPlayerInFront(stats.comboReach + (isFinisher ? 20 : 0))) {
      this.damagePlayer(isFinisher ? stats.finisherDamage : stats.comboDamage);
    }

    this.comboIndex += 1;

    if (this.comboIndex < stats.comboHits) {
      this.time.delayedCall(this.windup(stats.comboGap), () =>
        this.comboStep(),
      );
      return;
    }

    this.lastComboAt = this.time.now;
    this.recover(stats.comboRecover, true);
  }

  /** true se o herói está à frente do Cavaleiro, a até `reach` pixels. */
  private isPlayerInFront(reach: number): boolean {
    const { x, y } = this.knight.sprite.body;
    const angle = Phaser.Math.Angle.Wrap(
      this.angleToPlayer() - this.knightFacing,
    );

    return (
      Math.abs(angle) <= DRAGON_KNIGHT_STATS.comboArc &&
      this.distanceToPlayer(x, y) <= reach
    );
  }

  // --- Guarda e contra-ataque --------------------------------------------------

  private startGuard(): void {
    this.knightState = "guard";
    this.knightFacing = this.angleToPlayer();
    this.setPose("guard");
    this.statusText.setText(this.t(TEXTS.bosses.dragonKnight.guard));
    audio.play("block");

    this.time.delayedCall(this.windup(DRAGON_KNIGHT_STATS.guardTime), () => {
      if (this.knightState !== "guard") {
        return;
      }

      this.lastGuardAt = this.time.now;
      this.knightState = "stalking";
      this.setPose("idle");
    });
  }

  /** O herói golpeou durante a guarda: apara e contra-ataca na hora. */
  private parryAndCounter(): void {
    const stats = DRAGON_KNIGHT_STATS;
    const { x, y } = this.knight.sprite.body;

    this.knightState = "combo";
    this.lastGuardAt = this.time.now;
    this.setPose("idle");

    audio.play("block");
    createImpactEffect(this, x, y - 10, 0xffffff, 10, 30);
    this.statusText.setText(this.t(TEXTS.bosses.dragonKnight.parried));

    this.time.delayedCall(120, () => {
      if (this.knightState !== "combo") {
        return;
      }

      this.knightFacing = this.angleToPlayer();
      createSlashEffect(
        this,
        x,
        y,
        Math.cos(this.knightFacing),
        Math.sin(this.knightFacing),
      );
      audio.play("swing");

      if (this.distanceToPlayer(x, y) <= stats.counterRange) {
        this.damagePlayer(stats.counterDamage);
      }

      this.recover(400, false);
    });
  }

  // --- Salto -------------------------------------------------------------------

  /** Marca onde o herói está e salta até lá. */
  private startLeap(): void {
    this.knightState = "leaping";
    this.lastLeapAt = this.time.now;

    const stats = DRAGON_KNIGHT_STATS;
    const start = {
      x: this.knight.sprite.body.x,
      y: this.knight.sprite.body.y,
    };
    const target = { x: this.player.body.x, y: this.player.body.y };
    const windup = this.windup(stats.leapWindup);
    const { container } = this.knight.sprite;

    this.getPhysicsBody(this.knight.sprite).setVelocity(0, 0);
    this.knightFacing = this.angleToPlayer();
    this.setPose("raised");

    createSlamWarning(
      this,
      target.x,
      target.y,
      stats.leapRadius,
      windup + stats.leapTime,
    );
    this.statusText.setText(this.t(TEXTS.bosses.dragonKnight.leap));
    audio.play("warning");

    // Agacha antes de saltar.
    this.tweens.add({
      targets: container,
      scaleY: 0.8,
      duration: windup,
      ease: "Quad.In",
    });

    this.time.delayedCall(windup, () => {
      if (this.knightState !== "leaping") {
        return;
      }

      const body = this.getPhysicsBody(this.knight.sprite);
      const jump = { t: 0 };

      this.tweens.killTweensOf(container);

      // Voa em arco até o alvo (o desenho cresce no meio do salto).
      this.tweens.add({
        targets: jump,
        t: 1,
        duration: stats.leapTime,
        ease: "Sine.InOut",
        onUpdate: () => {
          body.reset(
            Phaser.Math.Linear(start.x, target.x, jump.t),
            Phaser.Math.Linear(start.y, target.y, jump.t),
          );
          container.setScale(1 + Math.sin(jump.t * Math.PI) * 0.35);
        },
        onComplete: () => this.land(),
      });
    });
  }

  private land(): void {
    if (this.knightState !== "leaping") {
      return;
    }

    const stats = DRAGON_KNIGHT_STATS;
    const { x, y } = this.knight.sprite.body;

    this.knight.sprite.container.setScale(1);
    this.syncCharacter(this.knight.sprite, 20);

    createShockwave(this, x, y, stats.leapRadius);
    audio.play("slam");
    this.cameras.main.shake(160, 0.008);

    if (this.distanceToPlayer(x, y) <= stats.leapRadius) {
      this.damagePlayer(stats.leapDamage);
    }

    this.recover(stats.leapRecover, true);
  }

  // --- Golpes do herói -----------------------------------------------------------

  protected attackSpecialTarget(): boolean {
    // Adormecido, no ar ou derrotado: não dá para acertá-lo.
    if (
      this.knightState === "dormant" ||
      this.knightState === "leaping" ||
      this.knightState === "defeated"
    ) {
      return false;
    }

    const { x, y } = this.knight.sprite.body;

    // Em guarda: se o golpe alcançaria, ele apara e contra-ataca.
    if (
      this.knightState === "guard" &&
      this.isTargetInFront(x, y, this.knight.hitRange)
    ) {
      this.parryAndCounter();
      return true;
    }

    if (this.strikeBoss(this.knight, TEXTS.bosses.dragonKnight)) {
      this.defeatKnight();
    } else {
      this.checkEnrage();
    }

    return true;
  }

  /** Com metade da vida, o Cavaleiro fica furioso: avisos mais curtos. */
  private checkEnrage(): void {
    if (
      this.enraged ||
      this.knight.health >
        this.knight.maxHealth * DRAGON_KNIGHT_STATS.enragedAt
    ) {
      return;
    }

    this.enraged = true;
    this.cameras.main.shake(200, 0.006);
    this.statusText.setText(this.t(TEXTS.bosses.dragonKnight.enraged));
    audio.play("bossAppear");
    audio.play("roar");

    // A aura da guarda fica vermelha.
    this.knightSprite.guardAura.setFillStyle(KNIGHT_COLOR, 0.25);
  }

  /** Derrotar o Cavaleiro liberta o quinto Fragmento Astral. */
  private defeatKnight(): void {
    progress.questStage = "fragment5";

    const { x, y } = this.knight.sprite.body;

    createDeathBurst(this, x, y, this.knight.style.deathColor);
    audio.play("enemyDeath");
    this.removeKnight();
    this.dropPotion(x - 60, y + 60);
    this.placeKnightItem();

    revealAstralFragment(this, this.fragment, true);

    this.updateQuestDisplay();
    this.statusText.setText(this.t(TEXTS.bosses.dragonKnight.defeated));

    saveProgress();
  }

  /** O Coração de Dragão aparece num canto da arena até o herói pegá-lo. */
  private placeKnightItem(): void {
    this.placeItem(
      "dragonHeart",
      DRAGON_KNIGHT_ITEM_POSITION.x,
      DRAGON_KNIGHT_ITEM_POSITION.y,
    );
  }

  /** Tira o Cavaleiro do mapa (ao derrotá-lo ou ao carregar um save). */
  private removeKnight(): void {
    this.knightState = "defeated";
    audio.setDrums(false);
    this.tweens.killTweensOf(this.knight.sprite.container);
    this.disableCharacter(this.knight.sprite);
    destroyBoss(this.knight);
  }

  // ---------------------------------------------------------------------------
  // Quinto Fragmento Astral
  // ---------------------------------------------------------------------------

  private updateFragment(): void {
    if (!this.fragment.visible || progress.questStage !== "fragment5") {
      return;
    }

    const distance = this.distanceToPlayer(
      GRAVEYARD_FRAGMENT_POSITION.x,
      GRAVEYARD_FRAGMENT_POSITION.y,
    );

    if (distance <= FRAGMENT_COLLECT_RANGE) {
      this.collectFragment();
    }
  }

  /**
   * Pegar o quinto fragmento conclui o Capítulo 5. O save é mantido:
   * na tela de vitória, Enter volta ao jogo para continuar explorando.
   */
  private collectFragment(): void {
    progress.questStage = "complete";

    const { x, y } = this.fragment.container;

    createDeathBurst(this, x, y, 0xffe08a);
    audio.play("fragment");
    this.fragment.container.destroy();
    this.fragment.visible = false;

    this.cameras.main.flash(500, 255, 240, 200);

    this.updateQuestDisplay();
    saveProgress();

    this.showGameOver(true);
  }
}

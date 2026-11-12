// Picos Congelados: Capítulo 3.
// Chega-se aqui pelo portal gelado na clareira do Pântano Sombrio.
// Lobos e Cavaleiros de Gelo (bloqueiam golpes de frente com o escudo).
// Missão: subir até o platô do topo, derrotar o chefe e pegar o terceiro
// Fragmento Astral, o que conclui o Capítulo 3.
//
// Placas de gelo fazem o herói escorregar (demora para frear e virar);
// a nevasca deixa as bordas da tela esbranquiçadas.
//
// O chefe tem duas fases:
// 1) Colosso de Gelo: lento. Perto, golpeia o chão (círculo vermelho);
//    longe, solta uma linha de espinhos de gelo na direção do herói.
// 2) Com metade da vida, a armadura se parte e sobra o Espírito do Inverno:
//    rápido, solta estilhaços em círculo e avança em linha reta. Depois da
//    investida fica tonto: é a hora de atacar.

import type Phaser from "phaser";
import {
  FRAGMENT_COLLECT_RANGE,
  FROST_BOSS_ITEM_POSITION,
  FROST_BOSS_POSITION,
  FROST_BOSS_STATS,
  PEAKS_FRAGMENT_POSITION,
  PEAKS_HEIGHT,
  PEAKS_ICE_TRACTION,
  PEAKS_KNIGHT_SPAWNS,
  PEAKS_RETURN_PORTAL_POSITION,
  PEAKS_SHRINE_POSITION,
  PEAKS_WIDTH,
  PEAKS_WOLF_SPAWNS,
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
import { createPeaksWorld, isOnIce } from "../world/peaks";
import { createPortal, openPortal } from "../world/portal";
import {
  createAstralFragment,
  revealAstralFragment,
  type AstralFragment,
} from "../world/astralFragment";
import {
  createFrostColossus,
  setFrostColossusAwake,
  showFrostSpiritForm,
  type FrostColossusSprite,
} from "../characters/frostColossus";
import {
  createChargeWarning,
  createDeathBurst,
  createIceSpike,
  createImpactEffect,
  createShockwave,
  createSlamWarning,
} from "../effects/combatEffects";
import { audio } from "../audio/engine";
import { AREA_SCENE_KEYS } from "./areas";
import { AreaScene } from "./AreaScene";

/**
 * Estados do chefe:
 * dormant (esperando) → chasing (fase 1, persegue)
 * ⇄ slamWindup (golpe no chão) / spikeWindup (linha de espinhos)
 * → transforming (armadura se partindo, não leva dano)
 * → spirit (fase 2, persegue) ⇄ burstWindup (estilhaços)
 * / dashWindup → dashing → dizzy (tonto) → defeated (derrotado).
 */
type ColossusState =
  | "dormant"
  | "chasing"
  | "slamWindup"
  | "spikeWindup"
  | "transforming"
  | "spirit"
  | "burstWindup"
  | "dashWindup"
  | "dashing"
  | "dizzy"
  | "defeated";

const ICE_COLOR = 0xbfe6ff;
const SPIRIT_COLOR = 0x7fffff;

export class PeaksScene extends AreaScene {
  protected readonly areaId = "peaks";
  protected readonly worldWidth = PEAKS_WIDTH;
  protected readonly worldHeight = PEAKS_HEIGHT;
  protected readonly areaName = TEXTS.places.peaks;
  protected readonly musicTrack = "peaks";

  private sign!: Phaser.GameObjects.Text;
  /** A dica sobre o gelo aparece só na primeira vez em cada visita. */
  private iceHintShown = false;
  private fragment!: AstralFragment;

  private colossusSprite!: FrostColossusSprite;
  private colossus!: Boss;
  private colossusState: ColossusState = "dormant";
  /** true depois que a armadura se parte (segunda fase). */
  private spiritPhase = false;
  private lastSlamAt = 0;
  private lastSpikeAt = 0;
  private lastBurstAt = 0;
  private lastDashAt = 0;
  private dashDirection = { x: 0, y: 0 };

  constructor() {
    super(AREA_SCENE_KEYS.peaks);
  }

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  protected createWorld(): Phaser.GameObjects.Rectangle[] {
    const { obstacles, sign } = createPeaksWorld(this);

    this.sign = sign;
    this.iceHintShown = false;

    this.addShrine(
      PEAKS_SHRINE_POSITION.x,
      PEAKS_SHRINE_POSITION.y,
      "peaksShrine",
    );

    this.fragment = createAstralFragment(
      this,
      PEAKS_FRAGMENT_POSITION.x,
      PEAKS_FRAGMENT_POSITION.y,
    );

    // Portal de volta para o Pântano (sempre aberto).
    const { x, y } = PEAKS_RETURN_PORTAL_POSITION;

    openPortal(this, createPortal(this, x, y), false);

    this.addExit({
      x: x - 40,
      y: y - 30,
      width: 80,
      height: 60,
      target: "swampPortal",
      isOpen: () => true,
    });

    return obstacles;
  }

  protected createActors(): void {
    const wolves = PEAKS_WOLF_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "wolf", x, y),
    );

    const knights = PEAKS_KNIGHT_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "iceKnight", x, y),
    );

    this.enemies.push(...wolves, ...knights);

    this.colossusSprite = createFrostColossus(
      this,
      FROST_BOSS_POSITION.x,
      FROST_BOSS_POSITION.y,
    );

    this.colossus = createBoss(this, this.colossusSprite, FROST_BOSS_STATS, {
      barWidth: 120,
      barOffsetY: 86,
      nameOffsetY: 106,
      nameColor: "#cfeeff",
      barColor: 0x6fb8e8,
      barBackColor: 0x1f3448,
      impactColor: 0xe8f7ff,
      damageTextColor: "#e8f7ff",
      deathColor: SPIRIT_COLOR,
    });

    this.colossusState = "dormant";
    this.spiritPhase = false;
  }

  protected setupAreaPhysics(obstacles: Phaser.GameObjects.Rectangle[]): void {
    const colossusBody = this.colossus.sprite.body;

    this.physics.add.collider(colossusBody, obstacles);
    // O chefe é sólido: o herói não atravessa nem empurra.
    this.physics.add.collider(this.player.body, colossusBody);
  }

  /** Deixa os Picos iguais ao progresso salvo. */
  protected restoreAreaState(): void {
    if (!reachedStage("fragment3")) {
      return;
    }

    // Chefe já derrotado. O fragmento só aparece se ainda não foi pego.
    this.removeColossus();
    this.placeColossusItem();

    if (progress.questStage === "fragment3") {
      revealAstralFragment(this, this.fragment, false);
    }
  }

  protected onAreaEntered(): void {
    // Atravessar o portal cumpre o objetivo "atravessar o portal gelado".
    if (progress.questStage === "portal2") {
      progress.questStage = "winter";
      saveProgress();
    }
  }

  protected applyAreaLanguage(): void {
    this.sign.setText(this.t(TEXTS.places.peaks));

    if (this.colossusState !== "defeated") {
      this.colossus.nameText.setText(this.t(this.getColossusName()));
    }
  }

  // ---------------------------------------------------------------------------
  // A cada quadro
  // ---------------------------------------------------------------------------

  protected updateArea(): void {
    this.updateColossus();
    this.updateFragment();
  }

  // ---------------------------------------------------------------------------
  // Gelo
  // ---------------------------------------------------------------------------

  protected getPlayerTraction(): number {
    const { x, y } = this.player.body;

    if (!isOnIce(x, y)) {
      return 1;
    }

    if (!this.iceHintShown) {
      this.iceHintShown = true;
      this.statusText.setText(this.t(TEXTS.chapter3.ice));
    }

    return PEAKS_ICE_TRACTION;
  }

  // ---------------------------------------------------------------------------
  // Chefe: Colosso de Gelo (fase 1) e Espírito do Inverno (fase 2)
  // ---------------------------------------------------------------------------

  private getColossusName() {
    const texts = TEXTS.bosses.colossus;

    return this.spiritPhase ? texts.spiritName : texts.name;
  }

  private updateColossus(): void {
    const { x, y } = this.colossus.sprite.body;
    const now = this.time.now;
    const stats = FROST_BOSS_STATS;

    switch (this.colossusState) {
      case "dormant":
        if (
          progress.questStage === "winter" &&
          this.distanceToPlayer(x, y) <= stats.wakeRange
        ) {
          this.wakeColossus();
        }
        return;

      case "chasing": {
        const distance = this.chasePlayer(
          this.colossus.sprite,
          stats.speed,
          stats.stopDistance,
          stats.sightRange,
          20,
        );

        drawBossHealthBar(this.colossus);

        if (
          distance <= stats.slamTriggerRange &&
          now - this.lastSlamAt >= stats.slamCooldown
        ) {
          this.startSlam();
        } else if (
          distance >= stats.spikeMinRange &&
          now - this.lastSpikeAt >= stats.spikeCooldown
        ) {
          this.startSpikes();
        }
        return;
      }

      case "spirit": {
        const distance = this.chasePlayer(
          this.colossus.sprite,
          stats.spiritSpeed,
          stats.spiritStopDistance,
          stats.sightRange,
          20,
        );

        drawBossHealthBar(this.colossus);

        if (
          distance >= stats.dashMinRange &&
          now - this.lastDashAt >= stats.dashCooldown
        ) {
          this.startDashWindup(distance);
        } else if (now - this.lastBurstAt >= stats.burstCooldown) {
          this.startBurst();
        }
        return;
      }

      case "dashing":
        this.syncCharacter(this.colossus.sprite, 20);
        drawBossHealthBar(this.colossus);

        if (this.distanceToPlayer(x, y) <= stats.dashHitRange) {
          this.damagePlayer(stats.dashDamage);
        }
        return;

      case "slamWindup":
      case "spikeWindup":
      case "transforming":
      case "burstWindup":
      case "dashWindup":
      case "dizzy":
        // Parado (preparando um ataque, tonto ou se transformando).
        this.getPhysicsBody(this.colossus.sprite).setVelocity(0, 0);
        drawBossHealthBar(this.colossus);
        return;

      case "defeated":
        return;
    }
  }

  private wakeColossus(): void {
    const now = this.time.now;

    this.colossusState = "chasing";
    this.lastSlamAt = now;
    // Os espinhos saem logo se o herói ficar longe.
    this.lastSpikeAt = now - FROST_BOSS_STATS.spikeCooldown + 1200;

    setFrostColossusAwake(this.colossusSprite, true);
    this.colossus.nameText.setText(this.t(this.getColossusName()));
    showBossUi(this.colossus);

    this.cameras.main.shake(250, 0.006);
    this.statusText.setText(this.t(TEXTS.bosses.colossus.appeared));

    audio.play("bossAppear");
    audio.setDrums(true);
  }

  // --- Fase 1: golpe no chão -------------------------------------------------

  private startSlam(): void {
    this.colossusState = "slamWindup";

    const { x, y } = this.colossus.sprite.body;
    const { slamRadius, slamWindup } = FROST_BOSS_STATS;

    this.getPhysicsBody(this.colossus.sprite).setVelocity(0, 0);
    audio.play("warning");
    createSlamWarning(this, x, y, slamRadius, slamWindup);

    // O Colosso "cresce" enquanto ergue os punhos.
    this.tweens.add({
      targets: this.colossus.sprite.container,
      scaleX: 1.08,
      scaleY: 1.14,
      duration: slamWindup,
      ease: "Quad.In",
    });

    this.time.delayedCall(slamWindup, () => this.slam());
  }

  private slam(): void {
    // Pode ter sido interrompido (transformação ou derrota).
    if (this.colossusState !== "slamWindup") {
      return;
    }

    this.colossusState = "chasing";
    this.lastSlamAt = this.time.now;

    const { x, y } = this.colossus.sprite.body;
    const { container } = this.colossus.sprite;
    const { slamRadius, slamDamage } = FROST_BOSS_STATS;

    this.tweens.killTweensOf(container);
    container.setScale(1);

    createShockwave(this, x, y, slamRadius);
    createImpactEffect(this, x, y + 10, ICE_COLOR, 12, slamRadius * 0.8);
    audio.play("slam");
    this.cameras.main.shake(150, 0.008);

    if (this.distanceToPlayer(x, y) <= slamRadius) {
      this.damagePlayer(slamDamage);
    }
  }

  // --- Fase 1: linha de espinhos de gelo -------------------------------------

  /**
   * Mira no herói e marca uma linha de círculos no chão. Depois do aviso,
   * os espinhos brotam um após o outro, do Colosso para fora.
   */
  private startSpikes(): void {
    this.colossusState = "spikeWindup";
    this.lastSpikeAt = this.time.now;

    const { x, y } = this.colossus.sprite.body;
    const stats = FROST_BOSS_STATS;
    const angle = Math.atan2(this.player.body.y - y, this.player.body.x - x);

    this.getPhysicsBody(this.colossus.sprite).setVelocity(0, 0);
    this.statusText.setText(this.t(TEXTS.bosses.colossus.spikes));
    audio.play("warning");

    for (let i = 0; i < stats.spikeCount; i++) {
      const distance = 50 + i * stats.spikeSpacing;
      const spikeX = x + Math.cos(angle) * distance;
      const spikeY = y + Math.sin(angle) * distance;
      const delay = stats.spikeWindup + i * stats.spikeInterval;

      createSlamWarning(this, spikeX, spikeY, stats.spikeRadius, delay);
      this.time.delayedCall(delay, () =>
        this.eruptSpike(spikeX, spikeY, i % 2 === 0),
      );
    }

    // Volta a andar quando o último espinho brota.
    const total = stats.spikeWindup + stats.spikeCount * stats.spikeInterval;

    this.time.delayedCall(total, () => {
      if (this.colossusState === "spikeWindup") {
        this.colossusState = "chasing";
      }
    });
  }

  private eruptSpike(x: number, y: number, withSound: boolean): void {
    if (this.colossusState === "defeated") {
      return;
    }

    createIceSpike(this, x, y, FROST_BOSS_STATS.spikeRadius);

    if (withSound) {
      audio.play("shatter");
    }

    if (this.distanceToPlayer(x, y) <= FROST_BOSS_STATS.spikeRadius) {
      this.damagePlayer(FROST_BOSS_STATS.spikeDamage);
    }
  }

  // --- Transformação ---------------------------------------------------------

  /** Com metade da vida, a armadura se parte e começa a segunda fase. */
  private startTransformation(): void {
    this.colossusState = "transforming";
    this.spiritPhase = true;

    const { container } = this.colossus.sprite;

    this.tweens.killTweensOf(container);
    container.setScale(1);
    this.getPhysicsBody(this.colossus.sprite).setVelocity(0, 0);

    this.cameras.main.shake(FROST_BOSS_STATS.transformTime, 0.004);
    audio.play("warning");

    // Treme cada vez mais até a armadura estourar.
    this.tweens.add({
      targets: container,
      angle: { from: -4, to: 4 },
      duration: 90,
      yoyo: true,
      repeat: -1,
    });

    this.time.delayedCall(FROST_BOSS_STATS.transformTime, () =>
      this.finishTransformation(),
    );
  }

  private finishTransformation(): void {
    if (this.colossusState !== "transforming") {
      return;
    }

    const now = this.time.now;
    const { container, body } = this.colossus.sprite;

    this.tweens.killTweensOf(container);
    container.setAngle(0);

    createDeathBurst(this, body.x, body.y - 10, ICE_COLOR);
    this.cameras.main.flash(300, 200, 240, 255);
    audio.play("shatter");
    audio.play("bossAppear");

    showFrostSpiritForm(this.colossusSprite);

    // O espírito surge crescendo.
    container.setScale(0.3);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 400,
      ease: "Back.Out",
    });

    // Nome e barra de vida mudam com a forma.
    this.colossus.style = {
      ...this.colossus.style,
      barColor: SPIRIT_COLOR,
      barBackColor: 0x1a3a40,
      nameColor: "#bffcff",
    };
    this.colossus.nameText
      .setColor("#bffcff")
      .setText(this.t(this.getColossusName()));

    this.statusText.setText(this.t(TEXTS.bosses.colossus.transformed));

    this.colossusState = "spirit";
    this.lastBurstAt = now - FROST_BOSS_STATS.burstCooldown + 900;
    this.lastDashAt = now;
  }

  // --- Fase 2: estilhaços em círculo -----------------------------------------

  private startBurst(): void {
    this.colossusState = "burstWindup";

    const { spiritGlow } = this.colossusSprite;

    // O núcleo brilha forte: aviso de que os estilhaços vêm aí.
    this.tweens.add({
      targets: spiritGlow,
      scale: 2,
      fillAlpha: 0.7,
      duration: FROST_BOSS_STATS.burstWindup / 2,
      yoyo: true,
      ease: "Sine.InOut",
    });

    this.time.delayedCall(FROST_BOSS_STATS.burstWindup, () => this.burst());
  }

  private burst(): void {
    if (this.colossusState !== "burstWindup") {
      return;
    }

    this.colossusState = "spirit";
    this.lastBurstAt = this.time.now;

    const stats = FROST_BOSS_STATS;
    const x = this.colossus.sprite.body.x;
    const y = this.colossus.sprite.body.y - 18;
    // Gira o círculo a cada rajada para os buracos mudarem de lugar.
    const offset = Math.random() * Math.PI;

    for (let i = 0; i < stats.burstCount; i++) {
      const angle = offset + (Math.PI * 2 * i) / stats.burstCount;

      this.fireProjectile(x, y, angle, {
        speed: stats.shardSpeed,
        damage: stats.shardDamage,
        range: stats.shardRange,
        color: ICE_COLOR,
        radius: 6,
      });
    }
  }

  // --- Fase 2: investida -----------------------------------------------------

  /** Para, mostra a faixa de aviso e trava a direção da investida. */
  private startDashWindup(distance: number): void {
    this.colossusState = "dashWindup";
    this.lastDashAt = this.time.now;

    const { x, y } = this.colossus.sprite.body;
    const dx = this.player.body.x - x;
    const dy = this.player.body.y - y;
    const stats = FROST_BOSS_STATS;

    this.dashDirection = { x: dx / distance, y: dy / distance };

    this.getPhysicsBody(this.colossus.sprite).setVelocity(0, 0);

    createChargeWarning(
      this,
      x,
      y,
      Math.atan2(dy, dx),
      (stats.dashSpeed * stats.dashDuration) / 1000 + 20,
      46,
      stats.dashWindup,
    );

    // Encolhe enquanto junta força.
    this.tweens.add({
      targets: this.colossus.sprite.container,
      scale: 0.8,
      duration: stats.dashWindup,
      ease: "Quad.In",
    });

    this.statusText.setText(this.t(TEXTS.bosses.colossus.dashing));
    audio.play("warning");

    this.time.delayedCall(stats.dashWindup, () => this.startDash());
  }

  private startDash(): void {
    if (this.colossusState !== "dashWindup") {
      return;
    }

    this.colossusState = "dashing";

    const { container, body } = this.colossus.sprite;
    const { dashSpeed, dashDuration } = FROST_BOSS_STATS;

    this.tweens.killTweensOf(container);
    container.setScale(1);

    this.getPhysicsBody(this.colossus.sprite).setVelocity(
      this.dashDirection.x * dashSpeed,
      this.dashDirection.y * dashSpeed,
    );

    createImpactEffect(this, body.x, body.y, ICE_COLOR, 8, 26);
    audio.play("teleport");

    this.time.delayedCall(dashDuration, () => this.endDash());
  }

  /** Depois da investida, o espírito fica tonto por um tempo. */
  private endDash(): void {
    if (this.colossusState !== "dashing") {
      return;
    }

    this.colossusState = "dizzy";

    const { container } = this.colossus.sprite;

    this.getPhysicsBody(this.colossus.sprite).setVelocity(0, 0);
    this.statusText.setText(this.t(TEXTS.bosses.colossus.dizzy));

    // Balança tonto.
    this.tweens.add({
      targets: container,
      angle: { from: -10, to: 10 },
      duration: 160,
      yoyo: true,
      repeat: -1,
    });

    this.time.delayedCall(FROST_BOSS_STATS.dashRecover, () => {
      if (this.colossusState !== "dizzy") {
        return;
      }

      this.tweens.killTweensOf(container);
      container.setAngle(0);
      this.colossusState = "spirit";
    });
  }

  // --- Golpes do herói -------------------------------------------------------

  protected attackSpecialTarget(): boolean {
    // Adormecido, se transformando ou derrotado: não dá para acertá-lo.
    if (
      this.colossusState === "dormant" ||
      this.colossusState === "transforming" ||
      this.colossusState === "defeated"
    ) {
      return false;
    }

    if (this.strikeBoss(this.colossus, TEXTS.bosses.colossus)) {
      this.defeatColossus();
    } else if (
      !this.spiritPhase &&
      this.colossus.health <=
        this.colossus.maxHealth * FROST_BOSS_STATS.phaseTwoAt
    ) {
      this.startTransformation();
    }

    return true;
  }

  /** Derrotar o Espírito do Inverno liberta o terceiro Fragmento Astral. */
  private defeatColossus(): void {
    progress.questStage = "fragment3";

    const { x, y } = this.colossus.sprite.body;

    createDeathBurst(this, x, y, this.colossus.style.deathColor);
    audio.play("enemyDeath");
    audio.play("shatter");
    this.removeColossus();
    // Um pouco abaixo, para não ficar em cima do fragmento.
    this.dropPotion(x - 60, y + 60);
    this.placeColossusItem();

    revealAstralFragment(this, this.fragment, true);

    this.updateQuestDisplay();
    this.statusText.setText(this.t(TEXTS.bosses.colossus.defeated));

    saveProgress();
  }

  /** A Lâmina Glacial aparece num canto do platô até o herói pegá-la. */
  private placeColossusItem(): void {
    this.placeItem(
      "glacialBlade",
      FROST_BOSS_ITEM_POSITION.x,
      FROST_BOSS_ITEM_POSITION.y,
    );
  }

  /** Tira o chefe do mapa (ao derrotá-lo ou ao carregar um save). */
  private removeColossus(): void {
    this.colossusState = "defeated";
    audio.setDrums(false);
    this.tweens.killTweensOf(this.colossus.sprite.container);
    this.tweens.killTweensOf(this.colossusSprite.spiritGlow);
    this.disableCharacter(this.colossus.sprite);
    destroyBoss(this.colossus);
  }

  // ---------------------------------------------------------------------------
  // Terceiro Fragmento Astral
  // ---------------------------------------------------------------------------

  private updateFragment(): void {
    if (!this.fragment.visible || progress.questStage !== "fragment3") {
      return;
    }

    const distance = this.distanceToPlayer(
      PEAKS_FRAGMENT_POSITION.x,
      PEAKS_FRAGMENT_POSITION.y,
    );

    if (distance <= FRAGMENT_COLLECT_RANGE) {
      this.collectFragment();
    }
  }

  /**
   * Pegar o terceiro fragmento conclui o Capítulo 3. O save é mantido:
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

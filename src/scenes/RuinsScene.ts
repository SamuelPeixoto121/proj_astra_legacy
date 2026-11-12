// Ruínas do Santuário: Capítulo 1.
// Missão: derrotar a Sentinela de Pedra, guardiã do primeiro Fragmento
// Astral, e pegar o fragmento no altar. Isso abre um portal atrás do altar,
// que leva ao Pântano Sombrio (Capítulo 2).
//
// A Sentinela é lenta, mas golpeia o chão em área. Antes do golpe, um
// círculo vermelho avisa onde vai bater: sair dele evita o dano.

import type Phaser from "phaser";
import {
  FRAGMENT_COLLECT_RANGE,
  FRAGMENT_POSITION,
  RUINS_HEIGHT,
  RUINS_PORTAL_POSITION,
  RUINS_SHRINE_POSITION,
  RUINS_SPIDER_SPAWNS,
  RUINS_WIDTH,
  SENTINEL_POSITION,
  SENTINEL_STATS,
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
import { createRuinsWorld } from "../world/ruins";
import { createPortal, openPortal, type AstralPortal } from "../world/portal";
import {
  createAstralFragment,
  revealAstralFragment,
  type AstralFragment,
} from "../world/astralFragment";
import {
  createSentinel,
  setSentinelAwake,
  type SentinelSprite,
} from "../characters/sentinel";
import {
  createDeathBurst,
  createShockwave,
  createSlamWarning,
} from "../effects/combatEffects";
import { audio } from "../audio/engine";
import { AREA_SCENE_KEYS } from "./areas";
import { AreaScene } from "./AreaScene";

/**
 * Estados da Sentinela:
 * dormant (adormecida) → awake (persegue) ⇄ windup (preparando o golpe)
 * → defeated (derrotada).
 */
type SentinelState = "dormant" | "awake" | "windup" | "defeated";

export class RuinsScene extends AreaScene {
  protected readonly areaId = "ruins";
  protected readonly worldWidth = RUINS_WIDTH;
  protected readonly worldHeight = RUINS_HEIGHT;
  protected readonly areaName = TEXTS.places.ruins;
  protected readonly musicTrack = "ruins";

  private sign!: Phaser.GameObjects.Text;
  private fragment!: AstralFragment;
  private portal!: AstralPortal;

  private sentinelSprite!: SentinelSprite;
  private sentinel!: Boss;
  private sentinelState: SentinelState = "dormant";
  private lastSlamAt = -10000;

  constructor() {
    super(AREA_SCENE_KEYS.ruins);
  }

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  protected createWorld(): Phaser.GameObjects.Rectangle[] {
    const { obstacles, sign } = createRuinsWorld(this);

    this.sign = sign;

    this.addShrine(
      RUINS_SHRINE_POSITION.x,
      RUINS_SHRINE_POSITION.y,
      "ruinsShrine",
    );

    this.fragment = createAstralFragment(
      this,
      FRAGMENT_POSITION.x,
      FRAGMENT_POSITION.y,
    );

    // Portal atrás do altar: leva ao Pântano depois de pegar o fragmento.
    const { x, y } = RUINS_PORTAL_POSITION;

    this.portal = createPortal(this, x, y);

    this.addExit({
      x: x - 40,
      y: y - 30,
      width: 80,
      height: 60,
      target: "swampEntrance",
      isOpen: () => reachedStage("portal"),
    });

    // Borda de baixo: volta para a trilha ao norte da Floresta.
    this.addExit({
      x: RUINS_WIDTH / 2 - 90,
      y: RUINS_HEIGHT - 40,
      width: 180,
      height: 40,
      target: "forestNorth",
      isOpen: () => true,
    });

    return obstacles;
  }

  protected createActors(): void {
    const spiders = RUINS_SPIDER_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "spider", x, y),
    );

    this.enemies.push(...spiders);

    this.sentinelSprite = createSentinel(
      this,
      SENTINEL_POSITION.x,
      SENTINEL_POSITION.y,
    );

    this.sentinel = createBoss(this, this.sentinelSprite, SENTINEL_STATS, {
      barWidth: 110,
      barOffsetY: 62,
      nameOffsetY: 84,
      nameColor: "#d9b8ff",
      barColor: 0xb06bff,
      barBackColor: 0x3d2650,
      impactColor: 0xd9c8ff,
      damageTextColor: "#efe4ff",
      deathColor: 0x8d3fb0,
    });

    this.sentinelState = "dormant";
    this.lastSlamAt = -10000;
  }

  protected setupAreaPhysics(obstacles: Phaser.GameObjects.Rectangle[]): void {
    const sentinelBody = this.sentinel.sprite.body;

    this.physics.add.collider(sentinelBody, obstacles);
    // A Sentinela é sólida: o herói não atravessa nem empurra.
    this.physics.add.collider(this.player.body, sentinelBody);
  }

  /** Deixa as Ruínas iguais ao progresso salvo. */
  protected restoreAreaState(): void {
    // A armadura da Sentinela fica onde ela estava até o herói pegá-la.
    if (reachedStage("fragment")) {
      this.placeItem("stoneArmor", SENTINEL_POSITION.x, SENTINEL_POSITION.y);
    }

    if (reachedStage("portal")) {
      // Fragmento já recuperado: Sentinela derrotada e portal aberto.
      this.removeSentinel();
      openPortal(this, this.portal, false);
    } else if (progress.questStage === "fragment") {
      this.removeSentinel();
      revealAstralFragment(this, this.fragment, false);
    }
  }

  protected onAreaEntered(): void {
    // Chegar às Ruínas cumpre o objetivo "ir às Ruínas".
    if (progress.questStage === "ruins") {
      progress.questStage = "guardian";
      saveProgress();
    }
  }

  protected applyAreaLanguage(): void {
    this.sign.setText(this.t(TEXTS.places.ruins));

    if (this.sentinelState !== "defeated") {
      this.sentinel.nameText.setText(this.t(TEXTS.bosses.sentinel.name));
    }
  }

  // ---------------------------------------------------------------------------
  // A cada quadro
  // ---------------------------------------------------------------------------

  protected updateArea(): void {
    this.updateSentinel();
    this.updateFragment();
  }

  // ---------------------------------------------------------------------------
  // Sentinela de Pedra
  // ---------------------------------------------------------------------------

  private updateSentinel(): void {
    const { x, y } = this.sentinel.sprite.body;

    switch (this.sentinelState) {
      case "dormant":
        if (
          progress.questStage === "guardian" &&
          this.distanceToPlayer(x, y) <= SENTINEL_STATS.wakeRange
        ) {
          this.wakeSentinel();
        }
        return;

      case "awake": {
        const distance = this.chasePlayer(
          this.sentinel.sprite,
          SENTINEL_STATS.speed,
          SENTINEL_STATS.stopDistance,
          SENTINEL_STATS.sightRange,
          20,
        );

        drawBossHealthBar(this.sentinel);

        if (
          distance <= SENTINEL_STATS.slamTriggerRange &&
          this.time.now - this.lastSlamAt >= SENTINEL_STATS.slamCooldown
        ) {
          this.startSlam();
        }
        return;
      }

      case "windup":
        // Parada, preparando o golpe.
        this.getPhysicsBody(this.sentinel.sprite).setVelocity(0, 0);
        drawBossHealthBar(this.sentinel);
        return;

      case "defeated":
        return;
    }
  }

  private wakeSentinel(): void {
    this.sentinelState = "awake";

    setSentinelAwake(this.sentinelSprite, true);
    showBossUi(this.sentinel);

    this.cameras.main.shake(250, 0.006);
    this.statusText.setText(this.t(TEXTS.bosses.sentinel.appeared));

    audio.play("bossAppear");
    audio.setDrums(true);
  }

  /** Começa o golpe no chão: mostra o aviso e golpeia depois do tempo. */
  private startSlam(): void {
    this.sentinelState = "windup";

    const { x, y } = this.sentinel.sprite.body;
    const { container } = this.sentinel.sprite;

    this.getPhysicsBody(this.sentinel.sprite).setVelocity(0, 0);

    audio.play("warning");

    createSlamWarning(
      this,
      x,
      y,
      SENTINEL_STATS.slamRadius,
      SENTINEL_STATS.slamWindup,
    );

    // A Sentinela "cresce" enquanto prepara o golpe.
    this.tweens.add({
      targets: container,
      scaleX: 1.08,
      scaleY: 1.14,
      duration: SENTINEL_STATS.slamWindup,
      ease: "Quad.In",
    });

    this.time.delayedCall(SENTINEL_STATS.slamWindup, () => this.slam());
  }

  private slam(): void {
    // Pode ter sido derrotada durante a preparação.
    if (this.sentinelState !== "windup") {
      return;
    }

    this.sentinelState = "awake";
    this.lastSlamAt = this.time.now;

    const { x, y } = this.sentinel.sprite.body;
    const { container } = this.sentinel.sprite;

    // Para a animação de "crescer" antes de voltar ao tamanho normal.
    this.tweens.killTweensOf(container);
    container.setScale(1);

    createShockwave(this, x, y, SENTINEL_STATS.slamRadius);
    audio.play("slam");
    this.cameras.main.shake(150, 0.008);

    if (this.distanceToPlayer(x, y) <= SENTINEL_STATS.slamRadius) {
      this.damagePlayer(SENTINEL_STATS.slamDamage);
    }
  }

  protected attackSpecialTarget(): boolean {
    if (this.sentinelState !== "awake" && this.sentinelState !== "windup") {
      return false;
    }

    if (this.strikeBoss(this.sentinel, TEXTS.bosses.sentinel)) {
      this.defeatSentinel();
    }

    return true;
  }

  /** Derrotar a Sentinela liberta o Fragmento Astral no altar. */
  private defeatSentinel(): void {
    progress.questStage = "fragment";

    const { x, y } = this.sentinel.sprite.body;

    createDeathBurst(this, x, y, this.sentinel.style.deathColor);
    audio.play("enemyDeath");
    this.removeSentinel();
    this.placeItem("stoneArmor", x, y);
    this.dropPotion(x + 40, y + 10);

    revealAstralFragment(this, this.fragment, true);

    this.updateQuestDisplay();
    this.statusText.setText(this.t(TEXTS.bosses.sentinel.defeated));

    saveProgress();
  }

  /** Tira a Sentinela do mapa (ao derrotá-la ou ao carregar um save). */
  private removeSentinel(): void {
    this.sentinelState = "defeated";
    audio.setDrums(false);
    this.tweens.killTweensOf(this.sentinel.sprite.container);
    this.disableCharacter(this.sentinel.sprite);
    destroyBoss(this.sentinel);
  }

  // ---------------------------------------------------------------------------
  // Fragmento Astral
  // ---------------------------------------------------------------------------

  private updateFragment(): void {
    if (!this.fragment.visible || progress.questStage !== "fragment") {
      return;
    }

    const distance = this.distanceToPlayer(
      FRAGMENT_POSITION.x,
      FRAGMENT_POSITION.y,
    );

    if (distance <= FRAGMENT_COLLECT_RANGE) {
      this.collectFragment();
    }
  }

  /** Pegar o fragmento conclui o Capítulo 1 e abre o portal para o Pântano. */
  private collectFragment(): void {
    progress.questStage = "portal";

    const { x, y } = this.fragment.container;

    createDeathBurst(this, x, y, 0xffe08a);
    audio.play("fragment");
    this.fragment.container.destroy();
    this.fragment.visible = false;

    this.cameras.main.flash(500, 255, 240, 200);

    openPortal(this, this.portal, true);
    audio.play("shrine");

    this.updateQuestDisplay();
    this.statusText.setText(this.t(TEXTS.chapter2.portalOpened));

    saveProgress();
  }
}

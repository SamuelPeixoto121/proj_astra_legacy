// Terras Vulcânicas: Capítulo 4.
// Chega-se aqui pelo portal de fogo no topo dos Picos Congelados.
// Missão: atravessar os rios de lava até a cratera, a leste, derrotar o
// Arauto de Ignis e pegar o quarto Fragmento Astral, o que abre um portal
// de luz na cratera: ele leva de volta à vila (Capítulo 5 começa com o
// Ancião). Brasas Vivas correm até o herói e explodem (a explosão fere
// também os outros inimigos); aranhas e lobos completam o caminho.
//
// Pisar na lava ou numa poça de fogo queima (dano a cada pouco tempo);
// rolar por cima é seguro, porque o herói fica invencível no rolamento.
//
// O Arauto flutua mantendo distância e ataca com:
// - colunas de fogo: marca o chão onde o herói está, várias vezes seguidas;
//   cada coluna deixa uma poça de fogo, e a cratera vai ficando perigosa;
// - explosão de chamas, se o herói ficar colado nele;
// - chamado: invoca Brasas Vivas.
// Com metade da vida fica furioso: mais colunas e ataques mais rápidos.

import Phaser from "phaser";
import {
  FRAGMENT_COLLECT_RANGE,
  HERALD_ITEM_POSITION,
  HERALD_POSITION,
  HERALD_STATS,
  VOLCANO_EMBER_SPAWNS,
  VOLCANO_FRAGMENT_POSITION,
  VOLCANO_HEIGHT,
  VOLCANO_HOME_PORTAL_POSITION,
  VOLCANO_LAVA_DAMAGE,
  VOLCANO_RETURN_PORTAL_POSITION,
  VOLCANO_SHRINE_POSITION,
  VOLCANO_SPIDER_SPAWNS,
  VOLCANO_WIDTH,
  VOLCANO_WOLF_SPAWNS,
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
import { createVolcanoWorld, isOnLava } from "../world/volcano";
import {
  PORTAL_COLORS,
  createPortal,
  openPortal,
  type AstralPortal,
} from "../world/portal";
import {
  createAstralFragment,
  revealAstralFragment,
  type AstralFragment,
} from "../world/astralFragment";
import {
  createHerald,
  setHeraldAwake,
  type HeraldSprite,
} from "../characters/herald";
import {
  createDeathBurst,
  createFireColumn,
  createImpactEffect,
  createShockwave,
  createSlamWarning,
} from "../effects/combatEffects";
import { audio } from "../audio/engine";
import { AREA_SCENE_KEYS } from "./areas";
import { AreaScene } from "./AreaScene";

/**
 * Estados do Arauto:
 * dormant (esperando) → idle (flutua e decide o próximo ataque)
 * ⇄ columns (colunas de fogo) / nova (explosão de chamas) / summoning
 * (chamando Brasas) → defeated (derrotado).
 */
type HeraldState =
  | "dormant"
  | "idle"
  | "columns"
  | "nova"
  | "summoning"
  | "defeated";

/** Poça de fogo deixada por uma coluna: queima até `endsAt`. */
interface FirePool {
  x: number;
  y: number;
  endsAt: number;
  visual: Phaser.GameObjects.Ellipse;
}

const FIRE_COLOR = 0xff7a2a;

export class VolcanoScene extends AreaScene {
  protected readonly areaId = "volcano";
  protected readonly worldWidth = VOLCANO_WIDTH;
  protected readonly worldHeight = VOLCANO_HEIGHT;
  protected readonly areaName = TEXTS.places.volcano;
  protected readonly musicTrack = "volcano";

  private sign!: Phaser.GameObjects.Text;
  private fragment!: AstralFragment;
  private homePortal!: AstralPortal;
  private firePools: FirePool[] = [];

  private heraldSprite!: HeraldSprite;
  private herald!: Boss;
  private heraldState: HeraldState = "dormant";
  private enraged = false;
  private lastColumnsAt = 0;
  private lastNovaAt = 0;
  private lastSummonAt = 0;
  /** Brasas chamadas pelo Arauto (para limitar quantas ficam vivas). */
  private summons: Enemy[] = [];

  constructor() {
    super(AREA_SCENE_KEYS.volcano);
  }

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  protected createWorld(): Phaser.GameObjects.Rectangle[] {
    const { obstacles, sign } = createVolcanoWorld(this);

    this.sign = sign;
    this.firePools = [];

    this.addShrine(
      VOLCANO_SHRINE_POSITION.x,
      VOLCANO_SHRINE_POSITION.y,
      "volcanoShrine",
    );

    this.fragment = createAstralFragment(
      this,
      VOLCANO_FRAGMENT_POSITION.x,
      VOLCANO_FRAGMENT_POSITION.y,
    );

    // Portal de luz na cratera: volta para a vila depois do fragmento.
    this.homePortal = createPortal(
      this,
      VOLCANO_HOME_PORTAL_POSITION.x,
      VOLCANO_HOME_PORTAL_POSITION.y,
    );

    this.addExit({
      x: VOLCANO_HOME_PORTAL_POSITION.x - 40,
      y: VOLCANO_HOME_PORTAL_POSITION.y - 30,
      width: 80,
      height: 60,
      target: "villagePortal",
      isOpen: () => reachedStage("return"),
    });

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

    const embers = VOLCANO_EMBER_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "ember", x, y),
    );

    this.enemies.push(...spiders, ...wolves, ...embers);

    this.heraldSprite = createHerald(this, HERALD_POSITION.x, HERALD_POSITION.y);

    this.herald = createBoss(this, this.heraldSprite, HERALD_STATS, {
      barWidth: 110,
      barOffsetY: 82,
      nameOffsetY: 102,
      nameColor: "#ffc48a",
      barColor: 0xff7a2a,
      barBackColor: 0x4a1a12,
      impactColor: 0xffd0a0,
      damageTextColor: "#ffe2b0",
      deathColor: FIRE_COLOR,
    });

    this.heraldState = "dormant";
    this.enraged = false;
    this.summons = [];
  }

  protected setupAreaPhysics(): void {
    // O herói não atravessa o Arauto.
    this.physics.add.collider(this.player.body, this.herald.sprite.body);
  }

  /** Deixa as Terras Vulcânicas iguais ao progresso salvo. */
  protected restoreAreaState(): void {
    if (!reachedStage("fragment4")) {
      return;
    }

    // Arauto já derrotado. O fragmento só aparece se ainda não foi pego.
    this.removeHerald();
    this.placeHeraldItem();

    if (progress.questStage === "fragment4") {
      revealAstralFragment(this, this.fragment, false);
    } else {
      // Fragmento já recuperado: o portal de luz está aberto.
      openPortal(this, this.homePortal, false);
    }
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

    if (this.heraldState !== "defeated") {
      this.herald.nameText.setText(this.t(TEXTS.bosses.herald.name));
    }
  }

  // ---------------------------------------------------------------------------
  // A cada quadro
  // ---------------------------------------------------------------------------

  protected updateArea(): void {
    this.updateFirePools();
    this.updateBurning();
    this.updateHerald();
    this.updateFragment();
  }

  // ---------------------------------------------------------------------------
  // Lava e poças de fogo
  // ---------------------------------------------------------------------------

  /** Pisar na lava ou numa poça de fogo queima; rolando, não. */
  private updateBurning(): void {
    const { x, y } = this.player.body;

    if (isOnLava(x, y) || this.isInFirePool(x, y)) {
      this.burnPlayer(VOLCANO_LAVA_DAMAGE, TEXTS.chapter4.lava);
    }
  }

  private isInFirePool(x: number, y: number): boolean {
    const radius = HERALD_STATS.columnRadius;

    return this.firePools.some(
      (pool) => Phaser.Math.Distance.Between(x, y, pool.x, pool.y) <= radius,
    );
  }

  /** Deixa uma poça de fogo no chão (a mais antiga some se houver muitas). */
  private addFirePool(x: number, y: number): void {
    const radius = HERALD_STATS.columnRadius;
    const visual = this.add
      .ellipse(x, y, radius * 2, radius * 1.2, FIRE_COLOR, 0.55)
      .setStrokeStyle(2, 0xffb347, 0.8)
      .setDepth(y - 6);

    // Tremula como fogo.
    this.tweens.add({
      targets: visual,
      alpha: { from: 0.45, to: 0.75 },
      scaleX: { from: 0.95, to: 1.05 },
      duration: 260,
      yoyo: true,
      repeat: -1,
    });

    this.firePools.push({
      x,
      y,
      endsAt: this.time.now + HERALD_STATS.firePoolTime,
      visual,
    });

    if (this.firePools.length > HERALD_STATS.maxFirePools) {
      this.removeFirePool(this.firePools[0]);
    }
  }

  private updateFirePools(): void {
    const now = this.time.now;

    for (const pool of [...this.firePools]) {
      if (now >= pool.endsAt) {
        this.removeFirePool(pool);
      }
    }
  }

  private removeFirePool(pool: FirePool): void {
    this.firePools = this.firePools.filter((other) => other !== pool);
    this.tweens.killTweensOf(pool.visual);

    // Some apagando aos poucos.
    this.tweens.add({
      targets: pool.visual,
      alpha: 0,
      duration: 300,
      onComplete: () => pool.visual.destroy(),
    });
  }

  // ---------------------------------------------------------------------------
  // Arauto de Ignis
  // ---------------------------------------------------------------------------

  /** Tempo de espera entre ataques (menor quando ele está furioso). */
  private cooldown(base: number): number {
    return this.enraged ? base * HERALD_STATS.enragedCooldownFactor : base;
  }

  private updateHerald(): void {
    const { x, y } = this.herald.sprite.body;
    const now = this.time.now;
    const stats = HERALD_STATS;

    switch (this.heraldState) {
      case "dormant":
        if (
          progress.questStage === "herald" &&
          this.distanceToPlayer(x, y) <= stats.wakeRange
        ) {
          this.wakeHerald();
        }
        return;

      case "idle": {
        const distance = this.chasePlayer(
          this.herald.sprite,
          stats.speed,
          stats.stopDistance,
          stats.sightRange,
          30,
        );

        drawBossHealthBar(this.herald);

        if (
          distance <= stats.novaTriggerRange &&
          now - this.lastNovaAt >= this.cooldown(stats.novaCooldown)
        ) {
          this.startNova();
        } else if (
          now - this.lastSummonAt >= this.cooldown(stats.summonCooldown) &&
          this.aliveSummons() < stats.maxSummons
        ) {
          this.startSummon();
        } else if (
          now - this.lastColumnsAt >= this.cooldown(stats.columnCooldown)
        ) {
          this.startColumns();
        }
        return;
      }

      case "columns":
      case "nova":
      case "summoning":
        // Parado, conjurando.
        this.getPhysicsBody(this.herald.sprite).setVelocity(0, 0);
        drawBossHealthBar(this.herald);
        return;

      case "defeated":
        return;
    }
  }

  private wakeHerald(): void {
    const now = this.time.now;

    this.heraldState = "idle";
    // As colunas saem logo; o chamado demora um pouco.
    this.lastColumnsAt = now - HERALD_STATS.columnCooldown + 1000;
    this.lastSummonAt = now - HERALD_STATS.summonCooldown + 6000;
    this.lastNovaAt = now;

    setHeraldAwake(this.heraldSprite, true);
    this.herald.nameText.setText(this.t(TEXTS.bosses.herald.name));
    showBossUi(this.herald);

    this.cameras.main.shake(250, 0.006);
    this.statusText.setText(this.t(TEXTS.bosses.herald.appeared));

    audio.play("bossAppear");
    audio.setDrums(true);
  }

  /** As mãos brilham forte: aviso de que um ataque vem aí. */
  private glowHands(duration: number): void {
    this.tweens.add({
      targets: this.heraldSprite.handGlow,
      scale: 1.7,
      fillAlpha: 0.55,
      duration: duration / 2,
      yoyo: true,
      ease: "Sine.InOut",
    });
  }

  // --- Colunas de fogo -------------------------------------------------------

  private startColumns(): void {
    this.heraldState = "columns";

    const stats = HERALD_STATS;
    const count = this.enraged ? stats.enragedColumnCount : stats.columnCount;

    this.glowHands(count * stats.columnInterval);
    this.statusText.setText(this.t(TEXTS.bosses.herald.columns));
    audio.play("warning");

    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * stats.columnInterval, () =>
        this.markColumn(i === count - 1),
      );
    }
  }

  /** Marca o chão onde o herói está; a coluna sobe depois de columnWindup. */
  private markColumn(isLast: boolean): void {
    if (this.heraldState !== "columns") {
      return;
    }

    const { x, y } = this.player.body;
    const { columnRadius, columnWindup, columnDamage } = HERALD_STATS;

    createSlamWarning(this, x, y, columnRadius, columnWindup);

    this.time.delayedCall(columnWindup, () => {
      if (this.heraldState === "defeated") {
        return;
      }

      createFireColumn(this, x, y, columnRadius);
      audio.play("flame");
      this.cameras.main.shake(80, 0.003);
      this.addFirePool(x, y);

      if (this.distanceToPlayer(x, y) <= columnRadius) {
        this.damagePlayer(columnDamage);
      }

      if (isLast && this.heraldState === "columns") {
        this.heraldState = "idle";
        this.lastColumnsAt = this.time.now;
      }
    });
  }

  // --- Explosão de chamas ----------------------------------------------------

  /** Herói colado nele: um anel avisa e ele explode em volta. */
  private startNova(): void {
    this.heraldState = "nova";

    const { x, y } = this.herald.sprite.body;
    const { novaRadius, novaWindup } = HERALD_STATS;

    this.getPhysicsBody(this.herald.sprite).setVelocity(0, 0);
    this.glowHands(novaWindup);
    createSlamWarning(this, x, y, novaRadius, novaWindup);
    this.statusText.setText(this.t(TEXTS.bosses.herald.nova));
    audio.play("fuse");

    this.time.delayedCall(novaWindup, () => this.nova());
  }

  private nova(): void {
    if (this.heraldState !== "nova") {
      return;
    }

    this.heraldState = "idle";
    this.lastNovaAt = this.time.now;

    const { x, y } = this.herald.sprite.body;
    const { novaRadius, novaDamage } = HERALD_STATS;

    createShockwave(this, x, y, novaRadius);
    createImpactEffect(this, x, y, FIRE_COLOR, 16, novaRadius);
    audio.play("explosion");
    this.cameras.main.shake(160, 0.008);

    if (this.distanceToPlayer(x, y) <= novaRadius) {
      this.damagePlayer(novaDamage);
    }
  }

  // --- Chamado das Brasas ----------------------------------------------------

  private aliveSummons(): number {
    this.summons = this.summons.filter((enemy) => !enemy.defeated);
    return this.summons.length;
  }

  private startSummon(): void {
    this.heraldState = "summoning";

    const duration = 700;

    this.glowHands(duration);
    this.statusText.setText(this.t(TEXTS.bosses.herald.summon));
    audio.play("teleport");

    this.time.delayedCall(duration, () => this.summon());
  }

  /** Brasas surgem dos dois lados do Arauto. */
  private summon(): void {
    if (this.heraldState !== "summoning") {
      return;
    }

    this.heraldState = "idle";
    this.lastSummonAt = this.time.now;

    const { x, y } = this.herald.sprite.body;
    const free = HERALD_STATS.maxSummons - this.aliveSummons();
    const count = Math.min(HERALD_STATS.summonCount, free);

    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const spawnX = x + side * 60;
      const spawnY = y + 30;

      createImpactEffect(this, spawnX, spawnY, FIRE_COLOR, 10, 30);

      const ember = spawnEnemy(this, "ember", spawnX, spawnY);

      this.enemies.push(ember);
      this.summons.push(ember);
    }
  }

  // --- Golpes do herói -------------------------------------------------------

  protected attackSpecialTarget(): boolean {
    if (this.heraldState === "dormant" || this.heraldState === "defeated") {
      return false;
    }

    if (this.strikeBoss(this.herald, TEXTS.bosses.herald)) {
      this.defeatHerald();
    } else {
      this.checkEnrage();
    }

    return true;
  }

  /** Com metade da vida, o Arauto fica furioso. */
  private checkEnrage(): void {
    if (
      this.enraged ||
      this.herald.health > this.herald.maxHealth * HERALD_STATS.enragedAt
    ) {
      return;
    }

    this.enraged = true;
    this.cameras.main.shake(200, 0.006);
    this.statusText.setText(this.t(TEXTS.bosses.herald.enraged));
    audio.play("bossAppear");

    // O brilho das mãos fica mais forte e mais vermelho.
    const { handGlow } = this.heraldSprite;

    this.tweens.killTweensOf(handGlow);
    handGlow.setScale(1.3);
    handGlow.setFillStyle(0xff4a2a, 0.45);
  }

  /** Derrotar o Arauto liberta o quarto Fragmento Astral. */
  private defeatHerald(): void {
    progress.questStage = "fragment4";

    const { x, y } = this.herald.sprite.body;

    createDeathBurst(this, x, y, this.herald.style.deathColor);
    audio.play("enemyDeath");
    audio.play("explosion");
    this.removeHerald();
    this.dropPotion(x - 70, y + 60);
    this.placeHeraldItem();

    // As Brasas chamadas por ele se apagam junto.
    for (const ember of this.summons) {
      if (!ember.defeated) {
        createDeathBurst(this, ember.sprite.body.x, ember.sprite.body.y, FIRE_COLOR);
        this.removeEnemy(ember);
      }
    }

    this.summons = [];

    revealAstralFragment(this, this.fragment, true);

    this.updateQuestDisplay();
    this.statusText.setText(this.t(TEXTS.bosses.herald.defeated));

    saveProgress();
  }

  /** O Manto de Brasas aparece num canto da cratera até o herói pegá-lo. */
  private placeHeraldItem(): void {
    this.placeItem(
      "emberMantle",
      HERALD_ITEM_POSITION.x,
      HERALD_ITEM_POSITION.y,
    );
  }

  /** Tira o Arauto do mapa (ao derrotá-lo ou ao carregar um save). */
  private removeHerald(): void {
    this.heraldState = "defeated";
    audio.setDrums(false);
    this.tweens.killTweensOf(this.herald.sprite.container);
    this.tweens.killTweensOf(this.heraldSprite.handGlow);
    this.disableCharacter(this.herald.sprite);
    destroyBoss(this.herald);
  }

  // ---------------------------------------------------------------------------
  // Quarto Fragmento Astral
  // ---------------------------------------------------------------------------

  private updateFragment(): void {
    if (!this.fragment.visible || progress.questStage !== "fragment4") {
      return;
    }

    const distance = this.distanceToPlayer(
      VOLCANO_FRAGMENT_POSITION.x,
      VOLCANO_FRAGMENT_POSITION.y,
    );

    if (distance <= FRAGMENT_COLLECT_RANGE) {
      this.collectFragment();
    }
  }

  /** Pegar o quarto fragmento abre o portal de luz de volta à vila. */
  private collectFragment(): void {
    progress.questStage = "return";

    const { x, y } = this.fragment.container;

    createDeathBurst(this, x, y, 0xffe08a);
    audio.play("fragment");
    this.fragment.container.destroy();
    this.fragment.visible = false;

    this.cameras.main.flash(500, 255, 240, 200);

    openPortal(this, this.homePortal, true);
    audio.play("shrine");

    this.updateQuestDisplay();
    this.statusText.setText(this.t(TEXTS.chapter5.portalHome));

    saveProgress();
  }
}

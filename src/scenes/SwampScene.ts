// Pântano Sombrio: Capítulo 2.
// Chega-se aqui pelo portal atrás do altar das Ruínas.
// Missão: derrotar a Feiticeira do Pântano, na clareira ao norte, e pegar o
// segundo Fragmento Astral. Espíritos do Pântano atacam de longe; aranhas,
// de perto. Poças de lama deixam o herói mais lento; rolar não é afetado.
//
// A Feiticeira ataca à distância:
// - rajada: o orbe brilha e ela dispara projéteis em leque;
// - teleporte: se o herói chega perto, ela some e reaparece longe;
// - marcas sombrias (especial): círculos no chão onde o herói está, que
//   explodem depois de um tempo.
// Enquanto conjura ela não consegue se teleportar: é a hora de atacar.
// Com metade da vida ela fica furiosa: mais projéteis e ataques mais rápidos.

import Phaser from "phaser";
import {
  FRAGMENT_COLLECT_RANGE,
  SWAMP_FRAGMENT_POSITION,
  SWAMP_HEIGHT,
  SWAMP_MUD_SPEED,
  SWAMP_RETURN_PORTAL_POSITION,
  SWAMP_SHRINE_POSITION,
  SWAMP_SPIDER_SPAWNS,
  SWAMP_WISP_SPAWNS,
  SWAMP_WIDTH,
  WITCH_POSITION,
  WITCH_STATS,
  WITCH_TELEPORT_POINTS,
} from "../config";
import { TEXTS } from "../i18n/texts";
import { progress, saveProgress } from "../systems/progress";
import { clearSave } from "../systems/saveGame";
import { spawnEnemy } from "../systems/enemies";
import {
  createBoss,
  destroyBoss,
  drawBossHealthBar,
  showBossUi,
  type Boss,
} from "../systems/bosses";
import { createSwampWorld, isInMud } from "../world/swamp";
import { createPortal, openPortal } from "../world/portal";
import {
  createAstralFragment,
  revealAstralFragment,
  type AstralFragment,
} from "../world/astralFragment";
import {
  createWitch,
  setWitchAwake,
  type WitchSprite,
} from "../characters/witch";
import {
  createDeathBurst,
  createImpactEffect,
  createShockwave,
  createSlamWarning,
} from "../effects/combatEffects";
import { audio } from "../audio/engine";
import { AREA_SCENE_KEYS } from "./areas";
import { AreaScene } from "./AreaScene";

/**
 * Estados da Feiticeira:
 * dormant (esperando) → idle (flutuando, decide o próximo ataque)
 * ⇄ casting (preparando a rajada) / marking (marcas sombrias)
 * / teleporting (sumindo e reaparecendo) → defeated (derrotada).
 */
type WitchState =
  | "dormant"
  | "idle"
  | "casting"
  | "marking"
  | "teleporting"
  | "defeated";

const WITCH_PROJECTILE_COLOR = 0xc77dff;
const WITCH_MAGIC_COLOR = 0x7fffd4;

export class SwampScene extends AreaScene {
  protected readonly areaId = "swamp";
  protected readonly worldWidth = SWAMP_WIDTH;
  protected readonly worldHeight = SWAMP_HEIGHT;
  protected readonly areaName = TEXTS.places.swamp;
  protected readonly musicTrack = "swamp";

  private sign!: Phaser.GameObjects.Text;
  /** A dica sobre a lama aparece só na primeira vez em cada visita. */
  private mudHintShown = false;
  private fragment!: AstralFragment;

  private witchSprite!: WitchSprite;
  private witch!: Boss;
  private witchState: WitchState = "dormant";
  private enraged = false;
  private lastVolleyAt = 0;
  private nextMarkAt = 0;
  private teleportReadyAt = 0;

  constructor() {
    super(AREA_SCENE_KEYS.swamp);
  }

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  protected createWorld(): Phaser.GameObjects.Rectangle[] {
    const { obstacles, sign } = createSwampWorld(this);

    this.sign = sign;
    this.mudHintShown = false;

    this.addShrine(
      SWAMP_SHRINE_POSITION.x,
      SWAMP_SHRINE_POSITION.y,
      "swampShrine",
    );

    this.fragment = createAstralFragment(
      this,
      SWAMP_FRAGMENT_POSITION.x,
      SWAMP_FRAGMENT_POSITION.y,
    );

    // Portal de volta para as Ruínas (sempre aberto).
    const { x, y } = SWAMP_RETURN_PORTAL_POSITION;

    openPortal(this, createPortal(this, x, y), false);

    this.addExit({
      x: x - 40,
      y: y - 30,
      width: 80,
      height: 60,
      target: "ruinsPortal",
      isOpen: () => true,
    });

    return obstacles;
  }

  protected createActors(): void {
    const spiders = SWAMP_SPIDER_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "spider", x, y),
    );

    const wisps = SWAMP_WISP_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "wisp", x, y),
    );

    this.enemies.push(...spiders, ...wisps);

    this.witchSprite = createWitch(this, WITCH_POSITION.x, WITCH_POSITION.y);

    this.witch = createBoss(this, this.witchSprite, WITCH_STATS, {
      barWidth: 100,
      barOffsetY: 76,
      nameOffsetY: 96,
      nameColor: "#9fffe0",
      barColor: 0x5fe0b8,
      barBackColor: 0x1f3d34,
      impactColor: 0xbfffe8,
      damageTextColor: "#dffff4",
      deathColor: WITCH_MAGIC_COLOR,
    });

    this.witchState = "dormant";
    this.enraged = false;
  }

  protected setupAreaPhysics(): void {
    // O herói não atravessa a feiticeira.
    this.physics.add.collider(this.player.body, this.witch.sprite.body);
  }

  /** Deixa o Pântano igual ao progresso salvo. */
  protected restoreAreaState(): void {
    if (progress.questStage === "fragment2") {
      this.removeWitch();
      revealAstralFragment(this, this.fragment, false);
    }
  }

  protected onAreaEntered(): void {
    // Atravessar o portal cumpre o objetivo "atravessar o portal".
    if (progress.questStage === "portal") {
      progress.questStage = "witch";
      saveProgress();
    }
  }

  protected applyAreaLanguage(): void {
    this.sign.setText(this.t(TEXTS.places.swamp));

    if (this.witchState !== "defeated") {
      this.witch.nameText.setText(this.t(TEXTS.bosses.witch.name));
    }
  }

  // ---------------------------------------------------------------------------
  // A cada quadro
  // ---------------------------------------------------------------------------

  protected updateArea(): void {
    this.updateWitch();
    this.updateFragment();
  }

  // ---------------------------------------------------------------------------
  // Lama
  // ---------------------------------------------------------------------------

  protected getPlayerSpeedMultiplier(): number {
    const { x, y } = this.player.body;

    if (!isInMud(x, y)) {
      return 1;
    }

    if (!this.mudHintShown) {
      this.mudHintShown = true;
      this.statusText.setText(this.t(TEXTS.chapter2.mud));
    }

    return SWAMP_MUD_SPEED;
  }

  // ---------------------------------------------------------------------------
  // Feiticeira do Pântano
  // ---------------------------------------------------------------------------

  /** Tempo de espera entre ataques (menor quando ela está furiosa). */
  private cooldown(base: number): number {
    return this.enraged ? base * WITCH_STATS.enragedCooldownFactor : base;
  }

  private updateWitch(): void {
    const { x, y } = this.witch.sprite.body;
    const now = this.time.now;

    switch (this.witchState) {
      case "dormant":
        if (
          progress.questStage === "witch" &&
          this.distanceToPlayer(x, y) <= WITCH_STATS.wakeRange
        ) {
          this.wakeWitch();
        }
        return;

      case "idle":
        drawBossHealthBar(this.witch);

        // Herói perto demais: some e reaparece longe.
        if (
          now >= this.teleportReadyAt &&
          this.distanceToPlayer(x, y) <= WITCH_STATS.teleportTriggerRange
        ) {
          this.teleportWitch();
        } else if (now >= this.nextMarkAt) {
          this.startMarks();
        } else if (
          now - this.lastVolleyAt >=
          this.cooldown(WITCH_STATS.volleyCooldown)
        ) {
          this.startVolley();
        }
        return;

      case "casting":
      case "marking":
      case "teleporting":
        drawBossHealthBar(this.witch);
        return;

      case "defeated":
        return;
    }
  }

  private wakeWitch(): void {
    const now = this.time.now;

    this.witchState = "idle";
    // O primeiro tiro sai logo; o ataque especial demora um pouco.
    this.lastVolleyAt = now - WITCH_STATS.volleyCooldown + 900;
    this.nextMarkAt = now + WITCH_STATS.markCooldown;
    this.teleportReadyAt = now;

    setWitchAwake(this.witchSprite, true);
    showBossUi(this.witch);

    this.cameras.main.shake(250, 0.005);
    this.statusText.setText(this.t(TEXTS.bosses.witch.appeared));

    audio.play("bossAppear");
    audio.setDrums(true);
  }

  /** O orbe do cajado brilha forte: aviso de que um ataque vem aí. */
  private glowOrb(duration: number): void {
    this.tweens.add({
      targets: this.witchSprite.orbGlow,
      scale: 2,
      fillAlpha: 0.85,
      duration: duration / 2,
      yoyo: true,
      ease: "Sine.InOut",
    });
  }

  // --- Rajada de projéteis ---------------------------------------------------

  private startVolley(): void {
    this.witchState = "casting";
    this.glowOrb(WITCH_STATS.volleyWindup);

    this.time.delayedCall(WITCH_STATS.volleyWindup, () => this.fireVolley());
  }

  /** Dispara projéteis em leque, mirando onde o herói está agora. */
  private fireVolley(): void {
    // Pode ter sido derrotada durante a preparação.
    if (this.witchState !== "casting") {
      return;
    }

    this.witchState = "idle";
    this.lastVolleyAt = this.time.now;

    const x = this.witch.sprite.body.x;
    const y = this.witch.sprite.body.y - 30;
    const aim = Math.atan2(this.player.body.y - y, this.player.body.x - x);
    const count = this.enraged
      ? WITCH_STATS.enragedVolleyCount
      : WITCH_STATS.volleyCount;

    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * WITCH_STATS.volleySpread;

      this.fireProjectile(x, y, aim + offset, {
        speed: WITCH_STATS.projectileSpeed,
        damage: WITCH_STATS.projectileDamage,
        range: WITCH_STATS.projectileRange,
        color: WITCH_PROJECTILE_COLOR,
        radius: 7,
      });
    }
  }

  // --- Marcas sombrias (ataque especial) -------------------------------------

  private startMarks(): void {
    this.witchState = "marking";
    this.glowOrb(WITCH_STATS.markInterval * WITCH_STATS.markCount);

    this.statusText.setText(this.t(TEXTS.bosses.witch.marks));
    audio.play("warning");

    for (let i = 0; i < WITCH_STATS.markCount; i++) {
      const isLast = i === WITCH_STATS.markCount - 1;

      this.time.delayedCall(i * WITCH_STATS.markInterval, () =>
        this.placeMark(isLast),
      );
    }
  }

  /** Marca o chão onde o herói está; explode depois de markWindup. */
  private placeMark(isLast: boolean): void {
    if (this.witchState !== "marking") {
      return;
    }

    const { x, y } = this.player.body;
    const { markRadius, markWindup } = WITCH_STATS;

    createSlamWarning(this, x, y, markRadius, markWindup);

    this.time.delayedCall(markWindup, () => {
      if (this.witchState === "defeated") {
        return;
      }

      createShockwave(this, x, y, markRadius);
      createImpactEffect(this, x, y, WITCH_PROJECTILE_COLOR, 10, markRadius);
      audio.play("slam");
      this.cameras.main.shake(100, 0.004);

      if (this.distanceToPlayer(x, y) <= markRadius) {
        this.damagePlayer(WITCH_STATS.markDamage);
      }

      if (isLast && this.witchState === "marking") {
        this.witchState = "idle";
        this.nextMarkAt =
          this.time.now + this.cooldown(WITCH_STATS.markCooldown);
      }
    });
  }

  // --- Teleporte -------------------------------------------------------------

  /** Some num redemoinho e reaparece num ponto da clareira longe do herói. */
  private teleportWitch(): void {
    this.witchState = "teleporting";

    const { container } = this.witch.sprite;
    const half = WITCH_STATS.teleportTime / 2;

    this.puffOfMagic();
    audio.play("teleport");
    this.statusText.setText(this.t(TEXTS.bosses.witch.teleported));

    this.tweens.add({
      targets: container,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 1.4,
      duration: half,
      ease: "Quad.In",
      onComplete: () => {
        if (this.witchState !== "teleporting") {
          return;
        }

        const target = this.pickTeleportPoint();

        this.getPhysicsBody(this.witch.sprite).reset(target.x, target.y);
        container.setPosition(target.x, target.y);
        container.setDepth(target.y + 30);
        this.puffOfMagic();

        this.tweens.add({
          targets: container,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: half,
          ease: "Quad.Out",
          onComplete: () => this.finishTeleport(),
        });
      },
    });
  }

  private finishTeleport(): void {
    if (this.witchState !== "teleporting") {
      return;
    }

    const now = this.time.now;

    this.witchState = "idle";
    this.teleportReadyAt = now + this.cooldown(WITCH_STATS.teleportCooldown);
    // Logo depois de reaparecer, ela ataca.
    this.lastVolleyAt = Math.min(
      this.lastVolleyAt,
      now - this.cooldown(WITCH_STATS.volleyCooldown) + 400,
    );
  }

  private puffOfMagic(): void {
    const { x, y } = this.witch.sprite.body;

    createImpactEffect(this, x, y - 20, WITCH_MAGIC_COLOR, 12, 40);
  }

  /** Escolhe um ponto da clareira longe do herói (e diferente do atual). */
  private pickTeleportPoint(): { x: number; y: number } {
    const here = this.witch.sprite.body;
    const options = WITCH_TELEPORT_POINTS.filter(
      (point) =>
        Phaser.Math.Distance.Between(point.x, point.y, here.x, here.y) > 10 &&
        this.distanceToPlayer(point.x, point.y) >=
          WITCH_STATS.teleportMinDistance,
    );

    if (options.length > 0) {
      return Phaser.Utils.Array.GetRandom(options);
    }

    // Nenhum ponto longe o bastante: vai para o mais distante.
    return [...WITCH_TELEPORT_POINTS].sort(
      (a, b) =>
        this.distanceToPlayer(b.x, b.y) - this.distanceToPlayer(a.x, a.y),
    )[0];
  }

  // --- Golpes do herói -------------------------------------------------------

  protected attackSpecialTarget(): boolean {
    // Enquanto some/reaparece, não dá para acertá-la.
    if (
      this.witchState !== "idle" &&
      this.witchState !== "casting" &&
      this.witchState !== "marking"
    ) {
      return false;
    }

    if (this.strikeBoss(this.witch, TEXTS.bosses.witch)) {
      this.defeatWitch();
    } else {
      this.checkEnrage();
    }

    return true;
  }

  /** Com metade da vida, a feiticeira fica furiosa. */
  private checkEnrage(): void {
    if (
      this.enraged ||
      this.witch.health > this.witch.maxHealth * WITCH_STATS.enragedAt
    ) {
      return;
    }

    this.enraged = true;
    this.cameras.main.shake(200, 0.006);
    this.statusText.setText(this.t(TEXTS.bosses.witch.enraged));
    audio.play("bossAppear");

    // O brilho do orbe fica roxo e mais forte.
    const { orbGlow } = this.witchSprite;

    this.tweens.killTweensOf(orbGlow);
    orbGlow.setScale(1);
    orbGlow.setFillStyle(WITCH_PROJECTILE_COLOR, 0.45);
  }

  /** Derrotar a feiticeira liberta o segundo Fragmento Astral. */
  private defeatWitch(): void {
    progress.questStage = "fragment2";

    const { x, y } = this.witch.sprite.body;

    createDeathBurst(this, x, y, this.witch.style.deathColor);
    audio.play("enemyDeath");
    this.removeWitch();
    // Um pouco abaixo, para não ficar em cima do fragmento.
    this.dropPotion(x, y + 50);

    revealAstralFragment(this, this.fragment, true);

    this.updateQuestDisplay();
    this.statusText.setText(this.t(TEXTS.bosses.witch.defeated));

    saveProgress();
  }

  /** Tira a feiticeira do mapa (ao derrotá-la ou ao carregar um save). */
  private removeWitch(): void {
    this.witchState = "defeated";
    audio.setDrums(false);
    this.tweens.killTweensOf(this.witch.sprite.container);
    this.tweens.killTweensOf(this.witchSprite.orbGlow);
    this.disableCharacter(this.witch.sprite);
    destroyBoss(this.witch);
  }

  // ---------------------------------------------------------------------------
  // Segundo Fragmento Astral
  // ---------------------------------------------------------------------------

  private updateFragment(): void {
    if (!this.fragment.visible || progress.questStage !== "fragment2") {
      return;
    }

    const distance = this.distanceToPlayer(
      SWAMP_FRAGMENT_POSITION.x,
      SWAMP_FRAGMENT_POSITION.y,
    );

    if (distance <= FRAGMENT_COLLECT_RANGE) {
      this.collectFragment();
    }
  }

  /** Pegar o segundo fragmento conclui o Capítulo 2. */
  private collectFragment(): void {
    progress.questStage = "complete";

    const { x, y } = this.fragment.container;

    createDeathBurst(this, x, y, 0xffe08a);
    audio.play("fragment");
    this.fragment.container.destroy();
    this.fragment.visible = false;

    this.cameras.main.flash(500, 255, 240, 200);

    // Capítulo concluído: a próxima partida começa do zero.
    clearSave();

    this.showGameOver(true);
    this.updateQuestDisplay();
  }
}

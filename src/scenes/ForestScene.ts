// Cena principal do prólogo: missões, combate, diálogo e HUD.
// A aparência dos personagens, os efeitos e os textos ficam em módulos próprios.

import Phaser from "phaser";
import {
  CHECKPOINTS,
  ELDER_TALK_RANGE,
  KAEL_STATS,
  PLAYER_STATS,
  SHRINE_ACTIVATION_RANGE,
  SHRINE_POSITION,
  SPIDER_SPAWNS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type CheckpointId,
} from "../config";
import type { Language, QuestStage } from "../types";
import { TEXTS, type Localized } from "../i18n/texts";
import { LANGUAGE_CHANGED_EVENT } from "../i18n/page";
import { createForestWorld, type ForestWorld } from "../world/forest";
import {
  activateShrine,
  createCheckpointShrine,
  type CheckpointShrine,
} from "../world/checkpointShrine";
import { clearSave, loadGame, saveGame } from "../systems/saveGame";
import {
  drawEnemyHealthBar,
  spawnEnemy,
  type Enemy,
} from "../systems/enemies";
import {
  animatePlayerWalk,
  animateSwordSwing,
  createPlayer,
  updatePlayerDirection,
  type PlayerSprite,
} from "../characters/player";
import { createElder, type ElderSprite } from "../characters/elder";
import { createKael } from "../characters/kael";
import type { CharacterSprite } from "../characters/types";
import {
  createDeathBurst,
  createImpactEffect,
  createSlashEffect,
  showDamageNumber,
} from "../effects/combatEffects";

export class ForestScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private elder!: ElderSprite;
  private signs!: ForestWorld["signs"];
  /** Todos os inimigos comuns (lobo e aranhas). */
  private enemies: Enemy[] = [];
  /** O lobo da missão: derrotá-lo avança a história. */
  private wolf!: Enemy;
  private kael!: CharacterSprite;
  private shrine!: CheckpointShrine;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private languageKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private newGameKey!: Phaser.Input.Keyboard.Key;

  private statusText!: Phaser.GameObjects.Text;
  private hudGraphics!: Phaser.GameObjects.Graphics;
  private kaelHealthGraphics!: Phaser.GameObjects.Graphics;
  private kaelNameText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private interactionHint!: Phaser.GameObjects.Text;

  private dialoguePanel!: Phaser.GameObjects.Rectangle;
  private dialogueName!: Phaser.GameObjects.Text;
  private dialogueText!: Phaser.GameObjects.Text;
  private dialogueHint!: Phaser.GameObjects.Text;

  private gameOverOverlay?: Phaser.GameObjects.Rectangle;
  private gameOverText?: Phaser.GameObjects.Text;

  private playerHealth: number = PLAYER_STATS.maxHealth;
  private kaelHealth: number = KAEL_STATS.maxHealth;

  private facingX = 0;
  private facingY = 1;

  private lastAttackAt = -10000;
  private lastDamageAt = -10000;
  private lastKaelAttackAt = -10000;

  private gameOver = false;
  private victory = false;

  private wolfDefeated = false;
  private kaelUnlocked = false;
  private kaelDefeated = false;

  private language: Language = "pt";
  private questStage: QuestStage = "talk";

  private elderTalked = false;
  private dialogueOpen = false;
  private dialogueLines: string[] = [];
  private dialogueIndex = 0;

  private checkpointId: CheckpointId = "village";

  constructor() {
    super("ForestScene");
  }

  // ---------------------------------------------------------------------------
  // Criação da cena
  // ---------------------------------------------------------------------------

  create(): void {
    this.resetState();

    const progressLoaded = this.loadProgress();

    const { treeColliders, signs } = createForestWorld(this);

    this.signs = signs;

    this.shrine = createCheckpointShrine(
      this,
      SHRINE_POSITION.x,
      SHRINE_POSITION.y,
    );

    const spawn = CHECKPOINTS[this.checkpointId];

    this.player = createPlayer(this, spawn.x, spawn.y);
    this.elder = createElder(this, 650, 960);
    this.createEnemies();
    this.createKael();

    this.createInterface();
    this.createInput();
    this.setupPhysics(treeColliders);
    this.setupCamera();

    this.restoreWorldState();
    this.applyLanguage();

    if (progressLoaded) {
      this.statusText.setText(this.t(TEXTS.save.progressLoaded));
    }
  }

  /** Volta tudo ao estado inicial (usado também ao reiniciar com R). */
  private resetState(): void {
    this.playerHealth = PLAYER_STATS.maxHealth;
    this.kaelHealth = KAEL_STATS.maxHealth;

    this.facingX = 0;
    this.facingY = 1;

    this.lastAttackAt = -10000;
    this.lastDamageAt = -10000;
    this.lastKaelAttackAt = -10000;

    this.gameOver = false;
    this.victory = false;
    this.gameOverOverlay = undefined;
    this.gameOverText = undefined;

    this.wolfDefeated = false;
    this.kaelUnlocked = false;
    this.kaelDefeated = false;

    this.language = "pt";
    this.questStage = "talk";

    this.elderTalked = false;
    this.dialogueOpen = false;
    this.dialogueLines = [];
    this.dialogueIndex = 0;

    this.checkpointId = "village";
  }

  // ---------------------------------------------------------------------------
  // Salvamento e checkpoints
  // ---------------------------------------------------------------------------

  /** Carrega o save, se existir. Devolve true quando havia progresso salvo. */
  private loadProgress(): boolean {
    const save = loadGame();

    if (!save) {
      return false;
    }

    this.language = save.language;
    this.questStage = save.questStage;
    this.elderTalked = save.elderTalked;
    this.wolfDefeated = save.wolfDefeated;
    this.kaelUnlocked = save.kaelUnlocked;
    this.checkpointId = save.checkpointId;

    return true;
  }

  private saveProgress(): void {
    saveGame({
      language: this.language,
      questStage: this.questStage,
      elderTalked: this.elderTalked,
      wolfDefeated: this.wolfDefeated,
      kaelUnlocked: this.kaelUnlocked,
      checkpointId: this.checkpointId,
    });
  }

  /** Deixa o mundo igual ao progresso carregado (sem efeitos e mensagens). */
  private restoreWorldState(): void {
    if (this.checkpointId === "shrine") {
      activateShrine(this, this.shrine, false);
    }

    // As aranhas sempre reaparecem; só o lobo da missão fica derrotado.
    if (this.wolfDefeated) {
      this.removeEnemy(this.wolf);
    }

    if (this.kaelUnlocked) {
      this.revealKael();
    }
  }

  private updateCheckpoint(): void {
    if (this.shrine.active) {
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.player.body.x,
      this.player.body.y,
      SHRINE_POSITION.x,
      SHRINE_POSITION.y,
    );

    if (distance > SHRINE_ACTIVATION_RANGE) {
      return;
    }

    activateShrine(this, this.shrine, true);
    this.checkpointId = "shrine";
    this.saveProgress();

    this.statusText.setText(this.t(TEXTS.save.checkpointSaved));
  }

  private startNewGame(): void {
    clearSave();
    this.scene.restart();
  }

  // ---------------------------------------------------------------------------
  // Personagens
  // ---------------------------------------------------------------------------

  private createEnemies(): void {
    this.wolf = spawnEnemy(this, "wolf", 850, 790);

    const spiders = SPIDER_SPAWNS.map(({ x, y }) =>
      spawnEnemy(this, "spider", x, y),
    );

    this.enemies = [this.wolf, ...spiders];
  }

  private createKael(): void {
    this.kael = createKael(this, 850, 380);

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

  private createInput(): void {
    if (!this.input.keyboard) {
      throw new Error("O teclado não está disponível.");
    }

    const keyboard = this.input.keyboard;
    const { KeyCodes } = Phaser.Input.Keyboard;

    this.cursors = keyboard.createCursorKeys();

    this.wasd = {
      W: keyboard.addKey(KeyCodes.W),
      A: keyboard.addKey(KeyCodes.A),
      S: keyboard.addKey(KeyCodes.S),
      D: keyboard.addKey(KeyCodes.D),
    };

    this.attackKey = keyboard.addKey(KeyCodes.J);
    this.interactKey = keyboard.addKey(KeyCodes.E);
    this.languageKey = keyboard.addKey(KeyCodes.L);
    this.restartKey = keyboard.addKey(KeyCodes.R);
    this.newGameKey = keyboard.addKey(KeyCodes.N);
  }

  private setupPhysics(treeColliders: Phaser.GameObjects.Rectangle[]): void {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.getPhysicsBody(this.player).setCollideWorldBounds(true);

    const enemyBodies = this.enemies.map((enemy) => enemy.sprite.body);

    this.physics.add.collider(
      [this.player.body, this.kael.body, ...enemyBodies],
      treeColliders,
    );

    // Inimigos não se sobrepõem uns aos outros.
    this.physics.add.collider(enemyBodies, enemyBodies);

    this.physics.add.collider(this.player.body, this.elder.body);

    // O dano dos inimigos comuns vem do ataque deles (ver updateEnemy).

    this.physics.add.overlap(this.player.body, this.kael.body, () => {
      if (this.kaelUnlocked && !this.kaelDefeated) {
        this.damagePlayer(KAEL_STATS.damage);
      }
    });
  }

  private setupCamera(): void {
    const camera = this.cameras.main;

    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    camera.startFollow(this.player.body, true, 0.08, 0.08);
    camera.setZoom(1);

    this.scale.on("resize", this.handleResize, this);

    // Evita acumular o mesmo evento a cada reinício da cena.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize, this);
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.main.setSize(gameSize.width, gameSize.height);

    this.dialoguePanel.setPosition(20, gameSize.height - 155);
    this.dialoguePanel.setSize(gameSize.width - 40, 135);
    this.dialogueName.setPosition(40, gameSize.height - 140);
    this.dialogueText.setPosition(40, gameSize.height - 108);
    this.dialogueHint.setPosition(gameSize.width - 245, gameSize.height - 43);

    this.gameOverOverlay?.setSize(gameSize.width, gameSize.height);
    this.gameOverText?.setPosition(gameSize.width / 2, gameSize.height / 2);
  }

  // ---------------------------------------------------------------------------
  // Interface (HUD, missão e diálogo)
  // ---------------------------------------------------------------------------

  private createInterface(): void {
    this.statusText = this.add
      .text(20, 18, "", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#e9dfbf",
        backgroundColor: "#15231bd9",
        padding: { x: 12, y: 9 },
      })
      .setScrollFactor(0)
      .setDepth(3000);

    this.hudGraphics = this.add.graphics();
    this.hudGraphics.setScrollFactor(0);
    this.hudGraphics.setDepth(3000);

    this.questText = this.add
      .text(20, 112, "", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#f0dfac",
        backgroundColor: "#15231bd9",
        padding: { x: 12, y: 9 },
        wordWrap: { width: 360 },
      })
      .setScrollFactor(0)
      .setDepth(3000);

    this.interactionHint = this.add
      .text(0, 0, "", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#f0dfac",
        backgroundColor: "#15231be8",
        padding: { x: 8, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(3500);

    this.dialoguePanel = this.add
      .rectangle(
        20,
        this.scale.height - 155,
        this.scale.width - 40,
        135,
        0x111710,
        0.96,
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setStrokeStyle(2, 0xc2a76b, 0.95)
      .setDepth(6000)
      .setVisible(false);

    this.dialogueName = this.add
      .text(40, this.scale.height - 140, "", {
        fontFamily: "Georgia, serif",
        fontSize: "17px",
        color: "#f0dfac",
        fontStyle: "bold",
      })
      .setScrollFactor(0)
      .setDepth(6001)
      .setVisible(false);

    this.dialogueText = this.add
      .text(40, this.scale.height - 108, "", {
        fontFamily: "Georgia, serif",
        fontSize: "16px",
        color: "#e9dfbf",
        wordWrap: {
          width: Math.max(300, this.scale.width - 100),
        },
        lineSpacing: 5,
      })
      .setScrollFactor(0)
      .setDepth(6001)
      .setVisible(false);

    this.dialogueHint = this.add
      .text(this.scale.width - 245, this.scale.height - 43, "", {
        fontFamily: "Georgia, serif",
        fontSize: "12px",
        color: "#c2a76b",
      })
      .setScrollFactor(0)
      .setDepth(6001)
      .setVisible(false);

    this.drawHud();
  }

  /** Escolhe o texto no idioma atual. */
  private t<T>(text: Localized<T>): T {
    return text[this.language];
  }

  private drawHud(): void {
    this.hudGraphics.clear();

    this.hudGraphics.fillStyle(0x111710, 0.9);
    this.hudGraphics.fillRoundedRect(20, 54, 224, 24, 5);

    this.hudGraphics.fillStyle(0x592e31, 1);
    this.hudGraphics.fillRect(24, 58, 216, 16);

    const healthWidth = 216 * (this.playerHealth / PLAYER_STATS.maxHealth);

    if (healthWidth > 0) {
      this.hudGraphics.fillStyle(0xb83e48, 1);
      this.hudGraphics.fillRect(24, 58, healthWidth, 16);
    }
  }

  private updateQuestDisplay(): void {
    this.questText.setText(this.t(TEXTS.quests[this.questStage]));

    if (this.victory) {
      this.statusText.setText(this.t(TEXTS.hud.victory));
    } else if (this.questStage === "complete") {
      this.statusText.setText(this.t(TEXTS.hud.prologueComplete));
    } else {
      this.statusText.setText(this.t(TEXTS.hud.title));
    }
  }

  // ---------------------------------------------------------------------------
  // Diálogo com o Ancião e progressão da missão
  // ---------------------------------------------------------------------------

  private isNearElder(): boolean {
    const distance = Phaser.Math.Distance.Between(
      this.player.body.x,
      this.player.body.y,
      this.elder.body.x,
      this.elder.body.y,
    );

    return distance <= ELDER_TALK_RANGE;
  }

  /** Falas do Ancião de acordo com o progresso da missão. */
  private getElderDialogueLines(): string[] {
    const dialogue = TEXTS.elderDialogue;

    if (!this.elderTalked) return this.t(dialogue.intro);
    if (this.kaelDefeated) return this.t(dialogue.bossDefeated);
    if (this.kaelUnlocked) return this.t(dialogue.bossAwake);
    if (this.wolfDefeated) return this.t(dialogue.wolfDefeated);

    return this.t(dialogue.reminder);
  }

  private interactWithElder(): void {
    if (!this.isNearElder()) {
      return;
    }

    if (this.dialogueOpen) {
      this.advanceDialogue();
      return;
    }

    this.dialogueLines = this.getElderDialogueLines();
    this.openDialogue(this.t(TEXTS.elder.name));
  }

  private openDialogue(name: string): void {
    this.dialogueOpen = true;
    this.dialogueIndex = 0;

    this.dialoguePanel.setVisible(true);
    this.dialogueName.setVisible(true).setText(name);
    this.dialogueText.setVisible(true);
    this.dialogueHint.setVisible(true);

    this.showCurrentDialogue();
  }

  private showCurrentDialogue(): void {
    this.dialogueText.setText(this.dialogueLines[this.dialogueIndex] ?? "");
    this.dialogueHint.setText(this.t(TEXTS.hints.continue));
  }

  private advanceDialogue(): void {
    this.dialogueIndex += 1;

    if (this.dialogueIndex < this.dialogueLines.length) {
      this.showCurrentDialogue();
      return;
    }

    this.closeDialogue();
  }

  private closeDialogue(): void {
    this.dialogueOpen = false;

    this.dialoguePanel.setVisible(false);
    this.dialogueName.setVisible(false);
    this.dialogueText.setVisible(false);
    this.dialogueHint.setVisible(false);

    if (!this.elderTalked) {
      this.elderTalked = true;
      this.questStage = this.wolfDefeated ? "boss" : "hunt";
    }

    this.unlockKaelIfReady();
    this.updateQuestDisplay();
    this.saveProgress();
  }

  /** Kael aparece só depois de falar com o Ancião E derrotar o lobo. */
  private unlockKaelIfReady(): void {
    if (!this.elderTalked || !this.wolfDefeated || this.kaelUnlocked) {
      return;
    }

    this.kaelUnlocked = true;
    this.questStage = "boss";

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

  /** Atualiza os textos fixos do mapa, o HUD e a página no idioma atual. */
  private applyLanguage(): void {
    this.signs.trail.setText(this.t(TEXTS.places.trail));
    this.signs.forest.setText(this.t(TEXTS.places.forest));
    this.elder.label.setText(this.t(TEXTS.elder.label));

    this.updateQuestDisplay();

    this.game.events.emit(LANGUAGE_CHANGED_EVENT, this.language);
  }

  private toggleLanguage(): void {
    this.language = this.language === "pt" ? "en" : "pt";

    this.applyLanguage();

    if (this.dialogueOpen) {
      this.dialogueName.setText(this.t(TEXTS.elder.name));
      this.dialogueLines = this.getElderDialogueLines();
      this.dialogueIndex = Math.min(
        this.dialogueIndex,
        this.dialogueLines.length - 1,
      );
      this.showCurrentDialogue();
    }

    this.gameOverText?.setText(this.getEndScreenMessage());

    // Na tela final o save já foi tratado (apagado na vitória).
    if (!this.gameOver) {
      this.saveProgress();
    }
  }

  // ---------------------------------------------------------------------------
  // Combate
  // ---------------------------------------------------------------------------

  private attack(): void {
    const now = this.time.now;

    if (now - this.lastAttackAt < PLAYER_STATS.attackCooldown) {
      return;
    }

    this.lastAttackAt = now;

    animateSwordSwing(this, this.player);
    createSlashEffect(
      this,
      this.player.body.x,
      this.player.body.y,
      this.facingX,
      this.facingY,
    );

    const target = this.findEnemyInFront();

    if (target) {
      this.hitEnemy(target);
      return;
    }

    if (this.kaelUnlocked && !this.kaelDefeated) {
      this.attackKael();
      return;
    }

    this.statusText.setText(this.t(TEXTS.combat.missed));
  }

  /** O inimigo comum mais próximo que a espada consegue acertar. */
  private findEnemyInFront(): Enemy | undefined {
    let closest: Enemy | undefined;
    let closestDistance = Infinity;

    for (const enemy of this.enemies) {
      if (enemy.defeated) continue;

      const { x, y } = enemy.sprite.body;

      if (!this.isTargetInFront(x, y, enemy.definition.stats.hitRange)) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.body.x,
        this.player.body.y,
        x,
        y,
      );

      if (distance < closestDistance) {
        closest = enemy;
        closestDistance = distance;
      }
    }

    return closest;
  }

  /** O alvo precisa estar perto e na frente do herói. */
  private isTargetInFront(
    targetX: number,
    targetY: number,
    range: number,
  ): boolean {
    const dx = targetX - this.player.body.x;
    const dy = targetY - this.player.body.y;
    const distance = Math.hypot(dx, dy);

    if (distance > range || distance === 0) {
      return false;
    }

    const facingDot =
      (dx / distance) * this.facingX + (dy / distance) * this.facingY;

    return facingDot >= 0.2;
  }

  private hitEnemy(enemy: Enemy): void {
    const { x, y } = enemy.sprite.body;
    const { colors } = enemy.definition;
    const damage = PLAYER_STATS.attackDamage;

    enemy.health = Math.max(0, enemy.health - damage);

    createImpactEffect(this, x, y, colors.impact);
    showDamageNumber(this, x, y, damage, colors.damageText);

    this.statusText.setText(this.t(TEXTS.enemies[enemy.kind].hit(damage)));

    drawEnemyHealthBar(enemy);

    if (enemy.health <= 0) {
      this.defeatEnemy(enemy);
    }
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
      if (this.kael.container.active && !this.kaelDefeated) {
        this.kael.container.setAlpha(1);
      }
    });

    this.drawKaelHealthBar();

    if (this.kaelHealth <= 0) {
      this.defeatKael();
    }
  }

  private damagePlayer(amount: number): void {
    if (
      this.gameOver ||
      this.time.now - this.lastDamageAt < PLAYER_STATS.invulnerabilityTime
    ) {
      return;
    }

    this.lastDamageAt = this.time.now;

    const { container } = this.player;

    createImpactEffect(this, container.x, container.y - 10, 0xff5267, 9, 30);
    showDamageNumber(this, container.x, container.y - 15, amount, "#ff5267");

    this.playerHealth = Math.max(0, this.playerHealth - amount);
    this.drawHud();

    this.statusText.setText(this.t(TEXTS.combat.playerHurt(amount)));

    // O herói pisca duas vezes ao receber dano.
    container.setAlpha(0.4);

    for (const [delay, alpha] of [
      [180, 1],
      [360, 0.4],
      [540, 1],
    ]) {
      this.time.delayedCall(delay, () => {
        if (container.active && !this.gameOver) {
          container.setAlpha(alpha);
        }
      });
    }

    if (this.playerHealth <= 0) {
      this.showGameOver(false);
    }
  }

  private defeatEnemy(enemy: Enemy): void {
    const { x, y } = enemy.sprite.body;

    createDeathBurst(this, x, y, enemy.definition.colors.death);
    this.removeEnemy(enemy);

    if (enemy !== this.wolf) {
      this.statusText.setText(this.t(TEXTS.enemies[enemy.kind].defeated));
      return;
    }

    // O lobo é o alvo da missão: derrotá-lo avança a história.
    this.wolfDefeated = true;

    this.unlockKaelIfReady();

    if (!this.kaelUnlocked) {
      this.statusText.setText(this.t(TEXTS.enemies.wolf.defeated));
    }

    this.saveProgress();
  }

  /** Tira um inimigo do mapa (ao derrotá-lo ou ao carregar um save). */
  private removeEnemy(enemy: Enemy): void {
    enemy.defeated = true;

    this.disableCharacter(enemy.sprite);
    enemy.sprite.container.destroy();
    enemy.healthBar.destroy();
  }

  private defeatKael(): void {
    this.kaelDefeated = true;
    this.victory = true;
    this.gameOver = true;

    this.disableCharacter(this.kael);
    createDeathBurst(this, this.kael.body.x, this.kael.body.y, 0x8d264e);

    this.kael.container.destroy();
    this.kaelHealthGraphics.destroy();
    this.kaelNameText.destroy();

    this.questStage = "complete";
    this.updateQuestDisplay();

    // Prólogo concluído: a próxima partida começa do zero.
    clearSave();

    this.showGameOver(true);
  }

  /** Para o movimento e desliga a física de um personagem derrotado. */
  private disableCharacter(character: CharacterSprite): void {
    const body = this.getPhysicsBody(character);

    body.setVelocity(0, 0);
    body.enable = false;

    character.body.setActive(false);
    character.body.setVisible(false);
  }

  private drawKaelHealthBar(): void {
    if (!this.kaelUnlocked || this.kaelDefeated) {
      return;
    }

    const width = 100;
    const x = this.kael.body.x - width / 2;
    const y = this.kael.body.y - 53;

    this.kaelHealthGraphics.clear();

    this.kaelHealthGraphics.fillStyle(0x100c16, 0.95);
    this.kaelHealthGraphics.fillRect(x, y, width, 10);

    this.kaelHealthGraphics.fillStyle(0x562038, 1);
    this.kaelHealthGraphics.fillRect(x + 1, y + 1, width - 2, 8);

    const healthWidth = (width - 2) * (this.kaelHealth / KAEL_STATS.maxHealth);

    if (healthWidth > 0) {
      this.kaelHealthGraphics.fillStyle(0xe43e62, 1);
      this.kaelHealthGraphics.fillRect(x + 1, y + 1, healthWidth, 8);
    }

    this.kaelNameText.setPosition(this.kael.body.x, this.kael.body.y - 76);
  }

  // ---------------------------------------------------------------------------
  // Fim de jogo
  // ---------------------------------------------------------------------------

  private getEndScreenMessage(): string {
    return this.t(
      this.victory ? TEXTS.endScreen.victory : TEXTS.endScreen.defeat,
    );
  }

  private showGameOver(isVictory: boolean): void {
    this.gameOver = true;
    this.victory = isVictory;

    this.physics.world.pause();

    this.gameOverOverlay = this.add
      .rectangle(
        0,
        0,
        this.scale.width,
        this.scale.height,
        isVictory ? 0x11120a : 0x080d0a,
        0.9,
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(5000);

    this.gameOverText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, this.getEndScreenMessage(), {
        fontFamily: "Georgia, serif",
        fontSize: "24px",
        color: isVictory ? "#f0dfac" : "#e9dfbf",
        align: "center",
        stroke: "#15231b",
        strokeThickness: 3,
        wordWrap: { width: this.scale.width - 60 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5001);
  }

  // ---------------------------------------------------------------------------
  // Loop principal (roda a cada quadro)
  // ---------------------------------------------------------------------------

  update(): void {
    if (!this.player || !this.wasd || !this.cursors) {
      return;
    }

    if (this.gameOver) {
      // R: recarrega o último save (na vitória o save já foi apagado).
      // N: apaga o save e começa do zero.
      if (Phaser.Input.Keyboard.JustDown(this.newGameKey)) {
        this.startNewGame();
      } else if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart();
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.languageKey)) {
      this.toggleLanguage();
    }

    if (this.dialogueOpen) {
      this.getPhysicsBody(this.player).setVelocity(0, 0);

      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.advanceDialogue();
      }

      return;
    }

    this.updatePlayerMovement();
    this.updateCheckpoint();

    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.attack();
    }

    this.updateElderInteraction();

    for (const enemy of this.enemies) {
      if (enemy.defeated) continue;

      this.updateEnemy(enemy);
      drawEnemyHealthBar(enemy);
    }

    if (this.kaelUnlocked && !this.kaelDefeated) {
      this.updateKael();
      this.drawKaelHealthBar();
    }

    this.drawHud();
  }

  private updatePlayerMovement(): void {
    let x = 0;
    let y = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) x -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) x += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) y -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) y += 1;

    // Na diagonal, mantém a mesma velocidade das direções retas.
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }

    const moving = x !== 0 || y !== 0;

    if (moving) {
      this.facingX = x;
      this.facingY = y;
      updatePlayerDirection(this.player, x, y);
    }

    this.getPhysicsBody(this.player).setVelocity(
      x * PLAYER_STATS.speed,
      y * PLAYER_STATS.speed,
    );

    this.player.container.setPosition(this.player.body.x, this.player.body.y);
    this.player.container.setDepth(this.player.body.y + 50);

    animatePlayerWalk(this.player, moving, this.time.now);
  }

  private updateElderInteraction(): void {
    if (!this.isNearElder()) {
      this.interactionHint.setVisible(false);
      return;
    }

    this.interactionHint
      .setText(this.t(TEXTS.hints.talk))
      .setPosition(this.elder.container.x, this.elder.container.y - 42)
      .setVisible(true);

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.interactWithElder();
    }
  }

  /** Persegue o herói e ataca quando ele está ao alcance. */
  private updateEnemy(enemy: Enemy): void {
    const { stats } = enemy.definition;

    const distance = this.chasePlayer(
      enemy.sprite,
      stats.speed,
      stats.stopDistance,
      stats.sightRange,
      10,
    );

    if (
      distance > stats.attackReach ||
      this.time.now - enemy.lastAttackAt < stats.attackCooldown
    ) {
      return;
    }

    enemy.lastAttackAt = this.time.now;

    // Pequeno "pulo" para o jogador ver o ataque.
    this.tweens.add({
      targets: enemy.sprite.container,
      scale: 1.18,
      duration: 90,
      yoyo: true,
      ease: "Quad.Out",
    });

    this.damagePlayer(stats.damage);
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

  /**
   * Faz um inimigo perseguir o herói quando ele está dentro do alcance de visão.
   * Devolve a distância até o herói.
   */
  private chasePlayer(
    enemy: CharacterSprite,
    speed: number,
    minDistance: number,
    sightRange: number,
    depthOffset: number,
  ): number {
    const dx = this.player.body.x - enemy.body.x;
    const dy = this.player.body.y - enemy.body.y;
    const distance = Math.hypot(dx, dy);

    const body = this.getPhysicsBody(enemy);

    if (distance > minDistance && distance < sightRange) {
      body.setVelocity((dx / distance) * speed, (dy / distance) * speed);
    } else {
      body.setVelocity(0, 0);
    }

    enemy.container.setPosition(enemy.body.x, enemy.body.y);
    enemy.container.setDepth(enemy.body.y + depthOffset);

    return distance;
  }

  private getPhysicsBody(character: CharacterSprite): Phaser.Physics.Arcade.Body {
    return character.body.body as Phaser.Physics.Arcade.Body;
  }
}

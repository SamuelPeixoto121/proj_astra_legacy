// Cena-base de todas as áreas do jogo.
// Aqui fica tudo o que toda área tem: herói, controles, HUD, diálogo,
// combate contra inimigos comuns, checkpoints, saídas para outras áreas,
// troca de idioma e tela de fim de jogo.
//
// Cada área (ForestScene, RuinsScene...) herda desta classe e só escreve
// o que é próprio dela: cenário, personagens e regras da missão.

import Phaser from "phaser";
import {
  AREA_BANNER,
  AREA_FADE_TIME,
  CHECKPOINTS,
  ENEMY_WANDER,
  ITEM_PICKUP_RANGE,
  PLAYER_STATS,
  POTION_STATS,
  SHRINE_ACTIVATION_RANGE,
  type CheckpointId,
} from "../config";
import type { AreaId, ItemId } from "../types";
import { TEXTS, type Localized } from "../i18n/texts";
import { LANGUAGE_CHANGED_EVENT } from "../i18n/page";
import { clearSave } from "../systems/saveGame";
import {
  progress,
  reachedStage,
  resetProgress,
  saveProgress,
} from "../systems/progress";
import {
  drawEnemyHealthBar,
  type Enemy,
  type RangedAttack,
  type ShieldDefense,
} from "../systems/enemies";
import {
  createProjectile,
  destroyProjectile,
  moveProjectile,
  type Projectile,
  type ProjectileOptions,
} from "../systems/projectiles";
import { drawBossHealthBar, type Boss } from "../systems/bosses";
import {
  animatePlayerWalk,
  animateSwordSwing,
  createPlayer,
  setPlayerLook,
  updatePlayerDirection,
  type PlayerSprite,
} from "../characters/player";
import type { CharacterSprite } from "../characters/types";
import {
  activateShrine,
  createCheckpointShrine,
  type CheckpointShrine,
} from "../world/checkpointShrine";
import {
  createPotionPickup,
  drawPotionIcon,
  type PotionPickup,
} from "../world/potion";
import { createItemPickup, type ItemPickup } from "../world/itemPickup";
import {
  ITEM_LOOKS,
  getHeroLook,
  getHeroStats,
  grantItem,
  ownsItem,
} from "../systems/equipment";
import {
  createDeathBurst,
  createImpactEffect,
  createSlashEffect,
  showDamageNumber,
} from "../effects/combatEffects";
import {
  AREA_SCENE_KEYS,
  EQUIPMENT_SCENE_KEY,
  PAUSE_SCENE_KEY,
  TITLE_SCENE_KEY,
  startFromSave,
} from "./areas";
import type { PauseSceneData } from "./PauseScene";
import type { EquipmentSceneData } from "./EquipmentScene";
import { saveLanguagePreference } from "../systems/preferences";
import { audio } from "../audio/engine";
import type { MusicTrackId } from "../audio/music";

/** Dados recebidos ao abrir uma área. */
export interface AreaSceneData {
  /** Mensagem a mostrar no topo ao entrar (ex.: "PROGRESSO CARREGADO"). */
  statusMessage?: Localized;
}

/** Retângulo que leva o herói para outro checkpoint (em outra área). */
interface AreaExit {
  x: number;
  y: number;
  width: number;
  height: number;
  target: CheckpointId;
  isOpen: () => boolean;
}

interface AreaShrine {
  sprite: CheckpointShrine;
  checkpointId: CheckpointId;
  /** true enquanto o herói está perto (tocar de novo recarrega as poções). */
  playerNear: boolean;
}

/** Conteúdo de um diálogo. É uma função para poder ser traduzido na hora. */
type DialogueSource = () => { name: string; lines: string[] };

export abstract class AreaScene extends Phaser.Scene {
  protected abstract readonly areaId: AreaId;
  protected abstract readonly worldWidth: number;
  protected abstract readonly worldHeight: number;
  /** Nome mostrado no centro da tela ao entrar na área. */
  protected abstract readonly areaName: Localized;
  /** Música ambiente da área. */
  protected abstract readonly musicTrack: MusicTrackId;

  protected player!: PlayerSprite;
  /** Inimigos comuns da área. As áreas adicionam os seus em createActors(). */
  protected enemies: Enemy[] = [];
  /** Projéteis voando agora (de inimigos e chefes que atiram de longe). */
  protected projectiles: Projectile[] = [];
  /** Obstáculos fixos (árvores, colunas...): também bloqueiam projéteis. */
  private obstacles: Phaser.GameObjects.Rectangle[] = [];

  protected statusText!: Phaser.GameObjects.Text;
  protected gameOver = false;

  private facingX = 0;
  private facingY = 1;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private rollKey!: Phaser.Input.Keyboard.Key;
  private potionKey!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private languageKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private muteKey!: Phaser.Input.Keyboard.Key;
  private titleKey!: Phaser.Input.Keyboard.Key;
  private continueKey!: Phaser.Input.Keyboard.Key;
  private equipmentKey!: Phaser.Input.Keyboard.Key;
  private newGameKey!: Phaser.Input.Keyboard.Key;

  private hudGraphics!: Phaser.GameObjects.Graphics;
  private questText!: Phaser.GameObjects.Text;
  private interactionHint!: Phaser.GameObjects.Text;

  private dialoguePanel!: Phaser.GameObjects.Rectangle;
  private dialogueName!: Phaser.GameObjects.Text;
  private dialogueText!: Phaser.GameObjects.Text;
  private dialogueHint!: Phaser.GameObjects.Text;

  private gameOverOverlay?: Phaser.GameObjects.Rectangle;
  private gameOverText?: Phaser.GameObjects.Text;

  private playerHealth: number = PLAYER_STATS.maxHealth;
  private lastAttackAt = -10000;
  private lastDamageAt = -10000;
  private lastDrinkAt = -10000;
  private victory = false;

  /** Até quando (ms) o herói está rolando. */
  private rollingUntil = 0;
  private lastRollAt = -10000;
  private rollDirection = { x: 0, y: 1 };

  private dialogueOpen = false;
  private dialogueSource?: DialogueSource;
  private onDialogueClose?: () => void;
  private dialogueLines: string[] = [];
  private dialogueIndex = 0;

  private exits: AreaExit[] = [];
  private shrines: AreaShrine[] = [];
  /** Poções caídas no chão (somem ao sair da área). */
  private potionPickups: PotionPickup[] = [];
  /** Itens de equipamento no chão (deixados pelos chefes). */
  private itemPickups: ItemPickup[] = [];
  private transitioning = false;
  private areaBanner?: Phaser.GameObjects.Text;

  // ---------------------------------------------------------------------------
  // O que cada área precisa (ou pode) escrever
  // ---------------------------------------------------------------------------

  /** Desenha o cenário. Devolve os obstáculos fixos (árvores, colunas...). */
  protected abstract createWorld(): Phaser.GameObjects.Rectangle[];

  /** Cria NPCs, inimigos (em this.enemies) e chefes. */
  protected abstract createActors(): void;

  /** Colisões próprias da área (ex.: chefe, NPCs). */
  protected setupAreaPhysics(_obstacles: Phaser.GameObjects.Rectangle[]): void {}

  /** Deixa a área igual ao progresso salvo (sem efeitos nem mensagens). */
  protected restoreAreaState(): void {}

  /** Chamado uma vez, logo depois que a área é aberta. */
  protected onAreaEntered(): void {}

  /** Lógica da área a cada quadro (NPCs, chefe...). */
  protected updateArea(): void {}

  /** Atualiza os textos fixos da área (placas, nomes) no idioma atual. */
  protected applyAreaLanguage(): void {}

  /**
   * Chamado quando o golpe não acertou nenhum inimigo comum.
   * Devolve true se a área tratou o golpe (ex.: atacou o chefe).
   */
  /**
   * Multiplica a velocidade do herói andando (ex.: 0.5 na lama do pântano).
   * Não afeta o rolamento.
   */
  protected getPlayerSpeedMultiplier(): number {
    return 1;
  }

  /**
   * Aderência do chão (1 = normal). Menor que 1, o herói escorrega: demora
   * para acelerar, frear e mudar de direção (ex.: gelo dos Picos).
   */
  protected getPlayerTraction(): number {
    return 1;
  }

  protected attackSpecialTarget(): boolean {
    return false;
  }

  /** Chamado depois que um inimigo comum é derrotado. */
  protected onEnemyDefeated(enemy: Enemy): void {
    this.statusText.setText(this.t(TEXTS.enemies[enemy.kind].defeated));
  }

  // ---------------------------------------------------------------------------
  // Criação da área
  // ---------------------------------------------------------------------------

  create(data: AreaSceneData = {}): void {
    this.resetSceneState();

    // Música da área; o tambor de chefe só liga se a área pedir.
    audio.setDrums(false);
    audio.setMusic(this.musicTrack);

    const obstacles = this.createWorld();
    this.obstacles = obstacles;
    const spawn = this.getSpawnPoint();

    this.player = createPlayer(this, spawn.x, spawn.y);
    setPlayerLook(this.player, getHeroLook());
    this.createActors();

    this.createInterface();
    this.createInput();
    this.setupPhysics(obstacles);
    this.setupCamera();

    this.restoreShrines();
    this.restoreAreaState();
    this.onAreaEntered();
    this.applyLanguage();

    if (data.statusMessage) {
      this.statusText.setText(this.t(data.statusMessage));
    }

    this.cameras.main.fadeIn(AREA_FADE_TIME, 0, 0, 0);
    this.showAreaBanner();
  }

  /** Nome da área grande no centro da tela, aparecendo e sumindo devagar. */
  private showAreaBanner(): void {
    const banner = this.add
      .text(this.scale.width / 2, this.scale.height * 0.3, this.t(this.areaName), {
        fontFamily: "Georgia, serif",
        fontSize: "34px",
        color: "#f0dfac",
        stroke: "#0d140f",
        strokeThickness: 6,
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(4000)
      .setAlpha(0);

    this.areaBanner = banner;

    this.tweens.add({
      targets: banner,
      alpha: 1,
      duration: AREA_BANNER.fade,
      hold: AREA_BANNER.hold,
      yoyo: true,
      ease: "Sine.InOut",
      onComplete: () => {
        banner.destroy();
        this.areaBanner = undefined;
      },
    });
  }

  /** Volta o estado da cena ao inicial (a cena é reaproveitada ao reabrir). */
  private resetSceneState(): void {
    this.enemies = [];
    this.projectiles = [];
    this.obstacles = [];
    this.exits = [];
    this.shrines = [];
    this.potionPickups = [];
    this.itemPickups = [];
    this.transitioning = false;
    this.areaBanner = undefined;

    this.playerHealth = PLAYER_STATS.maxHealth;
    this.facingX = 0;
    this.facingY = 1;
    this.lastAttackAt = -10000;
    this.lastDamageAt = -10000;
    this.lastDrinkAt = -10000;
    this.rollingUntil = 0;
    this.lastRollAt = -10000;

    this.gameOver = false;
    this.victory = false;
    this.gameOverOverlay = undefined;
    this.gameOverText = undefined;

    this.dialogueOpen = false;
    this.dialogueSource = undefined;
    this.onDialogueClose = undefined;
    this.dialogueLines = [];
    this.dialogueIndex = 0;
  }

  /** Onde o herói aparece: no checkpoint salvo, se ele for desta área. */
  private getSpawnPoint(): { x: number; y: number } {
    const checkpoint = CHECKPOINTS[progress.checkpointId];

    if (checkpoint.area === this.areaId) {
      return checkpoint;
    }

    // Segurança: usa o primeiro checkpoint desta área.
    const fallback = Object.values(CHECKPOINTS).find(
      (point) => point.area === this.areaId,
    );

    return fallback ?? { x: this.worldWidth / 2, y: this.worldHeight / 2 };
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
    this.rollKey = keyboard.addKey(KeyCodes.SHIFT);
    this.potionKey = keyboard.addKey(KeyCodes.Q);
    this.interactKey = keyboard.addKey(KeyCodes.E);
    this.languageKey = keyboard.addKey(KeyCodes.L);
    this.restartKey = keyboard.addKey(KeyCodes.R);
    this.newGameKey = keyboard.addKey(KeyCodes.N);
    this.muteKey = keyboard.addKey(KeyCodes.M);
    this.titleKey = keyboard.addKey(KeyCodes.ESC);
    this.continueKey = keyboard.addKey(KeyCodes.ENTER);
    this.equipmentKey = keyboard.addKey(KeyCodes.TAB);
  }

  private setupPhysics(obstacles: Phaser.GameObjects.Rectangle[]): void {
    // A física pode ter ficado pausada pela tela de fim de jogo.
    this.physics.world.resume();
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.getPhysicsBody(this.player).setCollideWorldBounds(true);

    // Quem voa (espíritos) passa por cima de árvores e de outros inimigos.
    const enemyBodies = this.enemies
      .filter((enemy) => !enemy.definition.flying)
      .map((enemy) => enemy.sprite.body);

    this.physics.add.collider([this.player.body, ...enemyBodies], obstacles);

    // Inimigos não se sobrepõem uns aos outros.
    this.physics.add.collider(enemyBodies, enemyBodies);

    // O dano dos inimigos comuns vem do ataque deles (ver updateEnemy).

    this.setupAreaPhysics(obstacles);
  }

  private setupCamera(): void {
    const camera = this.cameras.main;

    camera.setBounds(0, 0, this.worldWidth, this.worldHeight);
    camera.startFollow(this.player.body, true, 0.08, 0.08);
    camera.setZoom(1);

    this.scale.on("resize", this.handleResize, this);

    // Evita acumular o mesmo evento a cada vez que a cena é reaberta.
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    });
  }

  /** Volta do menu de pausa. */
  private handleResume(): void {
    // Esquece teclas apertadas no menu (senão o Esc que fechou a pausa
    // abriria a pausa de novo aqui).
    this.input.keyboard?.resetKeys();
    this.refreshLanguage();

    // O equipamento pode ter mudado na tela de equipamento.
    setPlayerLook(this.player, getHeroLook());
    this.drawHud();
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
    this.areaBanner?.setPosition(gameSize.width / 2, gameSize.height * 0.3);
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
      .setDepth(3500)
      .setVisible(false);

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
  protected t<T>(text: Localized<T>): T {
    return text[progress.language];
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

    // Poções ao lado da barra de vida (cheias e vazias).
    this.hudGraphics.fillStyle(0x111710, 0.9);
    this.hudGraphics.fillRoundedRect(250, 54, POTION_STATS.max * 22 + 6, 24, 5);

    for (let i = 0; i < POTION_STATS.max; i++) {
      drawPotionIcon(this.hudGraphics, 264 + i * 22, 66, i < progress.potions);
    }
  }

  protected updateQuestDisplay(): void {
    const stage = progress.questStage;

    this.questText.setText(this.t(TEXTS.quests[stage]));

    // Capítulo 1: depois de Kael ("ruins"). Capítulo 2: depois do portal.
    if (this.victory) {
      this.statusText.setText(this.t(TEXTS.hud.victory));
    } else if (stage === "complete") {
      this.statusText.setText(this.t(TEXTS.hud.chapterComplete));
    } else if (reachedStage("portal2")) {
      this.statusText.setText(this.t(TEXTS.hud.chapter3Title));
    } else if (reachedStage("portal")) {
      this.statusText.setText(this.t(TEXTS.hud.chapter2Title));
    } else if (reachedStage("ruins")) {
      this.statusText.setText(this.t(TEXTS.hud.chapterTitle));
    } else {
      this.statusText.setText(this.t(TEXTS.hud.title));
    }
  }

  /** Mostra a dica de interação (ex.: "E • Conversar") num ponto do mapa. */
  protected showInteractionHint(text: string, x: number, y: number): void {
    this.interactionHint.setText(text).setPosition(x, y).setVisible(true);
  }

  protected hideInteractionHint(): void {
    this.interactionHint.setVisible(false);
  }

  /** true no quadro em que a tecla de interagir (E) foi apertada. */
  protected justPressedInteract(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.interactKey);
  }

  protected distanceToPlayer(x: number, y: number): number {
    return Phaser.Math.Distance.Between(
      this.player.body.x,
      this.player.body.y,
      x,
      y,
    );
  }

  // ---------------------------------------------------------------------------
  // Diálogo
  // ---------------------------------------------------------------------------

  /**
   * Abre um diálogo. O conteúdo vem de uma função para poder ser
   * traduzido se o jogador trocar o idioma no meio da conversa.
   */
  protected openDialogue(source: DialogueSource, onClose?: () => void): void {
    const { name, lines } = source();

    this.dialogueOpen = true;
    this.dialogueSource = source;
    this.onDialogueClose = onClose;
    this.dialogueLines = lines;
    this.dialogueIndex = 0;

    this.hideInteractionHint();
    audio.play("tick");

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
    audio.play("tick");

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

    const onClose = this.onDialogueClose;

    this.dialogueSource = undefined;
    this.onDialogueClose = undefined;

    onClose?.();
  }

  // ---------------------------------------------------------------------------
  // Idioma
  // ---------------------------------------------------------------------------

  /** Atualiza os textos fixos da área, o HUD e a página no idioma atual. */
  private applyLanguage(): void {
    this.applyAreaLanguage();
    this.updateQuestDisplay();
    this.areaBanner?.setText(this.t(this.areaName));

    this.game.events.emit(LANGUAGE_CHANGED_EVENT, progress.language);
  }

  private toggleLanguage(): void {
    progress.language = progress.language === "pt" ? "en" : "pt";
    saveLanguagePreference(progress.language);

    this.refreshLanguage();
  }

  /**
   * Atualiza todos os textos no idioma atual (HUD, placas, diálogo aberto,
   * tela de fim) e salva. Usado ao trocar o idioma pela tecla L e ao voltar
   * do menu de pausa (onde o idioma pode ter sido trocado).
   */
  private refreshLanguage(): void {
    this.applyLanguage();

    if (this.dialogueOpen && this.dialogueSource) {
      const { name, lines } = this.dialogueSource();

      this.dialogueName.setText(name);
      this.dialogueLines = lines;
      this.dialogueIndex = Math.min(this.dialogueIndex, lines.length - 1);
      this.showCurrentDialogue();
    }

    this.gameOverText?.setText(this.getEndScreenMessage());

    // Na tela final o save já foi tratado (apagado na vitória).
    if (!this.gameOver) {
      saveProgress();
    }
  }

  // ---------------------------------------------------------------------------
  // Checkpoints (Pedras Astrais) e saídas para outras áreas
  // ---------------------------------------------------------------------------

  /** Coloca uma Pedra Astral que salva o jogo no checkpoint indicado. */
  protected addShrine(x: number, y: number, checkpointId: CheckpointId): void {
    this.shrines.push({
      sprite: createCheckpointShrine(this, x, y),
      checkpointId,
      playerNear: false,
    });
  }

  private restoreShrines(): void {
    for (const shrine of this.shrines) {
      if (shrine.checkpointId === progress.checkpointId) {
        activateShrine(this, shrine.sprite, false);
      }
    }
  }

  /**
   * Tocar numa Pedra Astral: a primeira vez ativa o checkpoint; toda vez
   * que o herói chega perto, as poções são recarregadas.
   */
  private updateShrines(): void {
    for (const shrine of this.shrines) {
      const { container } = shrine.sprite;
      const near =
        this.distanceToPlayer(container.x, container.y) <=
        SHRINE_ACTIVATION_RANGE;
      const justArrived = near && !shrine.playerNear;

      shrine.playerNear = near;

      if (justArrived) {
        this.touchShrine(shrine);
      }
    }
  }

  private touchShrine(shrine: AreaShrine): void {
    const activated = !shrine.sprite.active;
    const refilled = progress.potions < POTION_STATS.max;

    if (!activated && !refilled) {
      return;
    }

    if (activated) {
      activateShrine(this, shrine.sprite, true);
      progress.checkpointId = shrine.checkpointId;
    }

    progress.potions = POTION_STATS.max;
    audio.play("shrine");
    saveProgress();

    if (activated && refilled) {
      this.statusText.setText(this.t(TEXTS.potions.checkpointRefilled));
    } else if (activated) {
      this.statusText.setText(this.t(TEXTS.save.checkpointSaved));
    } else {
      this.statusText.setText(this.t(TEXTS.potions.refilled));
    }
  }

  // ---------------------------------------------------------------------------
  // Poções de cura
  // ---------------------------------------------------------------------------

  /** Bebe uma poção (tecla Q). */
  private drinkPotion(): void {
    if (this.time.now - this.lastDrinkAt < POTION_STATS.drinkCooldown) {
      return;
    }

    if (progress.potions <= 0) {
      this.statusText.setText(this.t(TEXTS.potions.none));
      return;
    }

    if (this.playerHealth >= PLAYER_STATS.maxHealth) {
      this.statusText.setText(this.t(TEXTS.potions.fullHealth));
      return;
    }

    const heal = Math.min(
      getHeroStats().potionHeal,
      PLAYER_STATS.maxHealth - this.playerHealth,
    );

    this.lastDrinkAt = this.time.now;
    progress.potions -= 1;
    this.playerHealth += heal;
    saveProgress();

    audio.play("potion");

    const { container } = this.player;

    createImpactEffect(this, container.x, container.y - 10, 0x7dff9a, 10, 30);
    showDamageNumber(this, container.x, container.y - 15, heal, "#7dff9a", "+");

    this.statusText.setText(this.t(TEXTS.potions.drank(heal)));
    this.drawHud();
  }

  /** Deixa uma poção no chão (inimigos têm uma chance; chefes, sempre). */
  protected dropPotion(x: number, y: number): void {
    this.potionPickups.push(createPotionPickup(this, x, y));
  }

  /**
   * Coloca um item de equipamento no chão (ex.: ao derrotar um chefe).
   * Se o herói já tem o item, nada acontece.
   */
  protected placeItem(itemId: ItemId, x: number, y: number): void {
    if (ownsItem(itemId)) {
      return;
    }

    this.itemPickups.push(
      createItemPickup(this, itemId, x, y, ITEM_LOOKS[itemId].icon),
    );
  }

  private updateItemPickups(): void {
    this.itemPickups = this.itemPickups.filter((pickup) => {
      const { x, y } = pickup.container;

      if (this.distanceToPlayer(x, y) > ITEM_PICKUP_RANGE) {
        return true;
      }

      grantItem(pickup.itemId);
      saveProgress();
      setPlayerLook(this.player, getHeroLook());

      audio.play("fragment");
      createImpactEffect(this, x, y - 14, ITEM_LOOKS[pickup.itemId].icon, 12, 36);
      this.tweens.killTweensOf([pickup.container, ...pickup.container.list]);
      pickup.container.destroy();

      this.statusText.setText(
        this.t(TEXTS.equipment.obtained(TEXTS.items[pickup.itemId].name)),
      );
      return false;
    });
  }

  private updatePotionPickups(): void {
    this.potionPickups = this.potionPickups.filter((pickup) => {
      const { x, y } = pickup.container;

      if (this.distanceToPlayer(x, y) > POTION_STATS.pickupRange) {
        pickup.fullHintShown = false;
        return true;
      }

      // Bolsa cheia: a poção fica no chão para depois.
      if (progress.potions >= POTION_STATS.max) {
        if (!pickup.fullHintShown) {
          pickup.fullHintShown = true;
          this.statusText.setText(this.t(TEXTS.potions.bagFull));
        }
        return true;
      }

      progress.potions += 1;
      saveProgress();

      audio.play("pickup");
      createImpactEffect(this, x, y - 10, 0xff8a96, 8, 22);
      // Para as animações do frasco e do brilho antes de apagar.
      this.tweens.killTweensOf([pickup.container, ...pickup.container.list]);
      pickup.container.destroy();

      this.statusText.setText(
        this.t(TEXTS.potions.picked(progress.potions, POTION_STATS.max)),
      );
      return false;
    });
  }

  /** Cria uma saída: ao entrar no retângulo, o herói vai para outra área. */
  protected addExit(exit: AreaExit): void {
    this.exits.push(exit);
  }

  private updateExits(): void {
    const { x, y } = this.player.body;

    for (const exit of this.exits) {
      const inside =
        x >= exit.x &&
        x <= exit.x + exit.width &&
        y >= exit.y &&
        y <= exit.y + exit.height;

      if (inside && exit.isOpen()) {
        this.travelTo(exit.target);
        return;
      }
    }
  }

  /** Salva no checkpoint de destino e abre a área dele, com escurecimento. */
  private travelTo(checkpointId: CheckpointId): void {
    this.transitioning = true;
    this.getPhysicsBody(this.player).setVelocity(0, 0);

    progress.checkpointId = checkpointId;
    saveProgress();

    const sceneKey = AREA_SCENE_KEYS[CHECKPOINTS[checkpointId].area];

    this.cameras.main.fadeOut(AREA_FADE_TIME, 0, 0, 0);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        const data: AreaSceneData = { statusMessage: TEXTS.save.progressSaved };
        this.scene.start(sceneKey, data);
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Combate
  // ---------------------------------------------------------------------------

  private attack(): void {
    const now = this.time.now;

    if (now - this.lastAttackAt < getHeroStats().attackCooldown) {
      return;
    }

    this.lastAttackAt = now;

    animateSwordSwing(this, this.player);
    audio.play("swing");
    createSlashEffect(
      this,
      this.player.body.x,
      this.player.body.y,
      this.facingX,
      this.facingY,
    );

    const deflected = this.deflectProjectiles();
    const target = this.findEnemyInFront();

    if (target) {
      this.hitEnemy(target);
    } else if (!this.attackSpecialTarget() && !deflected) {
      this.statusText.setText(this.t(TEXTS.combat.missed));
    }

    if (deflected) {
      this.statusText.setText(this.t(TEXTS.combat.deflected));
    }
  }

  // ---------------------------------------------------------------------------
  // Projéteis
  // ---------------------------------------------------------------------------

  /** Dispara um projétil de (x, y) na direção `angle` (radianos). */
  protected fireProjectile(
    x: number,
    y: number,
    angle: number,
    options: ProjectileOptions,
  ): void {
    this.projectiles.push(createProjectile(this, x, y, angle, options));
    audio.play("shoot");
  }

  /** Move os projéteis e confere se bateram em algo ou no herói. */
  private updateProjectiles(): void {
    const delta = this.game.loop.delta;

    this.projectiles = this.projectiles.filter((projectile) => {
      const alive = moveProjectile(this, projectile, delta);
      const { x, y } = projectile.container;

      if (!alive || this.hitsObstacle(x, y)) {
        destroyProjectile(this, projectile);
        return false;
      }

      // Rolando, o herói é invencível: o projétil passa direto.
      if (
        !this.isRolling() &&
        this.distanceToPlayer(x, y) <= projectile.radius + 12
      ) {
        this.damagePlayer(projectile.damage);
        destroyProjectile(this, projectile);
        return false;
      }

      return true;
    });
  }

  /** O golpe de espada destrói projéteis na frente do herói. */
  private deflectProjectiles(): boolean {
    let deflected = false;

    this.projectiles = this.projectiles.filter((projectile) => {
      const { x, y } = projectile.container;

      if (!this.isTargetInFront(x, y, 80)) {
        return true;
      }

      destroyProjectile(this, projectile);
      deflected = true;
      return false;
    });

    if (deflected) {
      audio.play("deflect");
    }

    return deflected;
  }

  private hitsObstacle(x: number, y: number): boolean {
    return this.obstacles.some((obstacle) => {
      const body = obstacle.body as Phaser.Physics.Arcade.StaticBody | null;

      return (
        !!body &&
        body.enable &&
        x >= body.x &&
        x <= body.right &&
        y >= body.y &&
        y <= body.bottom
      );
    });
  }

  /** O alvo precisa estar perto e na frente do herói. */
  protected isTargetInFront(
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

      const distance = this.distanceToPlayer(x, y);

      if (distance < closestDistance) {
        closest = enemy;
        closestDistance = distance;
      }
    }

    return closest;
  }

  private hitEnemy(enemy: Enemy): void {
    const { x, y } = enemy.sprite.body;
    const { colors, shield } = enemy.definition;
    const damage = getHeroStats().attackDamage;

    // Escudo erguido e virado para o herói: o golpe não passa.
    if (shield && this.isBlockedByShield(enemy, shield)) {
      audio.play("block");
      createImpactEffect(this, x, y - 4, 0xd8f2ff, 6, 18);
      this.statusText.setText(this.t(TEXTS.combat.blocked));
      return;
    }

    enemy.health = Math.max(0, enemy.health - damage);
    audio.play("hit");

    createImpactEffect(this, x, y, colors.impact);
    showDamageNumber(this, x, y, damage, colors.damageText);

    this.statusText.setText(this.t(TEXTS.enemies[enemy.kind].hit(damage)));

    drawEnemyHealthBar(enemy);

    if (enemy.health <= 0) {
      this.defeatEnemy(enemy);
    }
  }

  private defeatEnemy(enemy: Enemy): void {
    const { x, y } = enemy.sprite.body;

    createDeathBurst(this, x, y, enemy.definition.colors.death);
    audio.play("enemyDeath");
    this.removeEnemy(enemy);

    if (Math.random() < POTION_STATS.dropChance) {
      this.dropPotion(x, y);
    }

    this.onEnemyDefeated(enemy);
  }

  /**
   * Golpe da espada num chefe: confere alcance e direção, tira vida,
   * mostra os efeitos e a mensagem. Devolve true se o chefe foi derrotado.
   */
  protected strikeBoss(
    boss: Boss,
    texts: { missed: Localized; hit: (damage: number) => Localized },
  ): boolean {
    const { x, y } = boss.sprite.body;
    const { style } = boss;
    const damage = getHeroStats().attackDamage;

    if (!this.isTargetInFront(x, y, boss.hitRange)) {
      this.statusText.setText(this.t(texts.missed));
      return false;
    }

    boss.health = Math.max(0, boss.health - damage);
    audio.play("hit");

    createImpactEffect(this, x, y, style.impactColor);
    showDamageNumber(this, x, y, damage, style.damageTextColor);

    this.statusText.setText(this.t(texts.hit(damage)));

    // O chefe pisca ao ser atingido.
    const { container } = boss.sprite;

    container.setAlpha(0.45);

    this.time.delayedCall(100, () => {
      if (container.active && boss.health > 0) {
        container.setAlpha(1);
      }
    });

    drawBossHealthBar(boss);

    return boss.health <= 0;
  }

  /** Tira um inimigo do mapa (ao derrotá-lo ou ao carregar um save). */
  protected removeEnemy(enemy: Enemy): void {
    enemy.defeated = true;

    this.disableCharacter(enemy.sprite);
    enemy.sprite.container.destroy();
    enemy.healthBar.destroy();
  }

  protected damagePlayer(rawAmount: number): void {
    // Rolando, o herói é invencível.
    if (
      this.gameOver ||
      this.isRolling() ||
      this.time.now - this.lastDamageAt < PLAYER_STATS.invulnerabilityTime
    ) {
      return;
    }

    this.lastDamageAt = this.time.now;
    audio.play("hurt");

    // A armadura reduz o dano (mínimo de 1).
    const amount = Math.max(
      1,
      Math.round(rawAmount * getHeroStats().damageTaken),
    );

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
      // Ao voltar ao checkpoint, o herói tem as poções recarregadas.
      progress.potions = POTION_STATS.max;
      saveProgress();
      this.showGameOver(false);
    }
  }

  /** Para o movimento e desliga a física de um personagem derrotado. */
  protected disableCharacter(character: CharacterSprite): void {
    const body = this.getPhysicsBody(character);

    body.setVelocity(0, 0);
    body.enable = false;

    character.body.setActive(false);
    character.body.setVisible(false);
  }

  // ---------------------------------------------------------------------------
  // Fim de jogo
  // ---------------------------------------------------------------------------

  private getEndScreenMessage(): string {
    return this.t(
      this.victory ? TEXTS.endScreen.victory : TEXTS.endScreen.defeat,
    );
  }

  protected showGameOver(isVictory: boolean): void {
    this.gameOver = true;
    this.victory = isVictory;

    this.physics.world.pause();

    audio.stopMusic();
    audio.play(isVictory ? "victory" : "defeat");

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
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        this.getEndScreenMessage(),
        {
          fontFamily: "Georgia, serif",
          fontSize: "24px",
          color: isVictory ? "#f0dfac" : "#e9dfbf",
          align: "center",
          stroke: "#15231b",
          strokeThickness: 3,
          wordWrap: { width: this.scale.width - 60 },
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5001);
  }

  /** Fecha a tela de vitória: o jogo continua de onde parou. */
  private continueExploring(): void {
    this.gameOver = false;
    this.victory = false;

    this.gameOverOverlay?.destroy();
    this.gameOverText?.destroy();
    this.gameOverOverlay = undefined;
    this.gameOverText = undefined;

    this.physics.world.resume();
    audio.setMusic(this.musicTrack);

    this.updateQuestDisplay();
  }

  /** Pausa esta área e abre a tela de equipamento (Tab) por cima. */
  private openEquipmentScreen(): void {
    const data: EquipmentSceneData = { areaKey: this.scene.key };

    this.getPhysicsBody(this.player).setVelocity(0, 0);
    this.scene.launch(EQUIPMENT_SCENE_KEY, data);
    this.scene.pause();
  }

  /** Pausa esta área e abre o menu de pausa por cima. */
  private openPauseMenu(): void {
    const data: PauseSceneData = { areaKey: this.scene.key };

    this.scene.launch(PAUSE_SCENE_KEY, data);
    this.scene.pause();
  }

  /** Escurece a tela e volta para a tela inicial. */
  private goToTitle(): void {
    this.transitioning = true;
    this.getPhysicsBody(this.player).setVelocity(0, 0);

    this.cameras.main.fadeOut(AREA_FADE_TIME, 0, 0, 0);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => this.scene.start(TITLE_SCENE_KEY),
    );
  }

  private startNewGame(): void {
    clearSave();
    resetProgress();
    this.scene.start(AREA_SCENE_KEYS.forest);
  }

  // ---------------------------------------------------------------------------
  // Loop principal (roda a cada quadro)
  // ---------------------------------------------------------------------------

  update(): void {
    if (!this.player || !this.wasd || !this.cursors || this.transitioning) {
      return;
    }

    // Esc: abre o menu de pausa. Nas telas de vitória/derrota, vai direto
    // para a tela inicial (como está escrito nelas).
    if (Phaser.Input.Keyboard.JustDown(this.titleKey)) {
      if (this.gameOver) {
        this.goToTitle();
      } else {
        this.openPauseMenu();
      }
      return;
    }

    // M: liga/desliga o som (funciona a qualquer momento).
    if (Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      const muted = audio.toggleMute();
      this.statusText.setText(this.t(muted ? TEXTS.sound.off : TEXTS.sound.on));
    }

    if (this.gameOver) {
      if (this.victory) {
        // Enter: fecha a tela de vitória e continua explorando.
        if (Phaser.Input.Keyboard.JustDown(this.continueKey)) {
          this.continueExploring();
        }
      } else if (Phaser.Input.Keyboard.JustDown(this.newGameKey)) {
        // N: apaga o save e começa do zero.
        this.startNewGame();
      } else if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        // R: volta ao último save.
        startFromSave(this);
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.languageKey)) {
      this.toggleLanguage();
    }

    if (this.dialogueOpen) {
      this.getPhysicsBody(this.player).setVelocity(0, 0);
      animatePlayerWalk(this.player, false, this.time.now);

      if (this.justPressedInteract()) {
        this.advanceDialogue();
      }

      return;
    }

    // Tab: tela de equipamento (não durante o rolamento).
    if (
      !this.isRolling() &&
      Phaser.Input.Keyboard.JustDown(this.equipmentKey)
    ) {
      this.openEquipmentScreen();
      return;
    }

    if (this.isRolling()) {
      this.updateRoll();
    } else {
      this.updatePlayerMovement();

      if (Phaser.Input.Keyboard.JustDown(this.rollKey)) {
        this.startRoll();
      } else if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
        this.attack();
      } else if (Phaser.Input.Keyboard.JustDown(this.potionKey)) {
        this.drinkPotion();
      }
    }

    this.updateShrines();
    this.updatePotionPickups();
    this.updateItemPickups();

    for (const enemy of this.enemies) {
      if (enemy.defeated) continue;

      this.updateEnemy(enemy);
      drawEnemyHealthBar(enemy);
    }

    this.updateProjectiles();
    this.updateArea();
    this.updateExits();
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

    const speed = getHeroStats().speed * this.getPlayerSpeedMultiplier();
    const body = this.getPhysicsBody(this.player);
    const traction = this.getPlayerTraction();

    if (traction >= 1) {
      body.setVelocity(x * speed, y * speed);
    } else {
      // Escorregando: a velocidade vai mudando aos poucos até a desejada.
      // A conta usa o tempo do quadro para escorregar igual em qualquer FPS.
      const blend = 1 - Math.pow(1 - traction, this.game.loop.delta / (1000 / 60));

      body.setVelocity(
        body.velocity.x + (x * speed - body.velocity.x) * blend,
        body.velocity.y + (y * speed - body.velocity.y) * blend,
      );
    }

    this.player.container.setPosition(this.player.body.x, this.player.body.y);
    this.player.container.setDepth(this.player.body.y + 50);

    animatePlayerWalk(this.player, moving, this.time.now);
  }

  /** Persegue o herói e ataca quando ele está ao alcance. */
  // ---------------------------------------------------------------------------
  // Rolamento (Shift)
  // ---------------------------------------------------------------------------

  private isRolling(): boolean {
    return this.time.now < this.rollingUntil;
  }

  /**
   * Rola na direção em que o herói está olhando (que é a direção das teclas
   * apertadas, se ele estiver andando). Invencível até o fim do rolamento.
   */
  private startRoll(): void {
    const now = this.time.now;

    if (now - this.lastRollAt < getHeroStats().rollCooldown) {
      return;
    }

    this.lastRollAt = now;
    audio.play("roll");
    this.rollingUntil = now + PLAYER_STATS.rollDuration;
    this.rollDirection = { x: this.facingX, y: this.facingY };

    const { container, body } = this.player;

    animatePlayerWalk(this.player, false, now);

    // Uma volta completa, girando para o lado em que rola.
    const spin = this.facingX < 0 ? -360 : 360;

    this.tweens.killTweensOf(container);
    container.setAlpha(0.75);

    this.tweens.add({
      targets: container,
      angle: { from: 0, to: spin },
      duration: PLAYER_STATS.rollDuration,
      ease: "Sine.InOut",
      onComplete: () => {
        container.setAngle(0);
        container.setAlpha(1);
      },
    });

    // Poeira na saída.
    createImpactEffect(this, body.x, body.y + 10, 0x8a7a6a, 6, 18);
  }

  private updateRoll(): void {
    const { container, body } = this.player;

    // Velocidade constante na direção travada (árvores ainda bloqueiam).
    this.getPhysicsBody(this.player).setVelocity(
      this.rollDirection.x * PLAYER_STATS.rollSpeed,
      this.rollDirection.y * PLAYER_STATS.rollSpeed,
    );

    container.setPosition(body.x, body.y);
    container.setDepth(body.y + 50);
  }

  /**
   * Inimigo comum: passeia perto de casa enquanto o herói está longe;
   * quando o herói chega perto, persegue e ataca ao alcance.
   */
  private updateEnemy(enemy: Enemy): void {
    const { stats } = enemy.definition;
    const { x, y } = enemy.sprite.body;

    if (this.distanceToPlayer(x, y) >= stats.sightRange) {
      this.wander(enemy);
      this.animateEnemy(enemy);
      return;
    }

    // Viu o herói: esquece o passeio e persegue (ou atira, se for de longe).
    enemy.wanderTarget = undefined;

    if (enemy.definition.ranged) {
      this.updateRangedEnemy(enemy, enemy.definition.ranged);
      this.animateEnemy(enemy);
      return;
    }

    if (enemy.definition.shield) {
      this.updateShieldedEnemy(enemy, enemy.definition.shield);
      this.animateEnemy(enemy);
      return;
    }

    const distance = this.chasePlayer(
      enemy.sprite,
      stats.speed,
      stats.stopDistance,
      stats.sightRange,
      10,
    );

    this.animateEnemy(enemy);

    if (
      distance > stats.attackReach ||
      this.time.now - enemy.lastAttackAt < stats.attackCooldown
    ) {
      return;
    }

    enemy.lastAttackAt = this.time.now;

    // Pequeno "pulo" para o jogador ver o ataque. Só a altura muda:
    // a largura (scaleX) guarda o espelhamento do desenho.
    this.tweens.add({
      targets: enemy.sprite.container,
      scaleY: 1.18,
      duration: 90,
      yoyo: true,
      ease: "Quad.Out",
    });

    this.damagePlayer(stats.damage);
  }

  /**
   * Inimigo com escudo: persegue o herói com o escudo virado para ele.
   * Ao atacar, trava a direção, ergue a espada (aviso) e golpeia à frente;
   * depois fica parado um tempo com a guarda baixa.
   */
  private updateShieldedEnemy(enemy: Enemy, shield: ShieldDefense): void {
    const now = this.time.now;
    const { stats } = enemy.definition;
    const body = this.getPhysicsBody(enemy.sprite);

    // Preparando o golpe: parado e com a direção travada.
    if (enemy.strikeAt > 0) {
      body.setVelocity(0, 0);

      if (now >= enemy.strikeAt) {
        this.shieldedStrike(enemy, shield);
      }
      return;
    }

    // Guarda baixa depois do golpe: parado e vulnerável.
    if (now < enemy.guardDownUntil) {
      body.setVelocity(0, 0);
      return;
    }

    const { x, y } = enemy.sprite.body;

    enemy.facingAngle = Math.atan2(
      this.player.body.y - y,
      this.player.body.x - x,
    );

    const distance = this.chasePlayer(
      enemy.sprite,
      stats.speed,
      stats.stopDistance,
      stats.sightRange,
      10,
    );

    if (
      distance <= stats.attackReach &&
      now - enemy.lastAttackAt >= stats.attackCooldown
    ) {
      enemy.strikeAt = now + shield.windup;
      body.setVelocity(0, 0);
      audio.play("warning");

      // Cresce enquanto ergue a espada: o aviso do golpe.
      this.tweens.add({
        targets: enemy.sprite.container,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: shield.windup / 2,
        yoyo: true,
        ease: "Sine.InOut",
      });
    }
  }

  /** O golpe do inimigo com escudo: só acerta quem está à frente dele. */
  private shieldedStrike(enemy: Enemy, shield: ShieldDefense): void {
    const now = this.time.now;
    const { stats } = enemy.definition;
    const { x, y } = enemy.sprite.body;
    const facingX = Math.cos(enemy.facingAngle);
    const facingY = Math.sin(enemy.facingAngle);

    enemy.strikeAt = 0;
    enemy.lastAttackAt = now;
    enemy.guardDownUntil = now + shield.recovery;

    audio.play("swing");
    createSlashEffect(this, x, y, facingX, facingY);

    const angleToPlayer = Math.atan2(
      this.player.body.y - y,
      this.player.body.x - x,
    );
    const inFront =
      Math.abs(Phaser.Math.Angle.Wrap(angleToPlayer - enemy.facingAngle)) <=
      shield.strikeArc;

    if (inFront && this.distanceToPlayer(x, y) <= stats.attackReach + 22) {
      this.damagePlayer(stats.damage);
    }
  }

  /** true se o escudo está erguido e virado para o herói. */
  private isBlockedByShield(enemy: Enemy, shield: ShieldDefense): boolean {
    if (this.time.now < enemy.guardDownUntil) {
      return false;
    }

    const { x, y } = enemy.sprite.body;
    const angleToPlayer = Math.atan2(
      this.player.body.y - y,
      this.player.body.x - x,
    );

    return (
      Math.abs(Phaser.Math.Angle.Wrap(angleToPlayer - enemy.facingAngle)) <=
      shield.blockArc
    );
  }

  /**
   * Inimigo que ataca de longe: mantém a distância preferida do herói;
   * quando pode atirar, para, brilha (aviso) e dispara na direção do herói.
   */
  private updateRangedEnemy(enemy: Enemy, ranged: RangedAttack): void {
    const now = this.time.now;
    const { stats } = enemy.definition;
    const body = this.getPhysicsBody(enemy.sprite);
    const { x, y } = enemy.sprite.body;
    const dx = this.player.body.x - x;
    const dy = this.player.body.y - y;
    const distance = Math.max(1, Math.hypot(dx, dy));

    // Mirando: fica parado até o tiro sair.
    if (enemy.shotReadyAt > 0) {
      body.setVelocity(0, 0);

      if (now >= enemy.shotReadyAt) {
        enemy.shotReadyAt = 0;
        enemy.lastAttackAt = now;

        this.fireProjectile(x, y - 8, Math.atan2(dy, dx), {
          speed: ranged.projectileSpeed,
          damage: stats.damage,
          range: ranged.projectileRange,
          color: ranged.projectileColor,
        });
      }
      return;
    }

    // Começa a mirar: brilha e cresce (o aviso do tiro).
    if (
      distance <= stats.attackReach &&
      now - enemy.lastAttackAt >= stats.attackCooldown
    ) {
      enemy.shotReadyAt = now + ranged.windup;
      body.setVelocity(0, 0);

      this.tweens.add({
        targets: enemy.sprite.container,
        scale: 1.3,
        duration: ranged.windup / 2,
        yoyo: true,
        ease: "Sine.InOut",
      });
      return;
    }

    // Mantém a distância: recua se o herói chega perto, avança se ele foge.
    const gap = distance - ranged.preferredDistance;
    const direction = Math.abs(gap) < 30 ? 0 : Math.sign(gap);

    body.setVelocity(
      (dx / distance) * stats.speed * direction,
      (dy / distance) * stats.speed * direction,
    );
  }

  /**
   * Passeio: escolhe um ponto perto de casa, anda devagar até ele,
   * faz uma pausa e escolhe outro. Também traz de volta para casa um
   * inimigo que perdeu o herói de vista longe dali.
   */
  private wander(enemy: Enemy): void {
    const now = this.time.now;
    const body = this.getPhysicsBody(enemy.sprite);
    const { stats } = enemy.definition;

    if (!enemy.wanderTarget) {
      body.setVelocity(0, 0);

      if (now < enemy.nextWanderAt) {
        return;
      }

      // Ponto aleatório dentro do raio de passeio, ao redor de casa.
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const radius = Phaser.Math.FloatBetween(0.3, 1) * stats.wanderRadius;

      enemy.wanderTarget = {
        x: enemy.home.x + Math.cos(angle) * radius,
        y: enemy.home.y + Math.sin(angle) * radius,
      };
      enemy.wanderGiveUpAt = now + ENEMY_WANDER.giveUpTime;
    }

    const dx = enemy.wanderTarget.x - enemy.sprite.body.x;
    const dy = enemy.wanderTarget.y - enemy.sprite.body.y;
    const distance = Math.hypot(dx, dy);

    // Chegou (ou ficou preso tempo demais): para e espera um pouco.
    if (distance < 6 || now >= enemy.wanderGiveUpAt) {
      enemy.wanderTarget = undefined;
      enemy.nextWanderAt =
        now +
        Phaser.Math.Between(ENEMY_WANDER.pauseMin, ENEMY_WANDER.pauseMax);
      body.setVelocity(0, 0);
      return;
    }

    body.setVelocity(
      (dx / distance) * stats.wanderSpeed,
      (dy / distance) * stats.wanderSpeed,
    );
    enemy.facingAngle = Math.atan2(dy, dx);
  }

  /**
   * Mantém o desenho junto do corpo físico; ao andar, balança de leve e,
   * se o desenho olha para a direita, vira para o lado em que anda.
   */
  private animateEnemy(enemy: Enemy): void {
    const { container, body } = enemy.sprite;
    const velocity = this.getPhysicsBody(enemy.sprite).velocity;
    const moving = Math.abs(velocity.x) + Math.abs(velocity.y) > 1;

    container.setPosition(body.x, body.y);
    container.setDepth(body.y + 10);
    container.setAngle(moving ? Math.sin(this.time.now / 90) * 4 : 0);

    if (enemy.definition.facesRight && Math.abs(velocity.x) > 1) {
      container.scaleX = velocity.x < 0 ? -1 : 1;
    }

    enemy.definition.showGuard?.(
      enemy.sprite,
      enemy.facingAngle,
      this.time.now >= enemy.guardDownUntil,
    );
  }

  /**
   * Faz um personagem perseguir o herói quando ele está dentro do alcance
   * de visão. Devolve a distância até o herói.
   */
  protected chasePlayer(
    character: CharacterSprite,
    speed: number,
    minDistance: number,
    sightRange: number,
    depthOffset: number,
  ): number {
    const dx = this.player.body.x - character.body.x;
    const dy = this.player.body.y - character.body.y;
    const distance = Math.hypot(dx, dy);

    const body = this.getPhysicsBody(character);

    if (distance > minDistance && distance < sightRange) {
      body.setVelocity((dx / distance) * speed, (dy / distance) * speed);
    } else {
      body.setVelocity(0, 0);
    }

    character.container.setPosition(character.body.x, character.body.y);
    character.container.setDepth(character.body.y + depthOffset);

    return distance;
  }

  protected getPhysicsBody(
    character: CharacterSprite,
  ): Phaser.Physics.Arcade.Body {
    return character.body.body as Phaser.Physics.Arcade.Body;
  }
}

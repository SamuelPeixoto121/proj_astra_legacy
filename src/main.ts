import Phaser from "phaser";
import "./style.css";

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1200;
const TILE_SIZE = 64;

type Language = "pt" | "en";
type QuestStage = "talk" | "hunt" | "boss" | "complete";

class ForestScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Rectangle;

  private enemy!: Phaser.GameObjects.Container;
  private enemyBody!: Phaser.GameObjects.Rectangle;

  private elder!: Phaser.GameObjects.Container;
  private elderBody!: Phaser.GameObjects.Rectangle;

  private boss!: Phaser.GameObjects.Container;
  private bossBody!: Phaser.GameObjects.Rectangle;

  private treeColliders: Phaser.GameObjects.Rectangle[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private languageKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;

  private statusText!: Phaser.GameObjects.Text;
  private hudGraphics!: Phaser.GameObjects.Graphics;
  private enemyHealthGraphics!: Phaser.GameObjects.Graphics;
  private bossHealthGraphics!: Phaser.GameObjects.Graphics;
  private bossNameText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private interactionHint!: Phaser.GameObjects.Text;

  private dialoguePanel!: Phaser.GameObjects.Rectangle;
  private dialogueName!: Phaser.GameObjects.Text;
  private dialogueText!: Phaser.GameObjects.Text;
  private dialogueHint!: Phaser.GameObjects.Text;

  private gameOverOverlay?: Phaser.GameObjects.Rectangle;
  private gameOverText?: Phaser.GameObjects.Text;

  private playerHealth = 100;
  private enemyHealth = 60;
  private bossHealth = 250;

  private readonly maxPlayerHealth = 100;
  private readonly maxEnemyHealth = 60;
  private readonly maxBossHealth = 250;

  private readonly playerSpeed = 220;
  private readonly enemySpeed = 85;
  private readonly bossSpeed = 105;

  private readonly attackDamage = 25;
  private readonly enemyDamage = 12;
  private readonly bossDamage = 20;

  private facingX = 0;
  private facingY = 1;

  private lastAttackAt = -10000;
  private lastDamageAt = -10000;
  private lastBossAttackAt = -10000;

  private gameOver = false;
  private victory = false;

  private enemyDefeated = false;
  private bossUnlocked = false;
  private bossDefeated = false;

  private language: Language = "pt";
  private questStage: QuestStage = "talk";

  private elderTalked = false;
  private dialogueOpen = false;
  private dialogueLines: string[] = [];
  private dialogueIndex = 0;

  constructor() {
    super("ForestScene");
  }

  create(): void {
    this.treeColliders = [];

    this.playerHealth = this.maxPlayerHealth;
    this.enemyHealth = this.maxEnemyHealth;
    this.bossHealth = this.maxBossHealth;

    this.facingX = 0;
    this.facingY = 1;

    this.lastAttackAt = -10000;
    this.lastDamageAt = -10000;
    this.lastBossAttackAt = -10000;

    this.gameOver = false;
    this.victory = false;

    this.enemyDefeated = false;
    this.bossUnlocked = false;
    this.bossDefeated = false;

    this.language = "pt";
    this.questStage = "talk";

    this.elderTalked = false;
    this.dialogueOpen = false;
    this.dialogueLines = [];
    this.dialogueIndex = 0;

    this.drawGround();
    this.drawPath();
    this.createForest();
    this.createLandmarks();

    this.createPlayer();
    this.createElder();
    this.createEnemy();
    this.createBoss();

    this.createInterface();
    this.createInput();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const playerBody = this.playerBody.body as Phaser.Physics.Arcade.Body;

    playerBody.setCollideWorldBounds(true);

    for (const obstacle of this.treeColliders) {
      this.physics.add.collider(this.playerBody, obstacle);
      this.physics.add.collider(this.enemyBody, obstacle);
      this.physics.add.collider(this.bossBody, obstacle);
    }

    this.physics.add.collider(this.playerBody, this.elderBody);

    this.physics.add.overlap(this.playerBody, this.enemyBody, () => {
      if (!this.enemyDefeated) {
        this.damagePlayer(this.enemyDamage);
      }
    });

    this.physics.add.overlap(this.playerBody, this.bossBody, () => {
      if (this.bossUnlocked && !this.bossDefeated) {
        this.damagePlayer(this.bossDamage);
      }
    });

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.cameras.main.startFollow(this.playerBody, true, 0.08, 0.08);

    this.cameras.main.setZoom(1);

    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setSize(gameSize.width, gameSize.height);

      this.dialoguePanel.setPosition(20, gameSize.height - 155);

      this.dialoguePanel.setSize(gameSize.width - 40, 135);

      this.dialogueName.setPosition(40, gameSize.height - 140);

      this.dialogueText.setPosition(40, gameSize.height - 108);

      this.dialogueHint.setPosition(gameSize.width - 245, gameSize.height - 43);

      if (this.gameOverOverlay) {
        this.gameOverOverlay.setSize(gameSize.width, gameSize.height);
      }

      if (this.gameOverText) {
        this.gameOverText.setPosition(gameSize.width / 2, gameSize.height / 2);
      }
    });

    this.updateQuestDisplay();
  }

  private createInput(): void {
    if (!this.input.keyboard) {
      throw new Error("O teclado nÃ£o estÃ¡ disponÃ­vel.");
    }

    this.cursors = this.input.keyboard.createCursorKeys();

    this.wasd = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.attackKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.J,
    );

    this.interactKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    );

    this.languageKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.L,
    );

    this.restartKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.R,
    );
  }

  private drawGround(): void {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x263d2c, 1);
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const colors = [0x2d4932, 0x304b35, 0x29432f, 0x334d36, 0x2a4530];

    for (let y = 0; y < WORLD_HEIGHT; y += TILE_SIZE) {
      for (let x = 0; x < WORLD_WIDTH; x += TILE_SIZE) {
        const variation = (x * 7 + y * 13) % 5;

        graphics.fillStyle(colors[variation], 0.8);
        graphics.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

        if ((x + y) % 3 === 0) {
          graphics.fillStyle(0x6c8250, 0.35);
          graphics.fillCircle(x + 17 + (y % 21), y + 23, 2);
          graphics.fillCircle(x + 42, y + 44, 2);
        }
      }
    }
  }

  private drawPath(): void {
    const graphics = this.add.graphics();

    const drawTrail = (width: number, color: number, alpha: number): void => {
      graphics.lineStyle(width, color, alpha);
      graphics.beginPath();
      graphics.moveTo(790, WORLD_HEIGHT);
      graphics.lineTo(790, 870);
      graphics.lineTo(720, 760);
      graphics.lineTo(820, 650);
      graphics.lineTo(800, 500);
      graphics.lineTo(850, 380);
      graphics.strokePath();
    };

    drawTrail(90, 0x554a35, 1);
    drawTrail(72, 0x817050, 0.9);
    drawTrail(2, 0xc5b58b, 0.25);
  }

  private createForest(): void {
    let seed = 7351;

    const random = (max: number): number => {
      seed = (seed * 16807) % 2147483647;
      return ((seed % 10000) / 10000) * max;
    };

    for (let i = 0; i < 105; i++) {
      const x = 35 + random(WORLD_WIDTH - 70);
      const y = 35 + random(WORLD_HEIGHT - 70);

      if (Math.abs(x - 790) < 105 && y > 340) {
        continue;
      }

      if (Phaser.Math.Distance.Between(x, y, 850, 380) < 115) {
        continue;
      }

      this.createTree(x, y, 0.75 + random(0.6));
    }
  }

  private createTree(x: number, y: number, size: number): void {
    const tree = this.add.container(x, y);

    tree.add([
      this.add.ellipse(4, 28, 53, 18, 0x15291d, 0.55),
      this.add.rectangle(0, 15, 13, 32, 0x59402c),
      this.add.circle(0, -4, 27, 0x1a3022),
      this.add.circle(-3, -9, 22, 0x355a36),
      this.add.circle(-8, -15, 11, 0x507445, 0.8),
    ]);

    tree.setScale(size);
    tree.setDepth(y + 10);

    const obstacle = this.add.rectangle(
      x,
      y + 15 * size,
      22 * size,
      16 * size,
      0xffffff,
    );

    obstacle.setVisible(false);
    this.physics.add.existing(obstacle, true);
    this.treeColliders.push(obstacle);
  }

  private createLandmarks(): void {
    this.add
      .text(790, 1080, "TRILHA DE ALVORADA", {
        fontFamily: "Georgia, serif",
        fontSize: "15px",
        color: "#e4d6a8",
        stroke: "#1a251b",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(2000);

    this.add.circle(850, 380, 75, 0x789b66, 0.12);

    this.add.circle(850, 380, 48, 0x9ebd7c, 0.08);

    this.add
      .text(850, 300, "FLORESTA SUSSURRANTE", {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        color: "#c8d6b0",
        stroke: "#15251a",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(2000);
  }

  private createPlayer(): void {
    this.playerBody = this.add.rectangle(790, 960, 22, 18, 0xffffff);

    this.playerBody.setVisible(false);
    this.physics.add.existing(this.playerBody);

    this.player = this.add.container(790, 960);

    const shadow = this.add.ellipse(0, 13, 35, 16, 0x101810, 0.6);
    const cloak = this.add.triangle(
      0, 3, -12, -12, 12, -12, 0, 15, 0x762e36
    );
    const body = this.add.rectangle(0, -1, 19, 23, 0xb6a47b);
    const head = this.add.circle(0, -15, 8, 0xe2bd91);
    const hair = this.add.ellipse(0, -21, 17, 8, 0x302b2a);
    const leftLeg = this.add.rectangle(-5, 10, 6, 10, 0x60412b);
    const rightLeg = this.add.rectangle(5, 10, 6, 10, 0x60412b);
    const sword = this.add.rectangle(13, 1, 4, 23, 0xd7d8c9)
      .setAngle(-25);
    const swordHandle = this.add.rectangle(8, 9, 5, 8, 0x60412b)
      .setAngle(-25);

    this.player.add([
      shadow,
      leftLeg,
      rightLeg,
      cloak,
      body,
      head,
      hair,
      sword,
      swordHandle,
    ]);

    this.player.setData("leftLeg", leftLeg);
    this.player.setData("rightLeg", rightLeg);
    this.player.setData("sword", sword);
    this.player.setData("swordHandle", swordHandle);
    this.player.setDepth(1010);
  }

  private createElder(): void {
    this.elderBody = this.add.rectangle(650, 960, 24, 20, 0xffffff);

    this.elderBody.setVisible(false);
    this.physics.add.existing(this.elderBody, true);

    this.elder = this.add.container(650, 960);

    this.elder.add([
      this.add.ellipse(0, 13, 35, 15, 0x101810, 0.6),
      this.add.triangle(0, 5, -15, -10, 15, -10, 0, 19, 0x4b526a),
      this.add.circle(0, -9, 11, 0xb8b3a1),
      this.add.circle(0, -12, 12, 0xddd5bd),
      this.add.ellipse(0, -16, 17, 9, 0x888a84),
      this.add.rectangle(0, -3, 5, 15, 0xddd5bd),
    ]);

    this.elder.setDepth(1020);

    this.add
      .text(650, 925, this.language === "pt" ? "AnciÃ£o" : "Elder", {
        fontFamily: "Georgia, serif",
        fontSize: "13px",
        color: "#f0dfac",
        stroke: "#17251b",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(2500);
  }

  private createEnemy(): void {
    this.enemyBody = this.add.rectangle(850, 790, 30, 24, 0xffffff);

    this.enemyBody.setVisible(false);
    this.physics.add.existing(this.enemyBody);

    const body = this.enemyBody.body as Phaser.Physics.Arcade.Body;

    body.setCollideWorldBounds(true);

    this.enemy = this.add.container(850, 790);

    this.enemy.add([
      this.add.ellipse(0, 11, 43, 18, 0x10150f, 0.65),
      this.add.ellipse(-2, 0, 35, 26, 0x483e43),
      this.add.ellipse(0, -2, 30, 23, 0x6c565b),
      this.add.circle(15, -7, 12, 0x80636a),
      this.add.triangle(8, -17, -5, 6, 5, 6, 0, -10, 0x59434a),
      this.add.triangle(20, -17, -5, 6, 5, 6, 0, -10, 0x59434a),
      this.add.circle(19, -8, 2.5, 0xff453f),
      this.add.circle(11, -8, 2.5, 0xff453f),
      this.add.ellipse(21, 0, 12, 8, 0xb9a0a0),
    ]);

    this.enemy.setDepth(800);

    this.enemyHealthGraphics = this.add.graphics();
    this.enemyHealthGraphics.setDepth(3000);
  }

  private createBoss(): void {
    this.bossBody = this.add.rectangle(850, 380, 38, 32, 0xffffff);

    this.bossBody.setVisible(false);
    this.physics.add.existing(this.bossBody);

    const body = this.bossBody.body as Phaser.Physics.Arcade.Body;

    body.setCollideWorldBounds(true);
    body.enable = false;

    this.boss = this.add.container(850, 380);

    this.boss.add([
      this.add.ellipse(0, 19, 64, 25, 0x080a10, 0.75),

      this.add.ellipse(0, 2, 50, 58, 0x291c32),

      this.add.ellipse(0, -3, 40, 50, 0x49304e),

      this.add.triangle(-16, -31, -12, 17, 0, -21, 5, 13, 0x17121f),

      this.add.triangle(16, -31, -5, 13, 0, -21, 12, 17, 0x17121f),

      this.add.circle(0, -17, 18, 0x17121f),

      this.add.circle(-7, -18, 3.5, 0xff354d),

      this.add.circle(7, -18, 3.5, 0xff354d),

      this.add.triangle(0, 0, -9, -5, 9, -5, 0, 12, 0x17121f),

      this.add.rectangle(-24, 7, 10, 35, 0x291c32).setAngle(-25),

      this.add.rectangle(24, 7, 10, 35, 0x291c32).setAngle(25),

      this.add.circle(0, 3, 8, 0x8d264e),

      this.add.circle(0, 3, 4, 0xff5267),
    ]);

    this.boss.setDepth(900);
    this.boss.setVisible(false);

    this.bossHealthGraphics = this.add.graphics();
    this.bossHealthGraphics.setDepth(3000);
    this.bossHealthGraphics.setVisible(false);

    this.bossNameText = this.add.text(850, 325, "KAEL", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#ff8293",
      stroke: "#160d1c",
      strokeThickness: 5,
    });

    this.bossNameText.setOrigin(0.5);
    this.bossNameText.setDepth(3000);
    this.bossNameText.setVisible(false);
  }

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

    this.dialoguePanel = this.add.rectangle(
      20,
      this.scale.height - 155,
      this.scale.width - 40,
      135,
      0x111710,
      0.96,
    );

    this.dialoguePanel
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
    this.updateQuestDisplay();
  }

  private drawHud(): void {
    this.hudGraphics.clear();

    this.hudGraphics.fillStyle(0x111710, 0.9);
    this.hudGraphics.fillRoundedRect(20, 54, 224, 24, 5);

    this.hudGraphics.fillStyle(0x592e31, 1);
    this.hudGraphics.fillRect(24, 58, 216, 16);

    const healthWidth = 216 * (this.playerHealth / this.maxPlayerHealth);

    if (healthWidth > 0) {
      this.hudGraphics.fillStyle(0xb83e48, 1);
      this.hudGraphics.fillRect(24, 58, healthWidth, 16);
    }
  }

  private updateQuestDisplay(): void {
    this.questText.setText(
      this.language === "pt"
        ? this.getPortugueseQuest()
        : this.getEnglishQuest(),
    );

    if (this.victory) {
      this.statusText.setText(
        this.language === "pt"
          ? "KAEL DERROTADO â€¢ VITÃ“RIA"
          : "KAEL DEFEATED â€¢ VICTORY",
      );
      return;
    }

    if (this.questStage === "complete") {
      this.statusText.setText(
        this.language === "pt" ? "PRÃ“LOGO CONCLUÃDO" : "PROLOGUE COMPLETE",
      );
      return;
    }

    this.statusText.setText(
      this.language === "pt"
        ? "ASTRA LEGACY  â€¢  PRÃ“LOGO"
        : "ASTRA LEGACY  â€¢  PROLOGUE",
    );
  }

  private getPortugueseQuest(): string {
    switch (this.questStage) {
      case "talk":
        return "MISSÃƒO: A FLORESTA SUSSURRANTE\nFale com o AnciÃ£o de Alvorada.";

      case "hunt":
        return "MISSÃƒO: A FLORESTA SUSSURRANTE\nDerrote o Lobo Corrompido.";

      case "boss":
        return "NOVO OBJETIVO: O SENHOR DA CORRUPÃ‡ÃƒO\nEncontre e derrote Kael na floresta.";

      case "complete":
        return "PRÃ“LOGO CONCLUÃDO!\nVocÃª derrotou Kael e sobreviveu Ã  corrupÃ§Ã£o.";
    }
  }

  private getEnglishQuest(): string {
    switch (this.questStage) {
      case "talk":
        return "QUEST: THE WHISPERING FOREST\nTalk to the Elder of Dawnvale.";

      case "hunt":
        return "QUEST: THE WHISPERING FOREST\nDefeat the Corrupted Wolf.";

      case "boss":
        return "NEW OBJECTIVE: LORD OF CORRUPTION\nFind and defeat Kael in the forest.";

      case "complete":
        return "PROLOGUE COMPLETE!\nYou defeated Kael and survived the corruption.";
    }
  }

  private interactWithElder(): void {
    const distance = Phaser.Math.Distance.Between(
      this.playerBody.x,
      this.playerBody.y,
      this.elderBody.x,
      this.elderBody.y,
    );

    if (distance > 85) {
      return;
    }

    if (this.dialogueOpen) {
      this.advanceDialogue();
      return;
    }

    if (!this.elderTalked) {
      this.dialogueLines =
        this.language === "pt"
          ? [
              "Viajante, vocÃª chegou em uma hora sombria. A Floresta Sussurrante estÃ¡ sendo consumida por uma corrupÃ§Ã£o antiga.",
              "Um lobo corrompido ronda a trilha e ataca quem se aproxima. Precisamos recuperar esse caminho antes que a escuridÃ£o alcance Alvorada.",
              "Encontre o lobo e derrote-o. Que a luz de Astra guie sua espada.",
            ]
          : [
              "Traveler, you have arrived in a dark hour. The Whispering Forest is being consumed by an ancient corruption.",
              "A corrupted wolf stalks the trail and attacks anyone who approaches. We must reclaim this path before darkness reaches Dawnvale.",
              "Find the wolf and defeat it. May Astra's light guide your sword.",
            ];

      this.openDialogue(
        this.language === "pt" ? "AnciÃ£o de Alvorada" : "Elder of Dawnvale",
      );

      return;
    }

    if (this.bossDefeated) {
      this.dialogueLines =
        this.language === "pt"
          ? [
              "VocÃª derrotou Kael! A corrupÃ§Ã£o perdeu sua forÃ§a, e Alvorada terÃ¡ uma chance de reconstruir seu futuro.",
            ]
          : [
              "You defeated Kael! The corruption has lost its power, and Dawnvale may finally rebuild its future.",
            ];
    } else if (this.bossUnlocked) {
      this.dialogueLines =
        this.language === "pt"
          ? [
              "Sinto a presenÃ§a de Kael no coraÃ§Ã£o da floresta. Prepare-se, viajante. Ele Ã© muito mais perigoso que o lobo.",
            ]
          : [
              "I sense Kael's presence deep in the forest. Prepare yourself, traveler. He is far more dangerous than the wolf.",
            ];
    } else if (this.enemyDefeated) {
      this.dialogueLines =
        this.language === "pt"
          ? [
              "VocÃª conseguiu! Mas a morte do lobo revelou uma presenÃ§a ainda mais sombria. Siga atÃ© o coraÃ§Ã£o da floresta e prepare-se para enfrentar Kael.",
            ]
          : [
              "You did it! But the wolf's death revealed an even darker presence. Head into the heart of the forest and prepare to face Kael.",
            ];
    } else {
      this.dialogueLines =
        this.language === "pt"
          ? [
              "A trilha fica adiante. Cuidado com o Lobo Corrompido e nÃ£o deixe que ele cerque vocÃª.",
            ]
          : [
              "The trail lies ahead. Beware of the Corrupted Wolf and do not let it corner you.",
            ];
    }

    this.openDialogue(
      this.language === "pt" ? "AnciÃ£o de Alvorada" : "Elder of Dawnvale",
    );
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

    this.dialogueHint.setText(
      this.language === "pt" ? "E  â€¢  Continuar" : "E  â€¢  Continue",
    );
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
      this.questStage = this.enemyDefeated ? "boss" : "hunt";
    }

    this.unlockBossIfReady();
    this.updateQuestDisplay();
  }

  private unlockBossIfReady(): void {
    if (!this.elderTalked || !this.enemyDefeated || this.bossUnlocked) {
      return;
    }

    this.bossUnlocked = true;
    this.questStage = "boss";

    const body = this.bossBody.body as Phaser.Physics.Arcade.Body;

    body.enable = true;
    body.setVelocity(0, 0);

    this.bossBody.setActive(true);
    this.boss.setVisible(true);
    this.bossHealthGraphics.setVisible(true);
    this.bossNameText.setVisible(true);

    this.statusText.setText(
      this.language === "pt"
        ? "UMA PRESENÃ‡A SOMBRIA SURGIU..."
        : "A DARK PRESENCE HAS AWAKENED...",
    );

    this.updateQuestDisplay();
    this.drawBossHealthBar();
  }

  private attack(): void {
    const now = this.time.now;

    if (now - this.lastAttackAt < 350) {
      return;
    }

    this.lastAttackAt = now;

    const sword = this.player.getData(
      "sword"
    ) as Phaser.GameObjects.Rectangle;
    const swordHandle = this.player.getData(
      "swordHandle"
    ) as Phaser.GameObjects.Rectangle;

    this.tweens.killTweensOf([sword, swordHandle]);
    sword.setAngle(-25);
    swordHandle.setAngle(-25);

    this.tweens.add({
      targets: [sword, swordHandle],
      angle: { from: -25, to: 65 },
      duration: 110,
      yoyo: true,
      ease: "Cubic.Out",
    });

    this.createSlashEffect();

    if (!this.enemyDefeated) {
      this.attackWolf();
      return;
    }

    if (this.bossUnlocked && !this.bossDefeated) {
      this.attackBoss();
    }
  }

  private isTargetInFront(
    targetX: number,
    targetY: number,
    range: number,
  ): boolean {
    const dx = targetX - this.playerBody.x;
    const dy = targetY - this.playerBody.y;
    const distance = Math.hypot(dx, dy);

    if (distance > range || distance === 0) {
      return false;
    }

    const directionX = dx / distance;
    const directionY = dy / distance;

    const facingDot = directionX * this.facingX + directionY * this.facingY;

    return facingDot >= 0.2;
  }

  private attackWolf(): void {
    if (!this.isTargetInFront(this.enemyBody.x, this.enemyBody.y, 85)) {
      this.statusText.setText(
        this.language === "pt"
          ? "O GOLPE NÃƒO ALCANÃ‡OU O LOBO"
          : "YOUR ATTACK MISSED THE WOLF",
      );
      return;
    }

    this.enemyHealth = Math.max(0, this.enemyHealth - this.attackDamage);

    this.createImpactEffect(this.enemyBody.x, this.enemyBody.y, 0xffb56b);
    this.showDamageNumber(
      this.enemyBody.x,
      this.enemyBody.y,
      this.attackDamage,
      "#fff0c2",
    );

    this.statusText.setText(
      this.language === "pt"
        ? `LOBO ATINGIDO! DANO: ${this.attackDamage}`
        : `WOLF HIT! DAMAGE: ${this.attackDamage}`,
    );

    this.drawEnemyHealthBar();

    if (this.enemyHealth <= 0) {
      this.defeatEnemy();
    }
  }

  private attackBoss(): void {
    if (!this.isTargetInFront(this.bossBody.x, this.bossBody.y, 105)) {
      this.statusText.setText(
        this.language === "pt"
          ? "VOCÃŠ PRECISA SE APROXIMAR E VIRAR PARA KAEL"
          : "GET CLOSER AND FACE KAEL",
      );
      return;
    }

    this.bossHealth = Math.max(0, this.bossHealth - this.attackDamage);

    this.createImpactEffect(this.bossBody.x, this.bossBody.y, 0xff5267);
    this.showDamageNumber(
      this.bossBody.x,
      this.bossBody.y,
      this.attackDamage,
      "#ff8293",
    );

    this.statusText.setText(
      this.language === "pt"
        ? `KAEL ATINGIDO! DANO: ${this.attackDamage}`
        : `KAEL HIT! DAMAGE: ${this.attackDamage}`,
    );

    this.boss.setAlpha(0.45);

    this.time.delayedCall(100, () => {
      if (this.boss.active && !this.bossDefeated) {
        this.boss.setAlpha(1);
      }
    });

    this.drawBossHealthBar();

    if (this.bossHealth <= 0) {
      this.defeatBoss();
    }
  }

  private createSlashEffect(): void {
    const x = this.playerBody.x + this.facingX * 30;
    const y = this.playerBody.y + this.facingY * 30;

    const slash = this.add.graphics();

    slash.lineStyle(5, 0xf5df92, 0.95);

    const points: Phaser.Math.Vector2[] = [];

    for (let i = 0; i <= 12; i++) {
      const angle = -1.05 + (2.1 * i) / 12;

      points.push(
        new Phaser.Math.Vector2(Math.cos(angle) * 27, Math.sin(angle) * 27),
      );
    }

    slash.strokePoints(points, false);
    slash.setPosition(x, y);
    slash.setRotation(Math.atan2(this.facingY, this.facingX));
    slash.setDepth(this.playerBody.y + 120);

    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 150,
      ease: "Cubic.Out",
      onComplete: () => slash.destroy(),
    });
  }

  private createImpactEffect(
    x: number,
    y: number,
    color: number,
    particleCount = 6,
    spread = 24,
  ): void {
    const flash = this.add.circle(x, y, 7, color, 0.75);

    flash.setDepth(y + 120);

    this.tweens.add({
      targets: flash,
      scale: 2.4,
      alpha: 0,
      duration: 220,
      ease: "Cubic.Out",
      onComplete: () => flash.destroy(),
    });

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = spread * (0.65 + (i % 3) * 0.2);

      const particle = this.add.circle(x, y, 2 + (i % 2), color, 0.95);

      particle.setDepth(y + 125);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: 260,
        ease: "Cubic.Out",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private showDamageNumber(
    x: number,
    y: number,
    amount: number,
    color: string,
  ): void {
    const damageText = this.add.text(x, y - 24, `-${amount}`, {
      fontFamily: "Georgia, serif",
      fontSize: "17px",
      fontStyle: "bold",
      color,
      stroke: "#160d1c",
      strokeThickness: 4,
    });

    damageText.setOrigin(0.5);
    damageText.setDepth(y + 150);

    this.tweens.add({
      targets: damageText,
      y: y - 58,
      alpha: 0,
      duration: 650,
      ease: "Cubic.Out",
      onComplete: () => damageText.destroy(),
    });
  }

  private createDeathBurst(x: number, y: number, color: number): void {
    const ring = this.add.circle(x, y, 18, color, 0.75);

    ring.setDepth(y + 160);

    this.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 650,
      ease: "Cubic.Out",
      onComplete: () => ring.destroy(),
    });

    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18;
      const distance = 42 + (i % 3) * 13;
      const particleColor = i % 2 === 0 ? color : 0xff5267;

      const particle = this.add.circle(x, y, 3 + (i % 3), particleColor, 1);

      particle.setDepth(y + 170);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.15,
        duration: 700 + (i % 4) * 70,
        ease: "Cubic.Out",
        onComplete: () => particle.destroy(),
      });
    }
  }
  private drawEnemyHealthBar(): void {
    if (!this.enemyHealthGraphics || this.enemyDefeated) {
      return;
    }

    const x = this.enemyBody.x - 24;
    const y = this.enemyBody.y - 36;
    const width = 48;

    this.enemyHealthGraphics.clear();
    this.enemyHealthGraphics.fillStyle(0x111710, 0.95);
    this.enemyHealthGraphics.fillRect(x, y, width, 7);

    const healthWidth = width * (this.enemyHealth / this.maxEnemyHealth);

    if (healthWidth > 0) {
      this.enemyHealthGraphics.fillStyle(0xc44449, 1);
      this.enemyHealthGraphics.fillRect(
        x + 1,
        y + 1,
        Math.max(0, healthWidth - 1),
        5,
      );
    }
  }

  private drawBossHealthBar(): void {
    if (!this.bossHealthGraphics || !this.bossUnlocked || this.bossDefeated) {
      return;
    }

    const width = 100;
    const x = this.bossBody.x - width / 2;
    const y = this.bossBody.y - 53;

    this.bossHealthGraphics.clear();

    this.bossHealthGraphics.fillStyle(0x100c16, 0.95);
    this.bossHealthGraphics.fillRect(x, y, width, 10);

    this.bossHealthGraphics.fillStyle(0x562038, 1);
    this.bossHealthGraphics.fillRect(x + 1, y + 1, width - 2, 8);

    const healthWidth = (width - 2) * (this.bossHealth / this.maxBossHealth);

    if (healthWidth > 0) {
      this.bossHealthGraphics.fillStyle(0xe43e62, 1);
      this.bossHealthGraphics.fillRect(x + 1, y + 1, healthWidth, 8);
    }

    this.bossNameText.setPosition(this.bossBody.x, this.bossBody.y - 76);
  }

  private damagePlayer(amount: number): void {
    if (this.gameOver || this.time.now - this.lastDamageAt < 850) {
      return;
    }

    this.lastDamageAt = this.time.now;

    // Efeito de impacto vermelho sobre o herÃ³i.
    this.createImpactEffect(this.player.x, this.player.y - 10, 0xff5267, 9, 30);

    // NÃºmero do dano flutuando acima do herÃ³i.
    this.showDamageNumber(this.player.x, this.player.y - 15, amount, "#ff5267");

    // Atualiza a vida do jogador.
    this.playerHealth = Math.max(0, this.playerHealth - amount);

    this.drawHud();

    this.statusText.setText(
      this.language === "pt"
        ? `VOCÃŠ RECEBEU ${amount} DE DANO`
        : `YOU TOOK ${amount} DAMAGE`,
    );

    // Efeito visual de dano no personagem.
    this.player.setAlpha(0.4);

    this.time.delayedCall(180, () => {
      if (this.player.active && !this.gameOver) {
        this.player.setAlpha(1);
      }
    });

    this.time.delayedCall(360, () => {
      if (this.player.active && !this.gameOver) {
        this.player.setAlpha(0.4);
      }
    });

    this.time.delayedCall(540, () => {
      if (this.player.active && !this.gameOver) {
        this.player.setAlpha(1);
      }
    });

    // Verifica se o jogador foi derrotado.
    if (this.playerHealth <= 0) {
      this.showGameOver(false);
    }
  }

  private defeatEnemy(): void {
    this.enemyDefeated = true;

    const body = this.enemyBody.body as Phaser.Physics.Arcade.Body;

    body.setVelocity(0, 0);
    body.enable = false;

    this.enemyBody.setActive(false);
    this.enemyBody.setVisible(false);

    this.createDeathBurst(this.enemyBody.x, this.enemyBody.y, 0xc44449);

    this.enemy.destroy();
    this.enemyHealthGraphics.destroy();

    this.unlockBossIfReady();

    if (!this.bossUnlocked) {
      this.statusText.setText(
        this.language === "pt"
          ? "LOBO DERROTADO! VOLTE AO ANCIÃƒO."
          : "WOLF DEFEATED! RETURN TO THE ELDER.",
      );
    }
  }

  private defeatBoss(): void {
    this.bossDefeated = true;
    this.victory = true;
    this.gameOver = true;

    const body = this.bossBody.body as Phaser.Physics.Arcade.Body;

    body.setVelocity(0, 0);
    body.enable = false;

    this.bossBody.setActive(false);
    this.bossBody.setVisible(false);

    this.createDeathBurst(this.bossBody.x, this.bossBody.y, 0x8d264e);

    this.boss.destroy();
    this.bossHealthGraphics.destroy();
    this.bossNameText.destroy();

    this.questStage = "complete";
    this.updateQuestDisplay();

    this.showGameOver(true);
  }

  private showGameOver(isVictory: boolean): void {
    this.gameOver = true;
    this.victory = isVictory;

    this.physics.world.pause();

    this.gameOverOverlay = this.add.rectangle(
      0,
      0,
      this.scale.width,
      this.scale.height,
      isVictory ? 0x11120a : 0x080d0a,
      0.9,
    );

    this.gameOverOverlay.setOrigin(0, 0).setScrollFactor(0).setDepth(5000);

    const message = isVictory
      ? this.language === "pt"
        ? "KAEL FOI DERROTADO!\n\nA luz de Astra voltou a brilhar.\n\nPressione R para jogar novamente"
        : "KAEL HAS BEEN DEFEATED!\n\nAstra's light shines once more.\n\nPress R to play again"
      : this.language === "pt"
        ? "VOCÃŠ FOI DERROTADO\n\nPressione R para tentar novamente"
        : "YOU WERE DEFEATED\n\nPress R to try again";

    this.gameOverText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      message,
      {
        fontFamily: "Georgia, serif",
        fontSize: "24px",
        color: isVictory ? "#f0dfac" : "#e9dfbf",
        align: "center",
        stroke: "#15231b",
        strokeThickness: 3,
        wordWrap: { width: this.scale.width - 60 },
      },
    );

    this.gameOverText.setOrigin(0.5).setScrollFactor(0).setDepth(5001);
  }

  private toggleLanguage(): void {
    this.language = this.language === "pt" ? "en" : "pt";

    this.updateQuestDisplay();

    if (this.dialogueOpen) {
      this.dialogueName.setText(
        this.language === "pt" ? "AnciÃ£o de Alvorada" : "Elder of Dawnvale",
      );

      if (!this.elderTalked) {
        this.dialogueLines =
          this.language === "pt"
            ? [
                "Viajante, vocÃª chegou em uma hora sombria. A Floresta Sussurrante estÃ¡ sendo consumida por uma corrupÃ§Ã£o antiga.",
                "Um lobo corrompido ronda a trilha e ataca quem se aproxima. Precisamos recuperar esse caminho antes que a escuridÃ£o alcance Alvorada.",
                "Encontre o lobo e derrote-o. Que a luz de Astra guie sua espada.",
              ]
            : [
                "Traveler, you have arrived in a dark hour. The Whispering Forest is being consumed by an ancient corruption.",
                "A corrupted wolf stalks the trail and attacks anyone who approaches. We must reclaim this path before darkness reaches Dawnvale.",
                "Find the wolf and defeat it. May Astra's light guide your sword.",
              ];

        this.dialogueIndex = Math.min(
          this.dialogueIndex,
          this.dialogueLines.length - 1,
        );

        this.showCurrentDialogue();
      }
    }

    if (this.gameOverText) {
      const message = this.victory
        ? this.language === "pt"
          ? "KAEL FOI DERROTADO!\n\nA luz de Astra voltou a brilhar.\n\nPressione R para jogar novamente"
          : "KAEL HAS BEEN DEFEATED!\n\nAstra's light shines once more.\n\nPress R to play again"
        : this.language === "pt"
          ? "VOCÃŠ FOI DERROTADO\n\nPressione R para tentar novamente"
          : "YOU WERE DEFEATED\n\nPress R to try again";

      this.gameOverText.setText(message);
    }
  }

  update(): void {
    if (!this.playerBody || !this.wasd || !this.cursors) {
      return;
    }

    if (this.gameOver && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.scene.restart();
      return;
    }

    if (this.gameOver) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.languageKey)) {
      this.toggleLanguage();
    }

    if (this.dialogueOpen) {
      const body = this.playerBody.body as Phaser.Physics.Arcade.Body;

      body.setVelocity(0, 0);

      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.advanceDialogue();
      }

      return;
    }

    let x = 0;
    let y = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) x -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) x += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) y -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) y += 1;

    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }

    if (x !== 0 || y !== 0) {
      this.facingX = x;
      this.facingY = y;
    }

    const playerBody = this.playerBody.body as Phaser.Physics.Arcade.Body;

    playerBody.setVelocity(x * this.playerSpeed, y * this.playerSpeed);

    this.player.setPosition(this.playerBody.x, this.playerBody.y);

    this.player.setDepth(this.playerBody.y + 50);

    // Animação procedural de caminhada.
    const moving = x !== 0 || y !== 0;
    const walkCycle = moving ? Math.sin(this.time.now / 75) : 0;
    const walkingBounce = moving
      ? 1 + Math.abs(walkCycle) * 0.025
      : 1;

    const leftLeg = this.player.getData(
      "leftLeg"
    ) as Phaser.GameObjects.Rectangle;
    const rightLeg = this.player.getData(
      "rightLeg"
    ) as Phaser.GameObjects.Rectangle;

    leftLeg.setAngle(moving ? walkCycle * 22 : 0);
    rightLeg.setAngle(moving ? -walkCycle * 22 : 0);

    this.player.setScale(1, walkingBounce);

    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.attack();
    }

    const elderDistance = Phaser.Math.Distance.Between(
      this.playerBody.x,
      this.playerBody.y,
      this.elderBody.x,
      this.elderBody.y,
    );

    if (elderDistance <= 85) {
      this.interactionHint
        .setText(this.language === "pt" ? "E  â€¢  Conversar" : "E  â€¢  Talk")
        .setPosition(this.elder.x, this.elder.y - 42)
        .setVisible(true);

      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.interactWithElder();
      }
    } else {
      this.interactionHint.setVisible(false);
    }

    if (!this.enemyDefeated) {
      this.updateEnemy();
      this.drawEnemyHealthBar();
    }

    if (this.bossUnlocked && !this.bossDefeated) {
      this.updateBoss();
      this.drawBossHealthBar();
    }

    this.drawHud();
  }

  private updateEnemy(): void {
    const dx = this.playerBody.x - this.enemyBody.x;
    const dy = this.playerBody.y - this.enemyBody.y;
    const distance = Math.hypot(dx, dy);

    const enemyBody = this.enemyBody.body as Phaser.Physics.Arcade.Body;

    if (distance > 36 && distance < 420) {
      enemyBody.setVelocity(
        (dx / distance) * this.enemySpeed,
        (dy / distance) * this.enemySpeed,
      );
    } else {
      enemyBody.setVelocity(0, 0);
    }

    this.enemy.setPosition(this.enemyBody.x, this.enemyBody.y);

    this.enemy.setDepth(this.enemyBody.y + 10);
  }

  private updateBoss(): void {
    const dx = this.playerBody.x - this.bossBody.x;
    const dy = this.playerBody.y - this.bossBody.y;
    const distance = Math.hypot(dx, dy);

    const bossBody = this.bossBody.body as Phaser.Physics.Arcade.Body;

    if (distance > 48 && distance < 650) {
      bossBody.setVelocity(
        (dx / distance) * this.bossSpeed,
        (dy / distance) * this.bossSpeed,
      );
    } else {
      bossBody.setVelocity(0, 0);
    }

    this.boss.setPosition(this.bossBody.x, this.bossBody.y);

    this.boss.setDepth(this.bossBody.y + 20);

    if (distance <= 65 && this.time.now - this.lastBossAttackAt >= 1000) {
      this.lastBossAttackAt = this.time.now;
      this.damagePlayer(this.bossDamage);
    }
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 540,
  backgroundColor: "#17251b",
  pixelArt: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [ForestScene],
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy(true));
}



import Phaser from "phaser";
import "./style.css";

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1200;
const TILE_SIZE = 64;

class ForestScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Rectangle;
  private enemy!: Phaser.GameObjects.Container;
  private enemyBody!: Phaser.GameObjects.Rectangle;
  private treeColliders: Phaser.GameObjects.Rectangle[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private attackKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;

  private statusText!: Phaser.GameObjects.Text;
  private hudGraphics!: Phaser.GameObjects.Graphics;
  private enemyHealthGraphics!: Phaser.GameObjects.Graphics;
  private gameOverOverlay?: Phaser.GameObjects.Rectangle;
  private gameOverText?: Phaser.GameObjects.Text;

  private playerHealth = 100;
  private enemyHealth = 60;

  private readonly maxPlayerHealth = 100;
  private readonly maxEnemyHealth = 60;
  private readonly playerSpeed = 220;
  private readonly enemySpeed = 85;
  private readonly attackDamage = 25;
  private readonly enemyDamage = 12;

  private facingX = 0;
  private facingY = 1;
  private lastAttackAt = -10000;
  private lastDamageAt = -10000;
  private gameOver = false;
  private enemyDefeated = false;

  constructor() {
    super("ForestScene");
  }

  create(): void {
    this.treeColliders = [];
    this.playerHealth = this.maxPlayerHealth;
    this.enemyHealth = this.maxEnemyHealth;
    this.facingX = 0;
    this.facingY = 1;
    this.lastAttackAt = -10000;
    this.lastDamageAt = -10000;
    this.gameOver = false;
    this.enemyDefeated = false;

    this.drawGround();
    this.drawPath();
    this.createForest();
    this.createLandmarks();
    this.createPlayer();
    this.createEnemy();
    this.createInterface();
    this.createInput();

    this.physics.world.setBounds(
      0,
      0,
      WORLD_WIDTH,
      WORLD_HEIGHT,
    );

    const playerBody =
      this.playerBody.body as Phaser.Physics.Arcade.Body;

    playerBody.setCollideWorldBounds(true);

    for (const obstacle of this.treeColliders) {
      this.physics.add.collider(this.playerBody, obstacle);
      this.physics.add.collider(this.enemyBody, obstacle);
    }

    this.physics.add.overlap(
      this.playerBody,
      this.enemyBody,
      () => this.damagePlayer(),
    );

    this.cameras.main.setBounds(
      0,
      0,
      WORLD_WIDTH,
      WORLD_HEIGHT,
    );

    this.cameras.main.startFollow(
      this.playerBody,
      true,
      0.08,
      0.08,
    );

    this.cameras.main.setZoom(1);

    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setSize(
        gameSize.width,
        gameSize.height,
      );

      if (this.gameOverOverlay) {
        this.gameOverOverlay.setSize(
          gameSize.width,
          gameSize.height,
        );
      }

      if (this.gameOverText) {
        this.gameOverText.setPosition(
          gameSize.width / 2,
          gameSize.height / 2,
        );
      }
    });
  }

  private createInput(): void {
    if (!this.input.keyboard) {
      throw new Error("O teclado não está disponível.");
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

    this.restartKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.R,
    );
  }

  private drawGround(): void {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x263d2c, 1);
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const colors = [
      0x2d4932,
      0x304b35,
      0x29432f,
      0x334d36,
      0x2a4530,
    ];

    for (let y = 0; y < WORLD_HEIGHT; y += TILE_SIZE) {
      for (let x = 0; x < WORLD_WIDTH; x += TILE_SIZE) {
        const variation = (x * 7 + y * 13) % 5;

        graphics.fillStyle(colors[variation], 0.8);
        graphics.fillRect(
          x + 2,
          y + 2,
          TILE_SIZE - 4,
          TILE_SIZE - 4,
        );

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

    const drawTrail = (
      width: number,
      color: number,
      alpha: number,
    ): void => {
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
      return (seed % 10000) / 10000 * max;
    };

    for (let i = 0; i < 105; i++) {
      const x = 35 + random(WORLD_WIDTH - 70);
      const y = 35 + random(WORLD_HEIGHT - 70);

      if (Math.abs(x - 790) < 105 && y > 340) {
        continue;
      }

      this.createTree(x, y, 0.75 + random(0.6));
    }
  }

  private createTree(
    x: number,
    y: number,
    size: number,
  ): void {
    const tree = this.add.container(x, y);

    const trunk = this.add.rectangle(
      0, 15, 13, 32, 0x59402c,
    );

    const shadow = this.add.ellipse(
      4, 28, 53, 18, 0x15291d, 0.55,
    );

    const leavesBack = this.add.circle(
      0, -4, 27, 0x1a3022,
    );

    const leaves = this.add.circle(
      -3, -9, 22, 0x355a36,
    );

    const leavesLight = this.add.circle(
      -8, -15, 11, 0x507445, 0.8,
    );

    tree.add([
      shadow,
      trunk,
      leavesBack,
      leaves,
      leavesLight,
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
    this.add.text(790, 1080, "TRILHA DE ALVORADA", {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#e4d6a8",
      stroke: "#1a251b",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2000);

    this.add.circle(
      850, 380, 55, 0x789b66, 0.12,
    );

    this.add.circle(
      850, 380, 36, 0x9ebd7c, 0.08,
    );

    this.add.text(850, 300, "FLORESTA SUSSURRANTE", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#c8d6b0",
      stroke: "#15251a",
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(2000);
  }

  private createPlayer(): void {
    this.playerBody = this.add.rectangle(
      790, 960, 22, 18, 0xffffff,
    );

    this.playerBody.setVisible(false);
    this.physics.add.existing(this.playerBody);

    this.player = this.add.container(790, 960);

    const shadow = this.add.ellipse(
      0, 13, 35, 16, 0x101810, 0.6,
    );

    const cape = this.add.triangle(
      0, 3,
      -12, -12,
      12, -12,
      0, 15,
      0x762e36,
    );

    const body = this.add.rectangle(
      0, -1, 19, 23, 0xb6a47b,
    );

    const head = this.add.circle(
      0, -15, 8, 0xe2bd91,
    );

    const hair = this.add.ellipse(
      0, -21, 17, 8, 0x302b2a,
    );

    const sword = this.add.rectangle(
      13, 1, 4, 23, 0xd7d8c9,
    ).setAngle(-25);

    const grip = this.add.rectangle(
      8, 9, 5, 8, 0x60412b,
    ).setAngle(-25);

    this.player.add([
      shadow,
      cape,
      body,
      head,
      hair,
      sword,
      grip,
    ]);

    this.player.setDepth(1010);
  }

  private createEnemy(): void {
    // O inimigo começa perto da trilha.
    this.enemyBody = this.add.rectangle(
      850, 790, 30, 24, 0xffffff,
    );

    this.enemyBody.setVisible(false);
    this.physics.add.existing(this.enemyBody);

    const body =
      this.enemyBody.body as Phaser.Physics.Arcade.Body;

    body.setCollideWorldBounds(true);

    this.enemy = this.add.container(850, 790);

    const shadow = this.add.ellipse(
      0, 11, 43, 18, 0x10150f, 0.65,
    );

    const rearBody = this.add.ellipse(
      -2, 0, 35, 26, 0x483e43,
    );

    const fur = this.add.ellipse(
      0, -2, 30, 23, 0x6c565b,
    );

    const head = this.add.circle(
      15, -7, 12, 0x80636a,
    );

    const leftEar = this.add.triangle(
      8, -17,
      -5, 6,
      5, 6,
      0, -10,
      0x59434a,
    );

    const rightEar = this.add.triangle(
      20, -17,
      -5, 6,
      5, 6,
      0, -10,
      0x59434a,
    );

    const leftEye = this.add.circle(
      19, -8, 2.5, 0xff453f,
    );

    const rightEye = this.add.circle(
      11, -8, 2.5, 0xff453f,
    );

    const muzzle = this.add.ellipse(
      21, 0, 12, 8, 0xb9a0a0,
    );

    this.enemy.add([
      shadow,
      rearBody,
      fur,
      head,
      leftEar,
      rightEar,
      leftEye,
      rightEye,
      muzzle,
    ]);

    this.enemy.setDepth(800);

    this.enemyHealthGraphics = this.add.graphics();
    this.enemyHealthGraphics.setDepth(3000);
  }

  private createInterface(): void {
    this.statusText = this.add.text(
      20,
      18,
      "ASTRA LEGACY  •  LOBO CORROMPIDO",
      {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#e9dfbf",
        backgroundColor: "#15231bd9",
        padding: { x: 12, y: 9 },
      },
    ).setScrollFactor(0).setDepth(3000);

    this.hudGraphics = this.add.graphics();
    this.hudGraphics.setScrollFactor(0);
    this.hudGraphics.setDepth(3000);

    this.drawHud();
  }

  private drawHud(): void {
    this.hudGraphics.clear();

    this.hudGraphics.fillStyle(0x111710, 0.9);
    this.hudGraphics.fillRoundedRect(
      20, 54, 224, 24, 5,
    );

    this.hudGraphics.fillStyle(0x592e31, 1);
    this.hudGraphics.fillRect(
      24, 58, 216, 16,
    );

    const healthWidth = 216 * (
      this.playerHealth / this.maxPlayerHealth
    );

    if (healthWidth > 0) {
      this.hudGraphics.fillStyle(0xb83e48, 1);
      this.hudGraphics.fillRect(
        24, 58, healthWidth, 16,
      );
    }

    this.hudGraphics.fillStyle(0xe9dfbf, 1);
    this.hudGraphics.fillRect(
      20, 84, 4, 4,
    );

    this.hudGraphics.fillStyle(0x111710, 0.9);
    this.hudGraphics.fillRoundedRect(
      30, 80, 194, 22, 4,
    );

    this.hudGraphics.fillStyle(0xe9dfbf, 1);
    this.hudGraphics.fillRect(
      38, 89, 8, 4,
    );
  }

  private attack(): void {
    const now = this.time.now;

    if (now - this.lastAttackAt < 350) {
      return;
    }

    this.lastAttackAt = now;

    // Efeito visual simples do golpe.
    const slash = this.add.circle(
      this.playerBody.x + this.facingX * 38,
      this.playerBody.y + this.facingY * 38,
      25,
      0xf5df92,
      0.55,
    );

    slash.setDepth(this.playerBody.y + 100);

    this.time.delayedCall(110, () => {
      slash.destroy();
    });

    if (this.enemyDefeated) {
      return;
    }

    const dx = this.enemyBody.x - this.playerBody.x;
    const dy = this.enemyBody.y - this.playerBody.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 85 || distance === 0) {
      this.statusText.setText(
        "O GOLPE NÃO ALCANÇOU O INIMIGO",
      );
      return;
    }

    const directionX = dx / distance;
    const directionY = dy / distance;

    const facingDot =
      directionX * this.facingX +
      directionY * this.facingY;

    if (facingDot < 0.2) {
      this.statusText.setText(
        "VIRE-SE PARA ACERTAR O LOBO",
      );
      return;
    }

    this.enemyHealth = Math.max(
      0,
      this.enemyHealth - this.attackDamage,
    );

    this.statusText.setText(
      `GOLPE ACERTOU! DANO: ${this.attackDamage}`,
    );

    this.drawEnemyHealthBar();

    if (this.enemyHealth <= 0) {
      this.defeatEnemy();
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
    this.enemyHealthGraphics.fillRect(
      x, y, width, 7,
    );

    const healthWidth =
      width * (this.enemyHealth / this.maxEnemyHealth);

    if (healthWidth > 0) {
      this.enemyHealthGraphics.fillStyle(0xc44449, 1);
      this.enemyHealthGraphics.fillRect(
        x + 1, y + 1, healthWidth - 1, 5,
      );
    }
  }

  private damagePlayer(): void {
    if (
      this.gameOver ||
      this.enemyDefeated ||
      this.time.now - this.lastDamageAt < 850
    ) {
      return;
    }

    this.lastDamageAt = this.time.now;

    this.playerHealth = Math.max(
      0,
      this.playerHealth - this.enemyDamage,
    );

    this.drawHud();

    this.statusText.setText(
      `VOCÊ RECEBEU ${this.enemyDamage} DE DANO`,
    );

    // Pisca durante a invulnerabilidade temporária.
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

    if (this.playerHealth <= 0) {
      this.showGameOver();
    }
  }

  private defeatEnemy(): void {
    this.enemyDefeated = true;

    const body =
      this.enemyBody.body as Phaser.Physics.Arcade.Body;

    body.setVelocity(0, 0);
    body.enable = false;

    this.enemyBody.setActive(false);
    this.enemyBody.setVisible(false);

    this.enemy.destroy();
    this.enemyHealthGraphics.destroy();

    this.statusText.setText(
      "LOBO DERROTADO! A TRILHA ESTÁ LIVRE",
    );
  }

  private showGameOver(): void {
    this.gameOver = true;
    this.physics.world.pause();

    this.gameOverOverlay = this.add.rectangle(
      0,
      0,
      this.scale.width,
      this.scale.height,
      0x080d0a,
      0.88,
    );

    this.gameOverOverlay
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(5000);

    this.gameOverText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      "VOCÊ FOI DERROTADO\n\nPressione R para tentar novamente",
      {
        fontFamily: "Georgia, serif",
        fontSize: "24px",
        color: "#e9dfbf",
        align: "center",
        stroke: "#15231b",
        strokeThickness: 3,
      },
    );

    this.gameOverText
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5001);
  }

  update(): void {
    if (!this.playerBody || !this.wasd || !this.cursors) {
      return;
    }

    if (
      this.gameOver &&
      Phaser.Input.Keyboard.JustDown(this.restartKey)
    ) {
      this.scene.restart();
      return;
    }

    if (this.gameOver) {
      return;
    }

    let x = 0;
    let y = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      x -= 1;
    }

    if (this.cursors.right.isDown || this.wasd.D.isDown) {
      x += 1;
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      y -= 1;
    }

    if (this.cursors.down.isDown || this.wasd.S.isDown) {
      y += 1;
    }

    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }

    if (x !== 0 || y !== 0) {
      this.facingX = x;
      this.facingY = y;
    }

    const playerBody =
      this.playerBody.body as Phaser.Physics.Arcade.Body;

    playerBody.setVelocity(
      x * this.playerSpeed,
      y * this.playerSpeed,
    );

    this.player.setPosition(
      this.playerBody.x,
      this.playerBody.y,
    );

    this.player.setDepth(this.playerBody.y + 50);

    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.attack();
    }

    if (!this.enemyDefeated) {
      this.updateEnemy();
      this.drawEnemyHealthBar();
    }

    this.drawHud();
  }

  private updateEnemy(): void {
    const dx = this.playerBody.x - this.enemyBody.x;
    const dy = this.playerBody.y - this.enemyBody.y;
    const distance = Math.hypot(dx, dy);

    const enemyBody =
      this.enemyBody.body as Phaser.Physics.Arcade.Body;

    if (distance > 36 && distance < 420) {
      enemyBody.setVelocity(
        (dx / distance) * this.enemySpeed,
        (dy / distance) * this.enemySpeed,
      );
    } else {
      enemyBody.setVelocity(0, 0);
    }

    this.enemy.setPosition(
      this.enemyBody.x,
      this.enemyBody.y,
    );

    this.enemy.setDepth(this.enemyBody.y + 10);
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

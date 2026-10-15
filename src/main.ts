import Phaser from "phaser";
import "./style.css";

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1200;
const TILE_SIZE = 64;

class ForestScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private statusText!: Phaser.GameObjects.Text;
  private speed = 220;

  constructor() {
    super("ForestScene");
  }

  create(): void {
    this.drawGround();
    this.drawPath();
    this.createForest();
    this.createLandmarks();
    this.createPlayer();
    this.createInterface();

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    this.scale.on("resize", () => {
      this.cameras.main.setSize(this.scale.width, this.scale.height);
    });
  }

  private drawGround(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x263d2c, 1);
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    for (let y = 0; y < WORLD_HEIGHT; y += TILE_SIZE) {
      for (let x = 0; x < WORLD_WIDTH; x += TILE_SIZE) {
        const variation = ((x * 7 + y * 13) % 5);
        const colors = [0x2d4932, 0x304b35, 0x29432f, 0x334d36, 0x2a4530];
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

    graphics.lineStyle(90, 0x554a35, 1);
    graphics.beginPath();
    graphics.moveTo(790, WORLD_HEIGHT);
    graphics.lineTo(790, 870);
    graphics.lineTo(720, 760);
    graphics.lineTo(820, 650);
    graphics.lineTo(800, 500);
    graphics.lineTo(850, 380);
    graphics.strokePath();

    graphics.lineStyle(72, 0x817050, 0.9);
    graphics.beginPath();
    graphics.moveTo(790, WORLD_HEIGHT);
    graphics.lineTo(790, 870);
    graphics.lineTo(720, 760);
    graphics.lineTo(820, 650);
    graphics.lineTo(800, 500);
    graphics.lineTo(850, 380);
    graphics.strokePath();

    graphics.lineStyle(2, 0xc5b58b, 0.25);
    graphics.beginPath();
    graphics.moveTo(790, WORLD_HEIGHT);
    graphics.lineTo(790, 870);
    graphics.lineTo(720, 760);
    graphics.lineTo(820, 650);
    graphics.lineTo(800, 500);
    graphics.lineTo(850, 380);
    graphics.strokePath();
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

      // Mantém o caminho principal livre para exploração.
      if (Math.abs(x - 790) < 105 && y > 340) continue;

      this.createTree(x, y, 0.75 + random(0.6));
    }
  }

  private createTree(x: number, y: number, size: number): void {
    const tree = this.add.container(x, y);
    const trunk = this.add.rectangle(0, 15, 13, 32, 0x59402c);
    const shadow = this.add.ellipse(4, 28, 53, 18, 0x15291d, 0.55);
    const leavesBack = this.add.circle(0, -4, 27, 0x1a3022);
    const leaves = this.add.circle(-3, -9, 22, 0x355a36);
    const leavesLight = this.add.circle(-8, -15, 11, 0x507445, 0.8);

    tree.add([shadow, trunk, leavesBack, leaves, leavesLight]);
    tree.setScale(size);
    tree.setDepth(y + 10);
  }

  private createLandmarks(): void {
    this.add.text(790, 1080, "TRILHA DE ALVORADA", {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#e4d6a8",
      stroke: "#1a251b",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2000);

    this.add.circle(850, 380, 55, 0x789b66, 0.12);
    this.add.circle(850, 380, 36, 0x9ebd7c, 0.08);

    this.add.text(850, 300, "FLORESTA SUSSURRANTE", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#c8d6b0",
      stroke: "#15251a",
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(2000);
  }

  private createPlayer(): void {
    this.player = this.add.container(790, 960);

    const shadow = this.add.ellipse(0, 13, 35, 16, 0x101810, 0.6);
    const cape = this.add.triangle(0, 3, -12, -12, 12, -12, 0, 15, 0x762e36);
    const body = this.add.rectangle(0, -1, 19, 23, 0xb6a47b);
    const head = this.add.circle(0, -15, 8, 0xe2bd91);
    const hair = this.add.ellipse(0, -21, 17, 8, 0x302b2a);
    const sword = this.add.rectangle(13, 1, 4, 23, 0xd7d8c9).setAngle(-25);
    const grip = this.add.rectangle(8, 9, 5, 8, 0x60412b).setAngle(-25);

    this.player.add([shadow, cape, body, head, hair, sword, grip]);
    this.player.setSize(25, 36);
    this.player.setDepth(960);
  }

  private createInterface(): void {
    this.statusText = this.add.text(20, 18, "PRÓLOGO  •  EXPLORA A FLORESTA", {
      fontFamily: "Georgia, serif",
      fontSize: "14px",
      color: "#e9dfbf",
      backgroundColor: "#15231bd9",
      padding: { x: 12, y: 9 },
    }).setScrollFactor(0).setDepth(3000);
  }

  update(_time: number, delta: number): void {
    if (!this.player || !this.wasd || !this.cursors) return;

    let x = 0;
    let y = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) x -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) x += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) y -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) y += 1;

    if (x !== 0 && y !== 0) {
      const normalization = Math.SQRT1_2;
      x *= normalization;
      y *= normalization;
    }

    const movement = this.speed * (delta / 1000);
    this.player.x = Phaser.Math.Clamp(
      this.player.x + x * movement,
      18,
      WORLD_WIDTH - 18,
    );
    this.player.y = Phaser.Math.Clamp(
      this.player.y + y * movement,
      18,
      WORLD_HEIGHT - 18,
    );

    this.player.setDepth(this.player.y + 50);
    this.statusText.setText(
      x === 0 && y === 0
        ? "PRÓLOGO  •  EXPLORA A FLORESTA"
        : "PRÓLOGO  •  CAMINHANDO PELA FLORESTA",
    );
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

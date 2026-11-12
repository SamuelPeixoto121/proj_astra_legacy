// Cenário dos Picos Congelados: chão de neve, trilha pisada até o platô do
// topo, placas de gelo escorregadio, pinheiros e pedras cobertos de neve,
// neve caindo e uma nevasca que embranquece as bordas da tela.

import Phaser from "phaser";
import {
  PEAKS_HEIGHT,
  PEAKS_ICE_PATCHES,
  PEAKS_PATH,
  PEAKS_SUMMIT,
  PEAKS_WIDTH,
  TILE_SIZE,
} from "../config";

export interface PeaksWorld {
  /** Obstáculos (pinheiros e pedras), usados pela cena para as colisões. */
  obstacles: Phaser.GameObjects.Rectangle[];
  /** Placa com o nome da área; a cena preenche o texto conforme o idioma. */
  sign: Phaser.GameObjects.Text;
}

const SNOWFLAKE_TEXTURE = "snowflake";
const VIGNETTE_TEXTURE = "blizzard-vignette";

export function createPeaksWorld(scene: Phaser.Scene): PeaksWorld {
  drawGround(scene);
  drawPath(scene);
  drawIcePatches(scene);

  const obstacles = createObstacles(scene);
  const sign = createSign(scene);

  createSnowfall(scene);
  createBlizzard(scene);

  return { obstacles, sign };
}

/** true se o ponto está sobre uma placa de gelo. */
export function isOnIce(x: number, y: number): boolean {
  return PEAKS_ICE_PATCHES.some((patch) => {
    const dx = (x - patch.x) / patch.rx;
    const dy = (y - patch.y) / patch.ry;
    return dx * dx + dy * dy <= 1;
  });
}

function drawGround(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  graphics.fillStyle(0xc9d3dc, 1);
  graphics.fillRect(0, 0, PEAKS_WIDTH, PEAKS_HEIGHT);

  const colors = [0xd6dee6, 0xcfd8e1, 0xdbe3ea, 0xc5cfd9];

  for (let y = 0; y < PEAKS_HEIGHT; y += TILE_SIZE) {
    for (let x = 0; x < PEAKS_WIDTH; x += TILE_SIZE) {
      const variation = (x * 3 + y * 7) % 4;

      graphics.fillStyle(colors[variation], 0.9);
      graphics.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      // Montinhos de neve com sombra azulada.
      if ((x * 5 + y) % 7 === 0) {
        graphics.fillStyle(0xaab8c6, 0.5);
        graphics.fillEllipse(x + 30, y + 40, 26, 8);
        graphics.fillStyle(0xf2f6fa, 0.9);
        graphics.fillEllipse(x + 28, y + 36, 22, 8);
      }
    }
  }
}

function drawPath(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  const drawTrail = (width: number, color: number, alpha: number): void => {
    graphics.lineStyle(width, color, alpha);
    graphics.beginPath();
    graphics.moveTo(PEAKS_PATH[0].x, PEAKS_PATH[0].y);

    for (const point of PEAKS_PATH.slice(1)) {
      graphics.lineTo(point.x, point.y);
    }

    graphics.strokePath();
  };

  // Neve pisada: mais escura e acinzentada que o resto.
  drawTrail(84, 0xa7b3bf, 1);
  drawTrail(64, 0xb6c1cc, 1);

  // Platô do topo (arena do chefe), com pedra exposta nas bordas.
  const { x, y, rx, ry } = PEAKS_SUMMIT;

  graphics.fillStyle(0x8e98a6, 1);
  graphics.fillEllipse(x, y, rx * 2 + 30, ry * 2 + 24);
  graphics.fillStyle(0xb9c3ce, 1);
  graphics.fillEllipse(x, y, rx * 2, ry * 2);
  graphics.lineStyle(2, 0x9aa6b4, 0.7);
  graphics.strokeEllipse(x, y, rx * 1.4, ry * 1.4);
}

function drawIcePatches(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  for (const patch of PEAKS_ICE_PATCHES) {
    graphics.fillStyle(0x8fc4e8, 0.9);
    graphics.fillEllipse(patch.x, patch.y, patch.rx * 2, patch.ry * 2);
    graphics.fillStyle(0xb5dcf5, 0.9);
    graphics.fillEllipse(patch.x, patch.y, patch.rx * 1.7, patch.ry * 1.6);

    // Riscos de luz no gelo.
    graphics.lineStyle(2, 0xffffff, 0.7);
    graphics.lineBetween(
      patch.x - patch.rx * 0.5,
      patch.y - patch.ry * 0.2,
      patch.x - patch.rx * 0.1,
      patch.y - patch.ry * 0.45,
    );
    graphics.lineBetween(
      patch.x + patch.rx * 0.1,
      patch.y + patch.ry * 0.3,
      patch.x + patch.rx * 0.45,
      patch.y + patch.ry * 0.05,
    );

    // Um brilho que passa pelo gelo de vez em quando.
    const shine = scene.add.ellipse(
      patch.x - patch.rx * 0.3,
      patch.y - patch.ry * 0.2,
      patch.rx * 0.5,
      patch.ry * 0.25,
      0xffffff,
      0,
    );

    scene.tweens.add({
      targets: shine,
      x: patch.x + patch.rx * 0.3,
      alpha: { from: 0, to: 0.5 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      repeatDelay: Phaser.Math.Between(1500, 4000),
      ease: "Sine.InOut",
    });
  }
}

/** Distância de um ponto até a trilha (segmento mais próximo). */
function distanceToPath(x: number, y: number): number {
  let best = Infinity;

  for (let i = 0; i < PEAKS_PATH.length - 1; i++) {
    const a = PEAKS_PATH[i];
    const b = PEAKS_PATH[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    // Posição (0 a 1) do ponto mais próximo ao longo do segmento a→b.
    const t = Phaser.Math.Clamp(
      ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy),
      0,
      1,
    );

    best = Math.min(
      best,
      Phaser.Math.Distance.Between(x, y, a.x + dx * t, a.y + dy * t),
    );
  }

  return best;
}

function isOnSummit(x: number, y: number, margin: number): boolean {
  const dx = (x - PEAKS_SUMMIT.x) / (PEAKS_SUMMIT.rx + margin);
  const dy = (y - PEAKS_SUMMIT.y) / (PEAKS_SUMMIT.ry + margin);
  return dx * dx + dy * dy <= 1;
}

function createObstacles(scene: Phaser.Scene): Phaser.GameObjects.Rectangle[] {
  const obstacles: Phaser.GameObjects.Rectangle[] = [];

  // Sorteio com semente fixa: os Picos são sempre iguais.
  let seed = 4421;

  const random = (max: number): number => {
    seed = (seed * 16807) % 2147483647;
    return ((seed % 10000) / 10000) * max;
  };

  for (let i = 0; i < 90; i++) {
    const x = 40 + random(PEAKS_WIDTH - 80);
    const y = 40 + random(PEAKS_HEIGHT - 80);
    const size = 0.8 + random(0.5);
    const isRock = random(1) < 0.3;

    const blocked =
      distanceToPath(x, y) < 95 || // trilha livre
      isOnIce(x, y) || // nada em cima do gelo
      isOnSummit(x, y, 60); // platô do chefe livre

    if (!blocked) {
      obstacles.push(
        isRock
          ? createRock(scene, x, y, size)
          : createPineTree(scene, x, y, size),
      );
    }
  }

  return obstacles;
}

function createStaticObstacle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Rectangle {
  const obstacle = scene.add.rectangle(x, y, width, height, 0xffffff);
  obstacle.setVisible(false);
  scene.physics.add.existing(obstacle, true);
  return obstacle;
}

function createPineTree(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Rectangle {
  const tree = scene.add.container(x, y);
  const pine = 0x24453a;
  const pineDark = 0x1a3329;
  const snow = 0xf4f8fb;

  tree.add([
    scene.add.ellipse(4, 26, 48, 14, 0x6d7d8c, 0.45), // sombra
    scene.add.rectangle(0, 18, 8, 16, 0x4a3628), // tronco
    scene.add.triangle(0, 0, -24, 16, 24, 16, 0, -14, pineDark), // galhos
    scene.add.triangle(0, -14, -20, 12, 20, 12, 0, -16, pine),
    scene.add.triangle(0, -28, -14, 8, 14, 8, 0, -16, pine),
    scene.add.triangle(0, -32, -8, 2, 8, 2, 0, -10, snow), // neve no topo
    scene.add.ellipse(-8, -6, 14, 4, snow, 0.9), // neve nos galhos
    scene.add.ellipse(9, 8, 14, 4, snow, 0.9),
  ]);

  tree.setScale(size);
  tree.setDepth(y + 10);

  return createStaticObstacle(scene, x, y + 18 * size, 18 * size, 12 * size);
}

function createRock(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Rectangle {
  const rock = scene.add.container(x, y);

  rock.add([
    scene.add.ellipse(2, 12, 46, 12, 0x6d7d8c, 0.45), // sombra
    scene.add.ellipse(0, 2, 40, 26, 0x6b7380),
    scene.add.ellipse(-4, -2, 30, 18, 0x838c99),
    scene.add.ellipse(-2, -9, 26, 9, 0xf4f8fb, 0.95), // neve por cima
  ]);

  rock.setScale(size);
  rock.setDepth(y + 10);

  return createStaticObstacle(scene, x, y + 2 * size, 34 * size, 18 * size);
}

/** Flocos de neve caindo na frente da câmera (seguem a tela, não o mapa). */
function createSnowfall(scene: Phaser.Scene): void {
  if (!scene.textures.exists(SNOWFLAKE_TEXTURE)) {
    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(3, 3, 3);
    graphics.generateTexture(SNOWFLAKE_TEXTURE, 6, 6);
    graphics.destroy();
  }

  scene.add
    .particles(0, 0, SNOWFLAKE_TEXTURE, {
      x: { min: -200, max: 2400 },
      y: -10,
      lifespan: 9000,
      speedY: { min: 50, max: 120 },
      speedX: { min: -80, max: -20 },
      scale: { min: 0.35, max: 1.1 },
      alpha: { min: 0.4, max: 0.9 },
      frequency: 30,
      quantity: 2,
    })
    .setScrollFactor(0)
    .setDepth(2650);
}

/**
 * Nevasca: as bordas da tela ficam esbranquiçadas (limitando a visão) e a
 * intensidade varia, como rajadas de vento.
 */
function createBlizzard(scene: Phaser.Scene): void {
  if (!scene.textures.exists(VIGNETTE_TEXTURE)) {
    const size = 512;
    const texture = scene.textures.createCanvas(VIGNETTE_TEXTURE, size, size);

    if (texture) {
      const context = texture.getContext();
      const gradient = context.createRadialGradient(
        size / 2,
        size / 2,
        size * 0.18,
        size / 2,
        size / 2,
        size / 2,
      );

      gradient.addColorStop(0, "rgba(225, 236, 248, 0)");
      gradient.addColorStop(0.6, "rgba(225, 236, 248, 0.35)");
      gradient.addColorStop(1, "rgba(225, 236, 248, 0.85)");

      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
      texture.refresh();
    }
  }

  const vignette = scene.add
    .image(0, 0, VIGNETTE_TEXTURE)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(2700)
    .setDisplaySize(scene.scale.width, scene.scale.height);

  const resize = (gameSize: Phaser.Structs.Size): void => {
    vignette.setDisplaySize(gameSize.width, gameSize.height);
  };

  scene.scale.on("resize", resize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off("resize", resize);
  });

  // Rajadas: a nevasca fica mais forte e mais fraca.
  scene.tweens.add({
    targets: vignette,
    alpha: { from: 0.75, to: 1 },
    duration: 3200,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });
}

function createSign(scene: Phaser.Scene): Phaser.GameObjects.Text {
  return scene.add
    .text(800, 1185, "", {
      fontFamily: "Georgia, serif",
      fontSize: "17px",
      color: "#1d2a36",
      stroke: "#eef4f8",
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setDepth(2000);
}

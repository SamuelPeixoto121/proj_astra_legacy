// Cenário da Floresta Sussurrante: chão, trilha, árvores e placas.

import Phaser from "phaser";
import { TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from "../config";

/**
 * Desenha o cenário completo e devolve os obstáculos das árvores,
 * que a cena usa para criar as colisões.
 */
export function createForestWorld(
  scene: Phaser.Scene,
): Phaser.GameObjects.Rectangle[] {
  drawGround(scene);
  drawPath(scene);
  const treeColliders = createTrees(scene);
  createLandmarks(scene);

  return treeColliders;
}

function drawGround(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

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

function drawPath(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

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

function createTrees(scene: Phaser.Scene): Phaser.GameObjects.Rectangle[] {
  const colliders: Phaser.GameObjects.Rectangle[] = [];

  // Gerador "aleatório" com semente fixa: a floresta é sempre igual.
  let seed = 7351;

  const random = (max: number): number => {
    seed = (seed * 16807) % 2147483647;
    return ((seed % 10000) / 10000) * max;
  };

  for (let i = 0; i < 105; i++) {
    const x = 35 + random(WORLD_WIDTH - 70);
    const y = 35 + random(WORLD_HEIGHT - 70);

    // Mantém a trilha livre.
    if (Math.abs(x - 790) < 105 && y > 340) {
      continue;
    }

    // Mantém a clareira do chefe livre.
    if (Phaser.Math.Distance.Between(x, y, 850, 380) < 115) {
      continue;
    }

    colliders.push(createTree(scene, x, y, 0.75 + random(0.6)));
  }

  return colliders;
}

function createTree(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Rectangle {
  const tree = scene.add.container(x, y);

  tree.add([
    scene.add.ellipse(4, 28, 53, 18, 0x15291d, 0.55),
    scene.add.rectangle(0, 15, 13, 32, 0x59402c),
    scene.add.circle(0, -4, 27, 0x1a3022),
    scene.add.circle(-3, -9, 22, 0x355a36),
    scene.add.circle(-8, -15, 11, 0x507445, 0.8),
  ]);

  tree.setScale(size);
  tree.setDepth(y + 10);

  // Obstáculo invisível no tronco, usado para colisão.
  const obstacle = scene.add.rectangle(
    x,
    y + 15 * size,
    22 * size,
    16 * size,
    0xffffff,
  );

  obstacle.setVisible(false);
  scene.physics.add.existing(obstacle, true);

  return obstacle;
}

function createLandmarks(scene: Phaser.Scene): void {
  scene.add
    .text(790, 1080, "TRILHA DA ALVORADA", {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#e4d6a8",
      stroke: "#1a251b",
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(2000);

  scene.add.circle(850, 380, 75, 0x789b66, 0.12);
  scene.add.circle(850, 380, 48, 0x9ebd7c, 0.08);

  scene.add
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

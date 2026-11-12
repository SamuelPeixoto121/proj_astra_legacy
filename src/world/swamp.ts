// Cenário do Pântano Sombrio: chão encharcado, trilha de lama, poças que
// deixam o herói lento, árvores mortas e névoa passando por cima de tudo.

import Phaser from "phaser";
import {
  SWAMP_HEIGHT,
  SWAMP_MUD_POOLS,
  SWAMP_PATH,
  SWAMP_WIDTH,
  TILE_SIZE,
} from "../config";
import { createSeededRandom, distanceToLine, isInEllipse } from "./geometry";

export interface SwampWorld {
  /** Obstáculos das árvores mortas, usados pela cena para as colisões. */
  obstacles: Phaser.GameObjects.Rectangle[];
  /** Placa com o nome da área; a cena preenche o texto conforme o idioma. */
  sign: Phaser.GameObjects.Text;
}

export function createSwampWorld(scene: Phaser.Scene): SwampWorld {
  drawGround(scene);
  drawPath(scene);
  drawMudPools(scene);

  const obstacles = createDeadTrees(scene);
  const sign = createSign(scene);

  createFog(scene);

  return { obstacles, sign };
}

/** true se o ponto está dentro de alguma poça de lama. */
export function isInMud(x: number, y: number): boolean {
  return SWAMP_MUD_POOLS.some((pool) => isInEllipse(x, y, pool));
}

function drawGround(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  graphics.fillStyle(0x161f1a, 1);
  graphics.fillRect(0, 0, SWAMP_WIDTH, SWAMP_HEIGHT);

  const colors = [0x1f2b22, 0x1c271f, 0x223026, 0x19231c];

  for (let y = 0; y < SWAMP_HEIGHT; y += TILE_SIZE) {
    for (let x = 0; x < SWAMP_WIDTH; x += TILE_SIZE) {
      const variation = (x * 3 + y * 7) % 4;

      graphics.fillStyle(colors[variation], 0.9);
      graphics.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      // Juncos (capim do brejo) em alguns pontos.
      if ((x * 5 + y) % 7 === 0) {
        graphics.lineStyle(2, 0x4d5a36, 0.7);
        graphics.lineBetween(x + 20, y + 44, x + 16, y + 26);
        graphics.lineBetween(x + 24, y + 44, x + 26, y + 22);
        graphics.lineBetween(x + 28, y + 44, x + 34, y + 30);
      }
    }
  }
}

function drawPath(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  const drawTrail = (width: number, color: number, alpha: number): void => {
    graphics.lineStyle(width, color, alpha);
    graphics.beginPath();
    graphics.moveTo(SWAMP_PATH[0].x, SWAMP_PATH[0].y);

    for (const point of SWAMP_PATH.slice(1)) {
      graphics.lineTo(point.x, point.y);
    }

    graphics.strokePath();
  };

  drawTrail(84, 0x2f2a1d, 1);
  drawTrail(66, 0x3d3525, 0.95);

  // Clareira no fim da trilha (onde mora a feiticeira).
  graphics.fillStyle(0x2a2419, 1);
  graphics.fillEllipse(800, 200, 420, 230);
  graphics.fillStyle(0x342d1f, 1);
  graphics.fillEllipse(800, 200, 360, 190);
}

function drawMudPools(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  for (const pool of SWAMP_MUD_POOLS) {
    graphics.fillStyle(0x241c10, 1);
    graphics.fillEllipse(pool.x, pool.y, pool.rx * 2, pool.ry * 2);
    graphics.fillStyle(0x30261a, 1);
    graphics.fillEllipse(pool.x, pool.y, pool.rx * 1.6, pool.ry * 1.5);
    graphics.fillStyle(0x4a3d28, 0.35);
    graphics.fillEllipse(pool.x - pool.rx * 0.3, pool.y - pool.ry * 0.3, pool.rx * 0.5, pool.ry * 0.3);

    // Bolhas subindo e estourando na lama.
    for (let i = 0; i < 3; i++) {
      const bubbleX = pool.x + Phaser.Math.Between(-pool.rx * 0.6, pool.rx * 0.6);
      const bubbleY = pool.y + Phaser.Math.Between(-pool.ry * 0.5, pool.ry * 0.5);
      const bubble = scene.add.circle(bubbleX, bubbleY, 3, 0x6b5a3a, 0.8);

      scene.tweens.add({
        targets: bubble,
        scale: { from: 0.3, to: 1.4 },
        alpha: { from: 0.8, to: 0 },
        duration: Phaser.Math.Between(900, 1500),
        delay: Phaser.Math.Between(0, 2500),
        repeat: -1,
        repeatDelay: Phaser.Math.Between(800, 2400),
      });
    }
  }
}

function createDeadTrees(scene: Phaser.Scene): Phaser.GameObjects.Rectangle[] {
  const obstacles: Phaser.GameObjects.Rectangle[] = [];

  // Sorteio com semente fixa: o pântano é sempre igual.
  const random = createSeededRandom(9173);

  for (let i = 0; i < 80; i++) {
    const x = 40 + random(SWAMP_WIDTH - 80);
    const y = 40 + random(SWAMP_HEIGHT - 80);
    const size = 0.8 + random(0.5);

    const blocked =
      distanceToLine(x, y, SWAMP_PATH) < 95 || // trilha livre
      isInMud(x, y) || // nada de árvore dentro da lama
      Phaser.Math.Distance.Between(x, y, 800, 200) < 240; // clareira da feiticeira

    if (!blocked) {
      obstacles.push(createDeadTree(scene, x, y, size));
    }
  }

  return obstacles;
}

function createDeadTree(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Rectangle {
  const tree = scene.add.container(x, y);
  const bark = 0x2b241d;

  tree.add([
    scene.add.ellipse(4, 26, 46, 14, 0x0b100d, 0.55),
    scene.add.rectangle(0, 4, 10, 44, bark), // tronco
    scene.add.rectangle(-10, -14, 4, 24, bark).setAngle(-40), // galhos secos
    scene.add.rectangle(10, -10, 4, 22, bark).setAngle(45),
    scene.add.rectangle(-4, -26, 3, 16, bark).setAngle(-15),
    scene.add.rectangle(-16, -24, 3, 12, bark).setAngle(-70),
    scene.add.rectangle(16, -20, 3, 12, bark).setAngle(70),
  ]);

  tree.setScale(size);
  tree.setDepth(y + 10);

  const obstacle = scene.add.rectangle(x, y + 18 * size, 16 * size, 12 * size, 0xffffff);
  obstacle.setVisible(false);
  scene.physics.add.existing(obstacle, true);

  return obstacle;
}

/** Névoa: manchas claras e transparentes passando por cima de tudo. */
function createFog(scene: Phaser.Scene): void {
  for (let i = 0; i < 9; i++) {
    const x = (i * 211) % SWAMP_WIDTH;
    const y = 120 + ((i * 337) % (SWAMP_HEIGHT - 200));
    const fog = scene.add
      .ellipse(x, y, 420, 150, 0xb8c4b0, 0.06)
      .setDepth(2600);

    scene.tweens.add({
      targets: fog,
      x: x + 160,
      alpha: { from: 0.04, to: 0.09 },
      duration: 9000 + i * 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }
}

function createSign(scene: Phaser.Scene): Phaser.GameObjects.Text {
  return scene.add
    .text(800, 985, "", {
      fontFamily: "Georgia, serif",
      fontSize: "17px",
      color: "#c8d6b0",
      stroke: "#0d140f",
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setDepth(2000);
}

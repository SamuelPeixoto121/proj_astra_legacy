// Cenário do Cemitério de Dragões: chão escuro e frio, trilha gasta até a
// arena do guardião (a oeste), esqueletos de dragões gigantes, ossos e
// túmulos espalhados e uma névoa roxa passando por cima de tudo.
// A escuridão e as tochas ficam em darkness.ts e torch.ts.

import type Phaser from "phaser";
import {
  GRAVEYARD_ARENA,
  GRAVEYARD_HEIGHT,
  GRAVEYARD_PATH,
  GRAVEYARD_SHRINE_POSITION,
  GRAVEYARD_TORCHES,
  GRAVEYARD_WIDTH,
  TILE_SIZE,
} from "../config";
import { createSeededRandom, distanceToLine, isInEllipse } from "./geometry";
import { addTriangle } from "../utils/shapes";

export interface GraveyardWorld {
  /** Obstáculos (ossos, crânios e túmulos), usados pela cena nas colisões. */
  obstacles: Phaser.GameObjects.Rectangle[];
  /** Placa com o nome da área; a cena preenche o texto conforme o idioma. */
  sign: Phaser.GameObjects.Text;
}

const BONE = 0xcfc6b4;
const BONE_DARK = 0x8f8676;

/** Esqueletos de dragão gigantes (posição do crânio e para onde olha). */
const DRAGON_SKELETONS = [
  { x: 1400, y: 330, facing: -1 },
  { x: 880, y: 960, facing: 1 },
  { x: 260, y: 1000, facing: 1 },
] as const;

export function createGraveyardWorld(scene: Phaser.Scene): GraveyardWorld {
  drawGround(scene);
  drawPath(scene);

  const obstacles = [
    ...DRAGON_SKELETONS.map((skeleton) =>
      createDragonSkeleton(scene, skeleton.x, skeleton.y, skeleton.facing),
    ),
    ...createScatteredObstacles(scene),
  ];

  const sign = createSign(scene);

  createFog(scene);

  return { obstacles, sign };
}

// ---------------------------------------------------------------------------
// Chão e trilha
// ---------------------------------------------------------------------------

function drawGround(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  graphics.fillStyle(0x15141a, 1);
  graphics.fillRect(0, 0, GRAVEYARD_WIDTH, GRAVEYARD_HEIGHT);

  const colors = [0x1d1b23, 0x1a1820, 0x201e27, 0x18171d];

  for (let y = 0; y < GRAVEYARD_HEIGHT; y += TILE_SIZE) {
    for (let x = 0; x < GRAVEYARD_WIDTH; x += TILE_SIZE) {
      const variation = (x * 3 + y * 7) % 4;

      graphics.fillStyle(colors[variation], 0.95);
      graphics.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      // Capim morto e pedrinhas.
      if ((x * 5 + y) % 7 === 0) {
        graphics.lineStyle(2, 0x4a4552, 0.7);
        graphics.lineBetween(x + 22, y + 46, x + 18, y + 30);
        graphics.lineBetween(x + 26, y + 46, x + 30, y + 32);
      }
    }
  }
}

function drawPath(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  const drawTrail = (width: number, color: number): void => {
    graphics.lineStyle(width, color, 1);
    graphics.beginPath();
    graphics.moveTo(GRAVEYARD_PATH[0].x, GRAVEYARD_PATH[0].y);

    for (const point of GRAVEYARD_PATH.slice(1)) {
      graphics.lineTo(point.x, point.y);
    }

    graphics.strokePath();
  };

  drawTrail(84, 0x26232c);
  drawTrail(64, 0x2f2b36);

  // Arena do guardião: um círculo de pedras antigas com runas apagadas.
  const { x, y, rx, ry } = GRAVEYARD_ARENA;

  graphics.fillStyle(0x24212b, 1);
  graphics.fillEllipse(x, y, rx * 2 + 30, ry * 2 + 24);
  graphics.fillStyle(0x2c2934, 1);
  graphics.fillEllipse(x, y, rx * 2, ry * 2);
  graphics.lineStyle(3, 0x6a4f8a, 0.45);
  graphics.strokeEllipse(x, y, rx * 1.4, ry * 1.4);
}

// ---------------------------------------------------------------------------
// Ossos, crânios e túmulos
// ---------------------------------------------------------------------------

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

/**
 * Esqueleto de dragão gigante: crânio com chifres, coluna e costelas
 * curvas. Só o crânio bloqueia a passagem; dá para andar entre as costelas.
 */
function createDragonSkeleton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  facing: number,
): Phaser.GameObjects.Rectangle {
  const skeleton = scene.add.container(x, y);
  const parts: Phaser.GameObjects.GameObject[] = [];

  // Coluna: vértebras indo para trás do crânio.
  for (let i = 0; i < 9; i++) {
    const vx = -facing * (60 + i * 26);
    const vy = 10 + Math.sin(i * 0.6) * 10;

    parts.push(scene.add.ellipse(vx, vy, 18 - i, 12 - i * 0.6, BONE_DARK));
  }

  // Costelas: arcos dos dois lados da coluna.
  for (let i = 0; i < 5; i++) {
    const rx = -facing * (90 + i * 30);
    const size = 46 - i * 5;

    for (const side of [-1, 1]) {
      parts.push(
        scene.add
          .rectangle(rx, 10 + side * (size / 2), 6, size, BONE)
          .setAngle(side * 18 * facing),
      );
    }
  }

  // Crânio: cabeça, focinho, olhos vazios e chifres.
  parts.push(
    scene.add.ellipse(0, 0, 70, 52, BONE),
    scene.add.ellipse(facing * 46, 8, 60, 30, BONE),
    scene.add.ellipse(facing * 6, -6, 16, 12, 0x0a090c),
    scene.add.ellipse(facing * 62, 4, 8, 5, 0x0a090c),
    addTriangle(scene, [-facing * 18, -18, -facing * 4, -22, -facing * 44, -58], BONE_DARK),
    addTriangle(scene, [-facing * 26, -10, -facing * 12, -16, -facing * 58, -40], BONE_DARK),
    // Dentes.
    addTriangle(scene, [facing * 30, 20, facing * 38, 20, facing * 34, 32], BONE),
    addTriangle(scene, [facing * 48, 20, facing * 56, 20, facing * 52, 31], BONE),
  );

  skeleton.add(parts);
  skeleton.setDepth(y + 20);

  return createStaticObstacle(scene, x + facing * 20, y + 8, 100, 36);
}

function createTombstone(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Rectangle {
  const tomb = scene.add.container(x, y);

  tomb.add([
    scene.add.ellipse(2, 16, 34, 9, 0x000000, 0.5), // sombra
    scene.add.rectangle(0, 0, 22, 30, 0x4a4652),
    scene.add.circle(0, -15, 11, 0x4a4652),
    scene.add.rectangle(0, -4, 12, 3, 0x2e2b34), // cruz gravada
    scene.add.rectangle(0, -6, 3, 14, 0x2e2b34),
  ]);

  tomb.setScale(size);
  tomb.setDepth(y + 10);

  return createStaticObstacle(scene, x, y + 4 * size, 24 * size, 16 * size);
}

/** Ossos soltos (fêmur com as pontas arredondadas). */
function createBone(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Rectangle {
  const bone = scene.add.container(x, y);
  const angle = (x * 7 + y) % 60 - 30;

  bone.add([
    scene.add.rectangle(0, 0, 40, 7, BONE),
    scene.add.circle(-20, -3, 5, BONE),
    scene.add.circle(-20, 3, 5, BONE),
    scene.add.circle(20, -3, 5, BONE),
    scene.add.circle(20, 3, 5, BONE),
  ]);

  bone.setScale(size).setAngle(angle).setDepth(y + 5);

  return createStaticObstacle(scene, x, y, 30 * size, 12 * size);
}

function createScatteredObstacles(
  scene: Phaser.Scene,
): Phaser.GameObjects.Rectangle[] {
  const obstacles: Phaser.GameObjects.Rectangle[] = [];
  const random = createSeededRandom(6271);

  for (let i = 0; i < 110; i++) {
    const x = 40 + random(GRAVEYARD_WIDTH - 80);
    const y = 40 + random(GRAVEYARD_HEIGHT - 80);
    const size = 0.8 + random(0.5);
    const isTomb = random(1) < 0.6;

    const blocked =
      distanceToLine(x, y, GRAVEYARD_PATH) < 95 || // trilha livre
      isInEllipse(x, y, GRAVEYARD_ARENA, 60) || // arena livre
      GRAVEYARD_TORCHES.some(
        (torch) => Math.hypot(x - torch.x, y - torch.y) < 70,
      ) ||
      Math.hypot(
        x - GRAVEYARD_SHRINE_POSITION.x,
        y - GRAVEYARD_SHRINE_POSITION.y,
      ) < 90 ||
      DRAGON_SKELETONS.some(
        (skeleton) => Math.hypot(x - skeleton.x, y - skeleton.y) < 300,
      );

    if (!blocked) {
      obstacles.push(
        isTomb
          ? createTombstone(scene, x, y, size)
          : createBone(scene, x, y, size),
      );
    }
  }

  return obstacles;
}

// ---------------------------------------------------------------------------
// Névoa e placa
// ---------------------------------------------------------------------------

/** Névoa roxa passando devagar por cima de tudo. */
function createFog(scene: Phaser.Scene): void {
  for (let i = 0; i < 10; i++) {
    const x = (i * 211) % GRAVEYARD_WIDTH;
    const y = 120 + ((i * 337) % (GRAVEYARD_HEIGHT - 200));
    const fog = scene.add
      .ellipse(x, y, 440, 160, 0x8a6fb0, 0.07)
      .setDepth(2600);

    scene.tweens.add({
      targets: fog,
      x: x + 180,
      alpha: { from: 0.05, to: 0.11 },
      duration: 9000 + i * 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }
}

function createSign(scene: Phaser.Scene): Phaser.GameObjects.Text {
  return scene.add
    .text(1580, 800, "", {
      fontFamily: "Georgia, serif",
      fontSize: "17px",
      color: "#d6c8f0",
      stroke: "#0a090c",
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setDepth(2000);
}

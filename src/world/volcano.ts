// Cenário das Terras Vulcânicas: chão de rocha escura com rachaduras
// brilhando, trilha de cinzas até a cratera (a leste), rios e poças de lava,
// pedras e árvores queimadas, cinzas caindo, brasas subindo e um calor
// avermelhado nas bordas da tela.

import Phaser from "phaser";
import {
  TILE_SIZE,
  VOLCANO_CRATER,
  VOLCANO_HEIGHT,
  VOLCANO_LAVA_POOLS,
  VOLCANO_LAVA_RIVERS,
  VOLCANO_PATH,
  VOLCANO_WIDTH,
} from "../config";
import { createSeededRandom, distanceToLine, isInEllipse } from "./geometry";
import { createAshfall, createHeatVignette } from "./weather";

export interface VolcanoWorld {
  /** Obstáculos (pedras e árvores queimadas), usados pela cena nas colisões. */
  obstacles: Phaser.GameObjects.Rectangle[];
  /** Placa com o nome da área; a cena preenche o texto conforme o idioma. */
  sign: Phaser.GameObjects.Text;
}

const LAVA_DARK = 0xa3201a;
const LAVA = 0xff5a1f;
const LAVA_BRIGHT = 0xffb347;

export function createVolcanoWorld(scene: Phaser.Scene): VolcanoWorld {
  drawGround(scene);
  drawPath(scene);
  drawLava(scene);

  const obstacles = createObstacles(scene);
  const sign = createSign(scene);

  createAshfall(scene);
  createHeatVignette(scene);

  return { obstacles, sign };
}

/** true se o ponto está sobre lava (rio ou poça). */
export function isOnLava(x: number, y: number): boolean {
  const inRiver = VOLCANO_LAVA_RIVERS.some(
    (river) => distanceToLine(x, y, river.points) <= river.width / 2,
  );

  return inRiver || VOLCANO_LAVA_POOLS.some((pool) => isInEllipse(x, y, pool));
}

// ---------------------------------------------------------------------------
// Chão, trilha e lava
// ---------------------------------------------------------------------------

function drawGround(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  graphics.fillStyle(0x1f1816, 1);
  graphics.fillRect(0, 0, VOLCANO_WIDTH, VOLCANO_HEIGHT);

  const colors = [0x2a211e, 0x261e1b, 0x2f2522, 0x231b19];

  for (let y = 0; y < VOLCANO_HEIGHT; y += TILE_SIZE) {
    for (let x = 0; x < VOLCANO_WIDTH; x += TILE_SIZE) {
      const variation = (x * 3 + y * 7) % 4;

      graphics.fillStyle(colors[variation], 0.95);
      graphics.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      // Rachaduras com brilho de magma por baixo.
      if ((x * 5 + y) % 9 === 0) {
        graphics.lineStyle(2, 0xff6a2a, 0.55);
        graphics.lineBetween(x + 14, y + 20, x + 32, y + 34);
        graphics.lineBetween(x + 32, y + 34, x + 28, y + 50);
      }
    }
  }
}

function strokeLine(
  graphics: Phaser.GameObjects.Graphics,
  points: readonly { x: number; y: number }[],
  width: number,
  color: number,
  alpha: number,
): void {
  graphics.lineStyle(width, color, alpha);
  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);

  for (const point of points.slice(1)) {
    graphics.lineTo(point.x, point.y);
  }

  graphics.strokePath();
}

function drawPath(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  // Trilha de cinzas: mais clara que a rocha.
  strokeLine(graphics, VOLCANO_PATH, 84, 0x3d3330, 1);
  strokeLine(graphics, VOLCANO_PATH, 64, 0x4a3f3b, 1);

  // Cratera (arena do chefe): rocha mais escura com um anel de brasas.
  const { x, y, rx, ry } = VOLCANO_CRATER;

  graphics.fillStyle(0x3a2420, 1);
  graphics.fillEllipse(x, y, rx * 2 + 30, ry * 2 + 24);
  graphics.fillStyle(0x2b1c19, 1);
  graphics.fillEllipse(x, y, rx * 2, ry * 2);
  graphics.lineStyle(3, 0xff6a2a, 0.45);
  graphics.strokeEllipse(x, y, rx * 1.4, ry * 1.4);
}

function drawLava(scene: Phaser.Scene): void {
  const lava = scene.add.graphics();
  // Camada de brilho por cima, que pulsa (a lava parece "respirar").
  const glow = scene.add.graphics();

  for (const river of VOLCANO_LAVA_RIVERS) {
    strokeLine(lava, river.points, river.width + 12, 0x3a1410, 1); // margem
    strokeLine(lava, river.points, river.width, LAVA_DARK, 1);
    strokeLine(lava, river.points, river.width * 0.7, LAVA, 1);
    strokeLine(glow, river.points, river.width * 0.3, LAVA_BRIGHT, 1);
  }

  for (const pool of VOLCANO_LAVA_POOLS) {
    lava.fillStyle(0x3a1410, 1);
    lava.fillEllipse(pool.x, pool.y, pool.rx * 2 + 12, pool.ry * 2 + 12);
    lava.fillStyle(LAVA_DARK, 1);
    lava.fillEllipse(pool.x, pool.y, pool.rx * 2, pool.ry * 2);
    lava.fillStyle(LAVA, 1);
    lava.fillEllipse(pool.x, pool.y, pool.rx * 1.6, pool.ry * 1.5);
    glow.fillStyle(LAVA_BRIGHT, 1);
    glow.fillEllipse(pool.x, pool.y, pool.rx * 0.9, pool.ry * 0.7);
  }

  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.35, to: 0.9 },
    duration: 1600,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  // Bolhas que estouram na lava de vez em quando.
  scene.time.addEvent({
    delay: 450,
    loop: true,
    callback: () => popBubble(scene),
  });
}

function popBubble(scene: Phaser.Scene): void {
  const pool = Phaser.Utils.Array.GetRandom([...VOLCANO_LAVA_POOLS]);
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * 0.7;
  const x = pool.x + Math.cos(angle) * pool.rx * distance;
  const y = pool.y + Math.sin(angle) * pool.ry * distance;

  const bubble = scene.add
    .circle(x, y, 4, LAVA_BRIGHT, 0.9)
    .setDepth(y - 1);

  scene.tweens.add({
    targets: bubble,
    scale: 2.4,
    alpha: 0,
    duration: 500,
    ease: "Quad.Out",
    onComplete: () => bubble.destroy(),
  });
}

// ---------------------------------------------------------------------------
// Obstáculos
// ---------------------------------------------------------------------------

function createObstacles(scene: Phaser.Scene): Phaser.GameObjects.Rectangle[] {
  const obstacles: Phaser.GameObjects.Rectangle[] = [];

  // Sorteio com semente fixa: as Terras Vulcânicas são sempre iguais.
  const random = createSeededRandom(7919);

  for (let i = 0; i < 100; i++) {
    const x = 40 + random(VOLCANO_WIDTH - 80);
    const y = 40 + random(VOLCANO_HEIGHT - 80);
    const size = 0.8 + random(0.5);
    const isRock = random(1) < 0.55;

    const blocked =
      distanceToLine(x, y, VOLCANO_PATH) < 95 || // trilha livre
      VOLCANO_LAVA_RIVERS.some(
        (river) => distanceToLine(x, y, river.points) < river.width / 2 + 30,
      ) ||
      VOLCANO_LAVA_POOLS.some((pool) => isInEllipse(x, y, pool, 30)) ||
      isInEllipse(x, y, VOLCANO_CRATER, 60); // arena do chefe livre

    if (!blocked) {
      obstacles.push(
        isRock
          ? createRock(scene, x, y, size)
          : createBurntTree(scene, x, y, size),
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

/** Árvore morta e queimada, com brasas nas pontas dos galhos. */
function createBurntTree(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Rectangle {
  const tree = scene.add.container(x, y);
  const bark = 0x1a1211;

  tree.add([
    scene.add.ellipse(4, 24, 40, 12, 0x0c0908, 0.55), // sombra
    scene.add.rectangle(0, 6, 8, 36, bark), // tronco
    scene.add.rectangle(-9, -8, 4, 20, bark).setAngle(-35), // galhos
    scene.add.rectangle(9, -4, 4, 18, bark).setAngle(40),
    scene.add.rectangle(-3, -16, 3, 14, bark).setAngle(15),
    scene.add.circle(-14, -16, 2, 0xff7a2a), // brasas
    scene.add.circle(14, -11, 2, 0xff9a3a),
  ]);

  tree.setScale(size);
  tree.setDepth(y + 10);

  return createStaticObstacle(scene, x, y + 18 * size, 14 * size, 12 * size);
}

/** Pedra vulcânica escura, com rachaduras brilhando. */
function createRock(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Rectangle {
  const rock = scene.add.container(x, y);

  rock.add([
    scene.add.ellipse(2, 12, 46, 12, 0x0c0908, 0.55), // sombra
    scene.add.ellipse(0, 2, 40, 26, 0x2e2422),
    scene.add.ellipse(-4, -3, 30, 17, 0x3f3330),
    scene.add.rectangle(-4, 0, 2, 12, 0xff6a2a, 0.8).setAngle(30), // rachadura
    scene.add.rectangle(6, 3, 2, 8, 0xff6a2a, 0.6).setAngle(-25),
  ]);

  rock.setScale(size);
  rock.setDepth(y + 10);

  return createStaticObstacle(scene, x, y + 2 * size, 34 * size, 18 * size);
}

function createSign(scene: Phaser.Scene): Phaser.GameObjects.Text {
  return scene.add
    .text(300, 985, "", {
      fontFamily: "Georgia, serif",
      fontSize: "17px",
      color: "#ffd9b0",
      stroke: "#1a0f0c",
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setDepth(2000);
}

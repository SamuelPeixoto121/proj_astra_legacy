// Cenário do Salão do Tesouro: o interior do castelo, onde Ignis guarda o
// ouro roubado de Astra. Chão de pedra coberto de moedas, montanhas de ouro
// encostadas nas paredes (com joias, cálices, coroas e baús), brilhos
// piscando no ouro, paredes com colunas e estandartes, e um buraco no teto
// por onde entra uma luz avermelhada (e por onde Ignis desce).

import Phaser from "phaser";
import {
  HOARD_ARENA,
  HOARD_GOLD_PILES,
  HOARD_HEIGHT,
  HOARD_WIDTH,
  IGNIS_LANDING,
  TILE_SIZE,
} from "../config";
import { createSeededRandom, isInEllipse } from "./geometry";
import { createAshfall } from "./weather";
import { addTriangle } from "../utils/shapes";

const GOLD_DARK = 0x9a6a14;
const GOLD = 0xd4a22a;
const GOLD_LIGHT = 0xf2cc5a;
const STONE_DARK = 0x221d1b;
const STONE = 0x3a332f;
const BANNER = 0x7a1c1c;
const GEMS = [0xd83a4a, 0x3ab0d8, 0x4ad86a, 0xb06ad8];

/** Espessura das paredes do salão. */
const WALL = 50;
/** Largura da porta (embaixo, no meio). */
const DOOR_WIDTH = 140;

export function createHoardWorld(
  scene: Phaser.Scene,
): Phaser.GameObjects.Rectangle[] {
  drawFloor(scene);
  drawRoofLight(scene);

  const obstacles = [...createWalls(scene), ...createGoldPiles(scene)];

  drawScatteredCoins(scene);

  return obstacles;
}

// ---------------------------------------------------------------------------
// Chão e luz do teto
// ---------------------------------------------------------------------------

function drawFloor(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  graphics.fillStyle(0x1a1614, 1);
  graphics.fillRect(0, 0, HOARD_WIDTH, HOARD_HEIGHT);

  const colors = [0x2a2420, 0x26201d, 0x2e2723, 0x231e1b];

  for (let y = 0; y < HOARD_HEIGHT; y += TILE_SIZE) {
    for (let x = 0; x < HOARD_WIDTH; x += TILE_SIZE) {
      graphics.fillStyle(colors[(x * 3 + y * 7) % 4], 1);
      graphics.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }
  }

  // Tapete real rasgado do portão até o centro.
  graphics.fillStyle(0x4a1414, 0.9);
  graphics.fillRect(HOARD_WIDTH / 2 - 50, IGNIS_LANDING.y + 120, 100, HOARD_HEIGHT);
  graphics.fillStyle(0xb8862a, 0.6);
  graphics.fillRect(HOARD_WIDTH / 2 - 50, IGNIS_LANDING.y + 120, 6, HOARD_HEIGHT);
  graphics.fillRect(HOARD_WIDTH / 2 + 44, IGNIS_LANDING.y + 120, 6, HOARD_HEIGHT);
}

/** Luz avermelhada que entra pelo buraco no teto, com cinzas caindo. */
function drawRoofLight(scene: Phaser.Scene): void {
  const { x, y } = IGNIS_LANDING;
  const light = scene.add.container(x, y).setDepth(1);

  light.add([
    scene.add.ellipse(0, 0, 560, 360, 0xff8a4a, 0.07),
    scene.add.ellipse(0, 0, 400, 260, 0xffb070, 0.08),
    scene.add.ellipse(0, 0, 240, 150, 0xffe0a0, 0.07),
  ]);

  scene.tweens.add({
    targets: light,
    alpha: { from: 0.75, to: 1 },
    duration: 2200,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  // Telhas e pedras caídas do teto, em volta da luz.
  const random = createSeededRandom(911);

  for (let i = 0; i < 14; i++) {
    const angle = random(Math.PI * 2);
    const distance = 170 + random(80);

    scene.add
      .ellipse(
        x + Math.cos(angle) * distance * 1.4,
        y + Math.sin(angle) * distance,
        10 + random(14),
        6 + random(8),
        STONE,
      )
      .setDepth(2);
  }

  createAshfall(scene);
}

// ---------------------------------------------------------------------------
// Paredes
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

/** Paredes de pedra com colunas, tochas e estandartes; porta embaixo. */
function createWalls(scene: Phaser.Scene): Phaser.GameObjects.Rectangle[] {
  const walls = scene.add.container(0, 0).setDepth(HOARD_HEIGHT + 100);
  const doorLeft = HOARD_WIDTH / 2 - DOOR_WIDTH / 2;
  const doorRight = HOARD_WIDTH / 2 + DOOR_WIDTH / 2;

  // Topo e laterais.
  walls.add([
    scene.add.rectangle(HOARD_WIDTH / 2, WALL / 2, HOARD_WIDTH, WALL, STONE_DARK),
    scene.add.rectangle(WALL / 2, HOARD_HEIGHT / 2, WALL, HOARD_HEIGHT, STONE_DARK),
    scene.add.rectangle(HOARD_WIDTH - WALL / 2, HOARD_HEIGHT / 2, WALL, HOARD_HEIGHT, STONE_DARK),
    // Parede de baixo, com a porta no meio.
    scene.add.rectangle(doorLeft / 2, HOARD_HEIGHT - WALL / 2, doorLeft, WALL, STONE_DARK),
    scene.add.rectangle(
      (doorRight + HOARD_WIDTH) / 2,
      HOARD_HEIGHT - WALL / 2,
      HOARD_WIDTH - doorRight,
      WALL,
      STONE_DARK,
    ),
  ]);

  // Colunas ao longo das paredes, com tochas e estandartes alternados.
  for (let x = 150; x < HOARD_WIDTH - 100; x += 220) {
    walls.add([
      scene.add.rectangle(x, WALL - 4, 40, 30, STONE),
      scene.add.rectangle(x + 110, WALL + 18, 26, 40, BANNER),
      addTriangle(scene, [x + 97, WALL + 38, x + 110, WALL + 38, x + 103, WALL + 50], BANNER),
      addTriangle(scene, [x + 110, WALL + 38, x + 123, WALL + 38, x + 117, WALL + 48], BANNER),
    ]);
    addSconce(scene, x, WALL + 8);
  }

  for (let y = 180; y < HOARD_HEIGHT - 120; y += 220) {
    walls.add([
      scene.add.rectangle(WALL - 4, y, 30, 40, STONE),
      scene.add.rectangle(HOARD_WIDTH - WALL + 4, y, 30, 40, STONE),
    ]);
    addSconce(scene, WALL + 10, y);
    addSconce(scene, HOARD_WIDTH - WALL - 10, y);
  }

  return [
    createStaticObstacle(scene, HOARD_WIDTH / 2, WALL / 2, HOARD_WIDTH, WALL),
    createStaticObstacle(scene, WALL / 2, HOARD_HEIGHT / 2, WALL, HOARD_HEIGHT),
    createStaticObstacle(scene, HOARD_WIDTH - WALL / 2, HOARD_HEIGHT / 2, WALL, HOARD_HEIGHT),
    createStaticObstacle(scene, doorLeft / 2, HOARD_HEIGHT - WALL / 2, doorLeft, WALL),
    createStaticObstacle(
      scene,
      (doorRight + HOARD_WIDTH) / 2,
      HOARD_HEIGHT - WALL / 2,
      HOARD_WIDTH - doorRight,
      WALL,
    ),
  ];
}

/** Tocha presa na parede, com chama tremulando e brilho no chão. */
function addSconce(scene: Phaser.Scene, x: number, y: number): void {
  scene.add.ellipse(x, y + 16, 90, 50, 0xffa04a, 0.08).setDepth(3);

  const flame = scene.add.container(x, y).setDepth(HOARD_HEIGHT + 110);

  flame.add([
    addTriangle(scene, [-6, 2, 6, 2, 0, -16], 0xff6a2a),
    addTriangle(scene, [-3, 2, 3, 2, 0, -10], 0xffc15a),
  ]);

  scene.tweens.add({
    targets: flame,
    scaleY: { from: 0.85, to: 1.15 },
    duration: 200 + (x % 7) * 20,
    yoyo: true,
    repeat: -1,
  });
}

// ---------------------------------------------------------------------------
// Ouro
// ---------------------------------------------------------------------------

/** Montanhas de ouro em camadas, com moedas, joias, cálices, coroas e baús. */
function createGoldPiles(scene: Phaser.Scene): Phaser.GameObjects.Rectangle[] {
  const random = createSeededRandom(2718);

  return HOARD_GOLD_PILES.map((pile) => {
    const container = scene.add.container(pile.x, pile.y);
    const { rx, ry } = pile;

    container.add([
      scene.add.ellipse(6, ry * 0.25, rx * 2.1, ry * 1.6, 0x000000, 0.35),
      scene.add.ellipse(0, 0, rx * 2, ry * 1.5, GOLD_DARK),
      scene.add.ellipse(-rx * 0.05, -ry * 0.12, rx * 1.6, ry * 1.15, GOLD),
      scene.add.ellipse(-rx * 0.1, -ry * 0.25, rx * 1.0, ry * 0.7, GOLD_LIGHT),
    ]);

    // Moedas soltas por cima.
    for (let i = 0; i < 18; i++) {
      const angle = random(Math.PI * 2);
      const distance = random(0.85);

      container.add(
        scene.add.ellipse(
          Math.cos(angle) * rx * distance,
          Math.sin(angle) * ry * 0.7 * distance - 4,
          7,
          4,
          random(1) < 0.5 ? GOLD_LIGHT : 0xffe9a0,
        ),
      );
    }

    // Joias, um cálice, uma coroa e um baú.
    for (let i = 0; i < 3; i++) {
      container.add(
        scene.add.polygon(
          (random(1) - 0.5) * rx,
          (random(1) - 0.5) * ry * 0.6,
          [0, -5, 4, 0, 0, 5, -4, 0],
          GEMS[i % GEMS.length],
        ),
      );
    }

    const cx = (random(1) - 0.5) * rx * 0.8;
    const cy = (random(1) - 0.5) * ry * 0.5;

    container.add([
      // Cálice.
      scene.add.rectangle(cx, cy, 4, 10, GOLD_LIGHT),
      scene.add.ellipse(cx, cy - 7, 12, 6, GOLD_LIGHT),
      scene.add.rectangle(cx, cy + 5, 10, 3, GOLD_DARK),
      // Coroa.
      scene.add.rectangle(cx + rx * 0.5, cy + 6, 20, 7, GOLD_LIGHT),
      addTriangle(scene, [cx + rx * 0.5 - 10, cy + 3, cx + rx * 0.5 - 4, cy + 3, cx + rx * 0.5 - 7, cy - 5], GOLD_LIGHT),
      addTriangle(scene, [cx + rx * 0.5 - 3, cy + 3, cx + rx * 0.5 + 3, cy + 3, cx + rx * 0.5, cy - 7], GOLD_LIGHT),
      addTriangle(scene, [cx + rx * 0.5 + 4, cy + 3, cx + rx * 0.5 + 10, cy + 3, cx + rx * 0.5 + 7, cy - 5], GOLD_LIGHT),
      // Baú aberto.
      scene.add.rectangle(-cx, -cy + 10, 30, 18, 0x5a3a1e),
      scene.add.rectangle(-cx, -cy + 3, 30, 4, GOLD_DARK),
      scene.add.ellipse(-cx, -cy + 2, 24, 8, GOLD_LIGHT),
    ]);

    container.setDepth(pile.y + ry * 0.5);

    addSparkles(scene, pile, random);

    return createStaticObstacle(scene, pile.x, pile.y, rx * 1.5, ry * 0.9);
  });
}

/** Brilhos que piscam sobre o ouro, cada um no seu ritmo. */
function addSparkles(
  scene: Phaser.Scene,
  pile: { x: number; y: number; rx: number; ry: number },
  random: (max: number) => number,
): void {
  for (let i = 0; i < 5; i++) {
    const angle = random(Math.PI * 2);
    const distance = random(0.8);
    const sparkle = scene.add
      .polygon(
        pile.x + Math.cos(angle) * pile.rx * distance,
        pile.y + Math.sin(angle) * pile.ry * 0.6 * distance - 6,
        [0, -6, 1.5, -1.5, 6, 0, 1.5, 1.5, 0, 6, -1.5, 1.5, -6, 0, -1.5, -1.5],
        0xffffff,
      )
      .setDepth(pile.y + pile.ry)
      .setAlpha(0);

    scene.tweens.add({
      targets: sparkle,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.4, to: 1.1 },
      duration: 350,
      yoyo: true,
      repeat: -1,
      delay: random(3000),
      repeatDelay: 1500 + random(3000),
    });
  }
}

/** Moedas espalhadas pelo chão (mais perto das paredes, menos no centro). */
function drawScatteredCoins(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics().setDepth(2);
  const random = createSeededRandom(1618);

  for (let i = 0; i < 420; i++) {
    const x = WALL + random(HOARD_WIDTH - WALL * 2);
    const y = WALL + random(HOARD_HEIGHT - WALL * 2);

    // No meio da arena as moedas ficam mais raras.
    if (isInEllipse(x, y, HOARD_ARENA, -80) && random(1) < 0.8) {
      continue;
    }

    graphics.fillStyle(random(1) < 0.5 ? GOLD : GOLD_LIGHT, 0.9);
    graphics.fillEllipse(x, y, 6, 3.5);
  }
}

/** Faixa da porta (embaixo, no meio), para a cena criar a saída. */
export const HOARD_DOOR = {
  x: HOARD_WIDTH / 2 - DOOR_WIDTH / 2,
  y: HOARD_HEIGHT - 30,
  width: DOOR_WIDTH,
  height: 30,
} as const;

/**
 * Moedas pulando do chão e caindo de volta (quando Ignis pousa ou bate no
 * chão). `count` moedas se espalham até `radius` pixels de (x, y).
 */
export function createCoinBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  count: number,
  radius: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.FloatBetween(radius * 0.3, radius);
    const coin = scene.add
      .ellipse(x, y, 7, 4, i % 2 ? GOLD : GOLD_LIGHT)
      .setDepth(y + 200);
    const duration = Phaser.Math.Between(500, 800);

    // Anda para fora...
    scene.tweens.add({
      targets: coin,
      x: x + Math.cos(angle) * distance,
      duration,
      ease: "Quad.Out",
    });

    // ...subindo e caindo (um arco).
    scene.tweens.add({
      targets: coin,
      y: y + Math.sin(angle) * distance * 0.6 - 60,
      duration: duration / 2,
      ease: "Quad.Out",
      yoyo: true,
      onComplete: () => {
        scene.tweens.add({
          targets: coin,
          alpha: 0,
          delay: 400,
          duration: 300,
          onComplete: () => coin.destroy(),
        });
      },
    });
  }
}

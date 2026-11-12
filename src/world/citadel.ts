// Cenário da Cidadela em Ruínas: a antiga capital de Astra, queimada por
// Ignis. Ruas de pedra sobem do portal (embaixo) até o pátio do castelo (em
// cima), onde o símbolo de Astra está apagado no chão. Casas desabadas e
// queimadas, muralhas nas laterais, a fachada do castelo no alto, fogo nos
// escombros (queima ao pisar), cinzas caindo e calor nas bordas da tela.

import Phaser from "phaser";
import {
  CITADEL_COURTYARD,
  CITADEL_FIRES,
  CITADEL_HEIGHT,
  CITADEL_PATH,
  CITADEL_RETURN_PORTAL_POSITION,
  CITADEL_SHRINE_POSITION,
  CITADEL_WIDTH,
  TILE_SIZE,
} from "../config";
import { createSeededRandom, distanceToLine, isInEllipse } from "./geometry";
import { createAshfall, createHeatVignette } from "./weather";
import { addTriangle } from "../utils/shapes";

export interface CitadelWorld {
  /** Obstáculos (casas, escombros, muralhas, castelo), para as colisões. */
  obstacles: Phaser.GameObjects.Rectangle[];
  /** Placa com o nome da área; a cena preenche o texto conforme o idioma. */
  sign: Phaser.GameObjects.Text;
}

const STONE_DARK = 0x2e2a28;
const STONE = 0x48413c;
const STONE_LIGHT = 0x5e554e;
const CHAR = 0x161210;
const BANNER = 0x7a1c1c;

/** Altura da faixa do castelo no topo do mapa (não dá para andar ali). */
const CASTLE_HEIGHT = 110;
/** Largura das muralhas nas laterais. */
const WALL_WIDTH = 40;

export function createCitadelWorld(scene: Phaser.Scene): CitadelWorld {
  drawGround(scene);
  drawStreets(scene);
  drawCourtyard(scene);
  drawFires(scene);

  const obstacles = [
    ...createCastle(scene),
    ...createCityWalls(scene),
    ...createRuins(scene),
  ];

  const sign = createSign(scene);

  createAshfall(scene);
  createHeatVignette(scene);

  return { obstacles, sign };
}

/** true se o ponto está sobre o fogo dos escombros. */
export function isOnCitadelFire(x: number, y: number): boolean {
  return CITADEL_FIRES.some((fire) => isInEllipse(x, y, fire));
}

// ---------------------------------------------------------------------------
// Chão, ruas e pátio
// ---------------------------------------------------------------------------

function drawGround(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  graphics.fillStyle(0x25201d, 1);
  graphics.fillRect(0, 0, CITADEL_WIDTH, CITADEL_HEIGHT);

  const colors = [0x302a26, 0x2c2622, 0x342d29, 0x29231f];

  for (let y = 0; y < CITADEL_HEIGHT; y += TILE_SIZE) {
    for (let x = 0; x < CITADEL_WIDTH; x += TILE_SIZE) {
      const variation = (x * 3 + y * 7) % 4;

      graphics.fillStyle(colors[variation], 0.95);
      graphics.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      // Marcas de queimado no chão.
      if ((x * 5 + y) % 9 === 0) {
        graphics.fillStyle(CHAR, 0.6);
        graphics.fillEllipse(x + 32, y + 36, 34, 14);
      }
    }
  }
}

function drawStreets(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  const drawStreet = (width: number, color: number): void => {
    graphics.lineStyle(width, color, 1);
    graphics.beginPath();
    graphics.moveTo(CITADEL_PATH[0].x, CITADEL_PATH[0].y);

    for (const point of CITADEL_PATH.slice(1)) {
      graphics.lineTo(point.x, point.y);
    }

    graphics.strokePath();
  };

  // Rua calçada: borda escura e pedras mais claras no meio.
  drawStreet(104, 0x3a332e);
  drawStreet(86, 0x544b44);
  drawStreet(4, 0x6e645b);
}

function drawCourtyard(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();
  const { x, y, rx, ry } = CITADEL_COURTYARD;

  graphics.fillStyle(0x3a332e, 1);
  graphics.fillEllipse(x, y, rx * 2 + 30, ry * 2 + 24);
  graphics.fillStyle(0x4e4640, 1);
  graphics.fillEllipse(x, y, rx * 2, ry * 2);

  // O símbolo de Astra (estrela de oito pontas), apagado e rachado: foi aqui
  // que Ignis destruiu o Fragmento Central.
  graphics.lineStyle(3, 0xb89a5a, 0.35);
  graphics.strokeEllipse(x, y, rx * 1.1, ry * 1.1);

  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;

    graphics.lineBetween(
      x,
      y,
      x + Math.cos(angle) * rx * 0.55,
      y + Math.sin(angle) * ry * 0.55,
    );
  }

  // Rachaduras por cima do símbolo.
  graphics.lineStyle(2, CHAR, 0.8);
  graphics.lineBetween(x - 120, y - 40, x - 20, y + 10);
  graphics.lineBetween(x - 20, y + 10, x + 60, y - 30);
  graphics.lineBetween(x + 30, y + 60, x + 140, y + 20);
}

/** Fogo nos escombros: base queimada, chamas tremulando e brilho. */
function drawFires(scene: Phaser.Scene): void {
  for (const fire of CITADEL_FIRES) {
    // Base: escombros queimados e brasas, com bordas suaves.
    scene.add
      .ellipse(fire.x, fire.y, fire.rx * 2.3, fire.ry * 2.3, CHAR, 0.45)
      .setDepth(fire.y - 21);
    scene.add
      .ellipse(fire.x, fire.y, fire.rx * 2, fire.ry * 2, 0x3a1a12, 0.85)
      .setDepth(fire.y - 20);
    scene.add
      .ellipse(fire.x, fire.y, fire.rx * 1.6, fire.ry * 1.4, 0xff5a1f, 0.35)
      .setDepth(fire.y - 19);
    scene.add
      .ellipse(fire.x, fire.y, fire.rx * 0.9, fire.ry * 0.7, 0xffb347, 0.35)
      .setDepth(fire.y - 18);

    // Algumas chamas espalhadas pela área do fogo.
    const flames = scene.add.container(fire.x, fire.y).setDepth(fire.y + 5);

    for (let i = 0; i < 5; i++) {
      const fx = (i - 2) * fire.rx * 0.35;
      const fy = ((i * 7) % 3 - 1) * fire.ry * 0.3;
      const height = 18 + ((i * 5) % 3) * 6;

      flames.add([
        addTriangle(scene, [fx - 8, fy + 4, fx + 8, fy + 4, fx, fy - height], 0xff6a2a),
        addTriangle(scene, [fx - 4, fy + 4, fx + 4, fy + 4, fx, fy - height * 0.6], 0xffc15a),
      ]);
    }

    scene.tweens.add({
      targets: flames,
      scaleY: { from: 0.85, to: 1.15 },
      duration: 240 + (fire.x % 5) * 30,
      yoyo: true,
      repeat: -1,
    });
  }
}

// ---------------------------------------------------------------------------
// Castelo, muralhas e ruínas
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

/** Fachada do castelo no topo: muralha com ameias, torres, portão e bandeiras. */
function createCastle(scene: Phaser.Scene): Phaser.GameObjects.Rectangle[] {
  const castle = scene.add.container(0, 0).setDepth(CASTLE_HEIGHT);
  const centerX = CITADEL_WIDTH / 2;

  castle.add(
    scene.add.rectangle(centerX, CASTLE_HEIGHT / 2, CITADEL_WIDTH, CASTLE_HEIGHT, STONE_DARK),
  );
  castle.add(
    scene.add.rectangle(centerX, CASTLE_HEIGHT - 8, CITADEL_WIDTH, 16, STONE),
  );

  // Ameias (algumas quebradas).
  for (let x = 20; x < CITADEL_WIDTH; x += 48) {
    if ((x / 48) % 5 !== 3) {
      castle.add(scene.add.rectangle(x, 8, 26, 16, STONE));
    }
  }

  // Torres dos lados do portão.
  for (const towerX of [centerX - 260, centerX + 260]) {
    castle.add([
      scene.add.rectangle(towerX, CASTLE_HEIGHT / 2 - 10, 90, CASTLE_HEIGHT + 20, STONE),
      scene.add.rectangle(towerX, CASTLE_HEIGHT / 2 - 10, 70, CASTLE_HEIGHT, STONE_LIGHT),
      scene.add.rectangle(towerX, 40, 14, 24, CHAR), // janela queimada
      // Bandeira rasgada.
      scene.add.rectangle(towerX, 74, 26, 34, BANNER),
      addTriangle(scene, [towerX - 13, 91, towerX - 1, 91, towerX - 7, 102], BANNER),
      addTriangle(scene, [towerX + 1, 91, towerX + 13, 91, towerX + 7, 98], BANNER),
    ]);
  }

  // Portão principal (arco escuro, fechado).
  castle.add([
    scene.add.rectangle(centerX, CASTLE_HEIGHT - 30, 120, 70, STONE),
    scene.add.rectangle(centerX, CASTLE_HEIGHT - 26, 90, 62, 0x0e0b0a),
    scene.add.circle(centerX, CASTLE_HEIGHT - 57, 45, 0x0e0b0a),
  ]);

  return [
    createStaticObstacle(scene, centerX, CASTLE_HEIGHT / 2, CITADEL_WIDTH, CASTLE_HEIGHT),
  ];
}

/** Muralhas da cidade nas laterais do mapa. */
function createCityWalls(scene: Phaser.Scene): Phaser.GameObjects.Rectangle[] {
  const obstacles: Phaser.GameObjects.Rectangle[] = [];

  for (const wallX of [WALL_WIDTH / 2, CITADEL_WIDTH - WALL_WIDTH / 2]) {
    const wall = scene.add.container(0, 0).setDepth(CITADEL_HEIGHT);

    wall.add(
      scene.add.rectangle(wallX, CITADEL_HEIGHT / 2, WALL_WIDTH, CITADEL_HEIGHT, STONE_DARK),
    );

    for (let y = CASTLE_HEIGHT + 20; y < CITADEL_HEIGHT; y += 60) {
      wall.add(scene.add.rectangle(wallX, y, WALL_WIDTH - 10, 26, STONE));
    }

    obstacles.push(
      createStaticObstacle(scene, wallX, CITADEL_HEIGHT / 2, WALL_WIDTH, CITADEL_HEIGHT),
    );
  }

  return obstacles;
}

/** Casa desabada: paredes de pedra, telhado caído e marcas de fogo. */
function createRuinedHouse(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Rectangle {
  const house = scene.add.container(x, y);
  const halfW = width / 2;
  const halfH = height / 2;

  house.add([
    scene.add.ellipse(6, halfH + 4, width + 10, 16, 0x000000, 0.45), // sombra
    scene.add.rectangle(0, 0, width, height, STONE), // paredes
    scene.add.rectangle(0, 2, width - 12, height - 14, 0x1d1917), // interior
    // Telhado desabado: duas metades tortas.
    addTriangle(scene, [-halfW, -halfH + 6, 0, -halfH + 6, -halfW * 0.4, -halfH - 22], 0x3a2420),
    addTriangle(scene, [halfW * 0.1, -halfH + 10, halfW, -halfH + 4, halfW * 0.7, -halfH - 12], 0x3a2420),
    // Pedaços de parede quebrada e escombros.
    scene.add.rectangle(-halfW + 8, halfH - 10, 14, 20, STONE_LIGHT),
    scene.add.ellipse(halfW * 0.4, halfH - 6, 26, 12, STONE_LIGHT),
    scene.add.ellipse(-halfW * 0.2, 0, 22, 14, CHAR, 0.8), // queimado
  ]);

  house.setDepth(y + halfH);

  return createStaticObstacle(scene, x, y + 4, width, height - 8);
}

/** Pilha de escombros ou coluna quebrada. */
function createRubble(
  scene: Phaser.Scene,
  x: number,
  y: number,
  isPillar: boolean,
): Phaser.GameObjects.Rectangle {
  const rubble = scene.add.container(x, y);

  if (isPillar) {
    rubble.add([
      scene.add.ellipse(3, 16, 30, 9, 0x000000, 0.45),
      scene.add.rectangle(0, 0, 18, 34, STONE_LIGHT),
      scene.add.rectangle(0, -17, 24, 6, STONE),
      addTriangle(scene, [-9, -20, 9, -20, 4, -30], STONE_LIGHT), // topo quebrado
    ]);
  } else {
    rubble.add([
      scene.add.ellipse(3, 10, 46, 12, 0x000000, 0.45),
      scene.add.ellipse(-8, 2, 26, 16, STONE),
      scene.add.ellipse(8, 4, 22, 13, STONE_LIGHT),
      scene.add.ellipse(0, -4, 16, 10, STONE),
    ]);
  }

  rubble.setDepth(y + 12);

  return isPillar
    ? createStaticObstacle(scene, x, y + 8, 18, 14)
    : createStaticObstacle(scene, x, y + 2, 38, 16);
}

function createRuins(scene: Phaser.Scene): Phaser.GameObjects.Rectangle[] {
  const obstacles: Phaser.GameObjects.Rectangle[] = [];
  const random = createSeededRandom(5381);

  for (let i = 0; i < 260; i++) {
    const x = WALL_WIDTH + 50 + random(CITADEL_WIDTH - WALL_WIDTH * 2 - 100);
    const y = CASTLE_HEIGHT + 60 + random(CITADEL_HEIGHT - CASTLE_HEIGHT - 100);
    const kind = random(1);
    const width = 80 + random(40);
    const height = 56 + random(26);
    const isHouse = kind < 0.45;
    const margin = isHouse ? 58 + width / 2 : 62;

    const blocked =
      distanceToLine(x, y, CITADEL_PATH) < margin || // ruas livres
      isInEllipse(x, y, CITADEL_COURTYARD, isHouse ? 90 : 50) || // pátio livre
      CITADEL_FIRES.some((fire) => isInEllipse(x, y, fire, isHouse ? 60 : 25)) ||
      Math.hypot(x - CITADEL_SHRINE_POSITION.x, y - CITADEL_SHRINE_POSITION.y) < 90 ||
      Math.hypot(
        x - CITADEL_RETURN_PORTAL_POSITION.x,
        y - CITADEL_RETURN_PORTAL_POSITION.y,
      ) < 110 ||
      // Casas não se encostam umas nas outras.
      (isHouse &&
        obstacles.some(
          (other) =>
            Math.abs(other.x - x) < (other.width + width) / 2 + 20 &&
            Math.abs(other.y - y) < (other.height + height) / 2 + 20,
        ));

    if (blocked) {
      continue;
    }

    obstacles.push(
      isHouse
        ? createRuinedHouse(scene, x, y, width, height)
        : createRubble(scene, x, y, kind > 0.8),
    );
  }

  return obstacles;
}

function createSign(scene: Phaser.Scene): Phaser.GameObjects.Text {
  return scene.add
    .text(800, 1400, "", {
      fontFamily: "Georgia, serif",
      fontSize: "17px",
      color: "#ffd9b0",
      stroke: "#140c0a",
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setDepth(2000);
}

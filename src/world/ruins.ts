// Cenário das Ruínas do Santuário: chão de pedra, trilha e colunas.

import type Phaser from "phaser";
import { RUINS_HEIGHT, RUINS_WIDTH, TILE_SIZE } from "../config";

export interface RuinsWorld {
  /** Obstáculos das colunas, usados pela cena para as colisões. */
  obstacles: Phaser.GameObjects.Rectangle[];
  /** Placa com o nome da área; a cena preenche o texto conforme o idioma. */
  sign: Phaser.GameObjects.Text;
}

const PATH_X = RUINS_WIDTH / 2;

export function createRuinsWorld(scene: Phaser.Scene): RuinsWorld {
  drawFloor(scene);
  drawPath(scene);

  const obstacles = [...createColumns(scene), createAltar(scene)];
  const sign = createSign(scene);

  return { obstacles, sign };
}

/** Altar no topo da trilha, onde fica o Fragmento Astral. */
function createAltar(scene: Phaser.Scene): Phaser.GameObjects.Rectangle {
  const y = 160;
  const altar = scene.add.container(PATH_X, y);

  altar.add([
    scene.add.ellipse(0, 18, 170, 30, 0x0d0c12, 0.5),
    scene.add.rectangle(0, 8, 150, 26, 0x4a4752), // degrau
    scene.add.rectangle(0, -6, 108, 24, 0x5a5763), // topo
    scene.add.rectangle(0, -6, 80, 3, 0xa58fd0, 0.6), // runas
    scene.add.rectangle(-30, -6, 3, 14, 0xa58fd0, 0.6),
    scene.add.rectangle(30, -6, 3, 14, 0xa58fd0, 0.6),
  ]);

  altar.setDepth(y + 10);

  const obstacle = scene.add.rectangle(PATH_X, y, 120, 30, 0xffffff);
  obstacle.setVisible(false);
  scene.physics.add.existing(obstacle, true);

  return obstacle;
}

function drawFloor(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  graphics.fillStyle(0x1f1e26, 1);
  graphics.fillRect(0, 0, RUINS_WIDTH, RUINS_HEIGHT);

  const colors = [0x34333d, 0x302f39, 0x383742, 0x2d2c35];

  for (let y = 0; y < RUINS_HEIGHT; y += TILE_SIZE) {
    for (let x = 0; x < RUINS_WIDTH; x += TILE_SIZE) {
      const variation = (x * 5 + y * 11) % 4;

      graphics.fillStyle(colors[variation], 0.95);
      graphics.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      // Rachaduras e musgo em algumas pedras.
      if ((x * 3 + y * 7) % 9 === 0) {
        graphics.lineStyle(2, 0x191820, 0.8);
        graphics.lineBetween(x + 14, y + 18, x + 34, y + 30);
        graphics.lineBetween(x + 34, y + 30, x + 40, y + 48);
      }

      if ((x + y * 3) % 11 === 0) {
        graphics.fillStyle(0x4f6a45, 0.3);
        graphics.fillEllipse(x + 40, y + 20, 26, 12);
      }
    }
  }
}

function drawPath(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  graphics.fillStyle(0x4a4752, 1);
  graphics.fillRect(PATH_X - 60, 120, 120, RUINS_HEIGHT - 120);

  // Juntas entre as lajes da trilha.
  graphics.lineStyle(2, 0x2c2a33, 0.9);

  for (let y = 120; y < RUINS_HEIGHT; y += 40) {
    graphics.lineBetween(PATH_X - 60, y, PATH_X + 60, y);
    const offset = (y / 40) % 2 === 0 ? -20 : 20;
    graphics.lineBetween(PATH_X + offset, y, PATH_X + offset, y + 40);
  }
}

function createColumns(scene: Phaser.Scene): Phaser.GameObjects.Rectangle[] {
  const obstacles: Phaser.GameObjects.Rectangle[] = [];

  // Colunas dos dois lados da trilha; algumas estão quebradas.
  const rows = [
    { y: 820, broken: [false, true] },
    { y: 640, broken: [true, false] },
    { y: 460, broken: [false, false] },
    { y: 300, broken: [false, true] },
  ];

  for (const row of rows) {
    obstacles.push(createColumn(scene, PATH_X - 120, row.y, row.broken[0]));
    obstacles.push(createColumn(scene, PATH_X + 120, row.y, row.broken[1]));
  }

  // Escombros soltos pelo chão (só decoração).
  const rubble = [
    [260, 760], [330, 300], [1080, 560], [1150, 840], [1000, 220], [420, 520],
  ];

  for (const [x, y] of rubble) {
    scene.add.circle(x, y, 9, 0x55525e).setDepth(y);
    scene.add.circle(x + 12, y + 4, 6, 0x4a4752).setDepth(y);
  }

  return obstacles;
}

function createColumn(
  scene: Phaser.Scene,
  x: number,
  y: number,
  broken: boolean,
): Phaser.GameObjects.Rectangle {
  const height = broken ? 26 : 62;
  const column = scene.add.container(x, y);

  column.add([
    scene.add.ellipse(4, 6, 46, 16, 0x0d0c12, 0.55),
    scene.add.rectangle(0, 0, 36, 14, 0x5a5763),
    scene.add.rectangle(0, -height / 2 - 4, 24, height, 0x6e6b78),
    scene.add.rectangle(-6, -height / 2 - 4, 4, height, 0x7d7a88),
  ]);

  if (!broken) {
    column.add(scene.add.rectangle(0, -height - 6, 32, 9, 0x5a5763));
  }

  column.setDepth(y + 10);

  const obstacle = scene.add.rectangle(x, y, 30, 14, 0xffffff);
  obstacle.setVisible(false);
  scene.physics.add.existing(obstacle, true);

  return obstacle;
}

function createSign(scene: Phaser.Scene): Phaser.GameObjects.Text {
  return scene.add
    .text(PATH_X, RUINS_HEIGHT - 60, "", {
      fontFamily: "Georgia, serif",
      fontSize: "17px",
      color: "#d6d0e4",
      stroke: "#15131b",
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setDepth(2000);
}

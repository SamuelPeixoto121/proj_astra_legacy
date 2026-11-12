// Selo Astral: duas pedras antigas com runas e uma parede de luz entre elas,
// bloqueando a trilha a oeste da vila. O Ancião rompe o selo com a luz dos
// quatro fragmentos (Capítulo 5): a parede se desfaz e as runas acendem.

import Phaser from "phaser";

export interface AstralSeal {
  container: Phaser.GameObjects.Container;
  /** Parede de luz (some ao abrir). */
  wall: Phaser.GameObjects.Container;
  runes: Phaser.GameObjects.Rectangle[];
  /** Obstáculo invisível que impede a passagem. */
  collider: Phaser.GameObjects.Rectangle;
  open: boolean;
}

const STONE = 0x6b6878;
const STONE_DARK = 0x4f4d5a;
const RUNE_OFF = 0x7f9cc9;
const RUNE_ON = 0xffe08a;
const LIGHT = 0xbfd8ff;

/** Cria o selo na vertical, centrado em (x, y), com a altura dada. */
export function createAstralSeal(
  scene: Phaser.Scene,
  x: number,
  y: number,
  height: number,
): AstralSeal {
  const container = scene.add.container(x, y);
  const runes: Phaser.GameObjects.Rectangle[] = [];

  // Pedras nas pontas, com três runas cada.
  for (const side of [-1, 1]) {
    const stoneY = (side * height) / 2;

    container.add([
      scene.add.ellipse(4, stoneY + 22, 44, 14, 0x15291d, 0.55), // sombra
      scene.add.rectangle(0, stoneY, 30, 46, STONE_DARK),
      scene.add.rectangle(-2, stoneY - 3, 24, 38, STONE),
    ]);

    for (let i = 0; i < 3; i++) {
      const rune = scene.add.rectangle(-2, stoneY - 12 + i * 11, 10, 3, RUNE_OFF);

      runes.push(rune);
      container.add(rune);
    }
  }

  // Parede de luz entre as pedras, com faixas que sobem e descem.
  const wall = scene.add.container(0, 0);
  const wallHeight = height - 40;

  wall.add([
    scene.add.rectangle(0, 0, 26, wallHeight, LIGHT, 0.12),
    scene.add.rectangle(0, 0, 10, wallHeight, LIGHT, 0.35),
    scene.add.rectangle(0, 0, 3, wallHeight, 0xffffff, 0.6),
  ]);

  container.add(wall);
  container.setDepth(y + height / 2 + 10);

  scene.tweens.add({
    targets: wall,
    alpha: { from: 0.6, to: 1 },
    scaleX: { from: 0.85, to: 1.15 },
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  scene.tweens.add({
    targets: runes,
    alpha: { from: 0.5, to: 1 },
    duration: 1300,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  const collider = scene.add.rectangle(x, y, 30, height, 0xffffff);
  collider.setVisible(false);
  scene.physics.add.existing(collider, true);

  return { container, wall, runes, collider, open: false };
}

/** Rompe o selo. Com animate = true, a luz se espalha e some aos poucos. */
export function openAstralSeal(
  scene: Phaser.Scene,
  seal: AstralSeal,
  animate: boolean,
): void {
  if (seal.open) {
    return;
  }

  seal.open = true;
  (seal.collider.body as Phaser.Physics.Arcade.StaticBody).enable = false;

  // As runas ficam douradas: o selo foi rompido.
  scene.tweens.killTweensOf(seal.runes);

  for (const rune of seal.runes) {
    rune.setFillStyle(RUNE_ON).setAlpha(1);
  }

  scene.tweens.killTweensOf(seal.wall);

  if (!animate) {
    seal.wall.destroy();
    return;
  }

  scene.tweens.add({
    targets: seal.wall,
    scaleX: 6,
    alpha: 0,
    duration: 900,
    ease: "Cubic.Out",
    onComplete: () => seal.wall.destroy(),
  });
}

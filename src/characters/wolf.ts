// Aparência do Lobo Corrompido.

import type Phaser from "phaser";
import type { CharacterSprite } from "./types";

export function createWolf(
  scene: Phaser.Scene,
  x: number,
  y: number,
): CharacterSprite {
  const body = scene.add.rectangle(x, y, 30, 24, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body);

  (body.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

  const container = scene.add.container(x, y);

  container.add([
    scene.add.ellipse(0, 11, 43, 18, 0x10150f, 0.65),
    scene.add.ellipse(-2, 0, 35, 26, 0x483e43),
    scene.add.ellipse(0, -2, 30, 23, 0x6c565b),
    scene.add.circle(15, -7, 12, 0x80636a),
    scene.add.triangle(8, -17, -5, 6, 5, 6, 0, -10, 0x59434a),
    scene.add.triangle(20, -17, -5, 6, 5, 6, 0, -10, 0x59434a),
    scene.add.circle(19, -8, 2.5, 0xff453f),
    scene.add.circle(11, -8, 2.5, 0xff453f),
    scene.add.ellipse(21, 0, 12, 8, 0xb9a0a0),
  ]);

  container.setDepth(800);

  return { container, body };
}

// Aparência da Aranha Corrompida (vista de cima).

import type Phaser from "phaser";
import type { CharacterSprite } from "./types";

const LEG_COLOR = 0x2a1f30;

export function createSpider(
  scene: Phaser.Scene,
  x: number,
  y: number,
): CharacterSprite {
  const body = scene.add.rectangle(x, y, 24, 18, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body);

  (body.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

  const container = scene.add.container(x, y);

  container.add(scene.add.ellipse(0, 9, 36, 12, 0x10150f, 0.6));

  // Quatro pernas de cada lado, abertas em leque.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      container.add(
        scene.add
          .rectangle(side * 10, -6 + i * 4, 15, 2.5, LEG_COLOR)
          .setAngle(side * (-35 + i * 22)),
      );
    }
  }

  container.add([
    scene.add.ellipse(0, 5, 20, 18, 0x3b2a48), // abdômen
    scene.add.ellipse(0, 6, 6, 8, 0x9a5cc4, 0.9), // marca de corrupção
    scene.add.ellipse(0, -5, 14, 12, 0x4a3558), // cabeça
    scene.add.circle(-3, -8, 1.8, 0x9dff6a), // olhos brilhantes
    scene.add.circle(3, -8, 1.8, 0x9dff6a),
    scene.add.circle(-1.5, -10.5, 1.1, 0x9dff6a),
    scene.add.circle(1.5, -10.5, 1.1, 0x9dff6a),
  ]);

  container.setDepth(800);

  return { container, body };
}

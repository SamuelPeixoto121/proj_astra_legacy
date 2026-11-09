// Aparência de Kael, o chefe do prólogo.
// Ele começa escondido e com a física desligada até ser desbloqueado.

import type Phaser from "phaser";
import type { CharacterSprite } from "./types";

export function createKael(
  scene: Phaser.Scene,
  x: number,
  y: number,
): CharacterSprite {
  const body = scene.add.rectangle(x, y, 38, 32, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body);

  const physicsBody = body.body as Phaser.Physics.Arcade.Body;

  physicsBody.setCollideWorldBounds(true);
  physicsBody.enable = false;

  const container = scene.add.container(x, y);

  container.add([
    scene.add.ellipse(0, 19, 64, 25, 0x080a10, 0.75),
    scene.add.ellipse(0, 2, 50, 58, 0x291c32),
    scene.add.ellipse(0, -3, 40, 50, 0x49304e),
    scene.add.triangle(-16, -31, -12, 17, 0, -21, 5, 13, 0x17121f),
    scene.add.triangle(16, -31, -5, 13, 0, -21, 12, 17, 0x17121f),
    scene.add.circle(0, -17, 18, 0x17121f),
    scene.add.circle(-7, -18, 3.5, 0xff354d),
    scene.add.circle(7, -18, 3.5, 0xff354d),
    scene.add.triangle(0, 0, -9, -5, 9, -5, 0, 12, 0x17121f),
    scene.add.rectangle(-24, 7, 10, 35, 0x291c32).setAngle(-25),
    scene.add.rectangle(24, 7, 10, 35, 0x291c32).setAngle(25),
    scene.add.circle(0, 3, 8, 0x8d264e),
    scene.add.circle(0, 3, 4, 0xff5267),
  ]);

  container.setDepth(900);
  container.setVisible(false);

  return { container, body };
}

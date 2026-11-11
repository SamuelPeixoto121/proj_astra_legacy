// Aparência do Espírito do Pântano: uma chama fantasma esverdeada que
// flutua (sobe e desce devagar) e solta uma cauda de fumaça.

import type Phaser from "phaser";
import type { CharacterSprite } from "./types";

const GLOW = 0x7fffd4;
const BODY = 0x9ef0d0;

export function createWisp(
  scene: Phaser.Scene,
  x: number,
  y: number,
): CharacterSprite {
  const body = scene.add.rectangle(x, y, 22, 20, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body);

  (body.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

  const container = scene.add.container(x, y);

  // Sombra no chão (fica parada enquanto o corpo flutua).
  container.add(scene.add.ellipse(0, 18, 26, 8, 0x0b100d, 0.45));

  // Corpo num container interno, para flutuar sem mexer na posição física.
  const floating = scene.add.container(0, -6);

  floating.add([
    scene.add.circle(0, 0, 17, GLOW, 0.22), // brilho
    scene.add.triangle(0, 12, -7, 0, 7, 0, 0, 14, BODY, 0.6), // cauda
    scene.add.triangle(-6, 10, -4, 0, 4, 0, -2, 10, BODY, 0.4),
    scene.add.ellipse(0, 0, 18, 22, BODY, 0.85),
    scene.add.circle(0, 2, 5, 0xffffff, 0.8), // núcleo
    scene.add.ellipse(-4, -4, 3, 5, 0x10302a), // olhos
    scene.add.ellipse(4, -4, 3, 5, 0x10302a),
  ]);

  container.add(floating);
  container.setDepth(800);

  scene.tweens.add({
    targets: floating,
    y: -12,
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  return { container, body };
}

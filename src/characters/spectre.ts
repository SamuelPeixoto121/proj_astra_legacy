// Aparência do Espectro: um fantasma encapuzado de manto pálido, com a
// barra do manto em pontas (sem pernas), rosto escuro e olhos acesos.
// Flutua subindo e descendo. A cena deixa ele translúcido no escuro.

import type Phaser from "phaser";
import type { CharacterSprite } from "./types";
import { addTriangle } from "../utils/shapes";

const ROBE = 0xc9c2e6;
const ROBE_SHADE = 0x9a90c4;
const FACE = 0x1a1626;
const EYES = 0x9ffcff;

export function createSpectre(
  scene: Phaser.Scene,
  x: number,
  y: number,
): CharacterSprite {
  const body = scene.add.rectangle(x, y, 24, 20, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body);

  (body.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

  const container = scene.add.container(x, y);
  const floating = scene.add.container(0, -6);

  floating.add([
    scene.add.circle(0, -6, 20, EYES, 0.12), // brilho em volta
    // Manto: corpo largo embaixo com a barra em pontas.
    scene.add.ellipse(0, -2, 26, 30, ROBE, 0.85),
    addTriangle(scene, [-13, 8, -5, 8, -9, 20], ROBE, 0.85),
    addTriangle(scene, [-4, 8, 4, 8, 0, 22], ROBE, 0.85),
    addTriangle(scene, [5, 8, 13, 8, 9, 19], ROBE, 0.85),
    // Braços erguidos (garras).
    scene.add.ellipse(-14, -4, 8, 16, ROBE_SHADE, 0.85).setAngle(30),
    scene.add.ellipse(14, -4, 8, 16, ROBE_SHADE, 0.85).setAngle(-30),
    // Capuz e rosto.
    scene.add.circle(0, -16, 11, ROBE, 0.9),
    scene.add.ellipse(0, -15, 14, 13, FACE),
    scene.add.circle(-3, -16, 1.8, EYES),
    scene.add.circle(3, -16, 1.8, EYES),
  ]);

  container.add([
    scene.add.ellipse(0, 14, 24, 7, 0x000000, 0.35), // sombra
    floating,
  ]);

  // Flutua subindo e descendo.
  scene.tweens.add({
    targets: floating,
    y: -12,
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  container.setDepth(900);

  return { container, body };
}

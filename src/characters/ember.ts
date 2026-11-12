// Aparência da Brasa Viva: uma criaturinha de magma com casca de rocha
// escura, rachaduras brilhando, um núcleo quente e dois olhos acesos.
// Quando acende o pavio, a cena faz ela piscar e crescer (ver AreaScene).

import type Phaser from "phaser";
import type { CharacterSprite } from "./types";

const SHELL = 0x2e2220;
const SHELL_LIGHT = 0x463431;
const MAGMA = 0xff6a2a;
const CORE = 0xffc15a;

export function createEmber(
  scene: Phaser.Scene,
  x: number,
  y: number,
): CharacterSprite {
  const body = scene.add.rectangle(x, y, 22, 18, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body);

  (body.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

  const container = scene.add.container(x, y);
  const glow = scene.add.circle(0, -4, 18, MAGMA, 0.25);

  container.add([
    scene.add.ellipse(0, 10, 30, 10, 0x0c0908, 0.55), // sombra
    glow,
    scene.add.ellipse(0, -2, 26, 22, SHELL), // casca
    scene.add.ellipse(-3, -6, 16, 10, SHELL_LIGHT),
    scene.add.rectangle(-6, 0, 2, 10, MAGMA).setAngle(30), // rachaduras
    scene.add.rectangle(7, 2, 2, 8, MAGMA).setAngle(-35),
    scene.add.circle(0, 3, 4, CORE), // núcleo
    scene.add.circle(-4, -6, 2, CORE), // olhos
    scene.add.circle(4, -6, 2, CORE),
    scene.add.circle(-2, -12, 2, MAGMA), // chaminha no topo
    scene.add.triangle(0, -15, -3, 3, 3, 3, 0, -5, CORE),
  ]);

  // O brilho pulsa sem parar.
  scene.tweens.add({
    targets: glow,
    scale: { from: 0.9, to: 1.25 },
    alpha: { from: 0.2, to: 0.45 },
    duration: 500,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  container.setDepth(900);

  return { container, body };
}

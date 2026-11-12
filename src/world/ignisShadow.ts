// A sombra de Ignis: a silhueta enorme de um dragão que cruza a tela,
// escurecendo tudo por onde passa (presságio do Capítulo 6).
// Segue a tela (não o mapa) e se destrói ao terminar a passagem.

import type Phaser from "phaser";
import { addTriangle } from "../utils/shapes";

export function flyIgnisShadow(scene: Phaser.Scene, duration: number): void {
  const { width, height } = scene.scale;
  const shadow = scene.add.container(-420, height * 0.25);
  const color = 0x000000;

  shadow.add([
    // Asas abertas.
    addTriangle(scene, [-20, 0, -260, -150, -140, 30], color),
    addTriangle(scene, [-140, 30, -260, -150, -300, -20], color),
    addTriangle(scene, [20, 0, 260, -150, 140, 30], color),
    addTriangle(scene, [140, 30, 260, -150, 300, -20], color),
    // Corpo, pescoço, cabeça e cauda.
    scene.add.ellipse(0, 10, 90, 170, color),
    scene.add.ellipse(0, -110, 34, 90, color),
    addTriangle(scene, [-22, -150, 22, -150, 0, -205], color),
    addTriangle(scene, [-14, 90, 14, 90, 0, 260], color),
  ]);

  // Voa de lado: a cabeça aponta para a direita.
  shadow
    .setRotation(Math.PI / 2 - 0.25)
    .setScale(0.9)
    .setAlpha(0)
    .setScrollFactor(0)
    .setDepth(2720);

  scene.tweens.add({
    targets: shadow,
    x: width + 420,
    y: height * 0.75,
    scale: 1.15,
    duration,
    ease: "Sine.InOut",
    onComplete: () => shadow.destroy(),
  });

  // Aparece e some suavemente nas pontas da passagem.
  scene.tweens.add({
    targets: shadow,
    alpha: 0.4,
    duration: duration * 0.25,
    yoyo: true,
    hold: duration * 0.5,
  });
}

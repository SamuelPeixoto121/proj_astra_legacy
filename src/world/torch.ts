// Tocha do Cemitério de Dragões: um poste com um cesto de ferro. Apagada,
// só a brasa fraca aparece; acesa (o herói aperta E perto dela), a chama
// tremula e um brilho laranja ilumina a escuridão em volta.

import type Phaser from "phaser";
import { addTriangle } from "../utils/shapes";

export interface Torch {
  x: number;
  y: number;
  lit: boolean;
  flame: Phaser.GameObjects.Container;
  /** Brilho alaranjado por cima da escuridão (só com a tocha acesa). */
  glow: Phaser.GameObjects.Arc;
}

export function createTorch(scene: Phaser.Scene, x: number, y: number): Torch {
  const post = scene.add.container(x, y);

  post.add([
    scene.add.ellipse(3, 22, 26, 8, 0x000000, 0.5), // sombra
    scene.add.rectangle(0, 4, 5, 38, 0x3a2a1e), // poste
    scene.add.rectangle(0, -16, 16, 4, 0x2b2b30), // cesto de ferro
    scene.add.rectangle(-7, -21, 3, 10, 0x2b2b30),
    scene.add.rectangle(7, -21, 3, 10, 0x2b2b30),
    scene.add.circle(0, -19, 4, 0x5a2a1a), // brasa apagada
  ]);
  post.setDepth(y + 10);

  // A chama fica acima da escuridão para ser vista de longe.
  const flame = scene.add.container(x, y - 22);

  flame.add([
    addTriangle(scene, [-8, 2, 8, 2, 0, -22], 0xff6a2a),
    addTriangle(scene, [-5, 2, 5, 2, 0, -16], 0xffb347),
    addTriangle(scene, [-2, 2, 2, 2, 0, -9], 0xfff0b0),
  ]);
  flame.setDepth(2710).setVisible(false);

  const glow = scene.add
    .circle(x, y - 18, 46, 0xffa04a, 0.07)
    .setDepth(2705)
    .setVisible(false);

  return { x, y, lit: false, flame, glow };
}

/** Acende a tocha. Com animate = true, a chama cresce de repente. */
export function lightTorch(
  scene: Phaser.Scene,
  torch: Torch,
  animate: boolean,
): void {
  if (torch.lit) {
    return;
  }

  torch.lit = true;
  torch.flame.setVisible(true);
  torch.glow.setVisible(true);

  // A chama tremula sem parar.
  scene.tweens.add({
    targets: torch.flame,
    scaleX: { from: 0.85, to: 1.1 },
    scaleY: { from: 0.9, to: 1.15 },
    duration: 180,
    yoyo: true,
    repeat: -1,
  });

  scene.tweens.add({
    targets: torch.glow,
    alpha: { from: 0.7, to: 1 },
    scale: { from: 0.95, to: 1.05 },
    duration: 400,
    yoyo: true,
    repeat: -1,
  });

  if (animate) {
    torch.glow.setScale(2.5);
    scene.tweens.add({
      targets: torch.glow,
      scale: 1,
      duration: 400,
      ease: "Quad.Out",
    });
  }
}

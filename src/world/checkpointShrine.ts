// Pedra Astral: o checkpoint da trilha.
// Apagada até o herói encostar nela; depois o cristal brilha e pulsa.

import type Phaser from "phaser";

export interface CheckpointShrine {
  container: Phaser.GameObjects.Container;
  crystal: Phaser.GameObjects.Polygon;
  glow: Phaser.GameObjects.Arc;
  active: boolean;
}

const CRYSTAL_OFF = 0x5d6b8a;
const CRYSTAL_ON = 0x9fd8ff;

export function createCheckpointShrine(
  scene: Phaser.Scene,
  x: number,
  y: number,
): CheckpointShrine {
  const container = scene.add.container(x, y);

  const glow = scene.add.circle(0, -24, 22, CRYSTAL_ON, 0);
  const crystal = scene.add.polygon(
    0,
    -24,
    [0, -11, 7, 0, 0, 11, -7, 0],
    CRYSTAL_OFF,
  );

  container.add([
    scene.add.ellipse(0, 10, 40, 14, 0x101810, 0.6),
    scene.add.rectangle(0, 4, 30, 10, 0x4a4a52),
    scene.add.rectangle(0, -6, 18, 14, 0x5f5f69),
    glow,
    crystal,
  ]);

  container.setDepth(y + 10);

  return { container, crystal, glow, active: false };
}

/** Acende o cristal. Com animate = true, faz um brilho de ativação. */
export function activateShrine(
  scene: Phaser.Scene,
  shrine: CheckpointShrine,
  animate: boolean,
): void {
  if (shrine.active) {
    return;
  }

  shrine.active = true;
  shrine.crystal.setFillStyle(CRYSTAL_ON);
  shrine.glow.setAlpha(0.3);

  // Pulsação contínua do brilho.
  scene.tweens.add({
    targets: shrine.glow,
    alpha: { from: 0.3, to: 0.12 },
    scale: { from: 1, to: 1.25 },
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  if (!animate) {
    return;
  }

  const burst = scene.add.circle(
    shrine.container.x,
    shrine.container.y - 24,
    10,
    CRYSTAL_ON,
    0.7,
  );

  burst.setDepth(shrine.container.depth + 1);

  scene.tweens.add({
    targets: burst,
    scale: 5,
    alpha: 0,
    duration: 600,
    ease: "Cubic.Out",
    onComplete: () => burst.destroy(),
  });
}

// Barreira de corrupção: espinhos sombrios que bloqueiam um caminho
// até que a missão permita passar.

import Phaser from "phaser";

export interface CorruptionBarrier {
  container: Phaser.GameObjects.Container;
  /** Obstáculo invisível que impede a passagem. */
  collider: Phaser.GameObjects.Rectangle;
  open: boolean;
}

export function createCorruptionBarrier(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
): CorruptionBarrier {
  const container = scene.add.container(x, y);

  const glow = scene.add.ellipse(0, 4, width + 30, 46, 0x6a2b7a, 0.25);
  container.add([glow, scene.add.ellipse(0, 6, width, 22, 0x1a0f22, 0.9)]);

  // Espinhos de alturas variadas ao longo da largura.
  const thornCount = Math.floor(width / 14);

  for (let i = 0; i < thornCount; i++) {
    const thornX = -width / 2 + 7 + i * 14;
    const height = 22 + ((i * 7) % 3) * 9;
    const color = i % 2 === 0 ? 0x3d1f4a : 0x58306a;

    container.add(
      scene.add.triangle(thornX, 4, -6, 0, 6, 0, 0, -height, color),
    );
  }

  container.setDepth(y + 20);

  // Pulsação do brilho roxo.
  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.25, to: 0.45 },
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  const collider = scene.add.rectangle(x, y, width, 28, 0xffffff);
  collider.setVisible(false);
  scene.physics.add.existing(collider, true);

  return { container, collider, open: false };
}

/** Desfaz a barreira. Com animate = true, os espinhos somem aos poucos. */
export function openCorruptionBarrier(
  scene: Phaser.Scene,
  barrier: CorruptionBarrier,
  animate: boolean,
): void {
  if (barrier.open) {
    return;
  }

  barrier.open = true;
  (barrier.collider.body as Phaser.Physics.Arcade.StaticBody).enable = false;

  if (!animate) {
    barrier.container.destroy();
    return;
  }

  scene.tweens.add({
    targets: barrier.container,
    alpha: 0,
    scaleY: 0.2,
    duration: 900,
    ease: "Cubic.In",
    onComplete: () => barrier.container.destroy(),
  });
}

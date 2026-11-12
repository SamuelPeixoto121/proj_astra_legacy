// Item de equipamento caído no chão (deixado por um chefe).
// Um cristal girando dentro de um feixe de luz da cor do item.

import type Phaser from "phaser";
import type { ItemId } from "../types";

export interface ItemPickup {
  itemId: ItemId;
  container: Phaser.GameObjects.Container;
}

export function createItemPickup(
  scene: Phaser.Scene,
  itemId: ItemId,
  x: number,
  y: number,
  color: number,
): ItemPickup {
  const container = scene.add.container(x, y);

  const beam = scene.add.rectangle(0, -30, 16, 70, color, 0.16);
  const glow = scene.add.circle(0, -14, 18, color, 0.3);
  const crystal = scene.add.container(0, -14);

  crystal.add([
    scene.add.polygon(0, 0, [0, -12, 8, 0, 0, 12, -8, 0], color),
    scene.add.polygon(0, -1, [0, -7, 4, 0, 0, 5, -4, 0], 0xffffff, 0.75),
  ]);

  container.add([
    scene.add.ellipse(0, 4, 26, 8, 0x0b100d, 0.5), // sombra
    beam,
    glow,
    crystal,
  ]);
  container.setDepth(y + 10);

  // Surge crescendo, depois flutua, gira e pulsa.
  container.setScale(0);
  scene.tweens.add({
    targets: container,
    scale: 1,
    duration: 500,
    ease: "Back.Out",
  });

  scene.tweens.add({
    targets: crystal,
    y: -22,
    scaleX: { from: 1, to: 0.3 },
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  scene.tweens.add({
    targets: [glow, beam],
    alpha: { from: 0.3, to: 0.1 },
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  return { itemId, container };
}

// Fragmento Astral: um cristal de luz que flutua sobre o altar.
// Começa escondido; aparece quando o guardião é derrotado.

import type Phaser from "phaser";

export interface AstralFragment {
  container: Phaser.GameObjects.Container;
  visible: boolean;
}

export function createAstralFragment(
  scene: Phaser.Scene,
  x: number,
  y: number,
): AstralFragment {
  const container = scene.add.container(x, y);

  const glow = scene.add.circle(0, 0, 26, 0xfff0b0, 0.25);

  container.add([
    glow,
    scene.add.polygon(0, 0, [0, -18, 11, 0, 0, 18, -11, 0], 0xffe08a),
    scene.add.polygon(0, -2, [0, -11, 6, 0, 0, 9, -6, 0], 0xfffbe8),
  ]);

  container.setDepth(y + 200);
  container.setVisible(false);

  // Flutua e pulsa sem parar (só aparece quando ficar visível).
  scene.tweens.add({
    targets: container,
    y: y - 8,
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  scene.tweens.add({
    targets: glow,
    scale: { from: 1, to: 1.35 },
    alpha: { from: 0.25, to: 0.1 },
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  return { container, visible: false };
}

/** Mostra o fragmento. Com animate = true, ele surge crescendo. */
export function revealAstralFragment(
  scene: Phaser.Scene,
  fragment: AstralFragment,
  animate: boolean,
): void {
  fragment.visible = true;
  fragment.container.setVisible(true);

  if (!animate) {
    return;
  }

  fragment.container.setScale(0);

  scene.tweens.add({
    targets: fragment.container,
    scale: 1,
    duration: 700,
    ease: "Back.Out",
  });
}

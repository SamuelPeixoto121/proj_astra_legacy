// Portal de luz: anéis girando e um brilho pulsando.
// Começa escondido (ou já aberto); abre com uma animação de crescer.

import type Phaser from "phaser";

export interface AstralPortal {
  container: Phaser.GameObjects.Container;
  open: boolean;
}

/** Cores de um portal: anel de fora (e brilho), anel do meio e centro. */
export interface PortalColors {
  outer: number;
  middle: number;
  core: number;
}

/** Portal de luz (padrão) e portal de fogo (para as Terras Vulcânicas). */
export const PORTAL_COLORS = {
  light: { outer: 0xfff0b0, middle: 0xb9a2ff, core: 0xfffbe8 },
  fire: { outer: 0xffa04a, middle: 0xff4a2a, core: 0xffe2b0 },
  astral: { outer: 0xffd76a, middle: 0xffffff, core: 0xfff6d0 },
} as const satisfies Record<string, PortalColors>;

export function createPortal(
  scene: Phaser.Scene,
  x: number,
  y: number,
  colors: PortalColors = PORTAL_COLORS.light,
): AstralPortal {
  const container = scene.add.container(x, y);

  const glow = scene.add.ellipse(0, 0, 110, 140, colors.outer, 0.12);
  const outer = scene.add
    .ellipse(0, 0, 70, 96)
    .setStrokeStyle(4, colors.outer, 0.9);
  const middle = scene.add
    .ellipse(0, 0, 50, 74)
    .setStrokeStyle(3, colors.middle, 0.8);
  const core = scene.add.ellipse(0, 0, 30, 48, colors.core, 0.55);

  container.add([
    scene.add.ellipse(0, 46, 90, 22, 0x0d0c12, 0.45), // sombra
    glow,
    outer,
    middle,
    core,
  ]);

  container.setDepth(y + 60);
  container.setVisible(false);

  // Anéis girando em sentidos opostos e brilho pulsando.
  scene.tweens.add({ targets: outer, angle: 360, duration: 6000, repeat: -1 });
  scene.tweens.add({ targets: middle, angle: -360, duration: 4000, repeat: -1 });
  scene.tweens.add({
    targets: [glow, core],
    alpha: { from: 0.12, to: 0.35 },
    scale: { from: 0.95, to: 1.08 },
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  return { container, open: false };
}

/** Abre o portal. Com animate = true, ele surge crescendo. */
export function openPortal(
  scene: Phaser.Scene,
  portal: AstralPortal,
  animate: boolean,
): void {
  if (portal.open) {
    return;
  }

  portal.open = true;
  portal.container.setVisible(true);

  if (!animate) {
    return;
  }

  portal.container.setScale(0);

  scene.tweens.add({
    targets: portal.container,
    scale: 1,
    duration: 900,
    ease: "Back.Out",
  });
}

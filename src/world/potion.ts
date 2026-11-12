// Poção de cura caída no chão (deixada por inimigos e chefes).
// Um frasco vermelho com brilho, que salta ao surgir e depois flutua.
// O mesmo desenho (drawPotionIcon) é usado no HUD.

import type Phaser from "phaser";

export interface PotionPickup {
  container: Phaser.GameObjects.Container;
  /** true depois de mostrar "bolsa cheia" (evita repetir a mensagem). */
  fullHintShown: boolean;
}

const LIQUID = 0xd93a4a;
const GLASS = 0xf2e6d0;
const CORK = 0x8a6a44;

export function createPotionPickup(
  scene: Phaser.Scene,
  x: number,
  y: number,
): PotionPickup {
  const container = scene.add.container(x, y);

  const glow = scene.add.circle(0, -10, 16, LIQUID, 0.22);
  const floating = scene.add.container(0, -10);

  floating.add([
    scene.add.circle(0, 3, 8, GLASS, 0.9), // vidro
    scene.add.circle(0, 4, 6.5, LIQUID), // líquido
    scene.add.circle(-2, 1, 2, 0xffffff, 0.8), // reflexo
    scene.add.rectangle(0, -7, 5, 6, GLASS, 0.9), // gargalo
    scene.add.rectangle(0, -11, 6, 3, CORK), // rolha
  ]);

  container.add([
    scene.add.ellipse(0, 4, 18, 6, 0x0b100d, 0.45), // sombra
    glow,
    floating,
  ]);
  container.setDepth(y + 10);

  // Salta ao cair...
  container.setScale(0);
  scene.tweens.add({
    targets: container,
    scale: 1,
    duration: 350,
    ease: "Back.Out",
  });

  // ...e depois flutua e pulsa.
  scene.tweens.add({
    targets: floating,
    y: -15,
    duration: 800,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  scene.tweens.add({
    targets: glow,
    scale: { from: 1, to: 1.4 },
    alpha: { from: 0.22, to: 0.08 },
    duration: 800,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  return { container, fullHintShown: false };
}

/** Desenha um frasco pequeno no HUD (cheio = colorido; vazio = apagado). */
export function drawPotionIcon(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  filled: boolean,
): void {
  graphics.fillStyle(filled ? GLASS : 0x3a3f36, filled ? 0.9 : 0.8);
  graphics.fillCircle(x, y + 3, 7);
  graphics.fillRect(x - 2.5, y - 7, 5, 6);

  graphics.fillStyle(filled ? LIQUID : 0x1f241d, 1);
  graphics.fillCircle(x, y + 4, 5.5);

  if (filled) {
    graphics.fillStyle(CORK, 1);
    graphics.fillRect(x - 3, y - 10, 6, 3);
    graphics.fillStyle(0xffffff, 0.8);
    graphics.fillCircle(x - 2, y + 1, 1.5);
  }
}

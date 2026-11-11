// Aparência da Feiticeira do Pântano, guardiã do segundo Fragmento Astral.
// Uma figura de manto e capuz que flutua sobre a clareira, com um cajado
// cujo orbe brilha. Adormecida, o orbe e os olhos ficam apagados.

import type Phaser from "phaser";
import type { CharacterSprite } from "./types";

export interface WitchSprite extends CharacterSprite {
  /** Partes que acendem quando ela desperta. */
  glowParts: Phaser.GameObjects.Shape[];
  /** Brilho ao redor do orbe (cresce quando ela conjura). */
  orbGlow: Phaser.GameObjects.Arc;
}

const ROBE_DARK = 0x1f1a2e;
const ROBE = 0x2f2742;
const ROBE_TRIM = 0x4fa88a;
const STAFF = 0x5a4632;
const GLOW_OFF = 0x34404a;
const GLOW_ON = 0x7fffd4;

export function createWitch(
  scene: Phaser.Scene,
  x: number,
  y: number,
): WitchSprite {
  const body = scene.add.rectangle(x, y, 30, 28, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body);

  const physicsBody = body.body as Phaser.Physics.Arcade.Body;
  physicsBody.setCollideWorldBounds(true);
  // O herói não consegue empurrá-la.
  physicsBody.setImmovable(true);

  const container = scene.add.container(x, y);

  // Sombra no chão (fica parada enquanto o corpo flutua).
  container.add(scene.add.ellipse(0, 22, 46, 12, 0x0b100d, 0.5));

  const leftEye = scene.add.rectangle(-5, -32, 4, 3, GLOW_OFF);
  const rightEye = scene.add.rectangle(5, -32, 4, 3, GLOW_OFF);
  const orb = scene.add.circle(24, -36, 6, GLOW_OFF);
  const orbGlow = scene.add.circle(24, -36, 14, GLOW_ON, 0);

  const floating = scene.add.container(0, -4);

  floating.add([
    // Manto (triângulo largo embaixo, mais estreito em cima).
    scene.add.triangle(0, 0, -22, 22, 22, 22, 0, -30, ROBE_DARK),
    scene.add.triangle(0, 0, -16, 20, 16, 20, 0, -26, ROBE),
    scene.add.rectangle(0, 19, 40, 3, ROBE_TRIM, 0.8), // barra do manto
    // Mangas.
    scene.add.ellipse(-15, -8, 12, 22, ROBE_DARK).setAngle(20),
    scene.add.ellipse(15, -8, 12, 22, ROBE_DARK).setAngle(-20),
    // Capuz e rosto na sombra.
    scene.add.circle(0, -30, 12, ROBE_DARK),
    scene.add.triangle(0, -40, -9, 0, 9, 0, 0, -16, ROBE_DARK),
    scene.add.ellipse(0, -30, 13, 12, 0x0c0a12),
    leftEye,
    rightEye,
    // Cajado com orbe.
    scene.add.rectangle(22, -10, 4, 56, STAFF),
    orbGlow,
    orb,
  ]);

  container.add(floating);
  container.setDepth(y + 30);

  scene.tweens.add({
    targets: floating,
    y: -10,
    duration: 1300,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  return {
    container,
    body,
    glowParts: [leftEye, rightEye, orb],
    orbGlow,
  };
}

/** Acende (ou apaga) o orbe e os olhos da feiticeira. */
export function setWitchAwake(witch: WitchSprite, awake: boolean): void {
  for (const part of witch.glowParts) {
    part.setFillStyle(awake ? GLOW_ON : GLOW_OFF);
  }

  witch.orbGlow.setFillStyle(GLOW_ON, awake ? 0.3 : 0);
}

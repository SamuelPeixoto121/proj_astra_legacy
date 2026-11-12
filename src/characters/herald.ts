// Aparência do Arauto de Ignis, servo do dragão e guardião do quarto
// Fragmento Astral. Um sacerdote de manto carmesim que flutua, com máscara
// de chifres, olhos de brasa e uma coroa de chamas. As mãos brilham quando
// ele conjura. Adormecido, os olhos, as mãos e a coroa ficam apagados.

import type Phaser from "phaser";
import type { CharacterSprite } from "./types";
import { addTriangle } from "../utils/shapes";

export interface HeraldSprite extends CharacterSprite {
  /** Partes que acendem quando ele desperta. */
  glowParts: Phaser.GameObjects.Shape[];
  /** Brilho entre as mãos (cresce quando ele conjura um ataque). */
  handGlow: Phaser.GameObjects.Arc;
}

const ROBE_DARK = 0x3a0f10;
const ROBE = 0x5c1a17;
const TRIM = 0xc9862a;
const MASK = 0x2a1c1a;
const GLOW_OFF = 0x4a3330;
const GLOW_ON = 0xffa04a;

export function createHerald(
  scene: Phaser.Scene,
  x: number,
  y: number,
): HeraldSprite {
  const body = scene.add.rectangle(x, y, 34, 30, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body);

  const physicsBody = body.body as Phaser.Physics.Arcade.Body;
  physicsBody.setCollideWorldBounds(true);
  // O herói não consegue empurrá-lo.
  physicsBody.setImmovable(true);

  const container = scene.add.container(x, y);

  // Sombra no chão (fica parada enquanto o corpo flutua).
  container.add(scene.add.ellipse(0, 24, 52, 14, 0x0c0908, 0.55));

  const leftEye = scene.add.rectangle(-5, -40, 5, 3, GLOW_OFF);
  const rightEye = scene.add.rectangle(5, -40, 5, 3, GLOW_OFF);
  const crown = [-8, 0, 8].map((offset) =>
    addTriangle(scene, [offset - 4, -56, offset + 4, -56, offset, -70], GLOW_OFF),
  );
  const leftHand = scene.add.circle(-17, -6, 5, GLOW_OFF);
  const rightHand = scene.add.circle(17, -6, 5, GLOW_OFF);
  const handGlow = scene.add.circle(0, -6, 16, GLOW_ON, 0);

  const floating = scene.add.container(0, -4);

  floating.add([
    // Manto largo embaixo, mais estreito em cima.
    addTriangle(scene, [-26, 24, 26, 24, 0, -34], ROBE_DARK),
    addTriangle(scene, [-19, 22, 19, 22, 0, -30], ROBE),
    scene.add.rectangle(0, 21, 46, 3, TRIM, 0.9), // barra dourada
    scene.add.rectangle(0, -4, 4, 40, TRIM, 0.7), // faixa no meio
    // Mangas abertas.
    scene.add.ellipse(-16, -8, 13, 24, ROBE_DARK).setAngle(25),
    scene.add.ellipse(16, -8, 13, 24, ROBE_DARK).setAngle(-25),
    leftHand,
    rightHand,
    handGlow,
    // Capuz e máscara com chifres.
    scene.add.circle(0, -38, 12, ROBE_DARK),
    scene.add.ellipse(0, -38, 15, 14, MASK),
    addTriangle(scene, [-13, -44, -7, -44, -16, -58], 0x1a1110), // chifres
    addTriangle(scene, [7, -44, 13, -44, 16, -58], 0x1a1110),
    leftEye,
    rightEye,
    ...crown,
  ]);

  container.add(floating);
  container.setDepth(y + 30);

  scene.tweens.add({
    targets: floating,
    y: -10,
    duration: 1400,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });

  return {
    container,
    body,
    glowParts: [leftEye, rightEye, leftHand, rightHand, ...crown],
    handGlow,
  };
}

/** Acende (ou apaga) os olhos, as mãos e a coroa do Arauto. */
export function setHeraldAwake(herald: HeraldSprite, awake: boolean): void {
  for (const part of herald.glowParts) {
    part.setFillStyle(awake ? GLOW_ON : GLOW_OFF);
  }

  herald.handGlow.setFillStyle(GLOW_ON, awake ? 0.25 : 0);
}

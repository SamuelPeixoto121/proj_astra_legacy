// Aparência da Sentinela de Pedra, guardiã do Fragmento Astral.
// Um golem de pedra antigo com rachaduras de corrupção.
// Adormecida, os olhos e o núcleo ficam apagados; desperta, brilham.

import type Phaser from "phaser";
import type { CharacterSprite } from "./types";

export interface SentinelSprite extends CharacterSprite {
  glowParts: Phaser.GameObjects.Shape[];
}

const STONE_DARK = 0x4f4d5a;
const STONE = 0x6b6878;
const STONE_LIGHT = 0x7d7a89;
const CRACK = 0x8d3fb0;
const GLOW_OFF = 0x3a2a44;
const GLOW_ON = 0xd27bff;

export function createSentinel(
  scene: Phaser.Scene,
  x: number,
  y: number,
): SentinelSprite {
  const body = scene.add.rectangle(x, y, 46, 34, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body);

  const physicsBody = body.body as Phaser.Physics.Arcade.Body;
  physicsBody.setCollideWorldBounds(true);
  // Pesada demais para o herói empurrar.
  physicsBody.setImmovable(true);

  const container = scene.add.container(x, y);

  const leftEye = scene.add.rectangle(-7, -31, 6, 4, GLOW_OFF);
  const rightEye = scene.add.rectangle(7, -31, 6, 4, GLOW_OFF);
  const core = scene.add.circle(0, -2, 7, GLOW_OFF);

  container.add([
    scene.add.ellipse(0, 26, 84, 24, 0x0d0c12, 0.6), // sombra
    scene.add.rectangle(-14, 18, 16, 18, STONE_DARK), // pernas
    scene.add.rectangle(14, 18, 16, 18, STONE_DARK),
    scene.add.rectangle(-36, 0, 15, 40, STONE_DARK), // braços
    scene.add.rectangle(36, 0, 15, 40, STONE_DARK),
    scene.add.rectangle(-36, 24, 20, 15, STONE), // punhos
    scene.add.rectangle(36, 24, 20, 15, STONE),
    scene.add.rectangle(0, -2, 54, 42, STONE), // tronco
    scene.add.rectangle(0, -2, 40, 30, STONE_LIGHT),
    scene.add.rectangle(-12, -9, 3, 16, CRACK).setAngle(25), // rachaduras
    scene.add.rectangle(13, 5, 3, 14, CRACK).setAngle(-30),
    core,
    scene.add.rectangle(0, -30, 32, 20, STONE), // cabeça
    leftEye,
    rightEye,
  ]);

  container.setDepth(900);

  return { container, body, glowParts: [leftEye, rightEye, core] };
}

/** Acende (desperta) ou apaga os olhos e o núcleo da Sentinela. */
export function setSentinelAwake(sprite: SentinelSprite, awake: boolean): void {
  for (const part of sprite.glowParts) {
    part.setFillStyle(awake ? GLOW_ON : GLOW_OFF);
  }
}

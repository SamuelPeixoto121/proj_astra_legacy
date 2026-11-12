// Aparência do Cavaleiro Dracônico, guardião do quinto Fragmento Astral:
// armadura escura com detalhes vermelhos, elmo com chifres de dragão,
// ombreiras em forma de asa, capa rasgada e uma espada larga.
// A espada fica num "braço" que gira para onde ele olha (como o escudo do
// Cavaleiro de Gelo). Na guarda, a espada fica atravessada e uma aura
// branca aparece.

import type Phaser from "phaser";
import type { CharacterSprite } from "./types";
import { addTriangle } from "../utils/shapes";

export interface DragonKnightSprite extends CharacterSprite {
  /** Espada (gira conforme a direção e a pose). */
  swordArm: Phaser.GameObjects.Container;
  /** Brilho da lâmina (acende antes de cada golpe). */
  bladeGlow: Phaser.GameObjects.Rectangle;
  /** Aura da guarda (aparece quando ele está aparando). */
  guardAura: Phaser.GameObjects.Arc;
  /** Partes que acendem quando ele desperta (olhos e detalhes). */
  glowParts: Phaser.GameObjects.Shape[];
}

/** Pose da espada: parada, erguida (preparando o golpe) ou em guarda. */
export type DragonKnightPose = "idle" | "raised" | "guard";

const ARMOR_DARK = 0x24232b;
const ARMOR = 0x3b3944;
const ARMOR_LIGHT = 0x55525f;
const ACCENT = 0x9a2a2a;
const CAPE = 0x4a1416;
const BLADE = 0xd0d4dc;
const GLOW_OFF = 0x3a2626;
const GLOW_ON = 0xff4a3a;

export function createDragonKnight(
  scene: Phaser.Scene,
  x: number,
  y: number,
): DragonKnightSprite {
  const body = scene.add.rectangle(x, y, 32, 26, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body);

  const physicsBody = body.body as Phaser.Physics.Arcade.Body;
  physicsBody.setCollideWorldBounds(true);
  physicsBody.setImmovable(true);

  const container = scene.add.container(x, y);

  const guardAura = scene.add
    .circle(0, -10, 40, 0xe8f0ff, 0.25)
    .setStrokeStyle(2, 0xffffff, 0.8)
    .setVisible(false);

  const leftEye = scene.add.rectangle(-4, -34, 4, 3, GLOW_OFF);
  const rightEye = scene.add.rectangle(4, -34, 4, 3, GLOW_OFF);
  const chestGem = scene.add.circle(0, -10, 4, GLOW_OFF);

  // Espada num container que gira (0 rad = apontando para a direita).
  const swordArm = scene.add.container(0, -8);
  const bladeGlow = scene.add.rectangle(30, 0, 44, 10, 0xffffff, 0);

  swordArm.add([
    bladeGlow,
    scene.add.rectangle(30, 0, 42, 7, BLADE), // lâmina
    addTriangle(scene, [51, -4, 51, 4, 58, 0], BLADE), // ponta
    scene.add.rectangle(30, 0, 36, 2, 0xffffff, 0.6), // fio
    scene.add.rectangle(8, 0, 4, 18, ACCENT), // guarda da espada
    scene.add.rectangle(2, 0, 10, 5, 0x3a2a1e), // cabo
  ]);

  container.add([
    scene.add.ellipse(0, 20, 50, 15, 0x000000, 0.5), // sombra
    guardAura,
    // Capa rasgada atrás.
    addTriangle(scene, [-18, -18, 18, -18, 0, 26], CAPE),
    addTriangle(scene, [-18, -18, -8, -18, -16, 22], CAPE),
    addTriangle(scene, [8, -18, 18, -18, 16, 22], CAPE),
    // Pernas e corpo.
    scene.add.rectangle(-7, 12, 9, 14, ARMOR_DARK),
    scene.add.rectangle(7, 12, 9, 14, ARMOR_DARK),
    scene.add.rectangle(0, -8, 28, 28, ARMOR),
    scene.add.rectangle(0, -10, 18, 18, ARMOR_LIGHT),
    scene.add.rectangle(0, 4, 28, 4, ACCENT), // cinto
    chestGem,
    // Ombreiras em forma de asa.
    addTriangle(scene, [-14, -20, -26, -20, -28, -34], ARMOR_DARK),
    addTriangle(scene, [14, -20, 26, -20, 28, -34], ARMOR_DARK),
    // Elmo com chifres de dragão.
    scene.add.circle(0, -32, 11, ARMOR),
    addTriangle(scene, [-8, -38, -3, -40, -16, -54], ACCENT),
    addTriangle(scene, [8, -38, 3, -40, 16, -54], ACCENT),
    scene.add.rectangle(0, -34, 14, 4, 0x0c0a0e), // fenda do elmo
    leftEye,
    rightEye,
    swordArm,
  ]);

  container.setDepth(y + 20);

  return {
    container,
    body,
    swordArm,
    bladeGlow,
    guardAura,
    glowParts: [leftEye, rightEye, chestGem],
  };
}

/** Acende (desperta) ou apaga os olhos e a gema do peito. */
export function setDragonKnightAwake(
  sprite: DragonKnightSprite,
  awake: boolean,
): void {
  for (const part of sprite.glowParts) {
    part.setFillStyle(awake ? GLOW_ON : GLOW_OFF);
  }
}

/**
 * Vira a espada para `angle` (radianos) na pose dada:
 * - idle: espada apontada para a frente, um pouco abaixada;
 * - raised: erguida para trás (preparando o golpe) e brilhando;
 * - guard: atravessada na frente do corpo, com a aura da guarda.
 */
export function setDragonKnightPose(
  sprite: DragonKnightSprite,
  angle: number,
  pose: DragonKnightPose,
): void {
  const offsets: Record<DragonKnightPose, number> = {
    idle: 0.5,
    raised: -1.6,
    guard: Math.PI / 2,
  };

  sprite.swordArm.setRotation(angle + offsets[pose]);
  sprite.bladeGlow.setFillStyle(0xffffff, pose === "raised" ? 0.7 : 0);
  sprite.guardAura.setVisible(pose === "guard");
}

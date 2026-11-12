// Aparência do chefe dos Picos Congelados, que tem duas formas:
// - Colosso de Gelo: um gigante de armadura de gelo, com cristais nos ombros;
// - Espírito do Inverno: o que sobra quando a armadura se parte, um núcleo
//   de luz gelada que flutua, cercado por estilhaços.
// Adormecido, os olhos e o núcleo ficam apagados; desperto, brilham.

import type Phaser from "phaser";
import type { CharacterSprite } from "./types";

export interface FrostColossusSprite extends CharacterSprite {
  /** Desenho da primeira fase (a armadura). */
  armorForm: Phaser.GameObjects.Container;
  /** Desenho da segunda fase (começa escondido). */
  spiritForm: Phaser.GameObjects.Container;
  /** Partes que acendem quando ele desperta. */
  glowParts: Phaser.GameObjects.Shape[];
  /** Brilho do núcleo do espírito (cresce quando ele prepara um ataque). */
  spiritGlow: Phaser.GameObjects.Arc;
}

const ICE_DARK = 0x4a7090;
const ICE = 0x7fb2d6;
const ICE_LIGHT = 0xbfe6ff;
const CRYSTAL = 0xe8f7ff;
const GLOW_OFF = 0x40566a;
const GLOW_ON = 0x7fffff;

export function createFrostColossus(
  scene: Phaser.Scene,
  x: number,
  y: number,
): FrostColossusSprite {
  const body = scene.add.rectangle(x, y, 50, 36, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body);

  const physicsBody = body.body as Phaser.Physics.Arcade.Body;
  physicsBody.setCollideWorldBounds(true);
  // Pesado demais para o herói empurrar.
  physicsBody.setImmovable(true);

  const container = scene.add.container(x, y);

  const leftEye = scene.add.rectangle(-8, -40, 7, 4, GLOW_OFF);
  const rightEye = scene.add.rectangle(8, -40, 7, 4, GLOW_OFF);
  const core = scene.add.circle(0, -4, 8, GLOW_OFF);

  const armorForm = scene.add.container(0, 0);

  armorForm.add([
    scene.add.ellipse(0, 28, 92, 26, 0x5f6f80, 0.5), // sombra
    scene.add.rectangle(-15, 20, 18, 20, ICE_DARK), // pernas
    scene.add.rectangle(15, 20, 18, 20, ICE_DARK),
    scene.add.rectangle(-40, 2, 16, 44, ICE_DARK), // braços
    scene.add.rectangle(40, 2, 16, 44, ICE_DARK),
    scene.add.rectangle(-40, 28, 22, 16, ICE), // punhos
    scene.add.rectangle(40, 28, 22, 16, ICE),
    scene.add.rectangle(0, -4, 60, 46, ICE), // tronco
    scene.add.rectangle(0, -4, 44, 32, ICE_LIGHT),
    // Cristais nos ombros.
    scene.add.triangle(-38, -28, -8, 8, 8, 8, 0, -18, CRYSTAL),
    scene.add.triangle(-30, -26, -5, 6, 5, 6, 0, -12, ICE_LIGHT),
    scene.add.triangle(38, -28, -8, 8, 8, 8, 0, -18, CRYSTAL),
    scene.add.triangle(30, -26, -5, 6, 5, 6, 0, -12, ICE_LIGHT),
    core,
    scene.add.rectangle(0, -38, 34, 22, ICE), // cabeça
    scene.add.triangle(0, -54, -10, 6, 10, 6, 0, -12, CRYSTAL), // coroa
    leftEye,
    rightEye,
  ]);

  // Segunda forma: núcleo flutuante cercado por estilhaços que giram.
  const spiritForm = scene.add.container(0, 0);
  const spiritGlow = scene.add.circle(0, -18, 26, GLOW_ON, 0.25);
  const shards = scene.add.container(0, -18);

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;

    shards.add(
      scene.add
        .triangle(
          Math.cos(angle) * 30,
          Math.sin(angle) * 30,
          -4,
          6,
          4,
          6,
          0,
          -10,
          i % 2 === 0 ? CRYSTAL : ICE_LIGHT,
        )
        .setRotation(angle + Math.PI / 2),
    );
  }

  spiritForm.add([
    scene.add.ellipse(0, 22, 44, 12, 0x5f6f80, 0.45), // sombra
    spiritGlow,
    shards,
    scene.add.circle(0, -18, 14, ICE),
    scene.add.circle(0, -18, 9, CRYSTAL),
    scene.add.rectangle(-5, -20, 4, 3, 0x1a2a3a), // olhos
    scene.add.rectangle(5, -20, 4, 3, 0x1a2a3a),
  ]);

  spiritForm.setVisible(false);

  // Os estilhaços giram sem parar (só aparecem na segunda forma).
  scene.tweens.add({
    targets: shards,
    angle: 360,
    duration: 2400,
    repeat: -1,
  });

  container.add([armorForm, spiritForm]);
  container.setDepth(y + 20);

  return {
    container,
    body,
    armorForm,
    spiritForm,
    glowParts: [leftEye, rightEye, core],
    spiritGlow,
  };
}

/** Acende (desperta) ou apaga os olhos e o núcleo do Colosso. */
export function setFrostColossusAwake(
  sprite: FrostColossusSprite,
  awake: boolean,
): void {
  for (const part of sprite.glowParts) {
    part.setFillStyle(awake ? GLOW_ON : GLOW_OFF);
  }
}

/** Troca o desenho para a segunda forma (Espírito do Inverno). */
export function showFrostSpiritForm(sprite: FrostColossusSprite): void {
  sprite.armorForm.setVisible(false);
  sprite.spiritForm.setVisible(true);
}

// Aparência do Cavaleiro de Gelo: armadura azulada, elmo com viseira que
// brilha e um escudo de gelo. Visto de cima, o corpo é simétrico; o escudo
// gira ao redor dele para ficar sempre do lado para onde ele olha.

import type Phaser from "phaser";
import type { CharacterSprite } from "./types";

const ARMOR_DARK = 0x3d5266;
const ARMOR = 0x5e7a94;
const ARMOR_LIGHT = 0x8fb0c9;
const ICE = 0xbfe6ff;
const VISOR = 0x7fffff;

/** Nome do dado (no container) que guarda o "braço" do escudo. */
const SHIELD_DATA = "shieldArm";

export function createIceKnight(
  scene: Phaser.Scene,
  x: number,
  y: number,
): CharacterSprite {
  const body = scene.add.rectangle(x, y, 26, 22, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body);

  (body.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

  const container = scene.add.container(x, y);

  // Escudo e espada num container que gira (0 rad = olhando para a direita).
  const shieldArm = scene.add.container(0, -4);

  shieldArm.add([
    scene.add.rectangle(-14, 10, 4, 26, 0xd7e7f2).setAngle(-20), // espada
    scene.add.rectangle(-12, 0, 8, 4, 0x4a3628).setAngle(-20), // cabo
    scene.add.rectangle(19, 0, 10, 34, ICE, 0.95), // escudo
    scene.add.rectangle(21, 0, 4, 26, 0xffffff, 0.6), // brilho do escudo
    scene.add.rectangle(19, 0, 10, 34).setStrokeStyle(2, ARMOR_DARK),
  ]);

  container.add([
    scene.add.ellipse(0, 16, 42, 14, 0x5f6f80, 0.45), // sombra
    scene.add.rectangle(-6, 12, 8, 12, ARMOR_DARK), // pernas
    scene.add.rectangle(6, 12, 8, 12, ARMOR_DARK),
    scene.add.rectangle(0, -2, 26, 24, ARMOR), // peitoral
    scene.add.rectangle(0, -4, 18, 14, ARMOR_LIGHT),
    scene.add.circle(-13, -10, 6, ARMOR_DARK), // ombreiras
    scene.add.circle(13, -10, 6, ARMOR_DARK),
    scene.add.circle(0, -20, 10, ARMOR), // elmo
    scene.add.triangle(0, -32, -5, 6, 5, 6, 0, -6, ICE), // crista de gelo
    scene.add.rectangle(0, -20, 12, 3, VISOR), // viseira
    shieldArm,
  ]);

  container.setData(SHIELD_DATA, shieldArm);
  container.setDepth(900);

  return { container, body };
}

/**
 * Vira o escudo para `angle` (radianos). Com a guarda baixa, o escudo vai
 * para o lado e fica mais apagado: é a hora de atacar.
 */
export function setIceKnightGuard(
  sprite: CharacterSprite,
  angle: number,
  guarding: boolean,
): void {
  const shieldArm = sprite.container.getData(SHIELD_DATA) as
    | Phaser.GameObjects.Container
    | undefined;

  if (!shieldArm) {
    return;
  }

  shieldArm.setRotation(guarding ? angle : angle + Math.PI * 0.6);
  shieldArm.setAlpha(guarding ? 1 : 0.55);
}

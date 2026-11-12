// Aparência de Ignis, o Dragão das Sombras, visto de cima: corpo de escamas
// carmesim escuras com espinhos dourados nas costas, pescoço e cabeça com
// chifres e olhos amarelos, cauda longa com ponta e asas (dobradas no chão,
// abertas no voo). O desenho inteiro gira para onde ele olha (0 rad = olhando
// para a direita; a cabeça fica no lado +x).

import type Phaser from "phaser";
import type { CharacterSprite } from "./types";
import { addTriangle } from "../utils/shapes";

export interface IgnisSprite extends CharacterSprite {
  /** Desenho que gira (o container de fora fica sempre reto). */
  rig: Phaser.GameObjects.Container;
  wingsFolded: Phaser.GameObjects.Container;
  wingsSpread: Phaser.GameObjects.Container;
  /** Brilho na boca (cresce antes do sopro de fogo). */
  mouthGlow: Phaser.GameObjects.Arc;
}

const SCALE_DARK = 0x2a0a0a;
const SCALE = 0x5a1414;
const SCALE_LIGHT = 0x7a2a1a;
const RIDGE = 0xc98a3a;
const WING = 0x3a0e0e;
const WING_SKIN = 0x6a1c18;
const EYES = 0xffd84a;

export function createIgnis(
  scene: Phaser.Scene,
  x: number,
  y: number,
): IgnisSprite {
  const body = scene.add.rectangle(x, y, 120, 80, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body);

  const physicsBody = body.body as Phaser.Physics.Arcade.Body;
  physicsBody.setCollideWorldBounds(true);
  physicsBody.setImmovable(true);

  const container = scene.add.container(x, y);
  const rig = scene.add.container(0, 0);

  // Asas dobradas (no chão) e abertas (no voo).
  const wingsFolded = scene.add.container(0, 0);

  for (const side of [-1, 1]) {
    wingsFolded.add([
      addTriangle(scene, [-50, side * 26, 40, side * 30, -80, side * 62], WING),
      addTriangle(scene, [-40, side * 32, 20, side * 34, -64, side * 54], WING_SKIN),
    ]);
  }

  const wingsSpread = scene.add.container(0, 0);

  for (const side of [-1, 1]) {
    wingsSpread.add([
      addTriangle(scene, [-30, side * 20, 40, side * 26, -10, side * 190], WING),
      addTriangle(scene, [-30, side * 20, -10, side * 190, -120, side * 150], WING),
      addTriangle(scene, [-20, side * 34, 20, side * 36, -20, side * 160], WING_SKIN),
      addTriangle(scene, [-30, side * 40, -30, side * 150, -100, side * 130], WING_SKIN),
      // "Dedos" ósseos da asa.
      scene.add.rectangle(-5, side * 105, 6, 170, SCALE_DARK).setAngle(side * -8),
    ]);
  }

  wingsSpread.setVisible(false);

  const tail: Phaser.GameObjects.GameObject[] = [];

  for (let i = 0; i < 7; i++) {
    const size = 34 - i * 4;

    tail.push(scene.add.ellipse(-70 - i * 20, Math.sin(i * 0.8) * 6, size, size * 0.8, i % 2 ? SCALE : SCALE_DARK));
  }

  tail.push(addTriangle(scene, [-200, -10, -200, 10, -232, 0], RIDGE));

  // Espinhos dourados ao longo das costas.
  const ridge = [-50, -25, 0, 25].map((rx) =>
    addTriangle(scene, [rx - 8, 0, rx + 8, 0, rx, -10], RIDGE),
  );

  const mouthGlow = scene.add.circle(154, 0, 12, 0xffa040, 0);

  rig.add([
    scene.add.ellipse(-10, 16, 240, 110, 0x000000, 0.35), // sombra
    wingsSpread,
    ...tail,
    // Patas com garras.
    scene.add.ellipse(28, -38, 26, 18, SCALE_DARK),
    scene.add.ellipse(28, 38, 26, 18, SCALE_DARK),
    scene.add.ellipse(-36, -36, 26, 18, SCALE_DARK),
    scene.add.ellipse(-36, 36, 26, 18, SCALE_DARK),
    wingsFolded,
    // Corpo.
    scene.add.ellipse(0, 0, 130, 74, SCALE),
    scene.add.ellipse(-4, 0, 96, 44, SCALE_LIGHT),
    ...ridge,
    // Pescoço e cabeça.
    scene.add.ellipse(76, 0, 64, 32, SCALE),
    scene.add.ellipse(116, 0, 50, 38, SCALE),
    scene.add.ellipse(140, 0, 34, 24, SCALE_LIGHT), // focinho
    addTriangle(scene, [104, -14, 112, -16, 78, -40], RIDGE), // chifres
    addTriangle(scene, [104, 14, 112, 16, 78, 40], RIDGE),
    scene.add.ellipse(122, -10, 9, 6, EYES),
    scene.add.ellipse(122, 10, 9, 6, EYES),
    mouthGlow,
  ]);

  container.add(rig);
  container.setDepth(y + 60);

  return { container, body, rig, wingsFolded, wingsSpread, mouthGlow };
}

/** Abre (voo) ou dobra (chão) as asas. */
export function setIgnisWings(sprite: IgnisSprite, spread: boolean): void {
  sprite.wingsSpread.setVisible(spread);
  sprite.wingsFolded.setVisible(!spread);
}

/** Vira o dragão para `angle` (radianos). */
export function setIgnisFacing(sprite: IgnisSprite, angle: number): void {
  sprite.rig.setRotation(angle);
}

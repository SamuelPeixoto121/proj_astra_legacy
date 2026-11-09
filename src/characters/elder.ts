// Aparência do Ancião da Alvorada.

import type Phaser from "phaser";
import type { CharacterSprite } from "./types";

export interface ElderSprite extends CharacterSprite {
  /** Nome acima da cabeça; a cena preenche o texto conforme o idioma. */
  label: Phaser.GameObjects.Text;
}

export function createElder(
  scene: Phaser.Scene,
  x: number,
  y: number,
): ElderSprite {
  const body = scene.add.rectangle(x, y, 24, 20, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body, true);

  const container = scene.add.container(x, y);

  container.add([
    scene.add.ellipse(0, 13, 35, 15, 0x101810, 0.6),
    scene.add.triangle(0, 5, -15, -10, 15, -10, 0, 19, 0x4b526a),
    scene.add.circle(0, -9, 11, 0xb8b3a1),
    scene.add.circle(0, -12, 12, 0xddd5bd),
    scene.add.ellipse(0, -16, 17, 9, 0x888a84),
    scene.add.rectangle(0, -3, 5, 15, 0xddd5bd),
  ]);

  container.setDepth(1020);

  const label = scene.add
    .text(x, y - 35, "", {
      fontFamily: "Georgia, serif",
      fontSize: "13px",
      color: "#f0dfac",
      stroke: "#17251b",
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(2500);

  return { container, body, label };
}

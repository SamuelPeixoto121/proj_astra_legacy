// Aparência e animações do herói.

import Phaser from "phaser";
import type { CharacterSprite } from "./types";

export interface PlayerSprite extends CharacterSprite {
  leftLeg: Phaser.GameObjects.Rectangle;
  rightLeg: Phaser.GameObjects.Rectangle;
  sword: Phaser.GameObjects.Rectangle;
  swordHandle: Phaser.GameObjects.Rectangle;
}

const SWORD_REST_ANGLE = -25;

export function createPlayer(
  scene: Phaser.Scene,
  x: number,
  y: number,
): PlayerSprite {
  const body = scene.add.rectangle(x, y, 22, 18, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body);

  const container = scene.add.container(x, y);

  const shadow = scene.add.ellipse(0, 13, 35, 16, 0x101810, 0.6);
  const cloak = scene.add.triangle(0, 3, -12, -12, 12, -12, 0, 15, 0x762e36);
  const torso = scene.add.rectangle(0, -1, 19, 23, 0xb6a47b);
  const head = scene.add.circle(0, -15, 8, 0xe2bd91);
  const hair = scene.add.ellipse(0, -21, 17, 8, 0x302b2a);
  const leftLeg = scene.add.rectangle(-5, 10, 6, 10, 0x60412b);
  const rightLeg = scene.add.rectangle(5, 10, 6, 10, 0x60412b);
  const sword = scene.add
    .rectangle(13, 1, 4, 23, 0xd7d8c9)
    .setAngle(SWORD_REST_ANGLE);
  const swordHandle = scene.add
    .rectangle(8, 9, 5, 8, 0x60412b)
    .setAngle(SWORD_REST_ANGLE);

  container.add([
    shadow,
    leftLeg,
    rightLeg,
    cloak,
    torso,
    head,
    hair,
    sword,
    swordHandle,
  ]);

  container.setDepth(1010);

  return { container, body, leftLeg, rightLeg, sword, swordHandle };
}

/** Balança as pernas e o corpo enquanto o herói anda. */
export function animatePlayerWalk(
  player: PlayerSprite,
  moving: boolean,
  time: number,
): void {
  const walkCycle = moving ? Math.sin(time / 75) : 0;
  const walkingBounce = moving ? 1 + Math.abs(walkCycle) * 0.025 : 1;

  player.leftLeg.setAngle(moving ? walkCycle * 22 : 0);
  player.rightLeg.setAngle(moving ? -walkCycle * 22 : 0);
  player.container.setScale(1, walkingBounce);
}

/** Gira a espada para frente e de volta durante o ataque. */
export function animateSwordSwing(
  scene: Phaser.Scene,
  player: PlayerSprite,
): void {
  const parts = [player.sword, player.swordHandle];

  scene.tweens.killTweensOf(parts);
  player.sword.setAngle(SWORD_REST_ANGLE);
  player.swordHandle.setAngle(SWORD_REST_ANGLE);

  scene.tweens.add({
    targets: parts,
    angle: { from: SWORD_REST_ANGLE, to: 65 },
    duration: 110,
    yoyo: true,
    ease: "Cubic.Out",
  });
}

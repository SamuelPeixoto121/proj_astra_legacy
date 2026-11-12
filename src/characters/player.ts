// Aparência e animações do herói.
// O herói tem três poses (frente, costas e perfil) montadas com as mesmas
// peças; a pose da esquerda é a de perfil espelhada.

import Phaser from "phaser";
import type { CharacterSprite } from "./types";

export type PlayerDirection = "down" | "up" | "left" | "right";

interface PlayerParts {
  shadow: Phaser.GameObjects.Ellipse;
  cloak: Phaser.GameObjects.Triangle;
  torso: Phaser.GameObjects.Rectangle;
  head: Phaser.GameObjects.Arc;
  leftEye: Phaser.GameObjects.Arc;
  rightEye: Phaser.GameObjects.Arc;
  hair: Phaser.GameObjects.Ellipse;
  leftLeg: Phaser.GameObjects.Rectangle;
  rightLeg: Phaser.GameObjects.Rectangle;
  sword: Phaser.GameObjects.Rectangle;
  swordHandle: Phaser.GameObjects.Rectangle;
}

/** O desenho do herói, sem física (usado também na tela de equipamento). */
export interface PlayerFigure {
  container: Phaser.GameObjects.Container;
  parts: PlayerParts;
}

export interface PlayerSprite extends CharacterSprite, PlayerFigure {
  direction: PlayerDirection;
}

type PartName = keyof PlayerParts;

/** Posição e tamanho das peças em cada pose. */
interface PlayerPose {
  torsoWidth: number;
  cloakX: number;
  legsX: [left: number, right: number];
  hair: { x: number; y: number; width: number; height: number };
  /** Posição x de cada olho, ou null quando o olho não aparece. */
  eyesX: [left: number | null, right: number | null];
  /** Ordem de desenho, do fundo para a frente. */
  layers: PartName[];
}

type PoseName = "front" | "back" | "side";

const POSES: Record<PoseName, PlayerPose> = {
  front: {
    torsoWidth: 19,
    cloakX: 0,
    legsX: [-5, 5],
    hair: { x: 0, y: -21, width: 17, height: 8 },
    eyesX: [-3, 3],
    layers: [
      "shadow", "leftLeg", "rightLeg", "cloak", "torso",
      "head", "leftEye", "rightEye", "hair", "sword", "swordHandle",
    ],
  },
  back: {
    torsoWidth: 19,
    cloakX: 0,
    legsX: [-5, 5],
    hair: { x: 0, y: -17, width: 17, height: 15 },
    eyesX: [null, null],
    // De costas, a espada fica atrás do corpo e a capa cobre as costas.
    layers: [
      "shadow", "sword", "swordHandle", "leftLeg", "rightLeg", "torso",
      "head", "leftEye", "rightEye", "hair", "cloak",
    ],
  },
  side: {
    torsoWidth: 14,
    cloakX: -4,
    legsX: [-2, 3],
    hair: { x: -2, y: -20, width: 15, height: 10 },
    eyesX: [null, 4],
    layers: [
      "shadow", "cloak", "leftLeg", "rightLeg", "torso",
      "head", "leftEye", "rightEye", "hair", "sword", "swordHandle",
    ],
  },
};

const SWORD_REST_ANGLE = -25;
const SKIN = 0xe2bd91;
const EYE_Y = -15;

export function createPlayer(
  scene: Phaser.Scene,
  x: number,
  y: number,
): PlayerSprite {
  const body = scene.add.rectangle(x, y, 22, 18, 0xffffff);

  body.setVisible(false);
  scene.physics.add.existing(body);

  const { container, parts } = createPlayerFigure(scene, x, y);

  container.setDepth(1010);

  const player: PlayerSprite = { container, body, parts, direction: "down" };

  applyPose(player, "down");

  return player;
}

/** Desenha o herói de frente em (x, y), sem física. */
export function createPlayerFigure(
  scene: Phaser.Scene,
  x: number,
  y: number,
): PlayerFigure {
  const container = scene.add.container(x, y);

  const parts: PlayerParts = {
    shadow: scene.add.ellipse(0, 13, 35, 16, 0x101810, 0.6),
    cloak: scene.add.triangle(0, 3, -12, -12, 12, -12, 0, 15, 0x762e36),
    torso: scene.add.rectangle(0, -1, 19, 23, 0xb6a47b),
    head: scene.add.circle(0, -15, 8, SKIN),
    leftEye: scene.add.circle(-3, EYE_Y, 1.4, 0x2a1d1a),
    rightEye: scene.add.circle(3, EYE_Y, 1.4, 0x2a1d1a),
    hair: scene.add.ellipse(0, -21, 17, 8, 0x302b2a),
    leftLeg: scene.add.rectangle(-5, 10, 6, 10, 0x60412b),
    rightLeg: scene.add.rectangle(5, 10, 6, 10, 0x60412b),
    sword: scene.add
      .rectangle(13, 1, 4, 23, 0xd7d8c9)
      .setAngle(SWORD_REST_ANGLE),
    swordHandle: scene.add
      .rectangle(8, 9, 5, 8, 0x60412b)
      .setAngle(SWORD_REST_ANGLE),
  };

  container.add(Object.values(parts));

  for (const name of POSES.front.layers) {
    container.bringToTop(parts[name]);
  }

  return { container, parts };
}

/**
 * Vira o herói para a direção em que ele está olhando.
 * Nas diagonais, usa a pose de perfil.
 */
export function updatePlayerDirection(
  player: PlayerSprite,
  facingX: number,
  facingY: number,
): void {
  let direction: PlayerDirection;

  if (facingX > 0) direction = "right";
  else if (facingX < 0) direction = "left";
  else if (facingY < 0) direction = "up";
  else direction = "down";

  if (direction !== player.direction) {
    applyPose(player, direction);
  }
}

function applyPose(player: PlayerSprite, direction: PlayerDirection): void {
  const pose =
    direction === "down"
      ? POSES.front
      : direction === "up"
        ? POSES.back
        : POSES.side;

  const { parts, container } = player;

  player.direction = direction;

  // Virado para a esquerda = pose de perfil espelhada.
  container.scaleX = direction === "left" ? -1 : 1;

  parts.torso.setSize(pose.torsoWidth, parts.torso.height);
  parts.cloak.x = pose.cloakX;
  parts.leftLeg.x = pose.legsX[0];
  parts.rightLeg.x = pose.legsX[1];

  parts.hair
    .setPosition(pose.hair.x, pose.hair.y)
    .setSize(pose.hair.width, pose.hair.height);

  setEye(parts.leftEye, pose.eyesX[0]);
  setEye(parts.rightEye, pose.eyesX[1]);

  for (const name of pose.layers) {
    container.bringToTop(parts[name]);
  }
}

function setEye(eye: Phaser.GameObjects.Arc, x: number | null): void {
  eye.setVisible(x !== null);

  if (x !== null) {
    eye.x = x;
  }
}

/** Balança as pernas e o corpo enquanto o herói anda. */
export function animatePlayerWalk(
  player: PlayerSprite,
  moving: boolean,
  time: number,
): void {
  const walkCycle = moving ? Math.sin(time / 75) : 0;
  const walkingBounce = moving ? 1 + Math.abs(walkCycle) * 0.025 : 1;

  player.parts.leftLeg.setAngle(moving ? walkCycle * 22 : 0);
  player.parts.rightLeg.setAngle(moving ? -walkCycle * 22 : 0);

  // Só a altura muda: a largura (scaleX) guarda o espelhamento da pose.
  player.container.scaleY = walkingBounce;
}

/** Gira a espada para frente e de volta durante o ataque. */
export function animateSwordSwing(
  scene: Phaser.Scene,
  player: PlayerSprite,
): void {
  const { sword, swordHandle } = player.parts;
  const swordParts = [sword, swordHandle];

  scene.tweens.killTweensOf(swordParts);
  sword.setAngle(SWORD_REST_ANGLE);
  swordHandle.setAngle(SWORD_REST_ANGLE);

  scene.tweens.add({
    targets: swordParts,
    angle: { from: SWORD_REST_ANGLE, to: 65 },
    duration: 110,
    yoyo: true,
    ease: "Cubic.Out",
  });
}

/**
 * Soco (herói sem arma): um punho sai do corpo na direção (facingX,
 * facingY) e volta. `side` (1 ou -1) escolhe a mão: alternar dá a
 * sensação de uma sequência de socos.
 */
export function animatePunch(
  scene: Phaser.Scene,
  player: PlayerSprite,
  facingX: number,
  facingY: number,
  side: 1 | -1,
): void {
  const { x, y } = player.body;
  // A mão fica um pouco para o lado (perpendicular à direção do soco).
  const handX = x - facingY * 7 * side;
  const handY = y - 4 + facingX * 7 * side;

  const fist = scene.add
    .circle(handX, handY, 5, SKIN)
    .setStrokeStyle(2, 0x8a6a4a)
    // Olhando para cima, o braço fica atrás do corpo.
    .setDepth(facingY < 0 ? y + 40 : y + 60);

  scene.tweens.add({
    targets: fist,
    x: handX + facingX * 24,
    y: handY + facingY * 24,
    duration: 70,
    yoyo: true,
    ease: "Quad.Out",
    onComplete: () => fist.destroy(),
  });
}

/**
 * Cores do herói conforme o equipamento.
 * blade null = sem espada (soco); cloak null = sem capa.
 */
export interface PlayerLook {
  blade: number | null;
  torso: number;
  cloak: number | null;
}

/** Muda as cores do herói (e esconde a espada ou a capa se não houver). */
export function setPlayerLook(player: PlayerFigure, look: PlayerLook): void {
  const { sword, swordHandle, torso, cloak } = player.parts;

  sword.setVisible(look.blade !== null);
  swordHandle.setVisible(look.blade !== null);

  if (look.blade !== null) {
    sword.setFillStyle(look.blade);
  }

  torso.setFillStyle(look.torso);

  cloak.setVisible(look.cloak !== null);

  if (look.cloak !== null) {
    cloak.setFillStyle(look.cloak);
  }
}

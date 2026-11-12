// Efeitos visuais de combate: corte da espada, impacto,
// números de dano e explosão ao derrotar um inimigo.
// Todos os efeitos se destroem sozinhos ao terminar a animação.

import Phaser from "phaser";

/** Arco de corte na frente do herói, na direção em que ele olha. */
export function createSlashEffect(
  scene: Phaser.Scene,
  originX: number,
  originY: number,
  facingX: number,
  facingY: number,
): void {
  const slash = scene.add.graphics();

  slash.lineStyle(5, 0xf5df92, 0.95);

  const points: Phaser.Math.Vector2[] = [];

  for (let i = 0; i <= 12; i++) {
    const angle = -1.05 + (2.1 * i) / 12;

    points.push(
      new Phaser.Math.Vector2(Math.cos(angle) * 27, Math.sin(angle) * 27),
    );
  }

  slash.strokePoints(points, false);
  slash.setPosition(originX + facingX * 30, originY + facingY * 30);
  slash.setRotation(Math.atan2(facingY, facingX));
  slash.setDepth(originY + 120);

  scene.tweens.add({
    targets: slash,
    alpha: 0,
    scaleX: 1.4,
    scaleY: 1.4,
    duration: 150,
    ease: "Cubic.Out",
    onComplete: () => slash.destroy(),
  });
}

/** Clarão com partículas no ponto de impacto. */
export function createImpactEffect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  particleCount = 6,
  spread = 24,
): void {
  const flash = scene.add.circle(x, y, 7, color, 0.75);

  flash.setDepth(y + 120);

  scene.tweens.add({
    targets: flash,
    scale: 2.4,
    alpha: 0,
    duration: 220,
    ease: "Cubic.Out",
    onComplete: () => flash.destroy(),
  });

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount;
    const distance = spread * (0.65 + (i % 3) * 0.2);

    const particle = scene.add.circle(x, y, 2 + (i % 2), color, 0.95);

    particle.setDepth(y + 125);

    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      scale: 0.2,
      duration: 260,
      ease: "Cubic.Out",
      onComplete: () => particle.destroy(),
    });
  }
}

/**
 * Número que sobe e desaparece: dano ("-25") ou cura ("+40", com sign "+").
 */
export function showDamageNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  color: string,
  sign: "-" | "+" = "-",
): void {
  const damageText = scene.add.text(x, y - 24, `${sign}${amount}`, {
    fontFamily: "Georgia, serif",
    fontSize: "17px",
    fontStyle: "bold",
    color,
    stroke: "#160d1c",
    strokeThickness: 4,
  });

  damageText.setOrigin(0.5);
  damageText.setDepth(y + 150);

  scene.tweens.add({
    targets: damageText,
    y: y - 58,
    alpha: 0,
    duration: 650,
    ease: "Cubic.Out",
    onComplete: () => damageText.destroy(),
  });
}

/**
 * Aviso de golpe em área: círculo vermelho pulsando no chão.
 * Some sozinho depois de `duration` milissegundos.
 */
export function createSlamWarning(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  duration: number,
): void {
  const warning = scene.add
    .circle(x, y, radius, 0xff3b5c, 0.12)
    .setStrokeStyle(3, 0xff3b5c, 0.85)
    .setDepth(y - 5);

  scene.tweens.add({
    targets: warning,
    alpha: { from: 0.5, to: 1 },
    duration: duration / 4,
    yoyo: true,
    repeat: 1,
  });

  scene.time.delayedCall(duration, () => warning.destroy());
}

/**
 * Aviso de investida: faixa vermelha no chão, saindo de (x, y) na direção
 * `angle` (em radianos). Some sozinha depois de `duration` milissegundos.
 */
export function createChargeWarning(
  scene: Phaser.Scene,
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number,
  duration: number,
): void {
  const warning = scene.add
    .rectangle(x, y, length, width, 0xff3b5c, 0.14)
    .setOrigin(0, 0.5)
    .setStrokeStyle(2, 0xff3b5c, 0.8)
    .setRotation(angle)
    .setDepth(y - 5);

  scene.tweens.add({
    targets: warning,
    alpha: { from: 0.5, to: 1 },
    duration: duration / 4,
    yoyo: true,
    repeat: 1,
  });

  scene.time.delayedCall(duration, () => warning.destroy());
}

/** Onda de choque de um golpe no chão, com poeira. */
export function createShockwave(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
): void {
  const ring = scene.add
    .circle(x, y, radius)
    .setStrokeStyle(5, 0xd9c8ff, 0.9)
    .setScale(0.2)
    .setDepth(y + 150);

  scene.tweens.add({
    targets: ring,
    scale: 1,
    alpha: 0,
    duration: 380,
    ease: "Cubic.Out",
    onComplete: () => ring.destroy(),
  });

  createImpactEffect(scene, x, y + 10, 0x9e98ad, 12, radius * 0.8);
}

/** Anel e partículas quando um inimigo é derrotado. */
export function createDeathBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
): void {
  const ring = scene.add.circle(x, y, 18, color, 0.75);

  ring.setDepth(y + 160);

  scene.tweens.add({
    targets: ring,
    scale: 4,
    alpha: 0,
    duration: 650,
    ease: "Cubic.Out",
    onComplete: () => ring.destroy(),
  });

  for (let i = 0; i < 18; i++) {
    const angle = (Math.PI * 2 * i) / 18;
    const distance = 42 + (i % 3) * 13;
    const particleColor = i % 2 === 0 ? color : 0xff5267;

    const particle = scene.add.circle(x, y, 3 + (i % 3), particleColor, 1);

    particle.setDepth(y + 170);

    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      scale: 0.15,
      duration: 700 + (i % 4) * 70,
      ease: "Cubic.Out",
      onComplete: () => particle.destroy(),
    });
  }
}

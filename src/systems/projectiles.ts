// Projéteis: bolas de energia que voam em linha reta, deixam rastro e somem
// ao bater num obstáculo ou ao chegar ao alcance máximo.
// Usados por inimigos que atacam à distância (espíritos, feiticeira).
// O movimento é feito à mão (sem física), a cada quadro, pela cena.

import type Phaser from "phaser";

export interface ProjectileOptions {
  speed: number;
  damage: number;
  /** Distância máxima que o projétil percorre antes de sumir. */
  range: number;
  color: number;
  radius?: number;
}

export interface Projectile {
  container: Phaser.GameObjects.Container;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  color: number;
  /** Distância que ainda falta percorrer. */
  remaining: number;
  /** Tempo (ms) até soltar o próximo pedacinho de rastro. */
  trailTimer: number;
}

export function createProjectile(
  scene: Phaser.Scene,
  x: number,
  y: number,
  angle: number,
  options: ProjectileOptions,
): Projectile {
  const radius = options.radius ?? 6;
  const container = scene.add.container(x, y);

  container.add([
    scene.add.circle(0, 0, radius * 1.9, options.color, 0.3), // brilho
    scene.add.circle(0, 0, radius, options.color, 0.95),
    scene.add.circle(0, 0, radius * 0.45, 0xffffff, 0.9), // núcleo
  ]);

  container.setDepth(y + 140);

  return {
    container,
    vx: Math.cos(angle) * options.speed,
    vy: Math.sin(angle) * options.speed,
    damage: options.damage,
    radius,
    color: options.color,
    remaining: options.range,
    trailTimer: 0,
  };
}

/** Move o projétil. `delta` em milissegundos. Devolve false se acabou o alcance. */
export function moveProjectile(
  scene: Phaser.Scene,
  projectile: Projectile,
  delta: number,
): boolean {
  const seconds = delta / 1000;
  const { container } = projectile;

  container.x += projectile.vx * seconds;
  container.y += projectile.vy * seconds;
  container.setDepth(container.y + 140);

  projectile.remaining -= Math.hypot(projectile.vx, projectile.vy) * seconds;

  // Rastro de luz que some rápido.
  projectile.trailTimer -= delta;

  if (projectile.trailTimer <= 0) {
    projectile.trailTimer = 40;

    const trail = scene.add
      .circle(container.x, container.y, projectile.radius * 0.8, projectile.color, 0.5)
      .setDepth(container.depth - 1);

    scene.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 0.2,
      duration: 260,
      onComplete: () => trail.destroy(),
    });
  }

  return projectile.remaining > 0;
}

/** Remove o projétil, com um pequeno estouro de luz. */
export function destroyProjectile(
  scene: Phaser.Scene,
  projectile: Projectile,
): void {
  const { x, y } = projectile.container;
  const burst = scene.add
    .circle(x, y, projectile.radius, projectile.color, 0.7)
    .setDepth(projectile.container.depth);

  scene.tweens.add({
    targets: burst,
    scale: 2.6,
    alpha: 0,
    duration: 200,
    onComplete: () => burst.destroy(),
  });

  projectile.container.destroy();
}

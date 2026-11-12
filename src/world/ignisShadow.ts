// A sombra de Ignis: a silhueta enorme de um dragão que cruza a tela,
// escurecendo tudo por onde passa (presságio do confronto final).
// Segue a tela (não o mapa) e se destrói ao terminar a passagem.
// scheduleIgnisShadow() faz ela passar de tempos em tempos, com rugido.

import Phaser from "phaser";
import { IGNIS_SHADOW } from "../config";
import { audio } from "../audio/engine";
import { addTriangle } from "../utils/shapes";

export interface IgnisShadowSchedule {
  /** Chame a cada quadro. Devolve true no quadro em que a sombra passa. */
  update: () => boolean;
}

/** A sombra passa a cada IGNIS_SHADOW.minDelay–maxDelay ms, com rugido. */
export function scheduleIgnisShadow(scene: Phaser.Scene): IgnisShadowSchedule {
  // O relógio da cena só vale no primeiro quadro (não na criação).
  let nextAt = 0;

  return {
    update: () => {
      const now = scene.time.now;

      if (nextAt === 0) {
        nextAt = now + IGNIS_SHADOW.firstDelay;
        return false;
      }

      if (now < nextAt) {
        return false;
      }

      nextAt =
        now +
        IGNIS_SHADOW.duration +
        Phaser.Math.Between(IGNIS_SHADOW.minDelay, IGNIS_SHADOW.maxDelay);

      flyIgnisShadow(scene, IGNIS_SHADOW.duration);
      audio.play("roar");
      scene.cameras.main.shake(IGNIS_SHADOW.duration * 0.6, 0.002);

      return true;
    },
  };
}

export function flyIgnisShadow(scene: Phaser.Scene, duration: number): void {
  const { width, height } = scene.scale;
  const shadow = scene.add.container(-420, height * 0.25);
  const color = 0x000000;

  shadow.add([
    // Asas abertas.
    addTriangle(scene, [-20, 0, -260, -150, -140, 30], color),
    addTriangle(scene, [-140, 30, -260, -150, -300, -20], color),
    addTriangle(scene, [20, 0, 260, -150, 140, 30], color),
    addTriangle(scene, [140, 30, 260, -150, 300, -20], color),
    // Corpo, pescoço, cabeça e cauda.
    scene.add.ellipse(0, 10, 90, 170, color),
    scene.add.ellipse(0, -110, 34, 90, color),
    addTriangle(scene, [-22, -150, 22, -150, 0, -205], color),
    addTriangle(scene, [-14, 90, 14, 90, 0, 260], color),
  ]);

  // Voa de lado: a cabeça aponta para a direita.
  shadow
    .setRotation(Math.PI / 2 - 0.25)
    .setScale(0.9)
    .setAlpha(0)
    .setScrollFactor(0)
    .setDepth(2720);

  scene.tweens.add({
    targets: shadow,
    x: width + 420,
    y: height * 0.75,
    scale: 1.15,
    duration,
    ease: "Sine.InOut",
    onComplete: () => shadow.destroy(),
  });

  // Aparece e some suavemente nas pontas da passagem.
  scene.tweens.add({
    targets: shadow,
    alpha: 0.4,
    duration: duration * 0.25,
    yoyo: true,
    hold: duration * 0.5,
  });
}

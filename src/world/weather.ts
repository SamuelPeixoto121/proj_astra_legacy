// Clima compartilhado pelas áreas quentes (Terras Vulcânicas, Cidadela):
// cinzas caindo, brasas subindo e bordas da tela avermelhadas pelo calor.
// Tudo segue a tela (não o mapa).

import Phaser from "phaser";

const ASH_TEXTURE = "ash-flake";
const EMBER_TEXTURE = "ember";
const HEAT_TEXTURE = "heat-vignette";

function makeDotTexture(
  scene: Phaser.Scene,
  key: string,
  color: number,
  radius: number,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  graphics.fillStyle(color, 1);
  graphics.fillCircle(radius, radius, radius);
  graphics.generateTexture(key, radius * 2, radius * 2);
  graphics.destroy();
}

/** Cinzas caindo devagar e brasas subindo (seguem a tela, não o mapa). */
export function createAshfall(scene: Phaser.Scene): void {
  makeDotTexture(scene, ASH_TEXTURE, 0x8a807a, 3);
  makeDotTexture(scene, EMBER_TEXTURE, 0xffffff, 2);

  scene.add
    .particles(0, 0, ASH_TEXTURE, {
      x: { min: -200, max: 2400 },
      y: -10,
      lifespan: 12000,
      speedY: { min: 25, max: 60 },
      speedX: { min: -30, max: 20 },
      scale: { min: 0.4, max: 1 },
      alpha: { min: 0.3, max: 0.7 },
      frequency: 60,
      quantity: 1,
    })
    .setScrollFactor(0)
    .setDepth(2650);

  scene.add
    .particles(0, 0, EMBER_TEXTURE, {
      x: { min: 0, max: 2400 },
      y: { min: 400, max: 1400 },
      lifespan: 2600,
      speedY: { min: -70, max: -30 },
      speedX: { min: -15, max: 15 },
      scale: { start: 1, end: 0.2 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xff7a2a, 0xffb347, 0xff4a2a],
      frequency: 90,
      quantity: 1,
    })
    .setScrollFactor(0)
    .setDepth(2650);
}

/** Calor: bordas da tela avermelhadas, pulsando devagar. */
export function createHeatVignette(scene: Phaser.Scene): void {
  if (!scene.textures.exists(HEAT_TEXTURE)) {
    const size = 512;
    const texture = scene.textures.createCanvas(HEAT_TEXTURE, size, size);

    if (texture) {
      const context = texture.getContext();
      const gradient = context.createRadialGradient(
        size / 2,
        size / 2,
        size * 0.2,
        size / 2,
        size / 2,
        size / 2,
      );

      gradient.addColorStop(0, "rgba(120, 20, 10, 0)");
      gradient.addColorStop(0.65, "rgba(120, 20, 10, 0.12)");
      gradient.addColorStop(1, "rgba(90, 10, 5, 0.5)");

      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
      texture.refresh();
    }
  }

  const vignette = scene.add
    .image(0, 0, HEAT_TEXTURE)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(2700)
    .setDisplaySize(scene.scale.width, scene.scale.height);

  const resize = (gameSize: Phaser.Structs.Size): void => {
    vignette.setDisplaySize(gameSize.width, gameSize.height);
  };

  scene.scale.on("resize", resize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off("resize", resize);
  });

  scene.tweens.add({
    targets: vignette,
    alpha: { from: 0.6, to: 0.9 },
    duration: 2600,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });
}

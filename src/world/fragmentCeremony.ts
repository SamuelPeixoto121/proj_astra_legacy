// Cerimônia dos cinco fragmentos (Capítulo 6): os cinco Fragmentos Astrais
// aparecem girando em volta do Ancião, cada um com a cor do seu capítulo,
// se juntam no centro num clarão e soltam um raio de luz até o ponto onde o
// Portal Astral vai se abrir. Quando termina, chama `onDone`.

import Phaser from "phaser";

/** Cores dos fragmentos: Ruínas, Pântano, Picos, Vulcão e Cemitério. */
const FRAGMENT_COLORS = [0xffe08a, 0x7fffd4, 0xbfe6ff, 0xff8a3a, 0xc9a6ff];

const ORBIT_RADIUS = 70;
const SPIN_TIME = 1800;
const MERGE_TIME = 500;

export function playFragmentCeremony(
  scene: Phaser.Scene,
  x: number,
  y: number,
  target: { x: number; y: number },
  onDone: () => void,
): void {
  const ring = scene.add.container(x, y - 30).setDepth(3200);
  const orbit = { radius: ORBIT_RADIUS, angle: 0 };

  const fragments = FRAGMENT_COLORS.map((color) => {
    const fragment = scene.add.container(0, 0);

    fragment.add([
      scene.add.circle(0, 0, 14, color, 0.3),
      scene.add.polygon(0, 0, [0, -12, 7, 0, 0, 12, -7, 0], color),
    ]);
    fragment.setScale(0);
    ring.add(fragment);

    return fragment;
  });

  const place = (): void => {
    fragments.forEach((fragment, index) => {
      const angle = orbit.angle + (Math.PI * 2 * index) / fragments.length;

      fragment.setPosition(
        Math.cos(angle) * orbit.radius,
        Math.sin(angle) * orbit.radius * 0.6,
      );
    });
  };

  place();

  // Os fragmentos surgem crescendo, um depois do outro.
  fragments.forEach((fragment, index) => {
    scene.tweens.add({
      targets: fragment,
      scale: 1,
      delay: index * 120,
      duration: 300,
      ease: "Back.Out",
    });
  });

  // Giram cada vez mais rápido e se fecham no centro.
  scene.tweens.add({
    targets: orbit,
    angle: Math.PI * 6,
    duration: SPIN_TIME + MERGE_TIME,
    ease: "Quad.In",
    onUpdate: place,
  });

  scene.tweens.add({
    targets: orbit,
    radius: 0,
    delay: SPIN_TIME,
    duration: MERGE_TIME,
    ease: "Quad.In",
    onComplete: () => {
      ring.destroy();
      scene.cameras.main.flash(600, 255, 245, 210);
      shootBeam(scene, x, y - 30, target);
      onDone();
    },
  });
}

/** Raio de luz do centro da cerimônia até o portal. */
function shootBeam(
  scene: Phaser.Scene,
  x: number,
  y: number,
  target: { x: number; y: number },
): void {
  const beam = scene.add.graphics().setDepth(3200);

  beam.lineStyle(10, 0xffd76a, 0.5);
  beam.lineBetween(x, y, target.x, target.y);
  beam.lineStyle(4, 0xffffff, 0.9);
  beam.lineBetween(x, y, target.x, target.y);

  scene.tweens.add({
    targets: beam,
    alpha: 0,
    duration: 700,
    ease: "Quad.Out",
    onComplete: () => beam.destroy(),
  });
}

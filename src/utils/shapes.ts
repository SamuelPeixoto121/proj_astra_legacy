// Formas auxiliares para desenhar com o Phaser.

import type Phaser from "phaser";

/**
 * Triângulo com os pontos dados em relação ao ponto (0, 0) do desenho.
 *
 * O `scene.add.triangle` do Phaser centraliza a forma pelo tamanho dela, então
 * pontos negativos fazem o triângulo aparecer deslocado. Aqui o centro é
 * calculado para ele ficar exatamente onde os pontos dizem.
 */
export function addTriangle(
  scene: Phaser.Scene,
  points: [number, number, number, number, number, number],
  color: number,
  alpha = 1,
): Phaser.GameObjects.Triangle {
  const [x1, y1, x2, y2, x3, y3] = points;
  const left = Math.min(x1, x2, x3);
  const top = Math.min(y1, y2, y3);
  const width = Math.max(x1, x2, x3) - left;
  const height = Math.max(y1, y2, y3) - top;

  return scene.add.triangle(
    left + width / 2,
    top + height / 2,
    x1 - left,
    y1 - top,
    x2 - left,
    y2 - top,
    x3 - left,
    y3 - top,
    color,
    alpha,
  );
}

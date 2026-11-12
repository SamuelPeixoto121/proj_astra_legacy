// Contas de geometria usadas pelos cenários: distância até uma trilha (ou
// rio de lava), ponto dentro de uma elipse e sorteio com semente fixa
// (para cada mapa ter sempre as mesmas árvores e pedras).

import Phaser from "phaser";

export type Point = { readonly x: number; readonly y: number };

export type Ellipse = {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
};

/** Distância de um ponto até uma linha de vários segmentos (a mais próxima). */
export function distanceToLine(
  x: number,
  y: number,
  points: readonly Point[],
): number {
  let best = Infinity;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    // Posição (0 a 1) do ponto mais próximo ao longo do segmento a→b.
    const t = Phaser.Math.Clamp(
      ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy),
      0,
      1,
    );

    best = Math.min(
      best,
      Phaser.Math.Distance.Between(x, y, a.x + dx * t, a.y + dy * t),
    );
  }

  return best;
}

/** true se o ponto está dentro da elipse (aumentada em `margin` pixels). */
export function isInEllipse(
  x: number,
  y: number,
  area: Ellipse,
  margin = 0,
): boolean {
  const dx = (x - area.x) / (area.rx + margin);
  const dy = (y - area.y) / (area.ry + margin);
  return dx * dx + dy * dy <= 1;
}

/**
 * Sorteio com semente fixa: a mesma semente sempre gera a mesma sequência.
 * Devolve uma função que sorteia um número de 0 até `max`.
 */
export function createSeededRandom(seed: number): (max: number) => number {
  let state = seed;

  return (max: number): number => {
    state = (state * 16807) % 2147483647;
    return ((state % 10000) / 10000) * max;
  };
}

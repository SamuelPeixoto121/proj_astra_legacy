// Ícones dos itens no inventário: uma espada, um peitoral ou um amuleto,
// desenhados com formas simples nas cores de cada item (ITEM_LOOKS).
// Sem item, desenha a "silhueta" apagada do espaço (ex.: amuleto vazio).
// Os desenhos cabem num quadrado de 40 x 40, centrado em (0, 0).

import type Phaser from "phaser";
import { ITEM_LOOKS, getItemSlot } from "../systems/equipment";
import type { EquipmentSlot, ItemId } from "../types";

const HANDLE = 0x6b4a2e;
const GUARD = 0xc9a45c;
const SILHOUETTE = 0x5a5040;

interface IconColors {
  main: number;
  accent: number;
}

/** Cria o ícone de um item (ou a silhueta do espaço, se `id` for null). */
export function createItemIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  slot: EquipmentSlot,
  id: ItemId | null,
): Phaser.GameObjects.Container {
  const icon = scene.add.container(x, y);
  const colors = id ? getIconColors(id) : null;
  const main = colors?.main ?? SILHOUETTE;
  const accent = colors?.accent ?? SILHOUETTE;
  const detail = colors ? undefined : SILHOUETTE;

  switch (slot) {
    case "weapon":
      icon.add([
        scene.add.rectangle(4, -4, 7, 34, main).setAngle(45), // lâmina
        scene.add.triangle(15, -15, -4, 3, 4, 3, 0, -5, main).setAngle(45),
        scene.add.rectangle(-8, 8, 16, 5, detail ?? GUARD).setAngle(45),
        scene.add.rectangle(-12, 12, 5, 10, detail ?? HANDLE).setAngle(45),
      ]);
      break;

    case "armor":
      icon.add([
        scene.add.triangle(0, 6, -16, -10, 16, -10, 0, 18, accent), // capa
        scene.add.rectangle(0, 0, 22, 26, main), // peitoral
        scene.add.circle(-12, -10, 6, main), // ombreiras
        scene.add.circle(12, -10, 6, main),
        scene.add.rectangle(0, 2, 3, 18, accent, colors ? 0.5 : 1),
      ]);
      break;

    case "amulet":
      icon.add([
        scene.add.circle(0, -6, 13).setStrokeStyle(2, detail ?? GUARD), // corrente
        scene.add.polygon(0, 8, [0, -10, 8, 0, 0, 10, -8, 0], main), // pedra
        scene.add.circle(-2, 5, 2, 0xffffff, colors ? 0.7 : 0),
      ]);
      break;
  }

  if (!colors) {
    icon.setAlpha(0.45);
  }

  return icon;
}

/** Cria o ícone de um item que o herói tem. */
export function createOwnedItemIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  id: ItemId,
): Phaser.GameObjects.Container {
  return createItemIcon(scene, x, y, getItemSlot(id), id);
}

function getIconColors(id: ItemId): IconColors {
  const look = ITEM_LOOKS[id];

  return {
    main: look.blade ?? look.torso ?? look.icon,
    accent: look.cloak ?? look.icon,
  };
}

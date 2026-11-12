// Tipos compartilhados entre os módulos do jogo.

export type Language = "pt" | "en";

/** Etapas da missão, em ordem. */
export const QUEST_STAGES = [
  "talk", // falar com o Ancião
  "hunt", // derrotar o Lobo Corrompido
  "boss", // derrotar Kael
  "ruins", // ir às Ruínas do Santuário
  "guardian", // derrotar o guardião do Fragmento Astral
  "fragment", // pegar o Fragmento Astral no altar
  "portal", // atravessar o portal atrás do altar (início do Capítulo 2)
  "witch", // derrotar a feiticeira do Pântano Sombrio
  "fragment2", // pegar o segundo Fragmento Astral
  "portal2", // atravessar o portal da clareira (início do Capítulo 3)
  "winter", // derrotar o chefe dos Picos Congelados
  "fragment3", // pegar o terceiro Fragmento Astral
  "portal3", // atravessar o portal de fogo no topo dos Picos (início do Capítulo 4)
  "herald", // derrotar o Arauto de Ignis nas Terras Vulcânicas
  "fragment4", // pegar o quarto Fragmento Astral
  "complete", // Capítulo 4 concluído
] as const;

export type QuestStage = (typeof QUEST_STAGES)[number];

/** Áreas (mapas) do jogo. Cada área é uma cena do Phaser. */
export type AreaId = "forest" | "ruins" | "swamp" | "peaks" | "volcano";

/** Tipos de inimigos comuns (os chefes são tratados à parte). */
export type EnemyKind = "wolf" | "spider" | "wisp" | "iceKnight";

// Equipamentos. Cada espaço (arma, armadura, amuleto) tem os seus itens.
// Os números de cada item ficam em config.ts; nomes e descrições, em texts.ts.
export const WEAPON_IDS = [
  "ironSword",
  "corruptedBlade",
  "glacialBlade",
] as const;
export const ARMOR_IDS = ["travelerTunic", "stoneArmor"] as const;
export const AMULET_IDS = ["swampAmulet"] as const;
export const ITEM_IDS = [...WEAPON_IDS, ...ARMOR_IDS, ...AMULET_IDS] as const;

export type WeaponId = (typeof WEAPON_IDS)[number];
export type ArmorId = (typeof ARMOR_IDS)[number];
export type AmuletId = (typeof AMULET_IDS)[number];
export type ItemId = (typeof ITEM_IDS)[number];

/** Raridade de um item (só muda a cor no inventário). */
export type Rarity = "common" | "uncommon" | "rare" | "veryRare";

export type EquipmentSlot = "weapon" | "armor" | "amulet";

/**
 * O que o herói está usando. null = espaço vazio
 * (arma: luta no soco; armadura: sem proteção; amuleto: nenhum).
 */
export interface EquippedItems {
  weapon: WeaponId | null;
  armor: ArmorId | null;
  amulet: AmuletId | null;
}

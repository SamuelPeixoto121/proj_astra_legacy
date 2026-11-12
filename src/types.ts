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
  "complete", // Capítulo 3 concluído
] as const;

export type QuestStage = (typeof QUEST_STAGES)[number];

/** Áreas (mapas) do jogo. Cada área é uma cena do Phaser. */
export type AreaId = "forest" | "ruins" | "swamp" | "peaks";

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

export type EquipmentSlot = "weapon" | "armor" | "amulet";

/** O que o herói está usando (amuleto: null = nenhum). */
export interface EquippedItems {
  weapon: WeaponId;
  armor: ArmorId;
  amulet: AmuletId | null;
}

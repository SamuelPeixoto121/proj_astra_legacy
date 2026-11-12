// Equipamentos do herói: arma, armadura e amuleto.
// Os itens obtidos e os equipados ficam em `progress` (vão para o save).
// Aqui ficam: a qual espaço cada item pertence, as cores de cada um e o
// cálculo dos atributos finais do herói (getHeroStats).

import {
  AMULET_STATS,
  ARMOR_STATS,
  PLAYER_STATS,
  POTION_STATS,
  UNARMED_STATS,
  UNARMORED_STATS,
  WEAPON_STATS,
} from "../config";
import {
  AMULET_IDS,
  ARMOR_IDS,
  WEAPON_IDS,
  type AmuletId,
  type ArmorId,
  type EquippedItems,
  type EquipmentSlot,
  type ItemId,
  type Rarity,
  type WeaponId,
} from "../types";
import { TEXTS, type Localized } from "../i18n/texts";
import { progress } from "./progress";
import type { PlayerLook } from "../characters/player";

/** Cor da camisa simples que o herói usa sem armadura. */
const UNARMORED_TORSO = 0x8a7a66;

/**
 * Cores de cada item:
 * - icon: brilho do item no chão (e no menu de equipamento);
 * - blade (armas): cor da lâmina;
 * - torso/cloak (armaduras): cor do peito e da capa do herói.
 */
export const ITEM_LOOKS: Record<
  ItemId,
  { icon: number; blade?: number; torso?: number; cloak?: number }
> = {
  ironSword: { icon: 0xd7d8c9, blade: 0xd7d8c9 },
  corruptedBlade: { icon: 0xe05a7a, blade: 0xc0405c },
  glacialBlade: { icon: 0x9fe8ff, blade: 0xbfeeff },
  travelerTunic: { icon: 0xb6a47b, torso: 0xb6a47b, cloak: 0x762e36 },
  stoneArmor: { icon: 0xa9a6b8, torso: 0x8f8c9c, cloak: 0x4f4d5a },
  swampAmulet: { icon: 0x7fffd4 },
};

/** Raridade de cada item (cor da borda e do nome no inventário). */
export const ITEM_RARITY: Record<ItemId, Rarity> = {
  ironSword: "common",
  travelerTunic: "common",
  corruptedBlade: "uncommon",
  stoneArmor: "uncommon",
  swampAmulet: "rare",
  glacialBlade: "veryRare",
};

export const RARITY_COLORS: Record<Rarity, number> = {
  common: 0xa8a29a,
  uncommon: 0x5fcf6a,
  rare: 0x4fa3ff,
  veryRare: 0xc27bff,
};

export function isWeapon(id: ItemId): id is WeaponId {
  return (WEAPON_IDS as readonly ItemId[]).includes(id);
}

export function isArmor(id: ItemId): id is ArmorId {
  return (ARMOR_IDS as readonly ItemId[]).includes(id);
}

export function isAmulet(id: ItemId): id is AmuletId {
  return (AMULET_IDS as readonly ItemId[]).includes(id);
}

export function getItemSlot(id: ItemId): EquipmentSlot {
  if (isWeapon(id)) return "weapon";
  if (isArmor(id)) return "armor";
  return "amulet";
}

export function ownsItem(id: ItemId): boolean {
  return progress.ownedItems.includes(id);
}

/** Equipa um item (que o herói já tem) no espaço dele. */
export function equipItem(id: ItemId): void {
  if (isWeapon(id)) {
    progress.equipped.weapon = id;
  } else if (isArmor(id)) {
    progress.equipped.armor = id;
  } else {
    progress.equipped.amulet = id;
  }
}

/** Dá um item novo ao herói e já o equipa. */
export function grantItem(id: ItemId): void {
  if (!ownsItem(id)) {
    progress.ownedItems.push(id);
  }

  equipItem(id);
}

/** Atributos do herói com os equipamentos atuais. */
export interface HeroStats {
  attackDamage: number;
  attackCooldown: number;
  /** Fração do dano recebido (0.7 = 30% a menos). */
  damageTaken: number;
  speed: number;
  potionHeal: number;
  rollCooldown: number;
}

/**
 * Atributos com os equipamentos atuais (ou com outros, para comparar:
 * a tela de equipamento mostra o que mudaria ao trocar um item).
 */
export function getHeroStats(
  equipped: EquippedItems = progress.equipped,
): HeroStats {
  const weapon = equipped.weapon
    ? WEAPON_STATS[equipped.weapon]
    : UNARMED_STATS;
  const armor = equipped.armor ? ARMOR_STATS[equipped.armor] : UNARMORED_STATS;
  const amulet = equipped.amulet
    ? AMULET_STATS[equipped.amulet]
    : { potionHeal: 1, rollCooldown: 1 };

  return {
    attackDamage: weapon.attackDamage,
    attackCooldown: weapon.attackCooldown,
    damageTaken: armor.damageTaken,
    speed: PLAYER_STATS.speed * armor.speed,
    potionHeal: Math.round(POTION_STATS.heal * amulet.potionHeal),
    rollCooldown: PLAYER_STATS.rollCooldown * amulet.rollCooldown,
  };
}

/** Cores do herói com os equipamentos atuais. */
export function getHeroLook(): PlayerLook {
  const { weapon, armor } = progress.equipped;
  const armorLook = armor ? ITEM_LOOKS[armor] : null;

  return {
    blade: weapon ? (ITEM_LOOKS[weapon].blade ?? 0xd7d8c9) : null,
    torso: armorLook ? (armorLook.torso ?? 0xb6a47b) : UNARMORED_TORSO,
    cloak: armorLook ? (armorLook.cloak ?? 0x762e36) : null,
  };
}

/** Esvazia um espaço (arma: soco; armadura: sem proteção). */
export function unequipSlot(slot: EquipmentSlot): void {
  progress.equipped[slot] = null;
}

/** Itens que o herói tem para um espaço (na ordem de ITEM_IDS). */
export function getOwnedItemsForSlot(slot: EquipmentSlot): ItemId[] {
  return progress.ownedItems.filter((id) => getItemSlot(id) === slot);
}

/** Item em uso num espaço (null = vazio). */
export function getEquippedItem(slot: EquipmentSlot): ItemId | null {
  return progress.equipped[slot];
}

/** Os números de um espaço vazio (soco, sem armadura, sem amuleto). */
export function describeEmptySlot(slot: EquipmentSlot): Localized {
  switch (slot) {
    case "weapon":
      return TEXTS.equipment.weaponStats(
        UNARMED_STATS.attackDamage,
        UNARMED_STATS.attackCooldown,
      );
    case "armor":
      return TEXTS.equipment.armorStats(
        UNARMORED_STATS.damageTaken,
        UNARMORED_STATS.speed,
      );
    case "amulet":
      return TEXTS.equipment.amuletStats(
        POTION_STATS.heal,
        PLAYER_STATS.rollCooldown,
      );
  }
}

/** Os números de um item, em texto. */
export function describeItemStats(id: ItemId): Localized {
  if (isWeapon(id)) {
    const weapon = WEAPON_STATS[id];
    return TEXTS.equipment.weaponStats(
      weapon.attackDamage,
      weapon.attackCooldown,
    );
  }

  if (isArmor(id)) {
    const armor = ARMOR_STATS[id];
    return TEXTS.equipment.armorStats(armor.damageTaken, armor.speed);
  }

  const amulet = AMULET_STATS[id];
  return TEXTS.equipment.amuletStats(
    Math.round(POTION_STATS.heal * amulet.potionHeal),
    PLAYER_STATS.rollCooldown * amulet.rollCooldown,
  );
}

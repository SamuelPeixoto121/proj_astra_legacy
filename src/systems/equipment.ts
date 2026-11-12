// Equipamentos do herói: arma, armadura e amuleto.
// Os itens obtidos e os equipados ficam em `progress` (vão para o save).
// Aqui ficam: a qual espaço cada item pertence, as cores de cada um e o
// cálculo dos atributos finais do herói (getHeroStats).

import {
  AMULET_STATS,
  ARMOR_STATS,
  PLAYER_STATS,
  POTION_STATS,
  WEAPON_STATS,
} from "../config";
import {
  AMULET_IDS,
  ARMOR_IDS,
  WEAPON_IDS,
  type AmuletId,
  type ArmorId,
  type EquipmentSlot,
  type ItemId,
  type WeaponId,
} from "../types";
import { progress } from "./progress";

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
  travelerTunic: { icon: 0xb6a47b, torso: 0xb6a47b, cloak: 0x762e36 },
  stoneArmor: { icon: 0xa9a6b8, torso: 0x8f8c9c, cloak: 0x4f4d5a },
  swampAmulet: { icon: 0x7fffd4 },
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

export function getHeroStats(): HeroStats {
  const weapon = WEAPON_STATS[progress.equipped.weapon];
  const armor = ARMOR_STATS[progress.equipped.armor];
  const amulet = progress.equipped.amulet
    ? AMULET_STATS[progress.equipped.amulet]
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
export function getHeroLook(): { blade: number; torso: number; cloak: number } {
  const weapon = ITEM_LOOKS[progress.equipped.weapon];
  const armor = ITEM_LOOKS[progress.equipped.armor];

  return {
    blade: weapon.blade ?? 0xd7d8c9,
    torso: armor.torso ?? 0xb6a47b,
    cloak: armor.cloak ?? 0x762e36,
  };
}

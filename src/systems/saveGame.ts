// Salvamento automático do progresso no navegador (localStorage).
// O save sobrevive ao fechar a aba, mas fica só neste navegador.

import {
  CHECKPOINTS,
  POTION_STATS,
  STARTING_ITEMS,
  createStartingEquipment,
  type CheckpointId,
} from "../config";
import {
  AMULET_IDS,
  ARMOR_IDS,
  ITEM_IDS,
  QUEST_STAGES,
  WEAPON_IDS,
  type AmuletId,
  type ArmorId,
  type EquippedItems,
  type ItemId,
  type Language,
  type QuestStage,
  type WeaponId,
} from "../types";
import type { GameProgress } from "./progress";

const SAVE_KEY = "astra-legacy:save";

// Aumente este número se o formato do save mudar no futuro.
// Saves de versões antigas são ignorados em vez de quebrar o jogo.
// Versão 2: áreas (Ruínas do Santuário) e kaelDefeated.
// Versão 3: poções de cura (potions). Saves da versão 2 continuam valendo:
// o herói recebe a quantidade inicial de poções.
// Versão 4: equipamentos (ownedItems, equipped). Saves das versões 2 e 3
// continuam valendo: o herói fica com os itens iniciais (os itens dos
// chefes já derrotados reaparecem no lugar onde cada chefe caiu).
// Versão 5: Capítulo 3. Antes, "complete" era o fim do Capítulo 2; agora
// é o fim do Capítulo 3, então saves antigos com "complete" passam para
// "portal2" (atravessar o portal da clareira do pântano).
// Versão 6: arma e armadura podem ficar vazias (null = soco / sem armadura).
// Saves antigos continuam valendo (neles os dois espaços sempre têm item).
const SAVE_VERSION = 6;
const COMPATIBLE_VERSIONS: readonly unknown[] = [2, 3, 4, 5, SAVE_VERSION];

export type SaveData = GameProgress;

const LANGUAGES: readonly Language[] = ["pt", "en"];

export function saveGame(data: SaveData): void {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION, ...data }),
    );
  } catch {
    // Navegação privada ou armazenamento bloqueado: o jogo segue sem salvar.
  }
}

/** Devolve o save, ou null se não existir ou estiver inválido. */
export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);

    if (!raw) {
      return null;
    }

    return parseSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nada a fazer se o armazenamento estiver bloqueado.
  }
}

/** Confere cada campo para que um save corrompido não quebre o jogo. */
function parseSave(value: unknown): SaveData | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const save = value as Record<string, unknown>;

  const isValid =
    COMPATIBLE_VERSIONS.includes(save.version) &&
    LANGUAGES.includes(save.language as Language) &&
    QUEST_STAGES.includes(save.questStage as QuestStage) &&
    typeof save.elderTalked === "boolean" &&
    typeof save.wolfDefeated === "boolean" &&
    typeof save.kaelUnlocked === "boolean" &&
    typeof save.kaelDefeated === "boolean" &&
    typeof save.checkpointId === "string" &&
    save.checkpointId in CHECKPOINTS;

  if (!isValid) {
    return null;
  }

  return {
    language: save.language as Language,
    questStage: migrateQuestStage(
      save.questStage as QuestStage,
      save.version as number,
    ),
    elderTalked: save.elderTalked as boolean,
    wolfDefeated: save.wolfDefeated as boolean,
    kaelUnlocked: save.kaelUnlocked as boolean,
    kaelDefeated: save.kaelDefeated as boolean,
    checkpointId: save.checkpointId as CheckpointId,
    potions: parsePotions(save.potions),
    ...parseEquipment(save.ownedItems, save.equipped),
  };
}

/** Quantidade de poções válida (entre 0 e o máximo); padrão: a inicial. */
function parsePotions(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return POTION_STATS.start;
  }

  return Math.min(POTION_STATS.max, Math.max(0, value));
}

/**
 * Itens obtidos e equipados. Itens desconhecidos são descartados; um item
 * equipado que o herói não tem volta ao item inicial daquele espaço.
 */
function parseEquipment(
  ownedValue: unknown,
  equippedValue: unknown,
): { ownedItems: ItemId[]; equipped: EquippedItems } {
  const owned = new Set<ItemId>(STARTING_ITEMS);

  if (Array.isArray(ownedValue)) {
    for (const id of ownedValue) {
      if (ITEM_IDS.includes(id as ItemId)) {
        owned.add(id as ItemId);
      }
    }
  }

  const ownedItems = [...owned];
  const equipped = createStartingEquipment();
  const saved = (
    typeof equippedValue === "object" && equippedValue !== null
      ? equippedValue
      : {}
  ) as Record<string, unknown>;

  const isOwned = (id: unknown): boolean => owned.has(id as ItemId);

  // null salvo de propósito = espaço vazio (soco / sem armadura).
  if (saved.weapon === null) {
    equipped.weapon = null;
  } else if (
    WEAPON_IDS.includes(saved.weapon as WeaponId) &&
    isOwned(saved.weapon)
  ) {
    equipped.weapon = saved.weapon as WeaponId;
  }

  if (saved.armor === null) {
    equipped.armor = null;
  } else if (
    ARMOR_IDS.includes(saved.armor as ArmorId) &&
    isOwned(saved.armor)
  ) {
    equipped.armor = saved.armor as ArmorId;
  }

  if (AMULET_IDS.includes(saved.amulet as AmuletId) && isOwned(saved.amulet)) {
    equipped.amulet = saved.amulet as AmuletId;
  }

  return { ownedItems, equipped };
}

/** Ajusta a etapa da missão de saves de versões antigas. */
function migrateQuestStage(stage: QuestStage, version: number): QuestStage {
  return version < 5 && stage === "complete" ? "portal2" : stage;
}

// Salvamento automático do progresso no navegador (localStorage).
// O save sobrevive ao fechar a aba, mas fica só neste navegador.

import { CHECKPOINTS, POTION_STATS, type CheckpointId } from "../config";
import { QUEST_STAGES, type Language, type QuestStage } from "../types";
import type { GameProgress } from "./progress";

const SAVE_KEY = "astra-legacy:save";

// Aumente este número se o formato do save mudar no futuro.
// Saves de versões antigas são ignorados em vez de quebrar o jogo.
// Versão 2: áreas (Ruínas do Santuário) e kaelDefeated.
// Versão 3: poções de cura (potions). Saves da versão 2 continuam valendo:
// o herói recebe a quantidade inicial de poções.
const SAVE_VERSION = 3;
const COMPATIBLE_VERSIONS: readonly unknown[] = [2, SAVE_VERSION];

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
    questStage: save.questStage as QuestStage,
    elderTalked: save.elderTalked as boolean,
    wolfDefeated: save.wolfDefeated as boolean,
    kaelUnlocked: save.kaelUnlocked as boolean,
    kaelDefeated: save.kaelDefeated as boolean,
    checkpointId: save.checkpointId as CheckpointId,
    potions: parsePotions(save.potions),
  };
}

/** Quantidade de poções válida (entre 0 e o máximo); padrão: a inicial. */
function parsePotions(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return POTION_STATS.start;
  }

  return Math.min(POTION_STATS.max, Math.max(0, value));
}

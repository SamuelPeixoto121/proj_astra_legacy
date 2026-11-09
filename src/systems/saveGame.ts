// Salvamento automático do progresso no navegador (localStorage).
// O save sobrevive ao fechar a aba, mas fica só neste navegador.

import { CHECKPOINTS, type CheckpointId } from "../config";
import type { Language, QuestStage } from "../types";

const SAVE_KEY = "astra-legacy:save";

// Aumente este número se o formato do save mudar no futuro.
// Saves de versões antigas são ignorados em vez de quebrar o jogo.
const SAVE_VERSION = 1;

export interface SaveData {
  language: Language;
  questStage: QuestStage;
  elderTalked: boolean;
  wolfDefeated: boolean;
  kaelUnlocked: boolean;
  checkpointId: CheckpointId;
}

const LANGUAGES: readonly Language[] = ["pt", "en"];
const QUEST_STAGES: readonly QuestStage[] = ["talk", "hunt", "boss", "complete"];

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
    save.version === SAVE_VERSION &&
    LANGUAGES.includes(save.language as Language) &&
    QUEST_STAGES.includes(save.questStage as QuestStage) &&
    typeof save.elderTalked === "boolean" &&
    typeof save.wolfDefeated === "boolean" &&
    typeof save.kaelUnlocked === "boolean" &&
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
    checkpointId: save.checkpointId as CheckpointId,
  };
}

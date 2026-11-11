// Progresso do jogador, compartilhado por todas as áreas (cenas).
// É isto que é salvo no navegador: ao trocar de área ou reiniciar,
// as cenas leem daqui em vez de guardar o progresso por conta própria.

import type { CheckpointId } from "../config";
import type { Language, QuestStage } from "../types";
import { loadGame, saveGame } from "./saveGame";
import { readLanguagePreference } from "./preferences";

export interface GameProgress {
  language: Language;
  questStage: QuestStage;
  elderTalked: boolean;
  wolfDefeated: boolean;
  kaelUnlocked: boolean;
  kaelDefeated: boolean;
  checkpointId: CheckpointId;
}

function createInitialProgress(): GameProgress {
  return {
    // O idioma vem da preferência guardada (vale também para jogo novo).
    language: readLanguagePreference() ?? "pt",
    questStage: "talk",
    elderTalked: false,
    wolfDefeated: false,
    kaelUnlocked: false,
    kaelDefeated: false,
    checkpointId: "village",
  };
}

/** O progresso atual. As cenas leem e alteram este objeto. */
export const progress: GameProgress = createInitialProgress();

/** Volta ao começo de um jogo novo. */
export function resetProgress(): void {
  Object.assign(progress, createInitialProgress());
}

/** Carrega o save. Devolve false se não houver save válido (nada muda). */
export function loadProgress(): boolean {
  const save = loadGame();

  if (!save) {
    return false;
  }

  Object.assign(progress, save);

  // A preferência de idioma vale mais que o idioma guardado no save.
  progress.language = readLanguagePreference() ?? save.language;

  return true;
}

export function saveProgress(): void {
  saveGame({ ...progress });
}

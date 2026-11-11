// Preferências da pessoa que joga, guardadas no navegador separadas do save:
// continuam valendo ao começar um jogo novo ou apagar o progresso.

import type { Language } from "../types";

const LANGUAGE_KEY = "astra-legacy:language";

/** Idioma escolhido, ou null se a pessoa nunca escolheu. */
export function readLanguagePreference(): Language | null {
  try {
    const value = localStorage.getItem(LANGUAGE_KEY);
    return value === "pt" || value === "en" ? value : null;
  } catch {
    return null;
  }
}

export function saveLanguagePreference(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Armazenamento bloqueado: a escolha vale só nesta sessão.
  }
}

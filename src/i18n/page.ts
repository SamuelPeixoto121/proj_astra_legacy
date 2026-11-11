// Traduz os textos da página HTML ao redor do jogo (cabeçalho, rodapé, aba).
// A cena avisa a troca de idioma pelo evento LANGUAGE_CHANGED_EVENT,
// assim o código do jogo não precisa conhecer o HTML.

import type { Language } from "../types";
import { TEXTS } from "./texts";

export const LANGUAGE_CHANGED_EVENT = "language-changed";

export function updatePageLanguage(language: Language): void {
  const page = TEXTS.page;

  document.documentElement.lang = language === "pt" ? "pt-BR" : "en";
  document.title = page.title[language];

  setText("page-subtitle", page.subtitle[language]);
  setText("page-tagline", page.tagline[language]);

  const controls = document.getElementById("page-controls");

  if (controls) {
    // Monta "<strong>J</strong> atacar • ..." sem usar innerHTML.
    const parts = page.controls[language].flatMap(([key, action], index) => {
      const strong = document.createElement("strong");
      strong.textContent = key;

      const separator = index > 0 ? ["  •  "] : [];

      return [...separator, strong, ` ${action}`];
    });

    controls.replaceChildren(...parts);
  }
}

function setText(id: string, text: string): void {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = text;
  }
}

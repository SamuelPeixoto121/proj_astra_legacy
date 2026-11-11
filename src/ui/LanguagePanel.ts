// Painel "Escolha o idioma" (usado na tela inicial e no menu de pausa).
// Os nomes dos idiomas aparecem na própria língua, como é padrão em jogos.

import type Phaser from "phaser";
import { TEXTS } from "../i18n/texts";
import { audio } from "../audio/engine";
import { progress } from "../systems/progress";
import { saveLanguagePreference } from "../systems/preferences";
import type { Language } from "../types";
import { Menu } from "./Menu";

const LANGUAGE_NAMES: Record<Language, string> = {
  pt: "Português",
  en: "English",
};

export class LanguagePanel {
  isOpen = false;

  private readonly box: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly menu: Menu;
  private onClose?: () => void;

  constructor(scene: Phaser.Scene) {
    this.box = scene.add
      .rectangle(0, 0, 360, 230, 0x111710, 0.96)
      .setStrokeStyle(2, 0xc2a76b, 0.95)
      .setVisible(false);

    this.title = scene.add
      .text(0, 0, "", {
        fontFamily: "Georgia, serif",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#f0dfac",
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Criado depois da caixa para as opções ficarem por cima dela.
    this.menu = new Menu(scene);
  }

  /** Abre o painel. `onClose` é chamado ao fechar (com ou sem troca). */
  open(onClose: () => void): void {
    this.isOpen = true;
    this.onClose = onClose;

    this.box.setVisible(true);
    this.title.setVisible(true).setText(TEXTS.title.languagePanelTitle[progress.language]);

    const languageOption = (language: Language) => ({
      label: () => {
        const name = LANGUAGE_NAMES[language];
        return language === progress.language ? `${name}  ✓` : name;
      },
      onSelect: () => {
        progress.language = language;
        saveLanguagePreference(language);
        this.close();
      },
    });

    audio.play("tick");

    this.menu.setOptions(
      [
        languageOption("pt"),
        languageOption("en"),
        {
          label: () => TEXTS.title.back[progress.language],
          onSelect: () => this.close(),
        },
      ],
      // Começa com o idioma atual selecionado.
      progress.language === "pt" ? 0 : 1,
    );
  }

  close(): void {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.box.setVisible(false);
    this.title.setVisible(false);
    this.menu.setOptions([]);

    audio.play("tick");
    this.onClose?.();
  }

  /** Centro do painel. */
  setPosition(x: number, centerY: number): void {
    this.box.setPosition(x, centerY);
    this.title.setPosition(x, centerY - 80);
    this.menu.setPosition(x, centerY - 30);
  }

  update(): void {
    if (this.isOpen) {
      this.menu.update();
    }
  }
}

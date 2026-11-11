// Tela inicial: título, menu (Continuar / Novo jogo / Idioma) e fundo animado.
// É a primeira cena do jogo. "Idioma" abre um painel para escolher o idioma.
//
// Teclado: ↑ ↓ (ou W S) escolhem, Enter (ou E, J, Espaço) confirma,
// Esc fecha o painel de idioma, L abre o painel, M liga/desliga o som.
// Mouse também funciona: passar por cima seleciona, clicar confirma.

import Phaser from "phaser";
import { AREA_FADE_TIME } from "../config";
import { TEXTS, type Localized } from "../i18n/texts";
import { LANGUAGE_CHANGED_EVENT } from "../i18n/page";
import { audio } from "../audio/engine";
import { clearSave, loadGame } from "../systems/saveGame";
import { progress, resetProgress } from "../systems/progress";
import { saveLanguagePreference } from "../systems/preferences";
import type { Language } from "../types";
import { AREA_SCENE_KEYS, TITLE_SCENE_KEY, startFromSave } from "./areas";

/** O que cada opção faz ao ser confirmada. */
type MenuAction =
  | { type: "continue" }
  | { type: "newGame" }
  | { type: "openLanguages" }
  | { type: "setLanguage"; language: Language }
  | { type: "back" };

interface MenuItem {
  action: MenuAction;
  text: Phaser.GameObjects.Text;
}

/** "main" = menu principal; "language" = painel de idioma aberto. */
type MenuMode = "main" | "language";

/** Nome de cada idioma escrito nele mesmo (padrão em jogos). */
const LANGUAGE_NAMES: Record<Language, string> = {
  pt: "Português",
  en: "English",
};

const COLOR_SELECTED = "#f0dfac";
const COLOR_IDLE = "#8f9a86";
const COLOR_WARNING = "#ff9aa8";

const ITEM_SPACING = 46;

export class TitleScene extends Phaser.Scene {
  private mode: MenuMode = "main";
  private items: MenuItem[] = [];
  private selected = 0;
  private hasSave = false;
  /** true depois do primeiro Enter em "Novo jogo" com um save existente. */
  private confirmingNewGame = false;
  private leaving = false;

  private glowOuter!: Phaser.GameObjects.Arc;
  private glowInner!: Phaser.GameObjects.Arc;
  private logo!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private treeline!: Phaser.GameObjects.Graphics;
  private panel!: Phaser.GameObjects.Rectangle;
  private panelTitle!: Phaser.GameObjects.Text;

  private keys!: {
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
    confirm: Phaser.Input.Keyboard.Key[];
    back: Phaser.Input.Keyboard.Key;
    language: Phaser.Input.Keyboard.Key;
    mute: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super(TITLE_SCENE_KEY);
  }

  create(): void {
    this.mode = "main";
    this.items = [];
    this.selected = 0;
    this.confirmingNewGame = false;
    this.leaving = false;
    this.hasSave = loadGame() !== null;

    // A música da floresta já toca no menu e continua no jogo novo.
    audio.setDrums(false);
    audio.setMusic("forest");

    this.cameras.main.setBackgroundColor("#0b110d");

    this.createBackground();
    this.createTexts();
    this.createLanguagePanel();
    this.createInput();

    this.buildMenu("main", 0);

    this.scale.on("resize", this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.layout, this);
    });

    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ---------------------------------------------------------------------------
  // Visual
  // ---------------------------------------------------------------------------

  private createBackground(): void {
    // Brilho de Astra atrás do título, pulsando devagar.
    this.glowOuter = this.add.circle(0, 0, 190, 0xfff0b0, 0.05);
    this.glowInner = this.add.circle(0, 0, 100, 0xfff0b0, 0.07);

    this.tweens.add({
      targets: [this.glowOuter, this.glowInner],
      scale: { from: 0.92, to: 1.08 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    // Partículas de luz subindo (poeira astral). Espalhadas numa área
    // grande para continuar cobrindo a tela se a janela crescer.
    for (let i = 0; i < 55; i++) {
      const x = Phaser.Math.Between(0, 2200);
      const y = Phaser.Math.Between(0, 1400);
      const mote = this.add.circle(
        x,
        y,
        Phaser.Math.FloatBetween(1, 2.4),
        Phaser.Math.RND.pick([0xfff0b0, 0xc8e6b0, 0xd9c8ff]),
        Phaser.Math.FloatBetween(0.2, 0.7),
      );

      this.tweens.add({
        targets: mote,
        y: y - Phaser.Math.Between(120, 320),
        alpha: 0,
        duration: Phaser.Math.Between(5000, 11000),
        delay: Phaser.Math.Between(0, 4000),
        repeat: -1,
        onRepeat: () => mote.setAlpha(Phaser.Math.FloatBetween(0.2, 0.7)),
      });
    }

    // Silhueta da floresta, redesenhada em layout() conforme a largura.
    this.treeline = this.add.graphics();
  }

  private createTexts(): void {
    this.logo = this.add
      .text(0, 0, "ASTRA LEGACY", {
        fontFamily: "Georgia, serif",
        fontSize: "64px",
        fontStyle: "bold",
        color: "#f0dfac",
        stroke: "#0d140f",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.subtitle = this.add
      .text(0, 0, "", {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        fontStyle: "italic",
        color: "#c8d6b0",
      })
      .setOrigin(0.5);

    this.hint = this.add
      .text(0, 0, "", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#7d8a74",
      })
      .setOrigin(0.5);
  }

  /** Painel do idioma: caixa com título; as opções são criadas em buildMenu(). */
  private createLanguagePanel(): void {
    this.panel = this.add
      .rectangle(0, 0, 360, 230, 0x111710, 0.96)
      .setStrokeStyle(2, 0xc2a76b, 0.95)
      .setVisible(false);

    this.panelTitle = this.add
      .text(0, 0, "", {
        fontFamily: "Georgia, serif",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#f0dfac",
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  /** Posiciona tudo conforme o tamanho atual da tela. */
  private layout(): void {
    const { width, height } = this.scale;
    const logoY = height * 0.3;
    const centerX = width / 2;

    this.glowOuter.setPosition(centerX, logoY);
    this.glowInner.setPosition(centerX, logoY);
    this.logo.setPosition(centerX, logoY);
    this.subtitle.setPosition(centerX, logoY + 54);

    const menuTop = height * 0.56;

    // O painel de idioma fica centralizado onde fica o menu.
    const panelCenterY = menuTop + ITEM_SPACING;

    this.panel.setPosition(centerX, panelCenterY);
    this.panelTitle.setPosition(centerX, panelCenterY - 80);

    const itemsTop = this.mode === "language" ? panelCenterY - 30 : menuTop;

    this.items.forEach(({ text }, index) => {
      text.setPosition(centerX, itemsTop + index * ITEM_SPACING);
    });

    this.hint.setPosition(centerX, height - 30);

    this.drawTreeline(width, height);
  }

  private drawTreeline(width: number, height: number): void {
    const g = this.treeline;

    g.clear();
    g.fillStyle(0x070b08, 1);
    g.fillRect(0, height - 60, width, 60);

    // Árvores com alturas "aleatórias", mas sempre iguais (sem sorteio).
    for (let x = -20; x < width + 40; x += 34) {
      const size = 36 + ((x * 7) % 5) * 9;

      g.fillTriangle(
        x - 22,
        height - 52,
        x + 22,
        height - 52,
        x,
        height - 52 - size * 1.6,
      );
      g.fillCircle(x, height - 52 - size * 0.5, size * 0.45);
    }
  }

  // ---------------------------------------------------------------------------
  // Menu
  // ---------------------------------------------------------------------------

  /** Monta as opções do modo indicado (menu principal ou painel de idioma). */
  private buildMenu(mode: MenuMode, selected: number): void {
    for (const item of this.items) {
      item.text.destroy();
    }

    this.mode = mode;
    this.selected = selected;
    this.confirmingNewGame = false;

    const actions: MenuAction[] =
      mode === "language"
        ? [
            { type: "setLanguage", language: "pt" },
            { type: "setLanguage", language: "en" },
            { type: "back" },
          ]
        : [
            ...(this.hasSave ? [{ type: "continue" } as const] : []),
            { type: "newGame" },
            { type: "openLanguages" },
          ];

    this.items = actions.map((action, index) => {
      const text = this.add
        .text(0, 0, "", {
          fontFamily: "Georgia, serif",
          fontSize: "22px",
          color: COLOR_IDLE,
          stroke: "#0d140f",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      text.on("pointerover", () => this.select(index));
      text.on("pointerdown", () => {
        this.select(index);
        this.confirm();
      });

      return { action, text };
    });

    const panelOpen = mode === "language";

    this.panel.setVisible(panelOpen);
    this.panelTitle.setVisible(panelOpen);

    this.layout();
    this.refreshTexts();
  }

  private t<T>(text: Localized<T>): T {
    return text[progress.language];
  }

  private labelFor(action: MenuAction): string {
    switch (action.type) {
      case "continue":
        return this.t(TEXTS.title.continue);
      case "newGame":
        return this.confirmingNewGame
          ? this.t(TEXTS.title.confirmNewGame)
          : this.t(TEXTS.title.newGame);
      case "openLanguages":
        return this.t(TEXTS.title.language);
      case "setLanguage": {
        const name = LANGUAGE_NAMES[action.language];
        return action.language === progress.language ? `${name}  ✓` : name;
      }
      case "back":
        return this.t(TEXTS.title.back);
    }
  }

  private refreshTexts(): void {
    this.subtitle.setText(this.t(TEXTS.page.subtitle));
    this.panelTitle.setText(this.t(TEXTS.title.languagePanelTitle));

    const hint =
      this.mode === "language" ? TEXTS.title.panelHint : TEXTS.title.hint;
    const sound = audio.isMuted() ? TEXTS.title.soundOff : TEXTS.title.soundOn;

    this.hint.setText(`${this.t(hint)}   •   ${this.t(sound)}`);

    this.items.forEach(({ action, text }, index) => {
      const isSelected = index === this.selected;
      const label = this.labelFor(action);
      const warning = action.type === "newGame" && this.confirmingNewGame;

      text.setText(isSelected ? `◆  ${label}  ◆` : label);
      text.setColor(
        warning ? COLOR_WARNING : isSelected ? COLOR_SELECTED : COLOR_IDLE,
      );
    });

    // A página HTML ao redor do jogo acompanha o idioma.
    this.game.events.emit(LANGUAGE_CHANGED_EVENT, progress.language);
  }

  private select(index: number): void {
    if (index === this.selected || this.leaving) {
      return;
    }

    this.selected = index;
    this.confirmingNewGame = false;
    audio.play("tick");
    this.refreshTexts();
  }

  private move(delta: number): void {
    const count = this.items.length;
    this.select((this.selected + delta + count) % count);
  }

  private confirm(): void {
    if (this.leaving) {
      return;
    }

    const { action } = this.items[this.selected];

    switch (action.type) {
      case "continue":
        this.leave(() => startFromSave(this));
        return;

      case "newGame":
        // Com um save existente, pede confirmação antes de apagar.
        if (this.hasSave && !this.confirmingNewGame) {
          this.confirmingNewGame = true;
          audio.play("warning");
          this.refreshTexts();
          return;
        }

        this.leave(() => {
          clearSave();
          resetProgress();
          this.scene.start(AREA_SCENE_KEYS.forest);
        });
        return;

      case "openLanguages":
        this.openLanguagePanel();
        return;

      case "setLanguage":
        progress.language = action.language;
        saveLanguagePreference(action.language);
        this.closeLanguagePanel();
        return;

      case "back":
        this.closeLanguagePanel();
        return;
    }
  }

  private openLanguagePanel(): void {
    audio.play("tick");

    // Começa com o idioma atual selecionado.
    this.buildMenu("language", progress.language === "pt" ? 0 : 1);
  }

  /** Fecha o painel e volta ao menu, com "Idioma" selecionado. */
  private closeLanguagePanel(): void {
    audio.play("tick");
    this.buildMenu("main", this.hasSave ? 2 : 1);
  }

  /** Escurece a tela e então executa `next` (abrir o jogo). */
  private leave(next: () => void): void {
    this.leaving = true;
    audio.play("shrine");

    this.cameras.main.fadeOut(AREA_FADE_TIME * 2, 0, 0, 0);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      next,
    );
  }

  // ---------------------------------------------------------------------------
  // Teclado
  // ---------------------------------------------------------------------------

  private createInput(): void {
    if (!this.input.keyboard) {
      throw new Error("O teclado não está disponível.");
    }

    const keyboard = this.input.keyboard;
    const { KeyCodes } = Phaser.Input.Keyboard;
    const add = (code: number): Phaser.Input.Keyboard.Key =>
      keyboard.addKey(code);

    this.keys = {
      up: [add(KeyCodes.UP), add(KeyCodes.W)],
      down: [add(KeyCodes.DOWN), add(KeyCodes.S)],
      confirm: [
        add(KeyCodes.ENTER),
        add(KeyCodes.SPACE),
        add(KeyCodes.E),
        add(KeyCodes.J),
      ],
      back: add(KeyCodes.ESC),
      language: add(KeyCodes.L),
      mute: add(KeyCodes.M),
    };
  }

  update(): void {
    if (this.leaving) {
      return;
    }

    const pressed = (keys: Phaser.Input.Keyboard.Key[]): boolean =>
      keys.some((key) => Phaser.Input.Keyboard.JustDown(key));

    if (pressed(this.keys.up)) this.move(-1);
    if (pressed(this.keys.down)) this.move(1);
    if (pressed(this.keys.confirm)) this.confirm();

    if (Phaser.Input.Keyboard.JustDown(this.keys.back) && this.mode === "language") {
      this.closeLanguagePanel();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.language) && this.mode === "main") {
      this.openLanguagePanel();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.mute)) {
      audio.toggleMute();
      this.refreshTexts();
    }
  }
}

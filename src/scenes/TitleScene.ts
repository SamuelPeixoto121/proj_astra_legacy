// Tela inicial: título, menu (Continuar / Novo jogo / Idioma) e fundo animado.
// É a primeira cena do jogo. "Idioma" abre o painel de idioma.
//
// Teclado: ↑ ↓ (ou W S) escolhem, Enter (ou E, J, Espaço) confirma,
// Esc fecha o painel de idioma, L abre o painel, M liga/desliga o som.
// Mouse também funciona (ver ui/Menu.ts).

import Phaser from "phaser";
import { AREA_FADE_TIME } from "../config";
import { TEXTS, type Localized } from "../i18n/texts";
import { LANGUAGE_CHANGED_EVENT } from "../i18n/page";
import { audio } from "../audio/engine";
import { clearSave, loadGame } from "../systems/saveGame";
import { progress, resetProgress } from "../systems/progress";
import { Menu, type MenuOption } from "../ui/Menu";
import { LanguagePanel } from "../ui/LanguagePanel";
import { AREA_SCENE_KEYS, TITLE_SCENE_KEY, startFromSave } from "./areas";

const COLOR_WARNING = "#ff9aa8";

export class TitleScene extends Phaser.Scene {
  private menu!: Menu;
  private languagePanel!: LanguagePanel;
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

  private keys!: {
    back: Phaser.Input.Keyboard.Key;
    language: Phaser.Input.Keyboard.Key;
    mute: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super(TITLE_SCENE_KEY);
  }

  create(): void {
    this.confirmingNewGame = false;
    this.leaving = false;
    this.hasSave = loadGame() !== null;

    // A música da floresta já toca no menu e continua no jogo novo.
    audio.setDrums(false);
    audio.setMusic("forest");

    this.cameras.main.setBackgroundColor("#0b110d");

    this.createBackground();
    this.createTexts();
    this.createInput();

    this.menu = new Menu(this);
    this.menu.onSelectionChange = () => {
      this.confirmingNewGame = false;
    };
    this.languagePanel = new LanguagePanel(this);

    this.showMainMenu(0);
    this.layout();
    this.refreshTexts();

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

  /** Posiciona tudo conforme o tamanho atual da tela. */
  private layout(): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const logoY = height * 0.3;
    const menuTop = height * 0.56;

    this.glowOuter.setPosition(centerX, logoY);
    this.glowInner.setPosition(centerX, logoY);
    this.logo.setPosition(centerX, logoY);
    this.subtitle.setPosition(centerX, logoY + 54);

    this.menu.setPosition(centerX, menuTop);
    this.languagePanel.setPosition(centerX, menuTop + 46);

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

  private t<T>(text: Localized<T>): T {
    return text[progress.language];
  }

  private refreshTexts(): void {
    this.subtitle.setText(this.t(TEXTS.page.subtitle));

    const hint = this.languagePanel.isOpen
      ? TEXTS.title.panelHint
      : TEXTS.title.hint;
    const sound = audio.isMuted() ? TEXTS.title.soundOff : TEXTS.title.soundOn;

    this.hint.setText(`${this.t(hint)}   •   ${this.t(sound)}`);
    this.menu.refresh();

    // A página HTML ao redor do jogo acompanha o idioma.
    this.game.events.emit(LANGUAGE_CHANGED_EVENT, progress.language);
  }

  // ---------------------------------------------------------------------------
  // Menu
  // ---------------------------------------------------------------------------

  private showMainMenu(selected: number): void {
    const options: MenuOption[] = [];

    if (this.hasSave) {
      options.push({
        label: () => this.t(TEXTS.title.continue),
        onSelect: () => this.leave(() => startFromSave(this)),
      });
    }

    options.push(
      {
        label: () =>
          this.t(
            this.confirmingNewGame
              ? TEXTS.title.confirmNewGame
              : TEXTS.title.newGame,
          ),
        color: () => (this.confirmingNewGame ? COLOR_WARNING : undefined),
        onSelect: () => this.selectNewGame(),
      },
      {
        label: () => this.t(TEXTS.title.language),
        onSelect: () => this.openLanguagePanel(),
      },
    );

    this.confirmingNewGame = false;
    this.menu.setOptions(options, selected);
  }

  private selectNewGame(): void {
    // Com um save existente, pede confirmação antes de apagar.
    if (this.hasSave && !this.confirmingNewGame) {
      this.confirmingNewGame = true;
      audio.play("warning");
      this.menu.refresh();
      return;
    }

    this.leave(() => {
      clearSave();
      resetProgress();
      this.scene.start(AREA_SCENE_KEYS.forest);
    });
  }

  private openLanguagePanel(): void {
    this.menu.setOptions([]);

    this.languagePanel.open(() => {
      // Volta ao menu com "Idioma" selecionado.
      this.showMainMenu(this.hasSave ? 2 : 1);
      this.refreshTexts();
    });

    this.refreshTexts();
  }

  /** Escurece a tela e então executa `next` (abrir o jogo). */
  private leave(next: () => void): void {
    this.leaving = true;
    this.menu.enabled = false;
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

    const { KeyCodes } = Phaser.Input.Keyboard;

    this.keys = {
      back: this.input.keyboard.addKey(KeyCodes.ESC),
      language: this.input.keyboard.addKey(KeyCodes.L),
      mute: this.input.keyboard.addKey(KeyCodes.M),
    };
  }

  update(): void {
    if (this.leaving) {
      return;
    }

    const { JustDown } = Phaser.Input.Keyboard;

    if (this.languagePanel.isOpen) {
      if (JustDown(this.keys.back)) {
        this.languagePanel.close();
      } else {
        this.languagePanel.update();
      }
    } else {
      if (JustDown(this.keys.language)) {
        this.openLanguagePanel();
      } else {
        this.menu.update();
      }
    }

    if (JustDown(this.keys.mute)) {
      audio.toggleMute();
      this.refreshTexts();
    }
  }
}

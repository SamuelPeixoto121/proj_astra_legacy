// Menu de pausa: abre por cima da área com Esc. A área fica pausada pelo
// próprio Phaser (física, animações e ataques agendados congelam).
// Opções: Continuar / Som / Idioma / Tela inicial. Esc também continua.

import Phaser from "phaser";
import { AREA_FADE_TIME } from "../config";
import { TEXTS, type Localized } from "../i18n/texts";
import { LANGUAGE_CHANGED_EVENT } from "../i18n/page";
import { audio } from "../audio/engine";
import { progress } from "../systems/progress";
import { Menu } from "../ui/Menu";
import { LanguagePanel } from "../ui/LanguagePanel";
import { PAUSE_SCENE_KEY, TITLE_SCENE_KEY } from "./areas";

export interface PauseSceneData {
  /** Chave da cena da área que foi pausada. */
  areaKey: string;
}

/** Posição de "Idioma" no menu (para voltar a ela ao fechar o painel). */
const LANGUAGE_OPTION_INDEX = 2;

export class PauseScene extends Phaser.Scene {
  private areaKey = "";
  private leaving = false;

  private overlay!: Phaser.GameObjects.Rectangle;
  private title!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private menu!: Menu;
  private languagePanel!: LanguagePanel;
  private backKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super(PAUSE_SCENE_KEY);
  }

  create(data: PauseSceneData): void {
    this.areaKey = data.areaKey;
    this.leaving = false;

    this.overlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x05080a, 0.72)
      .setOrigin(0, 0);

    this.title = this.add
      .text(0, 0, "", {
        fontFamily: "Georgia, serif",
        fontSize: "40px",
        fontStyle: "bold",
        color: "#f0dfac",
        stroke: "#0d140f",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.hint = this.add
      .text(0, 0, "", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#7d8a74",
      })
      .setOrigin(0.5);

    this.menu = new Menu(this);
    this.languagePanel = new LanguagePanel(this);

    if (!this.input.keyboard) {
      throw new Error("O teclado não está disponível.");
    }

    this.backKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    );

    this.showMainMenu(0);
    this.layout();
    this.refreshTexts();

    this.scale.on("resize", this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.layout, this);
    });

    audio.play("tick");
  }

  private t<T>(text: Localized<T>): T {
    return text[progress.language];
  }

  private layout(): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const menuTop = height * 0.42;

    this.overlay.setSize(width, height);
    this.title.setPosition(centerX, height * 0.24);
    this.menu.setPosition(centerX, menuTop);
    this.languagePanel.setPosition(centerX, menuTop + 70);
    this.hint.setPosition(centerX, height - 30);
  }

  private refreshTexts(): void {
    this.title.setText(this.t(TEXTS.pause.title));

    this.hint.setText(
      this.t(
        this.languagePanel.isOpen ? TEXTS.title.panelHint : TEXTS.pause.hint,
      ),
    );

    this.menu.refresh();

    // A página HTML ao redor do jogo acompanha o idioma.
    this.game.events.emit(LANGUAGE_CHANGED_EVENT, progress.language);
  }

  private showMainMenu(selected: number): void {
    this.menu.setOptions(
      [
        {
          label: () => this.t(TEXTS.pause.resume),
          onSelect: () => this.resumeGame(),
        },
        {
          label: () =>
            this.t(audio.isMuted() ? TEXTS.pause.soundOff : TEXTS.pause.soundOn),
          onSelect: () => {
            audio.toggleMute();
            audio.play("tick");
            this.menu.refresh();
          },
        },
        {
          label: () => this.t(TEXTS.title.language),
          onSelect: () => this.openLanguagePanel(),
        },
        {
          label: () => this.t(TEXTS.pause.toTitle),
          onSelect: () => this.goToTitle(),
        },
      ],
      selected,
    );
  }

  private openLanguagePanel(): void {
    this.menu.setOptions([]);

    this.languagePanel.open(() => {
      this.showMainMenu(LANGUAGE_OPTION_INDEX);
      this.refreshTexts();
    });

    this.refreshTexts();
  }

  /** Fecha a pausa e continua o jogo de onde parou. */
  private resumeGame(): void {
    if (this.leaving) {
      return;
    }

    this.leaving = true;
    audio.play("tick");

    this.scene.resume(this.areaKey);
    this.scene.stop();
  }

  /** Encerra a área e abre a tela inicial (o progresso salvo continua lá). */
  private goToTitle(): void {
    if (this.leaving) {
      return;
    }

    this.leaving = true;
    this.menu.enabled = false;
    audio.play("shrine");

    this.cameras.main.fadeOut(AREA_FADE_TIME, 0, 0, 0);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.scene.stop(this.areaKey);
        this.scene.start(TITLE_SCENE_KEY);
      },
    );
  }

  update(): void {
    if (this.leaving) {
      return;
    }

    // Esc: fecha o painel de idioma ou, no menu, continua o jogo.
    if (Phaser.Input.Keyboard.JustDown(this.backKey)) {
      if (this.languagePanel.isOpen) {
        this.languagePanel.close();
      } else {
        this.resumeGame();
      }
      return;
    }

    if (this.languagePanel.isOpen) {
      this.languagePanel.update();
    } else {
      this.menu.update();
    }
  }
}

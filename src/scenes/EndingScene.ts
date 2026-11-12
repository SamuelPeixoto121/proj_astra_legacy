// Final do jogo: abre por cima do Salão do Tesouro depois que o Fragmento
// Central se reconstrói (a área fica pausada, como no menu de pausa).
// 1) A tela escurece e o desfecho aparece um parágrafo de cada vez;
// 2) os créditos sobem, com a música da floresta (o tema do começo);
// 3) "FIM" e as opções: Enter continua explorando (o mundo em paz),
//    Esc volta para a tela inicial.
// Enter (ou Espaço) pula o parágrafo ou os créditos.

import Phaser from "phaser";
import { AREA_FADE_TIME } from "../config";
import { TEXTS, type Localized } from "../i18n/texts";
import { audio } from "../audio/engine";
import type { MusicTrackId } from "../audio/music";
import { progress } from "../systems/progress";
import { ENDING_SCENE_KEY, TITLE_SCENE_KEY } from "./areas";

export interface EndingSceneData {
  /** Chave da cena da área que foi pausada. */
  areaKey: string;
  /** Música da área, para voltar a tocar ao continuar explorando. */
  musicTrack: MusicTrackId;
}

/** Tempos (ms) de cada parágrafo do desfecho e dos créditos. */
const PARAGRAPH = { fade: 900, hold: 4200 } as const;
const CREDIT_LINE_HEIGHT = 46;
/** Quanto tempo (ms) cada linha leva para subir a altura de uma linha. */
const CREDIT_SPEED = 900;

type EndingPhase = "epilogue" | "credits" | "final";

export class EndingScene extends Phaser.Scene {
  private areaKey = "";
  private musicTrack: MusicTrackId = "forest";
  private phase: EndingPhase = "epilogue";
  private leaving = false;

  private overlay!: Phaser.GameObjects.Rectangle;
  private paragraph!: Phaser.GameObjects.Text;
  private credits!: Phaser.GameObjects.Container;
  private finalTitle!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private paragraphIndex = 0;
  private paragraphTimer?: Phaser.Time.TimerEvent;
  private creditsTween?: Phaser.Tweens.Tween;

  private keys!: {
    advance: Phaser.Input.Keyboard.Key[];
    title: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super(ENDING_SCENE_KEY);
  }

  create(data: EndingSceneData): void {
    this.areaKey = data.areaKey;
    this.musicTrack = data.musicTrack;
    this.phase = "epilogue";
    this.leaving = false;
    this.paragraphIndex = 0;

    const { width, height } = this.scale;

    this.overlay = this.add
      .rectangle(0, 0, width, height, 0x07060a, 1)
      .setOrigin(0, 0)
      .setAlpha(0);

    this.paragraph = this.add
      .text(width / 2, height / 2, "", {
        fontFamily: "Georgia, serif",
        fontSize: "24px",
        color: "#f0dfac",
        align: "center",
        lineSpacing: 10,
        wordWrap: { width: Math.min(760, width - 80) },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.credits = this.add.container(width / 2, height + 40);

    this.finalTitle = this.add
      .text(width / 2, height / 2 - 30, this.t(TEXTS.ending.thanks), {
        fontFamily: "Georgia, serif",
        fontSize: "56px",
        fontStyle: "bold",
        color: "#ffe08a",
        stroke: "#2a1a08",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // A dica fica no topo enquanto os créditos sobem (para não ficar por
    // baixo deles); no fim, as opções vão para baixo.
    this.hint = this.add
      .text(width / 2, 30, this.t(TEXTS.ending.skip), {
        fontFamily: "Georgia, serif",
        fontSize: "16px",
        color: "#8a7c60",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.setupKeys();

    // A música do começo do jogo volta, calma, para o final.
    audio.setDrums(false);
    audio.setMusic("forest");

    // Escurece a tela e começa o desfecho.
    this.tweens.add({
      targets: [this.overlay, this.hint],
      alpha: 1,
      duration: 1500,
      onComplete: () => this.showParagraph(),
    });

    this.scale.on("resize", this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.layout, this);
    });
  }

  private t<T>(text: Localized<T>): T {
    return text[progress.language];
  }

  private setupKeys(): void {
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      throw new Error("O teclado não está disponível.");
    }

    const { KeyCodes } = Phaser.Input.Keyboard;

    this.keys = {
      advance: [keyboard.addKey(KeyCodes.ENTER), keyboard.addKey(KeyCodes.SPACE)],
      title: keyboard.addKey(KeyCodes.ESC),
    };
  }

  private layout(): void {
    const { width, height } = this.scale;

    this.overlay.setSize(width, height);
    this.paragraph
      .setPosition(width / 2, height / 2)
      .setWordWrapWidth(Math.min(760, width - 80));
    this.credits.setX(width / 2);
    this.finalTitle.setPosition(width / 2, height / 2 - 30);
    this.hint.setPosition(width / 2, this.phase === "final" ? height - 36 : 30);
  }

  // ---------------------------------------------------------------------------
  // 1) Desfecho
  // ---------------------------------------------------------------------------

  /** Mostra o parágrafo atual: aparece, fica um tempo e some. */
  private showParagraph(): void {
    const paragraphs = this.t(TEXTS.ending.epilogue);

    if (this.paragraphIndex >= paragraphs.length) {
      this.startCredits();
      return;
    }

    this.paragraph.setText(paragraphs[this.paragraphIndex]).setAlpha(0);

    this.tweens.add({
      targets: this.paragraph,
      alpha: 1,
      duration: PARAGRAPH.fade,
    });

    this.paragraphTimer = this.time.delayedCall(
      PARAGRAPH.fade + PARAGRAPH.hold,
      () => this.nextParagraph(),
    );
  }

  /** Some com o parágrafo atual e passa para o próximo. */
  private nextParagraph(): void {
    this.paragraphTimer?.remove();
    // Sem timer = nenhum parágrafo na tela (evita pular dois de uma vez).
    this.paragraphTimer = undefined;
    this.tweens.killTweensOf(this.paragraph);

    this.tweens.add({
      targets: this.paragraph,
      alpha: 0,
      duration: PARAGRAPH.fade / 2,
      onComplete: () => {
        this.paragraphIndex += 1;
        this.showParagraph();
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 2) Créditos
  // ---------------------------------------------------------------------------

  private startCredits(): void {
    this.phase = "credits";

    const lines = this.t(TEXTS.ending.credits);

    lines.forEach((line, index) => {
      // A primeira linha é o título; as outras alternam papel e nome.
      const isTitle = index === 0;

      this.credits.add(
        this.add
          .text(0, index * CREDIT_LINE_HEIGHT, line, {
            fontFamily: "Georgia, serif",
            fontSize: isTitle ? "40px" : "22px",
            fontStyle: isTitle ? "bold" : "normal",
            color: isTitle ? "#ffe08a" : "#e9dfbf",
            stroke: "#120c08",
            strokeThickness: isTitle ? 5 : 3,
          })
          .setOrigin(0.5),
      );
    });

    const { height } = this.scale;
    const totalHeight = lines.length * CREDIT_LINE_HEIGHT;
    const distance = height + 40 + totalHeight;

    this.credits.setY(height + 40);

    this.creditsTween = this.tweens.add({
      targets: this.credits,
      y: -totalHeight,
      duration: (distance / CREDIT_LINE_HEIGHT) * CREDIT_SPEED,
      onComplete: () => this.showFinal(),
    });
  }

  // ---------------------------------------------------------------------------
  // 3) Fim e opções
  // ---------------------------------------------------------------------------

  private showFinal(): void {
    if (this.phase === "final") {
      return;
    }

    this.phase = "final";
    this.creditsTween?.stop();
    this.credits.setVisible(false);

    audio.play("victory");

    this.hint
      .setText(this.t(TEXTS.ending.options))
      .setColor("#f0dfac")
      .setY(this.scale.height - 36);

    this.finalTitle.setScale(0.6);
    this.tweens.add({
      targets: this.finalTitle,
      alpha: 1,
      scale: 1,
      duration: 900,
      ease: "Back.Out",
    });
  }

  /** Enter no fim: fecha o final e o jogo continua, em paz. */
  private continueExploring(): void {
    this.leaving = true;
    audio.play("tick");
    audio.setMusic(this.musicTrack);

    this.scene.resume(this.areaKey);
    this.scene.stop();
  }

  /** Esc no fim: volta para a tela inicial. */
  private goToTitle(): void {
    this.leaving = true;
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

    const advance = this.keys.advance.some((key) =>
      Phaser.Input.Keyboard.JustDown(key),
    );

    if (this.phase === "final") {
      if (advance) {
        this.continueExploring();
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.title)) {
        this.goToTitle();
      }
      return;
    }

    if (!advance) {
      return;
    }

    // Enter/Espaço pula o parágrafo ou os créditos.
    if (this.phase === "epilogue") {
      // Só pula se há um parágrafo na tela.
      if (this.paragraphTimer) {
        this.nextParagraph();
      }
    } else {
      this.showFinal();
    }
  }
}

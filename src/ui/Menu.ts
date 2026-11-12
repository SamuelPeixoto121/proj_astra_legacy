// Menu de opções reaproveitável (tela inicial, pausa, painel de idioma).
// Teclado: ↑ ↓ (ou W S) escolhem, Enter (ou E, J, Espaço) confirma.
// Mouse: passar por cima seleciona, clicar confirma.
// A opção escolhida aparece dourada e entre ◆ ◆.

import Phaser from "phaser";
import { audio } from "../audio/engine";

export interface MenuOption {
  /** Texto da opção (função, para acompanhar troca de idioma). */
  label: () => string;
  onSelect: () => void;
  /** Cor especial (ex.: vermelho para confirmação); undefined = cor normal. */
  color?: () => string | undefined;
}

const COLOR_SELECTED = "#f0dfac";
const COLOR_IDLE = "#8f9a86";

export class Menu {
  /** false = ignora teclado e mouse (ex.: enquanto a tela escurece). */
  enabled = true;
  /** Chamado sempre que a opção selecionada muda. */
  onSelectionChange?: () => void;

  private options: MenuOption[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private selected = 0;
  private x = 0;
  private top = 0;

  private readonly keys: {
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
    confirm: Phaser.Input.Keyboard.Key[];
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly spacing = 46,
  ) {
    const keyboard = scene.input.keyboard;

    if (!keyboard) {
      throw new Error("O teclado não está disponível.");
    }

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
    };
  }

  /** Posição (0, 1, 2...) da opção destacada agora. */
  get selectedIndex(): number {
    return this.selected;
  }

  /** Troca as opções do menu. Lista vazia = menu escondido. */
  setOptions(options: MenuOption[], selected = 0): void {
    for (const text of this.texts) {
      text.destroy();
    }

    this.options = options;
    this.selected = Math.min(selected, Math.max(0, options.length - 1));

    this.texts = options.map((_, index) => {
      const text = this.scene.add
        .text(0, 0, "", {
          fontFamily: "Georgia, serif",
          fontSize: "22px",
          color: COLOR_IDLE,
          stroke: "#0d140f",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      text.on("pointerover", () => {
        if (this.enabled) this.select(index);
      });

      text.on("pointerdown", () => {
        if (!this.enabled) return;
        this.select(index);
        this.confirm();
      });

      return text;
    });

    this.setPosition(this.x, this.top);
    this.refresh();
  }

  /** Posição: x do centro e y da primeira opção. */
  setPosition(x: number, top: number): void {
    this.x = x;
    this.top = top;

    this.texts.forEach((text, index) => {
      text.setPosition(x, top + index * this.spacing);
    });
  }

  /** Redesenha os textos (ex.: depois de trocar o idioma). */
  refresh(): void {
    this.texts.forEach((text, index) => {
      const option = this.options[index];
      const isSelected = index === this.selected;
      const label = option.label();

      text.setText(isSelected ? `◆  ${label}  ◆` : label);
      text.setColor(
        option.color?.() ?? (isSelected ? COLOR_SELECTED : COLOR_IDLE),
      );
    });
  }

  /** Lê o teclado. Chame no update() da cena. */
  update(): void {
    if (!this.enabled || this.options.length === 0) {
      return;
    }

    const pressed = (keys: Phaser.Input.Keyboard.Key[]): boolean =>
      keys.some((key) => Phaser.Input.Keyboard.JustDown(key));

    if (pressed(this.keys.up)) this.move(-1);
    if (pressed(this.keys.down)) this.move(1);
    if (pressed(this.keys.confirm)) this.confirm();
  }

  private move(delta: number): void {
    const count = this.options.length;
    this.select((this.selected + delta + count) % count);
  }

  private select(index: number): void {
    if (index === this.selected) {
      return;
    }

    this.selected = index;
    audio.play("tick");
    this.onSelectionChange?.();
    this.refresh();
  }

  private confirm(): void {
    this.options[this.selected]?.onSelect();
  }
}

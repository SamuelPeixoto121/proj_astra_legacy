// Tela de equipamento: abre por cima da área com Tab (a área fica pausada,
// como no menu de pausa).
//
// Primeiro o jogador escolhe um espaço (arma, armadura, amuleto); depois,
// um dos itens que tem para aquele espaço. Embaixo aparecem a descrição e
// os números do item destacado e os atributos atuais do herói.
// Tab ou Esc: volta para os espaços / fecha a tela.

import Phaser from "phaser";
import { PLAYER_STATS } from "../config";
import { TEXTS, type Localized } from "../i18n/texts";
import { audio } from "../audio/engine";
import { progress, saveProgress } from "../systems/progress";
import {
  ITEM_LOOKS,
  describeItemStats,
  equipItem,
  getEquippedItem,
  getHeroStats,
  getOwnedItemsForSlot,
  unequipAmulet,
} from "../systems/equipment";
import type { EquipmentSlot, ItemId } from "../types";
import { Menu } from "../ui/Menu";
import { EQUIPMENT_SCENE_KEY } from "./areas";

export interface EquipmentSceneData {
  /** Chave da cena da área que foi pausada. */
  areaKey: string;
}

const SLOTS: EquipmentSlot[] = ["weapon", "armor", "amulet"];

/** Cor do ícone quando não há item (amuleto vazio). */
const EMPTY_ICON_COLOR = 0x4a5046;

export class EquipmentScene extends Phaser.Scene {
  private areaKey = "";
  private leaving = false;

  /** null = escolhendo o espaço; senão, escolhendo um item deste espaço. */
  private openSlot: EquipmentSlot | null = null;
  /** Itens da lista aberta (null = "nenhum amuleto"). */
  private choices: (ItemId | null)[] = [];

  private overlay!: Phaser.GameObjects.Rectangle;
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private detailPanel!: Phaser.GameObjects.Rectangle;
  private detailIcon!: Phaser.GameObjects.Polygon;
  private detailName!: Phaser.GameObjects.Text;
  private detailText!: Phaser.GameObjects.Text;
  private heroStats!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private menu!: Menu;
  private backKeys!: Phaser.Input.Keyboard.Key[];

  constructor() {
    super(EQUIPMENT_SCENE_KEY);
  }

  create(data: EquipmentSceneData): void {
    this.areaKey = data.areaKey;
    this.leaving = false;
    this.openSlot = null;

    const textStyle = (
      fontSize: string,
      color: string,
    ): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontFamily: "Georgia, serif",
      fontSize,
      color,
      stroke: "#0d140f",
      strokeThickness: 4,
      align: "center",
    });

    this.overlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x05080a, 0.78)
      .setOrigin(0, 0);

    this.title = this.add
      .text(0, 0, "", { ...textStyle("36px", "#f0dfac"), fontStyle: "bold" })
      .setOrigin(0.5);

    this.subtitle = this.add
      .text(0, 0, "", textStyle("16px", "#b1bd8b"))
      .setOrigin(0.5);

    this.detailPanel = this.add
      .rectangle(0, 0, 10, 110, 0x15231b, 0.92)
      .setStrokeStyle(2, 0x3d5a46, 1);

    this.detailIcon = this.add.polygon(
      0,
      0,
      [0, -12, 8, 0, 0, 12, -8, 0],
      EMPTY_ICON_COLOR,
    );

    this.detailName = this.add
      .text(0, 0, "", { ...textStyle("18px", "#f0dfac"), fontStyle: "bold" })
      .setOrigin(0, 0.5);

    this.detailText = this.add
      .text(0, 0, "", { ...textStyle("14px", "#e9dfbf"), align: "left" })
      .setOrigin(0, 0);

    this.heroStats = this.add
      .text(0, 0, "", textStyle("14px", "#9fd8b0"))
      .setOrigin(0.5);

    this.hint = this.add
      .text(0, 0, "", { ...textStyle("14px", "#7d8a74"), strokeThickness: 0 })
      .setOrigin(0.5);

    this.menu = new Menu(this, 42);
    this.menu.onSelectionChange = () => this.refreshDetails();

    if (!this.input.keyboard) {
      throw new Error("O teclado não está disponível.");
    }

    const { KeyCodes } = Phaser.Input.Keyboard;

    this.backKeys = [
      this.input.keyboard.addKey(KeyCodes.ESC),
      this.input.keyboard.addKey(KeyCodes.TAB),
    ];

    this.showSlots(0);
    this.layout();

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
    const panelWidth = Math.min(620, width - 40);
    const panelY = height * 0.66;
    const panelLeft = centerX - panelWidth / 2;

    this.overlay.setSize(width, height);
    this.title.setPosition(centerX, height * 0.14);
    this.subtitle.setPosition(centerX, height * 0.14 + 40);
    this.menu.setPosition(centerX, height * 0.3);

    this.detailPanel.setPosition(centerX, panelY).setSize(panelWidth, 110);
    this.detailIcon.setPosition(panelLeft + 26, panelY - 30);
    this.detailName.setPosition(panelLeft + 44, panelY - 30);
    this.detailText
      .setPosition(panelLeft + 20, panelY - 10)
      .setWordWrapWidth(panelWidth - 40);

    this.heroStats
      .setPosition(centerX, panelY + 80)
      .setWordWrapWidth(width - 40);
    this.hint.setPosition(centerX, height - 26);
  }

  // ---------------------------------------------------------------------------
  // Listas
  // ---------------------------------------------------------------------------

  /** Lista dos espaços: "ARMA: ESPADA DE FERRO"... */
  private showSlots(selected: number): void {
    this.openSlot = null;
    this.choices = SLOTS.map((slot) => getEquippedItem(slot));

    this.menu.setOptions(
      SLOTS.map((slot) => ({
        label: () =>
          `${this.t(TEXTS.equipment.slots[slot])}:  ${this.itemName(getEquippedItem(slot))}`,
        onSelect: () => this.showItems(slot),
      })),
      selected,
    );

    this.refreshTexts();
  }

  /** Lista dos itens que o herói tem para um espaço. */
  private showItems(slot: EquipmentSlot): void {
    audio.play("tick");

    this.openSlot = slot;
    this.choices = [
      ...(slot === "amulet" ? [null] : []),
      ...getOwnedItemsForSlot(slot),
    ];

    const equipped = getEquippedItem(slot);

    this.menu.setOptions(
      this.choices.map((id) => ({
        label: () => {
          const tag =
            id === equipped ? `  ${this.t(TEXTS.equipment.equippedTag)}` : "";
          return `${this.itemName(id)}${tag}`;
        },
        onSelect: () => this.choose(slot, id),
      })),
      Math.max(0, this.choices.indexOf(equipped)),
    );

    this.refreshTexts();
  }

  /** Equipa o item escolhido e volta para a lista de espaços. */
  private choose(slot: EquipmentSlot, id: ItemId | null): void {
    if (id === null) {
      unequipAmulet();
    } else {
      equipItem(id);
    }

    saveProgress();
    audio.play("pickup");

    this.showSlots(SLOTS.indexOf(slot));
  }

  // ---------------------------------------------------------------------------
  // Textos
  // ---------------------------------------------------------------------------

  private itemName(id: ItemId | null): string {
    return this.t(
      id === null ? TEXTS.equipment.noAmulet.name : TEXTS.items[id].name,
    );
  }

  private refreshTexts(): void {
    this.title.setText(this.t(TEXTS.equipment.title));
    this.subtitle.setText(
      this.openSlot ? this.t(TEXTS.equipment.slots[this.openSlot]) : "",
    );
    this.hint.setText(
      this.t(
        this.openSlot ? TEXTS.equipment.hintItems : TEXTS.equipment.hintSlots,
      ),
    );

    const stats = getHeroStats();

    this.heroStats.setText(
      this.t(
        TEXTS.equipment.heroStats(
          stats.attackDamage,
          stats.damageTaken,
          // Velocidade em relação à normal (sem armadura pesada).
          stats.speed / PLAYER_STATS.speed,
          stats.potionHeal,
        ),
      ),
    );

    this.menu.refresh();
    this.refreshDetails();
  }

  /** Mostra a descrição e os números do item destacado no menu. */
  private refreshDetails(): void {
    const id = this.choices[this.menu.selectedIndex] ?? null;
    const description =
      id === null
        ? TEXTS.equipment.noAmulet.description
        : TEXTS.items[id].description;

    this.detailIcon.setFillStyle(
      id === null ? EMPTY_ICON_COLOR : ITEM_LOOKS[id].icon,
    );
    this.detailName.setText(this.itemName(id));
    this.detailText.setText(
      `${this.t(description)}\n\n${this.t(describeItemStats(id))}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Fechar
  // ---------------------------------------------------------------------------

  /** Fecha a tela e continua o jogo (a área atualiza a aparência do herói). */
  private close(): void {
    if (this.leaving) {
      return;
    }

    this.leaving = true;
    audio.play("tick");

    this.scene.resume(this.areaKey);
    this.scene.stop();
  }

  update(): void {
    if (this.leaving) {
      return;
    }

    if (this.backKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
      if (this.openSlot) {
        audio.play("tick");
        this.showSlots(SLOTS.indexOf(this.openSlot));
      } else {
        this.close();
      }
      return;
    }

    this.menu.update();
  }
}

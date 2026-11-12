// Tela de equipamento (inventário): abre por cima da área com Tab (a área
// fica pausada, como no menu de pausa). Inspirada nos RPGs clássicos:
// - esquerda: atributos do herói (com a mudança que um item causaria);
// - centro: o herói desenhado com os espaços de arma, armadura e amuleto;
// - direita: a mochila (grade com os itens que não estão em uso) e os
//   detalhes do item escolhido.
//
// Setas (ou WASD) e mouse escolhem; Enter ou clique equipa o item da
// mochila (o antigo volta para a mochila) ou tira o item do herói (sem arma
// ele luta no soco; sem armadura fica mais rápido, mas frágil).
// Também dá para arrastar: da mochila para o espaço certo no herói (equipa),
// do herói para um item do mesmo tipo na mochila (troca) ou para um
// quadrado vazio da mochila (tira). Enquanto arrasta, os lugares onde dá
// para soltar ficam dourados.
// Tab ou Esc fecham a tela.
//
// Tudo é desenhado num "quadro" de tamanho fixo (DESIGN_WIDTH x
// DESIGN_HEIGHT) que diminui em telas pequenas.

import Phaser from "phaser";
import { PLAYER_STATS, POTION_STATS } from "../config";
import { TEXTS, type Localized } from "../i18n/texts";
import { audio } from "../audio/engine";
import { progress, saveProgress } from "../systems/progress";
import {
  ITEM_RARITY,
  RARITY_COLORS,
  describeEmptySlot,
  describeItemStats,
  equipItem,
  getEquippedItem,
  getHeroLook,
  getHeroStats,
  getItemSlot,
  ownsItem,
  unequipSlot,
  type HeroStats,
} from "../systems/equipment";
import {
  ITEM_IDS,
  type EquippedItems,
  type EquipmentSlot,
  type ItemId,
} from "../types";
import {
  createPlayerFigure,
  setPlayerLook,
  type PlayerFigure,
} from "../characters/player";
import { drawPotionIcon } from "../world/potion";
import { createItemIcon } from "../ui/itemIcon";
import { EQUIPMENT_SCENE_KEY } from "./areas";

export interface EquipmentSceneData {
  /** Chave da cena da área que foi pausada. */
  areaKey: string;
  /** Vida atual do herói (só para mostrar). */
  health: number;
}

const DESIGN_WIDTH = 920;
const DESIGN_HEIGHT = 500;

const COLORS = {
  frame: 0x14100b,
  gold: 0x9c7a3c,
  panel: 0x1e1810,
  panelLine: 0x4d3c22,
  cell: 0x261f15,
  cursor: 0xf0d38a,
};

const TEXT_COLORS = {
  title: "#e8c98a",
  label: "#b3a07c",
  value: "#f2e6c8",
  better: "#7fe08a",
  worse: "#ff7a7a",
  muted: "#8a7c60",
};

/** Espaços de equipamento em volta do herói (posição no quadro). */
const SLOT_CELLS: { slot: EquipmentSlot; x: number; y: number }[] = [
  { slot: "amulet", x: -25, y: -118 },
  { slot: "weapon", x: -132, y: 10 },
  { slot: "armor", x: 82, y: 10 },
];

const SLOT_SIZE = 66;

/** Quanto (em pixels) o mouse precisa andar para virar "arrastar". */
const DRAG_THRESHOLD = 6;

// Mochila: grade de BAG_COLUMNS x BAG_ROWS no painel da direita.
const BAG_COLUMNS = 4;
const BAG_ROWS = 3;
const BAG_CELL = 58;
const BAG_GAP = 8;
const BAG_LEFT = 167;
const BAG_TOP = -160;

/** Um quadrado que pode ser escolhido (espaço de equipamento ou mochila). */
interface Cell {
  /** Espaço do herói; undefined = quadrado da mochila. */
  slot?: EquipmentSlot;
  /** Posição na mochila (só nos quadrados da mochila). */
  bagIndex?: number;
  x: number;
  y: number;
  size: number;
  frame: Phaser.GameObjects.Rectangle;
}

/** Item sendo arrastado (ou só pressionado, antes de andar o bastante). */
interface DragState {
  from: number;
  startX: number;
  startY: number;
  /** Ícone que segue o mouse (só existe depois de começar a arrastar). */
  ghost?: Phaser.GameObjects.Container;
}

/** Uma linha da coluna de atributos. */
interface StatRow {
  label: Localized;
  get: (stats: HeroStats) => number;
  format: (value: number) => string;
  higherIsBetter: boolean;
  valueText?: Phaser.GameObjects.Text;
}

export class EquipmentScene extends Phaser.Scene {
  private areaKey = "";
  private health = 0;
  private leaving = false;

  private overlay!: Phaser.GameObjects.Rectangle;
  /** O quadro inteiro (tudo fica dentro dele). */
  private root!: Phaser.GameObjects.Container;
  /** Ícones dos itens (refeitos a cada mudança). */
  private iconLayer!: Phaser.GameObjects.Container;
  private cursor!: Phaser.GameObjects.Rectangle;

  private cells: Cell[] = [];
  /** Ícone de cada quadrado (mesma ordem de `cells`; null = sem ícone). */
  private cellIcons: (Phaser.GameObjects.Container | null)[] = [];
  private drag: DragState | null = null;
  private focus = 0;
  /** Itens na mochila (os que o herói tem e não estão em uso). */
  private bagItems: ItemId[] = [];

  private statRows: StatRow[] = [];
  private healthValue!: Phaser.GameObjects.Text;
  private heroFigure!: PlayerFigure;
  private potionIcons!: Phaser.GameObjects.Graphics;

  private detailName!: Phaser.GameObjects.Text;
  private detailRarity!: Phaser.GameObjects.Text;
  private detailStats!: Phaser.GameObjects.Text;
  private detailDescription!: Phaser.GameObjects.Text;
  private detailAction!: Phaser.GameObjects.Text;

  private keys!: {
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
    left: Phaser.Input.Keyboard.Key[];
    right: Phaser.Input.Keyboard.Key[];
    confirm: Phaser.Input.Keyboard.Key[];
    back: Phaser.Input.Keyboard.Key[];
  };

  constructor() {
    super(EQUIPMENT_SCENE_KEY);
  }

  create(data: EquipmentSceneData): void {
    this.areaKey = data.areaKey;
    this.health = data.health;
    this.leaving = false;
    this.cells = [];
    this.focus = 0;
    this.drag = null;

    this.overlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x05080a, 0.7)
      .setOrigin(0, 0);

    this.root = this.add.container(0, 0);

    this.createFrame();
    this.createAttributesColumn();
    this.createHeroColumn();
    this.createBagColumn();

    this.iconLayer = this.add.container(0, 0);
    this.root.add(this.iconLayer);

    this.cursor = this.add
      .rectangle(0, 0, SLOT_SIZE, SLOT_SIZE)
      .setStrokeStyle(3, COLORS.cursor, 1);
    this.root.add(this.cursor);

    this.tweens.add({
      targets: this.cursor,
      alpha: { from: 1, to: 0.45 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    this.setupKeys();
    this.setupDrag();
    this.refresh();
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

  /** Centraliza o quadro e diminui ele se a tela for pequena. */
  private layout(): void {
    const { width, height } = this.scale;
    const scale = Math.min(
      1,
      (width - 16) / DESIGN_WIDTH,
      (height - 16) / DESIGN_HEIGHT,
    );

    this.overlay.setSize(width, height);
    this.root.setPosition(width / 2, height / 2).setScale(scale);
  }

  // ---------------------------------------------------------------------------
  // Criação (partes fixas)
  // ---------------------------------------------------------------------------

  private text(
    x: number,
    y: number,
    content: string,
    fontSize: number,
    color: string,
    bold = false,
  ): Phaser.GameObjects.Text {
    const text = this.add.text(x, y, content, {
      fontFamily: "Georgia, serif",
      fontSize: `${fontSize}px`,
      fontStyle: bold ? "bold" : "normal",
      color,
      stroke: "#0b0805",
      strokeThickness: 3,
    });

    this.root.add(text);

    return text;
  }

  /** Painel escuro com borda (uma coluna). */
  private panel(centerX: number, width: number): void {
    this.root.add(
      this.add
        .rectangle(centerX, 3, width, 402, COLORS.panel, 0.95)
        .setStrokeStyle(1, COLORS.panelLine),
    );
  }

  private createFrame(): void {
    const halfWidth = DESIGN_WIDTH / 2;
    const halfHeight = DESIGN_HEIGHT / 2;

    this.root.add([
      this.add
        .rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, COLORS.frame, 0.97)
        .setStrokeStyle(2, COLORS.gold),
      this.add
        .rectangle(0, 0, DESIGN_WIDTH - 12, DESIGN_HEIGHT - 12)
        .setStrokeStyle(1, COLORS.panelLine),
      // Linhas douradas dos lados do título.
      this.add.rectangle(-215, -224, 200, 1, COLORS.gold),
      this.add.rectangle(215, -224, 200, 1, COLORS.gold),
    ]);

    // Losangos dourados nos cantos.
    for (const [x, y] of [
      [-halfWidth, -halfHeight],
      [halfWidth, -halfHeight],
      [-halfWidth, halfHeight],
      [halfWidth, halfHeight],
    ]) {
      this.root.add(
        this.add
          .rectangle(x, y, 12, 12, COLORS.frame)
          .setStrokeStyle(2, COLORS.gold)
          .setAngle(45),
      );
    }

    this.text(0, -224, this.t(TEXTS.equipment.title), 26, TEXT_COLORS.title, true)
      .setOrigin(0.5);

    this.text(0, 230, this.t(TEXTS.equipment.hint), 13, TEXT_COLORS.muted)
      .setOrigin(0.5)
      .setStroke("#000000", 0);

    this.panel(-320, 250);
    this.panel(-25, 320);
    this.panel(295, 300);
  }

  /** Coluna da esquerda: vida e atributos. */
  private createAttributesColumn(): void {
    const stats = TEXTS.equipment.stats;
    const seconds = (value: number): string =>
      this.t(TEXTS.equipment.secondsValue(value));

    this.text(-320, -180, this.t(TEXTS.equipment.attributes), 17, TEXT_COLORS.title, true)
      .setOrigin(0.5);

    this.statRows = [
      {
        label: stats.damage,
        get: (s) => s.attackDamage,
        format: (v) => `${v}`,
        higherIsBetter: true,
      },
      {
        label: stats.attackInterval,
        get: (s) => s.attackCooldown,
        format: seconds,
        higherIsBetter: false,
      },
      {
        label: stats.defense,
        get: (s) => Math.round((1 - s.damageTaken) * 100),
        format: (v) => `${v}%`,
        higherIsBetter: true,
      },
      {
        label: stats.speed,
        get: (s) => Math.round((s.speed / PLAYER_STATS.speed) * 100),
        format: (v) => `${v}%`,
        higherIsBetter: true,
      },
      {
        label: stats.potionHeal,
        get: (s) => s.potionHeal,
        format: (v) => `+${v}`,
        higherIsBetter: true,
      },
      {
        label: stats.rollCooldown,
        get: (s) => s.rollCooldown,
        format: seconds,
        higherIsBetter: false,
      },
    ];

    const rowY = (index: number): number => -140 + index * 46;

    this.statLabel(stats.health, rowY(0));
    this.healthValue = this.statValue(rowY(0));

    this.statRows.forEach((row, index) => {
      this.statLabel(row.label, rowY(index + 1));
      row.valueText = this.statValue(rowY(index + 1));
    });
  }

  private statLabel(label: Localized, y: number): void {
    // Nome em cima, valor embaixo (à direita): cabe "atual → novo".
    this.text(-432, y - 9, this.t(label), 13, TEXT_COLORS.label).setOrigin(0, 0.5);
    this.root.add(this.add.rectangle(-320, y + 24, 226, 1, COLORS.panelLine));
  }

  private statValue(y: number): Phaser.GameObjects.Text {
    return this.text(-208, y + 10, "", 16, TEXT_COLORS.value, true).setOrigin(1, 0.5);
  }

  /** Coluna do meio: o herói, os espaços em volta e as poções. */
  private createHeroColumn(): void {
    // Brilho no chão atrás do herói.
    this.root.add(this.add.ellipse(-25, 52, 150, 40, COLORS.gold, 0.12));

    this.heroFigure = createPlayerFigure(this, -25, 10);
    this.heroFigure.container.setScale(3.2);
    this.root.add(this.heroFigure.container);

    for (const { slot, x, y } of SLOT_CELLS) {
      this.text(x, y - SLOT_SIZE / 2 - 12, this.t(TEXTS.equipment.slots[slot]), 12, TEXT_COLORS.label)
        .setOrigin(0.5);
      this.addCell({ slot, x, y, size: SLOT_SIZE });
    }

    this.text(-25, 150, this.t(TEXTS.equipment.potions), 13, TEXT_COLORS.label)
      .setOrigin(0.5);

    this.potionIcons = this.add.graphics();
    this.potionIcons.setPosition(-25, 180).setScale(1.5);
    this.root.add(this.potionIcons);
  }

  /** Coluna da direita: a mochila e os detalhes do item escolhido. */
  private createBagColumn(): void {
    this.text(295, -180, this.t(TEXTS.equipment.inventory), 17, TEXT_COLORS.title, true)
      .setOrigin(0.5);

    for (let index = 0; index < BAG_COLUMNS * BAG_ROWS; index++) {
      const column = index % BAG_COLUMNS;
      const row = Math.floor(index / BAG_COLUMNS);

      this.addCell({
        bagIndex: index,
        x: BAG_LEFT + BAG_CELL / 2 + column * (BAG_CELL + BAG_GAP),
        y: BAG_TOP + BAG_CELL / 2 + row * (BAG_CELL + BAG_GAP),
        size: BAG_CELL,
      });
    }

    this.root.add(this.add.rectangle(295, 44, 270, 1, COLORS.panelLine));

    const wrap = { width: 270 };

    this.detailName = this.text(160, 56, "", 17, TEXT_COLORS.value, true)
      .setOrigin(0, 0.5);
    this.detailRarity = this.text(160, 76, "", 12, TEXT_COLORS.label)
      .setOrigin(0, 0.5);
    this.detailStats = this.text(160, 88, "", 13, TEXT_COLORS.value)
      .setWordWrapWidth(wrap.width);
    this.detailDescription = this.text(160, 0, "", 13, TEXT_COLORS.label)
      .setWordWrapWidth(wrap.width)
      .setFontStyle("italic");
    this.detailAction = this.text(160, 194, "", 12, TEXT_COLORS.title)
      .setOrigin(0, 1)
      .setWordWrapWidth(wrap.width);
  }

  /** Cria um quadrado escolhível (com mouse: passar por cima e clicar). */
  private addCell(cell: Omit<Cell, "frame">): void {
    const index = this.cells.length;
    const frame = this.add
      .rectangle(cell.x, cell.y, cell.size, cell.size, COLORS.cell)
      .setStrokeStyle(2, COLORS.panelLine)
      .setInteractive({ useHandCursor: true });

    frame.on("pointerover", () => {
      // Arrastando, os detalhes continuam mostrando o item arrastado.
      if (!this.drag) {
        this.setFocus(index);
      }
    });
    frame.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.setFocus(index);
      // Clique ou começo de arrastar: decide quando o botão for solto.
      this.drag = { from: index, startX: pointer.x, startY: pointer.y };
    });

    this.root.add([
      frame,
      // Fundo interno um pouco mais claro, para parecer um encaixe.
      this.add.rectangle(cell.x, cell.y, cell.size - 10, cell.size - 10, 0x2f2619, 0.6),
    ]);

    this.cells.push({ ...cell, frame });
  }

  private setupKeys(): void {
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      throw new Error("O teclado não está disponível.");
    }

    const { KeyCodes } = Phaser.Input.Keyboard;
    const add = (...codes: number[]): Phaser.Input.Keyboard.Key[] =>
      codes.map((code) => keyboard.addKey(code));

    this.keys = {
      up: add(KeyCodes.UP, KeyCodes.W),
      down: add(KeyCodes.DOWN, KeyCodes.S),
      left: add(KeyCodes.LEFT, KeyCodes.A),
      right: add(KeyCodes.RIGHT, KeyCodes.D),
      confirm: add(KeyCodes.ENTER, KeyCodes.SPACE, KeyCodes.E, KeyCodes.J),
      back: add(KeyCodes.ESC, KeyCodes.TAB),
    };
  }

  // ---------------------------------------------------------------------------
  // Atualizar o que aparece
  // ---------------------------------------------------------------------------

  /** Redesenha ícones, herói, poções e atributos (depois de cada troca). */
  private refresh(): void {
    this.bagItems = ITEM_IDS.filter(
      (id) => ownsItem(id) && getEquippedItem(getItemSlot(id)) !== id,
    );

    this.iconLayer.removeAll(true);
    this.cellIcons = [];

    for (const cell of this.cells) {
      const id = this.getCellItem(cell);
      const slot = cell.slot ?? (id ? getItemSlot(id) : null);

      cell.frame.setStrokeStyle(
        2,
        id ? RARITY_COLORS[ITEM_RARITY[id]] : COLORS.panelLine,
      );

      // Quadrado vazio da mochila: sem ícone. Espaço vazio: silhueta.
      if (slot) {
        const icon = createItemIcon(this, cell.x, cell.y, slot, id);

        icon.setScale(cell.size / 52);
        this.iconLayer.add(icon);
        this.cellIcons.push(icon);
      } else {
        this.cellIcons.push(null);
      }
    }

    setPlayerLook(this.heroFigure, getHeroLook());

    this.potionIcons.clear();

    for (let i = 0; i < POTION_STATS.max; i++) {
      drawPotionIcon(
        this.potionIcons,
        (i - (POTION_STATS.max - 1) / 2) * 20,
        0,
        i < progress.potions,
      );
    }

    this.healthValue.setText(`${this.health} / ${PLAYER_STATS.maxHealth}`);

    this.setFocus(this.focus);
  }

  /** Item mostrado num quadrado (null = vazio). */
  private getCellItem(cell: Cell): ItemId | null {
    if (cell.slot) {
      return getEquippedItem(cell.slot);
    }

    return this.bagItems[cell.bagIndex ?? -1] ?? null;
  }

  /** Muda o quadrado escolhido: move o cursor e atualiza os detalhes. */
  private setFocus(index: number): void {
    this.focus = index;

    const cell = this.cells[index];

    this.cursor
      .setPosition(cell.x, cell.y)
      .setSize(cell.size + 6, cell.size + 6);

    this.refreshDetails(cell);
    this.refreshStats(this.getPreviewEquipment(cell));
  }

  /**
   * Equipamento que ficaria em uso se o jogador confirmasse agora
   * (null = nada mudaria). Usado para comparar os atributos.
   */
  private getPreviewEquipment(cell: Cell): EquippedItems | null {
    const id = this.getCellItem(cell);

    if (cell.slot === undefined && id) {
      return { ...progress.equipped, [getItemSlot(id)]: id };
    }

    if (cell.slot && id) {
      return { ...progress.equipped, [cell.slot]: null };
    }

    return null;
  }

  /** Atributos atuais; com `preview`, mostra "atual → novo" em cores. */
  private refreshStats(preview: EquippedItems | null): void {
    const current = getHeroStats();
    const next = preview ? getHeroStats(preview) : current;

    for (const row of this.statRows) {
      const now = row.get(current);
      const then = row.get(next);
      const text = row.valueText;

      if (!text) {
        continue;
      }

      if (now === then) {
        text.setText(row.format(now)).setColor(TEXT_COLORS.value);
        continue;
      }

      const better = row.higherIsBetter ? then > now : then < now;

      text
        .setText(`${row.format(now)} → ${row.format(then)}`)
        .setColor(better ? TEXT_COLORS.better : TEXT_COLORS.worse);
    }
  }

  /** Nome, raridade, números e descrição do item do quadrado escolhido. */
  private refreshDetails(cell: Cell): void {
    const id = this.getCellItem(cell);
    const slot = cell.slot ?? (id ? getItemSlot(id) : null);
    const equipment = TEXTS.equipment;

    if (!slot) {
      // Quadrado vazio da mochila.
      this.detailName.setText("");
      this.detailRarity.setText("");
      this.detailStats.setText("");
      this.detailDescription.setText(this.t(equipment.emptyCell));
      this.detailAction.setText("");
      this.placeDescription();
      return;
    }

    const slotName = this.t(equipment.slots[slot]);

    if (!id) {
      // Espaço vazio no herói (soco, sem armadura ou sem amuleto).
      const empty = equipment.emptySlot[slot];

      this.detailName.setText(this.t(empty.name)).setColor(TEXT_COLORS.muted);
      this.detailRarity.setText(slotName).setColor(TEXT_COLORS.label);
      this.detailStats.setText(this.t(describeEmptySlot(slot)));
      this.detailDescription.setText(this.t(empty.description));
      this.detailAction.setText("");
      this.placeDescription();
      return;
    }

    const rarity = ITEM_RARITY[id];
    const rarityColor = `#${RARITY_COLORS[rarity].toString(16).padStart(6, "0")}`;

    this.detailName.setText(this.t(TEXTS.items[id].name)).setColor(rarityColor);
    this.detailRarity
      .setText(`${this.t(equipment.rarity[rarity])}  •  ${slotName}`)
      .setColor(rarityColor);
    this.detailStats.setText(this.t(describeItemStats(id)));
    this.detailDescription.setText(this.t(TEXTS.items[id].description));
    this.detailAction.setText(this.getActionText(cell, id));
    this.placeDescription();
  }

  /** O que Enter faria agora, para mostrar embaixo dos detalhes. */
  private getActionText(cell: Cell, id: ItemId): string {
    const equipment = TEXTS.equipment;

    if (cell.slot) {
      return `${this.t(equipment.equippedTag)}  •  ${this.t(equipment.unequipAction)}`;
    }

    const current = getEquippedItem(getItemSlot(id));
    const replaces = current
      ? `${this.t(equipment.replaces(TEXTS.items[current].name))}\n`
      : "";

    return `${replaces}${this.t(equipment.equipAction)}`;
  }

  /** A descrição fica logo abaixo dos números (que podem ter 1 ou 2 linhas). */
  private placeDescription(): void {
    const stats = this.detailStats;

    this.detailDescription.setY(
      stats.text ? stats.y + stats.height + 8 : stats.y,
    );
  }

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------

  /** Troca o equipamento, salva e redesenha a tela. */
  private applyChange(change: () => void): void {
    change();
    saveProgress();
    audio.play("pickup");
    this.refresh();
  }

  /** Enter ou clique no quadrado escolhido. */
  private activate(): void {
    const cell = this.cells[this.focus];
    const id = this.getCellItem(cell);

    if (cell.slot === undefined) {
      // Item da mochila: equipa (o antigo volta para a mochila).
      if (id) {
        this.applyChange(() => equipItem(id));
      }
      return;
    }

    // Item no herói: tira (vai para a mochila).
    if (id) {
      const { slot } = cell;

      this.applyChange(() => unequipSlot(slot));
      return;
    }

    // Espaço vazio: pula para o primeiro item daquele tipo na mochila.
    const bagIndex = this.bagItems.findIndex(
      (item) => getItemSlot(item) === cell.slot,
    );

    if (bagIndex >= 0) {
      audio.play("tick");
      this.setFocus(this.cells.findIndex((c) => c.bagIndex === bagIndex));
    }
  }

  // ---------------------------------------------------------------------------
  // Arrastar e soltar
  // ---------------------------------------------------------------------------

  private setupDrag(): void {
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.on(
      Phaser.Input.Events.POINTER_UP_OUTSIDE,
      this.onPointerUp,
      this,
    );
  }

  /**
   * O que acontece ao soltar o item do quadrado `from` no quadrado `to`
   * (null = não pode soltar ali).
   */
  private getDropAction(from: Cell, to: Cell): (() => void) | null {
    const id = this.getCellItem(from);
    const targetId = this.getCellItem(to);

    if (!id || from === to) {
      return null;
    }

    // Da mochila para o espaço do mesmo tipo: equipa.
    if (from.slot === undefined) {
      return to.slot === getItemSlot(id) ? () => equipItem(id) : null;
    }

    // Do herói para a mochila.
    if (to.slot === undefined) {
      // Em cima de um item do mesmo tipo: troca por ele.
      if (targetId && getItemSlot(targetId) === from.slot) {
        return () => equipItem(targetId);
      }

      // Num quadrado vazio: tira o item (o espaço fica vazio).
      if (!targetId) {
        const { slot } = from;

        return () => unequipSlot(slot);
      }
    }

    return null;
  }

  /** Posição do mouse dentro do quadro (que pode estar diminuído). */
  private toFrame(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    return {
      x: (pointer.x - this.root.x) / this.root.scale,
      y: (pointer.y - this.root.y) / this.root.scale,
    };
  }

  private cellAt(x: number, y: number): Cell | undefined {
    return this.cells.find(
      (cell) =>
        Math.abs(x - cell.x) <= cell.size / 2 &&
        Math.abs(y - cell.y) <= cell.size / 2,
    );
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;

    if (!drag || this.leaving) {
      return;
    }

    if (!drag.ghost) {
      const moved = Math.hypot(
        pointer.x - drag.startX,
        pointer.y - drag.startY,
      );

      if (moved < DRAG_THRESHOLD) {
        return;
      }

      this.startDrag(drag);
    }

    const { x, y } = this.toFrame(pointer);

    drag.ghost?.setPosition(x, y);
  }

  /** Cria o ícone que segue o mouse e destaca onde dá para soltar. */
  private startDrag(drag: DragState): void {
    const from = this.cells[drag.from];
    const id = this.getCellItem(from);
    const icon = this.cellIcons[drag.from];

    // Quadrado vazio ou silhueta: nada para arrastar.
    if (!id || !icon) {
      this.drag = null;
      return;
    }

    icon.setAlpha(0.3);

    drag.ghost = createItemIcon(this, from.x, from.y, getItemSlot(id), id)
      .setScale((from.size / 52) * 1.15)
      .setAlpha(0.9);
    this.root.add(drag.ghost);

    for (const cell of this.cells) {
      if (this.getDropAction(from, cell)) {
        cell.frame.setStrokeStyle(3, COLORS.cursor);
      }
    }

    audio.play("tick");
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;

    this.drag = null;

    if (!drag || this.leaving) {
      return;
    }

    // Não chegou a arrastar: foi um clique.
    if (!drag.ghost) {
      this.activate();
      return;
    }

    const from = this.cells[drag.from];
    const { x, y } = this.toFrame(pointer);
    const to = this.cellAt(x, y);
    const action = to ? this.getDropAction(from, to) : null;
    const ghost = drag.ghost;

    if (to && action) {
      ghost.destroy();
      this.focus = this.cells.indexOf(to);
      this.applyChange(action);
      return;
    }

    // Lugar inválido: o item volta deslizando para onde estava.
    this.tweens.add({
      targets: ghost,
      x: from.x,
      y: from.y,
      duration: 160,
      ease: "Quad.Out",
      onComplete: () => {
        ghost.destroy();
        this.refresh();
      },
    });
  }

  /**
   * Move o cursor para o quadrado mais próximo na direção (dx, dy).
   * Funciona igual entre os espaços do herói e a mochila.
   */
  private moveFocus(dx: number, dy: number): void {
    const from = this.cells[this.focus];
    let best = -1;
    let bestScore = Infinity;

    this.cells.forEach((cell, index) => {
      const vx = cell.x - from.x;
      const vy = cell.y - from.y;
      const along = vx * dx + vy * dy;

      if (index === this.focus || along <= 0) {
        return;
      }

      // Prefere quadrados bem alinhados com a direção.
      const across = Math.abs(vx * dy - vy * dx);
      const score = along + across * 2;

      if (score < bestScore) {
        bestScore = score;
        best = index;
      }
    });

    if (best >= 0) {
      audio.play("tick");
      this.setFocus(best);
    }
  }

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
    // Enquanto arrasta com o mouse, o teclado espera.
    if (this.leaving || this.drag) {
      return;
    }

    const pressed = (keys: Phaser.Input.Keyboard.Key[]): boolean =>
      keys.some((key) => Phaser.Input.Keyboard.JustDown(key));

    if (pressed(this.keys.back)) {
      this.close();
    } else if (pressed(this.keys.confirm)) {
      this.activate();
    } else if (pressed(this.keys.up)) {
      this.moveFocus(0, -1);
    } else if (pressed(this.keys.down)) {
      this.moveFocus(0, 1);
    } else if (pressed(this.keys.left)) {
      this.moveFocus(-1, 0);
    } else if (pressed(this.keys.right)) {
      this.moveFocus(1, 0);
    }
  }
}

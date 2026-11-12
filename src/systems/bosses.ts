// Partes comuns a todos os chefes: vida, barra de vida, nome e cores.
// O comportamento de cada chefe (perseguir, golpear o chão...) fica na
// cena da área dele; aqui fica só o que todos compartilham.

import type Phaser from "phaser";
import type { CharacterSprite } from "../characters/types";

export interface BossStyle {
  barWidth: number;
  /** Distância (para cima) da barra de vida até o centro do chefe. */
  barOffsetY: number;
  /** Distância (para cima) do nome até o centro do chefe. */
  nameOffsetY: number;
  nameColor: string;
  barColor: number;
  barBackColor: number;
  impactColor: number;
  damageTextColor: string;
  deathColor: number;
  /**
   * true = barra e nome fixos na parte de baixo da tela (para chefes
   * enormes, como Ignis, cuja barra ficaria fora da tela). Nesse caso
   * barOffsetY e nameOffsetY não são usados.
   */
  screenBar?: boolean;
}

/** Distância (px) da barra fixa até a borda de baixo da tela. */
const SCREEN_BAR_BOTTOM = 34;

export interface Boss {
  sprite: CharacterSprite;
  style: BossStyle;
  maxHealth: number;
  health: number;
  /** Distância máxima para a espada do herói acertar o chefe. */
  hitRange: number;
  healthBar: Phaser.GameObjects.Graphics;
  nameText: Phaser.GameObjects.Text;
}

/** Cria a barra de vida e o nome do chefe (começam escondidos). */
export function createBoss(
  scene: Phaser.Scene,
  sprite: CharacterSprite,
  stats: { maxHealth: number; hitRange: number },
  style: BossStyle,
): Boss {
  const healthBar = scene.add.graphics();
  healthBar.setDepth(3000);
  healthBar.setVisible(false);

  const nameText = scene.add
    .text(sprite.body.x, sprite.body.y - style.nameOffsetY, "", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      fontStyle: "bold",
      color: style.nameColor,
      stroke: "#160d1c",
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setDepth(3000)
    .setVisible(false);

  if (style.screenBar) {
    healthBar.setScrollFactor(0);
    nameText.setScrollFactor(0).setFontSize(20);
  }

  return {
    sprite,
    style,
    maxHealth: stats.maxHealth,
    health: stats.maxHealth,
    hitRange: stats.hitRange,
    healthBar,
    nameText,
  };
}

export function showBossUi(boss: Boss): void {
  boss.healthBar.setVisible(true);
  boss.nameText.setVisible(true);
  drawBossHealthBar(boss);
}

export function drawBossHealthBar(boss: Boss): void {
  const { style } = boss;
  const bar = boss.healthBar;
  const screen = bar.scene.scale;
  // Barra fixa na tela: centralizada embaixo, até a largura da tela.
  const width = style.screenBar
    ? Math.min(style.barWidth, screen.width - 40)
    : style.barWidth;
  const x = style.screenBar
    ? (screen.width - width) / 2
    : boss.sprite.body.x - width / 2;
  const y = style.screenBar
    ? screen.height - SCREEN_BAR_BOTTOM
    : boss.sprite.body.y - style.barOffsetY;

  bar.clear();

  bar.fillStyle(0x100c16, 0.95);
  bar.fillRect(x, y, width, 10);

  bar.fillStyle(style.barBackColor, 1);
  bar.fillRect(x + 1, y + 1, width - 2, 8);

  const healthWidth = (width - 2) * (boss.health / boss.maxHealth);

  if (healthWidth > 0) {
    bar.fillStyle(style.barColor, 1);
    bar.fillRect(x + 1, y + 1, healthWidth, 8);
  }

  if (style.screenBar) {
    boss.nameText.setPosition(screen.width / 2, y - 16);
  } else {
    boss.nameText.setPosition(
      boss.sprite.body.x,
      boss.sprite.body.y - style.nameOffsetY,
    );
  }
}

/** Remove o desenho, a barra e o nome do chefe. */
export function destroyBoss(boss: Boss): void {
  boss.sprite.container.destroy();
  boss.healthBar.destroy();
  boss.nameText.destroy();
}

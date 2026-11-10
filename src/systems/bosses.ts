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
}

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
  const width = style.barWidth;
  const x = boss.sprite.body.x - width / 2;
  const y = boss.sprite.body.y - style.barOffsetY;
  const bar = boss.healthBar;

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

  boss.nameText.setPosition(
    boss.sprite.body.x,
    boss.sprite.body.y - style.nameOffsetY,
  );
}

/** Remove o desenho, a barra e o nome do chefe. */
export function destroyBoss(boss: Boss): void {
  boss.sprite.container.destroy();
  boss.healthBar.destroy();
  boss.nameText.destroy();
}

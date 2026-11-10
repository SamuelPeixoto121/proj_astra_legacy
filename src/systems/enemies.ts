// Sistema de inimigos comuns.
// Cada tipo de inimigo é descrito por dados (atributos, cores, barra de vida
// e função de desenho). A cena trata todos os inimigos do mesmo jeito.
//
// Para criar um inimigo novo:
// 1. adicione o nome em EnemyKind (types.ts) e os atributos em config.ts;
// 2. crie o desenho em characters/;
// 3. registre o tipo em ENEMY_TYPES abaixo;
// 4. adicione os textos em i18n/texts.ts (TEXTS.enemies).

import type Phaser from "phaser";
import { SPIDER_STATS, WOLF_STATS } from "../config";
import type { EnemyKind } from "../types";
import type { CharacterSprite } from "../characters/types";
import { createWolf } from "../characters/wolf";
import { createSpider } from "../characters/spider";

export interface EnemyStats {
  maxHealth: number;
  speed: number;
  damage: number;
  hitRange: number;
  sightRange: number;
  stopDistance: number;
  attackReach: number;
  attackCooldown: number;
}

interface EnemyDefinition {
  stats: EnemyStats;
  create: (scene: Phaser.Scene, x: number, y: number) => CharacterSprite;
  colors: {
    impact: number;
    damageText: string;
    healthBar: number;
    death: number;
  };
  healthBar: { width: number; offsetY: number };
}

export const ENEMY_TYPES: Record<EnemyKind, EnemyDefinition> = {
  wolf: {
    stats: WOLF_STATS,
    create: createWolf,
    colors: {
      impact: 0xffb56b,
      damageText: "#fff0c2",
      healthBar: 0xc44449,
      death: 0xc44449,
    },
    healthBar: { width: 48, offsetY: 36 },
  },
  spider: {
    stats: SPIDER_STATS,
    create: createSpider,
    colors: {
      impact: 0xc9ff9a,
      damageText: "#e6ffd0",
      healthBar: 0x9a5cc4,
      death: 0x7a4c9e,
    },
    healthBar: { width: 36, offsetY: 28 },
  },
};

export interface Enemy {
  kind: EnemyKind;
  definition: EnemyDefinition;
  sprite: CharacterSprite;
  healthBar: Phaser.GameObjects.Graphics;
  health: number;
  defeated: boolean;
  /** Momento (em ms) do último ataque deste inimigo. */
  lastAttackAt: number;
}

export function spawnEnemy(
  scene: Phaser.Scene,
  kind: EnemyKind,
  x: number,
  y: number,
): Enemy {
  const definition = ENEMY_TYPES[kind];
  const sprite = definition.create(scene, x, y);

  const healthBar = scene.add.graphics();
  healthBar.setDepth(3000);

  return {
    kind,
    definition,
    sprite,
    healthBar,
    health: definition.stats.maxHealth,
    defeated: false,
    lastAttackAt: -10000,
  };
}

export function drawEnemyHealthBar(enemy: Enemy): void {
  if (enemy.defeated) {
    return;
  }

  const { width, offsetY } = enemy.definition.healthBar;
  const x = enemy.sprite.body.x - width / 2;
  const y = enemy.sprite.body.y - offsetY;
  const bar = enemy.healthBar;

  bar.clear();
  bar.fillStyle(0x111710, 0.95);
  bar.fillRect(x, y, width, 7);

  const healthWidth =
    width * (enemy.health / enemy.definition.stats.maxHealth);

  if (healthWidth > 0) {
    bar.fillStyle(enemy.definition.colors.healthBar, 1);
    bar.fillRect(x + 1, y + 1, Math.max(0, healthWidth - 1), 5);
  }
}

// Números de balanceamento e tamanho do mundo.
// Para ajustar a dificuldade do jogo, altere os valores aqui.

export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 1200;
export const TILE_SIZE = 64;

export const PLAYER_STATS = {
  maxHealth: 100,
  speed: 220,
  attackDamage: 25,
  attackCooldown: 350,
  invulnerabilityTime: 850,
} as const;

// Inimigos comuns:
// - hitRange: distância máxima para a espada do herói acertá-los;
// - sightRange: a partir de que distância eles começam a perseguir o herói;
// - stopDistance: param de andar quando chegam tão perto assim;
// - attackReach: atacam o herói quando estão a essa distância ou menos
//   (precisa ser maior que stopDistance, senão nunca alcançam);
// - attackCooldown: tempo mínimo entre dois ataques, em milissegundos.
export const WOLF_STATS = {
  maxHealth: 60,
  speed: 85,
  damage: 12,
  hitRange: 85,
  sightRange: 420,
  stopDistance: 36,
  attackReach: 46,
  attackCooldown: 900,
} as const;

export const SPIDER_STATS = {
  maxHealth: 30,
  speed: 115,
  damage: 8,
  hitRange: 75,
  sightRange: 230,
  stopDistance: 26,
  attackReach: 36,
  attackCooldown: 700,
} as const;

// Aranhas espalhadas pela floresta, longe da trilha (não fazem parte da missão).
export const SPIDER_SPAWNS = [
  { x: 380, y: 640 },
  { x: 1220, y: 860 },
  { x: 1180, y: 430 },
] as const;

export const KAEL_STATS = {
  maxHealth: 250,
  speed: 105,
  damage: 20,
  hitRange: 105,
  attackCooldown: 1000,
} as const;

export const ELDER_TALK_RANGE = 85;

// Pedra Astral: checkpoint no meio da trilha.
export const SHRINE_POSITION = { x: 740, y: 700 } as const;
export const SHRINE_ACTIVATION_RANGE = 60;

// Onde o herói reaparece em cada checkpoint.
export const CHECKPOINTS = {
  village: { x: 790, y: 960 },
  shrine: { x: 790, y: 715 },
} as const;

export type CheckpointId = keyof typeof CHECKPOINTS;

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

export const WOLF_STATS = {
  maxHealth: 60,
  speed: 85,
  damage: 12,
  attackRange: 85,
} as const;

export const KAEL_STATS = {
  maxHealth: 250,
  speed: 105,
  damage: 20,
  attackRange: 105,
  attackCooldown: 1000,
} as const;

export const ELDER_TALK_RANGE = 85;

// Números de balanceamento e tamanho do mundo.
// Para ajustar a dificuldade do jogo, altere os valores aqui.

import type { AreaId } from "./types";

// Floresta Sussurrante
export const WORLD_WIDTH = 1600;
export const WORLD_HEIGHT = 1200;
export const TILE_SIZE = 64;

// Ruínas do Santuário
export const RUINS_WIDTH = 1400;
export const RUINS_HEIGHT = 1000;

// Barreira de corrupção que fecha a trilha ao norte até Kael ser derrotado.
export const NORTH_BARRIER = { x: 850, y: 240, width: 200 } as const;

// Tempo (ms) do escurecimento ao trocar de área.
export const AREA_FADE_TIME = 350;

// Nome da área no centro da tela ao entrar: tempo para aparecer/sumir e
// quanto tempo fica totalmente visível (ms).
export const AREA_BANNER = { fade: 700, hold: 1800 } as const;

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

// Sentinela de Pedra, o guardião das Ruínas. Golpeia o chão em área:
// - wakeRange: desperta quando o herói chega tão perto assim;
// - slamTriggerRange: começa o golpe quando o herói está a essa distância;
// - slamWindup: tempo (ms) do aviso antes do golpe — dá para fugir;
// - slamRadius: quem estiver dentro desse raio na hora do golpe leva dano.
export const SENTINEL_STATS = {
  maxHealth: 320,
  speed: 70,
  hitRange: 110,
  sightRange: 560,
  stopDistance: 58,
  wakeRange: 280,
  slamTriggerRange: 90,
  slamWindup: 750,
  slamRadius: 95,
  slamDamage: 28,
  slamCooldown: 1500,
} as const;

export const SENTINEL_POSITION = { x: 700, y: 300 } as const;

// Fragmento Astral no altar das Ruínas.
export const FRAGMENT_POSITION = { x: 700, y: 126 } as const;
export const FRAGMENT_COLLECT_RANGE = 70;

// Aranhas das Ruínas.
export const RUINS_SPIDER_SPAWNS = [
  { x: 360, y: 560 },
  { x: 1040, y: 640 },
  { x: 990, y: 300 },
] as const;

// Pedra Astral das Ruínas (antes do guardião).
export const RUINS_SHRINE_POSITION = { x: 645, y: 730 } as const;

export const ELDER_TALK_RANGE = 85;

// Pedra Astral: checkpoint no meio da trilha.
export const SHRINE_POSITION = { x: 740, y: 700 } as const;
export const SHRINE_ACTIVATION_RANGE = 60;

// Onde o herói reaparece em cada checkpoint, e em qual área.
// Entrar numa área também salva o jogo no checkpoint de entrada dela.
export const CHECKPOINTS = {
  village: { area: "forest", x: 790, y: 960 },
  shrine: { area: "forest", x: 790, y: 715 },
  forestNorth: { area: "forest", x: 850, y: 110 },
  ruinsEntrance: { area: "ruins", x: 700, y: 880 },
  ruinsShrine: { area: "ruins", x: 700, y: 745 },
} as const satisfies Record<string, { area: AreaId; x: number; y: number }>;

export type CheckpointId = keyof typeof CHECKPOINTS;

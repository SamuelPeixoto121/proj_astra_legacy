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

// Pântano Sombrio
export const SWAMP_WIDTH = 1600;
export const SWAMP_HEIGHT = 1200;

// Barreira de corrupção que fecha a trilha ao norte até Kael ser derrotado.
export const NORTH_BARRIER = { x: 850, y: 240, width: 200 } as const;

// Tempo (ms) do escurecimento ao trocar de área.
export const AREA_FADE_TIME = 350;

// Nome da área no centro da tela ao entrar: tempo para aparecer/sumir e
// quanto tempo fica totalmente visível (ms).
export const AREA_BANNER = { fade: 700, hold: 1800 } as const;

// Herói. Rolamento (Shift):
// - rollSpeed/rollDuration: velocidade e duração (ms) do rolamento;
// - rollCooldown: tempo mínimo (ms) entre o início de dois rolamentos.
// Durante o rolamento o herói não recebe dano.
export const PLAYER_STATS = {
  maxHealth: 100,
  speed: 220,
  attackDamage: 25,
  attackCooldown: 350,
  invulnerabilityTime: 850,
  rollSpeed: 470,
  rollDuration: 300,
  rollCooldown: 750,
} as const;

// Inimigos comuns:
// - hitRange: distância máxima para a espada do herói acertá-los;
// - sightRange: a partir de que distância eles começam a perseguir o herói;
// - stopDistance: param de andar quando chegam tão perto assim;
// - attackReach: atacam o herói quando estão a essa distância ou menos
//   (precisa ser maior que stopDistance, senão nunca alcançam);
// - attackCooldown: tempo mínimo entre dois ataques, em milissegundos;
// - wanderRadius: com o herói longe, passeiam até essa distância de onde nasceram;
// - wanderSpeed: velocidade do passeio (mais lenta que a perseguição).
export const WOLF_STATS = {
  maxHealth: 60,
  speed: 85,
  damage: 12,
  hitRange: 85,
  sightRange: 420,
  stopDistance: 36,
  attackReach: 46,
  attackCooldown: 900,
  wanderRadius: 110,
  wanderSpeed: 40,
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
  wanderRadius: 70,
  wanderSpeed: 55,
} as const;

// Passeio dos inimigos comuns (vale para todos):
// - pauseMin/pauseMax: pausa (ms) entre um passeio e outro;
// - giveUpTime: se não chegar ao destino nesse tempo (ex.: preso numa árvore),
//   desiste e escolhe outro.
export const ENEMY_WANDER = {
  pauseMin: 1000,
  pauseMax: 2500,
  giveUpTime: 4000,
} as const;

// Aranhas espalhadas pela floresta, longe da trilha (não fazem parte da missão).
export const SPIDER_SPAWNS = [
  { x: 380, y: 640 },
  { x: 1220, y: 860 },
  { x: 1180, y: 430 },
] as const;

// Kael, chefe do prólogo. Persegue e ataca de perto; à distância média,
// faz uma investida em linha reta (com aviso no chão antes).
// - chargeMinRange/chargeMaxRange: distância do herói para iniciar a investida;
// - chargeWindup: tempo (ms) do aviso antes de correr — dá para sair da frente;
// - chargeSpeed/chargeDuration: velocidade e duração (ms) da corrida;
// - recoverTime: tempo parado depois da investida (janela para atacar);
// - stunTime: tempo atordoado se ele bater numa árvore durante a investida.
export const KAEL_STATS = {
  maxHealth: 250,
  speed: 105,
  damage: 20,
  hitRange: 105,
  attackCooldown: 1000,
  sightRange: 650,
  stopDistance: 48,
  meleeReach: 65,
  chargeMinRange: 130,
  chargeMaxRange: 380,
  chargeWindup: 650,
  chargeSpeed: 430,
  chargeDuration: 450,
  chargeDamage: 26,
  chargeCooldown: 3200,
  recoverTime: 700,
  stunTime: 1600,
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

// Portal de luz atrás do altar das Ruínas (abre ao pegar o fragmento).
export const RUINS_PORTAL_POSITION = { x: 700, y: 60 } as const;

// Pântano Sombrio.
// Trilha (pontos em ordem, de baixo para cima) e poças de lama:
// dentro da lama o herói anda mais devagar (rolar não é afetado).
export const SWAMP_PATH = [
  { x: 800, y: 1200 },
  { x: 760, y: 980 },
  { x: 880, y: 820 },
  { x: 800, y: 640 },
  { x: 700, y: 480 },
  { x: 800, y: 320 },
  { x: 800, y: 170 },
] as const;

export const SWAMP_MUD_POOLS = [
  { x: 780, y: 900, rx: 110, ry: 55 },
  { x: 860, y: 560, rx: 130, ry: 60 },
  { x: 420, y: 760, rx: 150, ry: 80 },
  { x: 1180, y: 520, rx: 140, ry: 70 },
  { x: 1150, y: 900, rx: 120, ry: 60 },
  { x: 450, y: 350, rx: 120, ry: 60 },
] as const;

/** Velocidade do herói dentro da lama (0.5 = metade). */
export const SWAMP_MUD_SPEED = 0.5;

export const SWAMP_RETURN_PORTAL_POSITION = { x: 800, y: 1150 } as const;
export const SWAMP_SHRINE_POSITION = { x: 715, y: 690 } as const;

// Aranhas do Pântano (os espíritos chegam na próxima etapa).
export const SWAMP_SPIDER_SPAWNS = [
  { x: 380, y: 980 },
  { x: 1240, y: 720 },
  { x: 1050, y: 300 },
] as const;

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
  ruinsPortal: { area: "ruins", x: 700, y: 112 },
  swampEntrance: { area: "swamp", x: 800, y: 1060 },
  swampShrine: { area: "swamp", x: 770, y: 705 },
} as const satisfies Record<string, { area: AreaId; x: number; y: number }>;

export type CheckpointId = keyof typeof CHECKPOINTS;

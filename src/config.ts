// Números de balanceamento e tamanho do mundo.
// Para ajustar a dificuldade do jogo, altere os valores aqui.

import type {
  AmuletId,
  AreaId,
  ArmorId,
  EquippedItems,
  ItemId,
  WeaponId,
} from "./types";

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

// Picos Congelados
export const PEAKS_WIDTH = 1600;
export const PEAKS_HEIGHT = 1400;

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
// O dano e a velocidade do golpe vêm da arma equipada (WEAPON_STATS).
export const PLAYER_STATS = {
  maxHealth: 100,
  speed: 220,
  invulnerabilityTime: 850,
  rollSpeed: 470,
  rollDuration: 300,
  rollCooldown: 750,
} as const;

// Equipamentos (cada chefe deixa um item ao ser derrotado):
// - armas: attackDamage (dano do golpe) e attackCooldown (ms entre golpes);
// - armaduras: damageTaken (fração do dano recebido: 0.7 = 30% a menos)
//   e speed (fração da velocidade ao andar: 0.9 = 10% mais lento);
// - amuletos: potionHeal (multiplica a cura das poções) e rollCooldown
//   (multiplica a recarga do rolamento: 0.6 = recarrega mais rápido).
export const WEAPON_STATS = {
  ironSword: { attackDamage: 25, attackCooldown: 350 },
  corruptedBlade: { attackDamage: 35, attackCooldown: 430 },
  glacialBlade: { attackDamage: 30, attackCooldown: 300 },
} as const satisfies Record<WeaponId, { attackDamage: number; attackCooldown: number }>;

export const ARMOR_STATS = {
  travelerTunic: { damageTaken: 1, speed: 1 },
  stoneArmor: { damageTaken: 0.65, speed: 0.9 },
} as const satisfies Record<ArmorId, { damageTaken: number; speed: number }>;

export const AMULET_STATS = {
  swampAmulet: { potionHeal: 1.5, rollCooldown: 0.6 },
} as const satisfies Record<AmuletId, { potionHeal: number; rollCooldown: number }>;

/** Sem arma, o herói luta no soco: fraco, mas muito rápido. */
export const UNARMED_STATS = { attackDamage: 12, attackCooldown: 260 } as const;

/** Sem armadura: mais leve (mais rápido), mas recebe mais dano. */
export const UNARMORED_STATS = { damageTaken: 1.15, speed: 1.05 } as const;

/** Itens que o herói tem (e usa) desde o começo de um jogo novo. */
export const STARTING_ITEMS: readonly ItemId[] = ["ironSword", "travelerTunic"];

export function createStartingEquipment(): EquippedItems {
  return { weapon: "ironSword", armor: "travelerTunic", amulet: null };
}

/** Distância para pegar um item do chão. */
export const ITEM_PICKUP_RANGE = 40;

// Poções de cura (tecla Q):
// - max: quantas o herói consegue carregar; start: com quantas começa;
// - heal: quanto de vida cada uma recupera;
// - drinkCooldown: tempo mínimo (ms) entre dois goles;
// - dropChance: chance (0 a 1) de um inimigo comum deixar cair uma poção
//   (chefes sempre deixam);
// - pickupRange: distância para pegar uma poção do chão.
// Tocar numa Pedra Astral (ou voltar ao checkpoint após uma derrota)
// recarrega as poções até o máximo.
export const POTION_STATS = {
  max: 3,
  start: 1,
  heal: 40,
  drinkCooldown: 800,
  dropChance: 0.3,
  pickupRange: 32,
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

// Espírito do Pântano: ataca à distância. Para inimigos assim:
// - damage: dano de cada projétil;
// - attackReach: distância máxima para atirar;
// - attackCooldown: tempo (ms) entre dois tiros.
// E os dados de "ranged" (ver systems/enemies.ts):
// - preferredDistance: distância que ele tenta manter do herói;
// - windup: tempo (ms) brilhando antes de atirar (o aviso);
// - projectileSpeed/projectileRange: velocidade e alcance do projétil.
export const WISP_STATS = {
  maxHealth: 40,
  speed: 80,
  damage: 10,
  hitRange: 80,
  sightRange: 380,
  stopDistance: 0,
  attackReach: 330,
  attackCooldown: 2000,
  wanderRadius: 90,
  wanderSpeed: 35,
} as const;

export const WISP_RANGED = {
  preferredDistance: 210,
  windup: 450,
  projectileSpeed: 220,
  projectileRange: 520,
} as const;

// Cavaleiro de Gelo (bloqueia com escudo).
export const ICE_KNIGHT_STATS = {
  maxHealth: 75,
  speed: 75,
  damage: 18,
  hitRange: 85,
  sightRange: 380,
  stopDistance: 44,
  attackReach: 62,
  attackCooldown: 1800,
  wanderRadius: 70,
  wanderSpeed: 30,
} as const;

// Escudo do Cavaleiro:
// - blockArc: metade do ângulo (radianos) protegido pelo escudo, à frente
//   dele (1.2 ≈ 70° para cada lado);
// - windup: tempo (ms) erguendo a espada antes do golpe (a direção trava);
// - recovery: tempo (ms) com o escudo baixado depois do golpe;
// - strikeArc: metade do ângulo à frente dele que o golpe acerta.
export const ICE_KNIGHT_SHIELD = {
  blockArc: 1.2,
  windup: 650,
  recovery: 1100,
  strikeArc: 1.2,
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

/** Onde Kael aparece na Floresta. */
export const KAEL_POSITION = { x: 850, y: 380 } as const;

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

// Espíritos do Pântano (atacam de longe).
export const SWAMP_WISP_SPAWNS = [
  { x: 600, y: 830 },
  { x: 1050, y: 660 },
  { x: 560, y: 500 },
  { x: 990, y: 380 },
] as const;

// Feiticeira do Pântano, a guardiã do segundo Fragmento Astral.
// - wakeRange: aparece quando o herói chega tão perto assim;
// - volley*: rajada de projéteis em leque (volleyWindup = aviso antes);
// - teleport*: se o herói chega a teleportTriggerRange, ela some e
//   reaparece longe (só de tempos em tempos: teleportCooldown);
// - mark*: ataque especial: marcas no chão onde o herói está, que explodem
//   depois de markWindup (dá para fugir);
// - enraged*: abaixo dessa fração da vida ela fica mais agressiva.
// Enquanto conjura (rajada ou marcas) ela não teleporta: é a hora de atacar.
export const WITCH_STATS = {
  maxHealth: 300,
  hitRange: 95,
  wakeRange: 330,
  volleyWindup: 650,
  volleyCooldown: 2300,
  volleyCount: 3,
  volleySpread: 0.26,
  projectileSpeed: 240,
  projectileRange: 620,
  projectileDamage: 14,
  teleportTriggerRange: 130,
  teleportCooldown: 3800,
  teleportMinDistance: 230,
  teleportTime: 260,
  markCooldown: 8000,
  markCount: 3,
  markInterval: 420,
  markWindup: 1000,
  markRadius: 70,
  markDamage: 22,
  enragedAt: 0.5,
  enragedVolleyCount: 5,
  enragedCooldownFactor: 0.7,
} as const;

export const WITCH_POSITION = { x: 800, y: 190 } as const;

/** Pontos da clareira para onde a feiticeira pode se teleportar. */
export const WITCH_TELEPORT_POINTS = [
  { x: 650, y: 170 },
  { x: 950, y: 170 },
  { x: 800, y: 120 },
  { x: 690, y: 270 },
  { x: 910, y: 270 },
  { x: 800, y: 230 },
] as const;

// Segundo Fragmento Astral: surge no centro da clareira.
export const SWAMP_FRAGMENT_POSITION = { x: 800, y: 180 } as const;

// Portal gelado na clareira (abre ao pegar o segundo fragmento).
export const SWAMP_PORTAL_POSITION = { x: 800, y: 80 } as const;

// Amuleto da feiticeira: num canto da clareira, longe do fragmento.
export const WITCH_ITEM_POSITION = { x: 680, y: 255 } as const;

// Aranhas do Pântano.
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
  swampPortal: { area: "swamp", x: 800, y: 150 },
  peaksEntrance: { area: "peaks", x: 800, y: 1260 },
  peaksShrine: { area: "peaks", x: 745, y: 800 },
} as const satisfies Record<string, { area: AreaId; x: number; y: number }>;

export type CheckpointId = keyof typeof CHECKPOINTS;

// Picos Congelados.
// Trilha (pontos em ordem, de baixo para cima) até o platô do topo, onde
// fica o chefe. Placas de gelo: o herói escorrega (ver PEAKS_ICE_TRACTION).
export const PEAKS_PATH = [
  { x: 800, y: 1400 },
  { x: 720, y: 1150 },
  { x: 900, y: 950 },
  { x: 760, y: 780 },
  { x: 640, y: 600 },
  { x: 820, y: 450 },
  { x: 800, y: 260 },
] as const;

/** Platô do topo (arena do chefe): elipse sem árvores nem pedras. */
export const PEAKS_SUMMIT = { x: 800, y: 240, rx: 300, ry: 170 } as const;

export const PEAKS_ICE_PATCHES = [
  { x: 840, y: 1060, rx: 120, ry: 60 },
  { x: 700, y: 690, rx: 140, ry: 70 },
  { x: 420, y: 900, rx: 160, ry: 80 },
  { x: 1150, y: 700, rx: 150, ry: 80 },
  { x: 1100, y: 1170, rx: 130, ry: 60 },
  { x: 740, y: 525, rx: 110, ry: 55 },
] as const;

/**
 * Aderência no gelo: quanto da velocidade desejada o herói alcança a cada
 * quadro (1 = normal, sem escorregar; perto de 0 = escorrega muito).
 */
export const PEAKS_ICE_TRACTION = 0.04;

export const PEAKS_RETURN_PORTAL_POSITION = { x: 800, y: 1350 } as const;
export const PEAKS_SHRINE_POSITION = { x: 690, y: 790 } as const;

// Lobos e Cavaleiros de Gelo dos Picos.
export const PEAKS_WOLF_SPAWNS = [
  { x: 520, y: 1100 },
  { x: 1050, y: 470 },
] as const;

export const PEAKS_KNIGHT_SPAWNS = [
  { x: 1100, y: 920 },
  { x: 560, y: 560 },
  { x: 880, y: 640 },
] as const;

// Colosso de Gelo, o chefe dos Picos. Tem duas fases:
// 1) Colosso (lento): golpe no chão quando o herói está perto (slam*) e
//    linha de espinhos de gelo quando está longe (spike*);
// 2) com phaseTwoAt da vida, a armadura se parte (transformTime ms sem
//    levar dano) e sobra o Espírito do Inverno (rápido): rajada de
//    estilhaços em círculo (burst*) e investida (dash*). Depois da
//    investida ele fica tonto por dashRecover ms.
export const FROST_BOSS_STATS = {
  maxHealth: 400,
  hitRange: 100,
  wakeRange: 320,
  sightRange: 900,
  // Fase 1
  speed: 55,
  stopDistance: 60,
  slamTriggerRange: 95,
  slamWindup: 850,
  slamRadius: 100,
  slamDamage: 26,
  slamCooldown: 1800,
  spikeMinRange: 160,
  spikeCooldown: 4000,
  spikeWindup: 800,
  spikeCount: 7,
  spikeSpacing: 55,
  spikeInterval: 80,
  spikeRadius: 32,
  spikeDamage: 20,
  // Transformação
  phaseTwoAt: 0.5,
  transformTime: 1800,
  // Fase 2
  spiritSpeed: 115,
  spiritStopDistance: 140,
  burstCooldown: 2600,
  burstWindup: 600,
  burstCount: 10,
  shardSpeed: 220,
  shardRange: 520,
  shardDamage: 14,
  dashMinRange: 120,
  dashCooldown: 4500,
  dashWindup: 700,
  dashSpeed: 560,
  dashDuration: 420,
  dashDamage: 24,
  dashHitRange: 42,
  dashRecover: 1300,
} as const;

export const FROST_BOSS_POSITION = { x: 800, y: 250 } as const;

// Terceiro Fragmento Astral: surge no centro do platô.
export const PEAKS_FRAGMENT_POSITION = { x: 800, y: 220 } as const;

// Lâmina Glacial (item do chefe): num canto do platô, longe do fragmento.
export const FROST_BOSS_ITEM_POSITION = { x: 960, y: 300 } as const;

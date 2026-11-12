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
export const VOLCANO_WIDTH = 2000;
export const VOLCANO_HEIGHT = 1200;
export const GRAVEYARD_WIDTH = 1800;
export const GRAVEYARD_HEIGHT = 1200;
export const CITADEL_WIDTH = 1600;
export const CITADEL_HEIGHT = 1600;
export const HOARD_WIDTH = 1400;
export const HOARD_HEIGHT = 1100;

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
  emberMantle: { damageTaken: 0.8, speed: 1 },
} as const satisfies Record<ArmorId, { damageTaken: number; speed: number }>;

export const AMULET_STATS = {
  swampAmulet: { potionHeal: 1.5, rollCooldown: 0.6 },
  dragonHeart: { potionHeal: 1.25, rollCooldown: 0.4 },
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
  peaksPortal: { area: "peaks", x: 800, y: 190 },
  volcanoEntrance: { area: "volcano", x: 230, y: 900 },
  volcanoShrine: { area: "volcano", x: 875, y: 790 },
  volcanoCrater: { area: "volcano", x: 1640, y: 440 },
  villagePortal: { area: "forest", x: 560, y: 1030 },
  forestWest: { area: "forest", x: 110, y: 905 },
  graveyardEntrance: { area: "graveyard", x: 1680, y: 700 },
  graveyardShrine: { area: "graveyard", x: 1055, y: 640 },
  graveyardArena: { area: "graveyard", x: 300, y: 470 },
  villageGate: { area: "forest", x: 1000, y: 990 },
  citadelEntrance: { area: "citadel", x: 800, y: 1460 },
  citadelShrine: { area: "citadel", x: 895, y: 1070 },
  citadelGate: { area: "citadel", x: 800, y: 190 },
  hoardEntrance: { area: "hoard", x: 700, y: 960 },
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

// Portal de fogo no topo do platô (abre ao pegar o terceiro fragmento).
export const PEAKS_FIRE_PORTAL_POSITION = { x: 800, y: 110 } as const;

// Terras Vulcânicas (Capítulo 4).
// Trilha da esquerda (portal de volta) para a direita, até a cratera onde
// fica o chefe. Rios de lava cruzam a trilha: pisar queima (rolar por cima
// é seguro, porque o herói fica invencível durante o rolamento).
export const VOLCANO_PATH = [
  { x: 60, y: 900 },
  { x: 400, y: 860 },
  { x: 620, y: 700 },
  { x: 900, y: 760 },
  { x: 1150, y: 560 },
  { x: 1400, y: 600 },
  { x: 1620, y: 500 },
] as const;

/** Cratera (arena do chefe): elipse sem pedras nem lava. */
export const VOLCANO_CRATER = { x: 1640, y: 500, rx: 290, ry: 200 } as const;

/** Rios de lava: linhas (pontos em ordem) com uma largura. */
export const VOLCANO_LAVA_RIVERS = [
  {
    width: 64,
    points: [
      { x: 520, y: 0 },
      { x: 570, y: 300 },
      { x: 500, y: 620 },
      { x: 560, y: 900 },
      { x: 520, y: 1200 },
    ],
  },
  {
    width: 72,
    points: [
      { x: 1060, y: 0 },
      { x: 1000, y: 330 },
      { x: 1070, y: 680 },
      { x: 1010, y: 1200 },
    ],
  },
] as const;

/** Poças de lava (elipses) espalhadas pelo mapa. */
export const VOLCANO_LAVA_POOLS = [
  { x: 280, y: 330, rx: 120, ry: 70 },
  { x: 790, y: 1060, rx: 140, ry: 70 },
  { x: 1330, y: 1000, rx: 130, ry: 70 },
  { x: 780, y: 330, rx: 110, ry: 60 },
] as const;

/** Dano de pisar na lava (a cada PLAYER_STATS.invulnerabilityTime ms). */
export const VOLCANO_LAVA_DAMAGE = 10;

export const VOLCANO_RETURN_PORTAL_POSITION = { x: 110, y: 900 } as const;
export const VOLCANO_SHRINE_POSITION = { x: 820, y: 780 } as const;

// Brasa Viva: corre até o herói, acende o pavio quando chega a
// attackReach e explode depois de fuseTime ms. A explosão (radius) tira
// `damage` do herói e enemyDamage dos outros inimigos por perto.
// Matá-la antes de explodir evita a explosão.
export const EMBER_STATS = {
  maxHealth: 30,
  speed: 125,
  damage: 22,
  hitRange: 70,
  sightRange: 360,
  stopDistance: 0,
  attackReach: 50,
  attackCooldown: 0,
  wanderRadius: 60,
  wanderSpeed: 35,
} as const;

export const EMBER_EXPLOSIVE = {
  fuseTime: 900,
  radius: 85,
  enemyDamage: 45,
} as const;

// Inimigos das Terras Vulcânicas.
export const VOLCANO_EMBER_SPAWNS = [
  { x: 330, y: 1000 },
  { x: 720, y: 880 },
  { x: 1240, y: 720 },
  { x: 1200, y: 380 },
] as const;

export const VOLCANO_SPIDER_SPAWNS = [
  { x: 300, y: 650 },
  { x: 1300, y: 760 },
] as const;

export const VOLCANO_WOLF_SPAWNS = [{ x: 1250, y: 420 }] as const;

// Arauto de Ignis, o chefe das Terras Vulcânicas. Flutua mantendo
// distância (stopDistance) e ataca com:
// - colunas de fogo (column*): marca o chão onde o herói está, várias vezes
//   seguidas; cada coluna deixa uma poça de fogo (firePool*) que queima;
// - explosão de chamas (nova*) quando o herói fica colado nele;
// - chamado (summon*): invoca Brasas Vivas (no máximo maxSummons vivas).
// Com enragedAt da vida fica furioso: mais colunas e ataques mais rápidos.
export const HERALD_STATS = {
  maxHealth: 450,
  hitRange: 95,
  wakeRange: 340,
  sightRange: 900,
  speed: 55,
  stopDistance: 150,
  columnCooldown: 3200,
  columnCount: 3,
  columnInterval: 450,
  columnWindup: 900,
  columnRadius: 46,
  columnDamage: 20,
  firePoolTime: 6000,
  maxFirePools: 8,
  novaTriggerRange: 110,
  novaCooldown: 4000,
  novaWindup: 750,
  novaRadius: 120,
  novaDamage: 24,
  summonCooldown: 10000,
  summonCount: 2,
  maxSummons: 3,
  enragedAt: 0.5,
  enragedColumnCount: 5,
  enragedCooldownFactor: 0.7,
} as const;

export const HERALD_POSITION = { x: 1700, y: 480 } as const;

// Quarto Fragmento Astral: surge no centro da cratera.
export const VOLCANO_FRAGMENT_POSITION = { x: 1640, y: 470 } as const;

// Manto de Brasas (item do chefe): num canto da cratera.
export const HERALD_ITEM_POSITION = { x: 1790, y: 590 } as const;

// Portal de luz na cratera (abre ao pegar o quarto fragmento): leva de
// volta à vila, ao lado do Ancião. Na vila, outro portal faz o caminho de
// volta até a cratera.
export const VOLCANO_HOME_PORTAL_POSITION = { x: 1640, y: 350 } as const;
export const VILLAGE_PORTAL_POSITION = { x: 560, y: 1100 } as const;

// Trilha a oeste da vila, até o Selo Astral na borda da Floresta. O Ancião
// rompe o selo com a luz dos quatro fragmentos (Capítulo 5).
export const FOREST_WEST_TRAIL = [
  { x: 760, y: 930 },
  { x: 600, y: 960 },
  { x: 450, y: 930 },
  { x: 250, y: 890 },
  { x: 0, y: 905 },
] as const;

export const ASTRAL_SEAL = { x: 130, y: 900, height: 170 } as const;

// Cemitério de Dragões (Capítulo 5).
// Trilha da direita (vindo da Floresta) para a esquerda, até a arena do
// guardião. Está escuro: o herói enxerga só ao redor de si e das tochas
// que acende (E). De tempos em tempos, a sombra de Ignis cruza o céu.
export const GRAVEYARD_PATH = [
  { x: 1800, y: 700 },
  { x: 1500, y: 650 },
  { x: 1250, y: 780 },
  { x: 950, y: 600 },
  { x: 650, y: 700 },
  { x: 380, y: 600 },
] as const;

/** Arena do guardião: elipse sem ossos nem túmulos. */
export const GRAVEYARD_ARENA = { x: 330, y: 560, rx: 260, ry: 190 } as const;

/** Tochas apagadas ao longo da trilha (o herói acende com E). */
export const GRAVEYARD_TORCHES = [
  { x: 1560, y: 590 },
  { x: 1290, y: 860 },
  { x: 1010, y: 520 },
  { x: 760, y: 770 },
  { x: 560, y: 610 },
  { x: 330, y: 360 },
  { x: 330, y: 760 },
] as const;

export const TORCH_STATS = {
  /** Distância para acender uma tocha com E. */
  lightRange: 60,
  /** Raio da luz de uma tocha acesa. */
  lightRadius: 160,
} as const;

export const GRAVEYARD_SHRINE_POSITION = { x: 1000, y: 630 } as const;

// Espectro: flutua por cima de túmulos e ossos e persegue devagar. No escuro
// é intangível (os golpes atravessam); só na luz de uma tocha acesa pode ser
// atingido. Ataca em qualquer lugar.
export const SPECTRE_STATS = {
  maxHealth: 50,
  speed: 70,
  damage: 14,
  hitRange: 80,
  sightRange: 420,
  stopDistance: 28,
  attackReach: 46,
  attackCooldown: 1300,
  wanderRadius: 90,
  wanderSpeed: 30,
} as const;

/** Até que fração do raio da luz da tocha o Espectro fica visível e tangível. */
export const SPECTRE_REVEAL_FACTOR = 0.85;

// Cavaleiro Dracônico, o guardião do Cemitério. Um duelo:
// - combo (combo*): comboHits golpes à frente, cada um com aviso curto; o
//   último é mais lento e mais forte. Depois fica parado (comboRecover): a
//   brecha para atacar;
// - guarda (guard*): ergue a espada atravessada; golpeá-lo nessa hora faz
//   ele aparar e contra-atacar na hora (counter*);
// - salto (leap*): se o herói se afasta, salta até onde ele está.
// Com enragedAt da vida, os avisos ficam mais curtos (enragedSpeedFactor).
export const DRAGON_KNIGHT_STATS = {
  maxHealth: 500,
  hitRange: 95,
  wakeRange: 300,
  sightRange: 900,
  speed: 85,
  stopDistance: 55,
  comboRange: 80,
  comboCooldown: 1500,
  comboHits: 3,
  comboWindup: 380,
  comboGap: 260,
  comboFinisherWindup: 620,
  comboReach: 85,
  comboArc: 1.2,
  comboDamage: 16,
  finisherDamage: 26,
  comboLunge: 22,
  comboRecover: 1100,
  guardChance: 0.3,
  guardTime: 1300,
  guardCooldown: 5000,
  counterDamage: 22,
  counterRange: 100,
  leapMinRange: 220,
  leapCooldown: 5000,
  leapWindup: 600,
  leapTime: 550,
  leapRadius: 75,
  leapDamage: 20,
  leapRecover: 800,
  enragedAt: 0.5,
  enragedSpeedFactor: 0.75,
} as const;

export const DRAGON_KNIGHT_POSITION = { x: 300, y: 540 } as const;

// Quinto Fragmento Astral: surge no centro da arena.
export const GRAVEYARD_FRAGMENT_POSITION = { x: 330, y: 560 } as const;

// Coração de Dragão (item do chefe): num canto da arena.
export const DRAGON_KNIGHT_ITEM_POSITION = { x: 470, y: 690 } as const;

/** Raio da luz que ilumina a arena quando o duelo começa. */
export const ARENA_LIGHT_RADIUS = 300;

// Portal de luz na arena do Cemitério (abre ao pegar o quinto fragmento):
// leva de volta à vila, onde o Ancião une os cinco fragmentos.
export const GRAVEYARD_HOME_PORTAL_POSITION = { x: 200, y: 470 } as const;

// Portal Astral dourado na vila (Capítulo 6): leva à Cidadela em Ruínas.
export const ASTRAL_GATE_POSITION = { x: 1000, y: 1060 } as const;

// Cidadela em Ruínas (Capítulo 6): a antiga capital de Astra, queimada por
// Ignis. Trilha de baixo (portal) para cima, até o pátio do castelo, onde
// fica o dragão. Fogo nos escombros queima ao pisar (rolar é seguro).
export const CITADEL_PATH = [
  { x: 800, y: 1600 },
  { x: 800, y: 1350 },
  { x: 600, y: 1150 },
  { x: 900, y: 950 },
  { x: 700, y: 700 },
  { x: 800, y: 450 },
  { x: 800, y: 300 },
] as const;

/** Pátio do castelo (arena de Ignis): elipse sem casas nem escombros. */
export const CITADEL_COURTYARD = { x: 800, y: 300, rx: 360, ry: 190 } as const;

/** Fogo nos escombros (elipses): queima ao pisar. */
export const CITADEL_FIRES = [
  { x: 560, y: 1300, rx: 70, ry: 40 },
  { x: 1060, y: 1160, rx: 80, ry: 45 },
  { x: 760, y: 1060, rx: 55, ry: 32 },
  { x: 430, y: 900, rx: 70, ry: 40 },
  { x: 1120, y: 790, rx: 80, ry: 40 },
  { x: 760, y: 820, rx: 60, ry: 35 },
  { x: 540, y: 560, rx: 70, ry: 40 },
  { x: 1070, y: 540, rx: 70, ry: 40 },
] as const;

/** Dano de pisar no fogo dos escombros (a cada invencibilidade). */
export const CITADEL_FIRE_DAMAGE = 8;

export const CITADEL_RETURN_PORTAL_POSITION = { x: 800, y: 1540 } as const;
export const CITADEL_SHRINE_POSITION = { x: 840, y: 1060 } as const;

// Inimigos da Cidadela (os servos de Ignis que ainda guardam as ruínas).
export const CITADEL_EMBER_SPAWNS = [
  { x: 430, y: 1130 },
  { x: 960, y: 1080 },
  { x: 600, y: 790 },
  { x: 1000, y: 640 },
] as const;

export const CITADEL_WISP_SPAWNS = [
  { x: 400, y: 1120 },
  { x: 1200, y: 920 },
  { x: 430, y: 640 },
] as const;

/** Portão do castelo (no topo do pátio): entrada do Salão do Tesouro. */
export const CITADEL_CASTLE_GATE = { x: 800, y: 125, width: 120 } as const;

// Salão do Tesouro (Capítulo 6): o interior do castelo, coberto de ouro. Só
// Ignis está aqui. Quando o herói chega perto do centro, Ignis desce do céu
// pelo buraco no teto e pousa no meio do salão.
/** Arena: elipse sem montanhas de ouro. */
export const HOARD_ARENA = { x: 700, y: 520, rx: 420, ry: 300 } as const;

/** Onde Ignis pousa (embaixo do buraco no teto). */
export const IGNIS_LANDING = { x: 700, y: 470 } as const;

/** Montanhas de ouro (elipses) encostadas nas paredes. */
export const HOARD_GOLD_PILES = [
  { x: 160, y: 250, rx: 130, ry: 90 },
  { x: 140, y: 540, rx: 120, ry: 100 },
  { x: 170, y: 820, rx: 130, ry: 90 },
  { x: 1240, y: 250, rx: 130, ry: 90 },
  { x: 1260, y: 540, rx: 120, ry: 100 },
  { x: 1230, y: 820, rx: 130, ry: 90 },
  { x: 430, y: 130, rx: 160, ry: 70 },
  { x: 970, y: 130, rx: 160, ry: 70 },
  { x: 700, y: 110, rx: 120, ry: 60 },
  { x: 370, y: 970, rx: 110, ry: 55 },
  { x: 1030, y: 970, rx: 110, ry: 55 },
] as const;

// Ignis, o Dragão das Sombras: o chefe final. Fase 1 (no chão):
// - garras (claw*): golpe à frente quando o herói está perto;
// - cauda (tail*): giro que acerta em volta quando o herói está atrás/do lado;
// - sopro (breath*): cone de fogo à frente, com aviso no chão.
// Ele vira devagar (turnSpeed, radianos por segundo) para encarar o herói.
export const IGNIS_STATS = {
  maxHealth: 900,
  // Medido até o centro do corpo: alto, porque a cabeça e a cauda ficam longe.
  hitRange: 210,
  triggerRange: 330,
  sightRange: 1400,
  speed: 45,
  stopDistance: 120,
  turnSpeed: 2.2,
  clawRange: 135,
  clawArc: 0.9,
  clawWindup: 450,
  clawDamage: 22,
  clawCooldown: 1500,
  tailRange: 170,
  tailWindup: 550,
  tailRadius: 170,
  tailDamage: 18,
  tailCooldown: 2600,
  breathMinRange: 170,
  breathRange: 380,
  breathArc: 0.42,
  breathWindup: 800,
  breathTime: 1000,
  breathDamage: 16,
  breathCooldown: 5000,
  recover: 650,
} as const;

// Fases 2 e 3 de Ignis:
// - fase 2 (com phase2At da vida): voa em volta do salão (fly*), sem poder
//   ser atingido; solta bolas de fogo (barrage*/fireball*) e mergulha
//   (dive*); depois do mergulho fica pousado groundedTime ms: a brecha;
// - fase 3 (com phase3At da vida): volta ao chão furioso (ataques da fase 1
//   com o tempo multiplicado por enragedFactor) e quebra o chão (crack*):
//   fendas de fogo que ficam para sempre e queimam quem pisa.
export const IGNIS_PHASES = {
  phase2At: 0.66,
  phase3At: 0.33,
  flyRadiusX: 300,
  flyRadiusY: 170,
  flySpeed: 0.7,
  flyScale: 1.35,
  takeoffTime: 900,
  attackDelay: 2200,
  barrageCount: 4,
  barrageInterval: 450,
  barrageWindup: 900,
  fireballRadius: 60,
  fireballDamage: 18,
  diveWindup: 900,
  diveTime: 600,
  diveLength: 620,
  diveDamage: 26,
  diveHitRange: 85,
  groundedTime: 2600,
  enragedFactor: 0.65,
  enragedSpeed: 1.4,
  crackInterval: 4500,
  crackCount: 3,
  crackWindup: 1100,
  crackRadius: 50,
  maxCracks: 10,
  crackDamage: 10,
} as const;

/** Tempos (ms) da descida de Ignis: sombra crescendo e o voo até o chão. */
export const IGNIS_DESCENT = { shadowTime: 1600, flightTime: 1800 } as const;

export const CITADEL_WOLF_SPAWNS = [
  { x: 1180, y: 1240 },
  { x: 900, y: 720 },
] as const;

export const GRAVEYARD_SPECTRE_SPAWNS = [
  { x: 1400, y: 770 },
  { x: 1180, y: 600 },
  { x: 1250, y: 420 },
  { x: 900, y: 790 },
  { x: 760, y: 560 },
  { x: 700, y: 880 },
] as const;

/** A sombra de Ignis passa a cada minDelay–maxDelay ms e dura `duration`. */
export const IGNIS_SHADOW = {
  firstDelay: 6000,
  minDelay: 22000,
  maxDelay: 38000,
  duration: 4500,
} as const;

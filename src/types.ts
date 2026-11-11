// Tipos compartilhados entre os módulos do jogo.

export type Language = "pt" | "en";

/** Etapas da missão, em ordem. */
export const QUEST_STAGES = [
  "talk", // falar com o Ancião
  "hunt", // derrotar o Lobo Corrompido
  "boss", // derrotar Kael
  "ruins", // ir às Ruínas do Santuário
  "guardian", // derrotar o guardião do Fragmento Astral
  "fragment", // pegar o Fragmento Astral no altar
  "portal", // atravessar o portal atrás do altar (início do Capítulo 2)
  "witch", // derrotar a feiticeira do Pântano Sombrio
  "fragment2", // pegar o segundo Fragmento Astral
  "complete", // capítulo concluído
] as const;

export type QuestStage = (typeof QUEST_STAGES)[number];

/** Áreas (mapas) do jogo. Cada área é uma cena do Phaser. */
export type AreaId = "forest" | "ruins" | "swamp";

/** Tipos de inimigos comuns (os chefes são tratados à parte). */
export type EnemyKind = "wolf" | "spider" | "wisp";

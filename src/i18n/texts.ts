// Todos os textos do jogo em português (pt) e inglês (en).
// Para corrigir ou traduzir um texto, altere apenas este arquivo.

import type { Language, QuestStage } from "../types";

export type Localized<T = string> = Record<Language, T>;

export const TEXTS = {
  hud: {
    title: {
      pt: "ASTRA LEGACY  •  PRÓLOGO",
      en: "ASTRA LEGACY  •  PROLOGUE",
    },
    prologueComplete: {
      pt: "PRÓLOGO CONCLUÍDO",
      en: "PROLOGUE COMPLETE",
    },
    victory: {
      pt: "KAEL DERROTADO • VITÓRIA",
      en: "KAEL DEFEATED • VICTORY",
    },
  },

  quests: {
    talk: {
      pt: "MISSÃO: A FLORESTA SUSSURRANTE\nFale com o Ancião da Alvorada.",
      en: "QUEST: THE WHISPERING FOREST\nTalk to the Elder of Dawnvale.",
    },
    hunt: {
      pt: "MISSÃO: A FLORESTA SUSSURRANTE\nDerrote o Lobo Corrompido.",
      en: "QUEST: THE WHISPERING FOREST\nDefeat the Corrupted Wolf.",
    },
    boss: {
      pt: "NOVO OBJETIVO: O SENHOR DA CORRUPÇÃO\nEncontre e derrote Kael na floresta.",
      en: "NEW OBJECTIVE: LORD OF CORRUPTION\nFind and defeat Kael in the forest.",
    },
    complete: {
      pt: "PRÓLOGO CONCLUÍDO!\nVocê derrotou Kael e sobreviveu à corrupção.",
      en: "PROLOGUE COMPLETE!\nYou defeated Kael and survived the corruption.",
    },
  } satisfies Record<QuestStage, Localized>,

  places: {
    trail: { pt: "TRILHA DA ALVORADA", en: "DAWNVALE TRAIL" },
    forest: { pt: "FLORESTA SUSSURRANTE", en: "WHISPERING FOREST" },
  },

  page: {
    title: {
      pt: "Astra Legacy — A Floresta Sussurrante",
      en: "Astra Legacy — The Whispering Forest",
    },
    eyebrow: { pt: "UM RPG DE FANTASIA SOMBRIA", en: "A DARK FANTASY RPG" },
    subtitle: {
      pt: "Prólogo: A Floresta Sussurrante",
      en: "Prologue: The Whispering Forest",
    },
    controls: {
      pt: [
        ["WASD / setas", "mover"],
        ["J", "atacar"],
        ["E", "interagir"],
        ["L", "idioma"],
      ],
      en: [
        ["WASD / arrows", "move"],
        ["J", "attack"],
        ["E", "interact"],
        ["L", "language"],
      ],
    } satisfies Localized<[string, string][]>,
    tagline: {
      pt: "Explore a floresta. Sua jornada está apenas começando.",
      en: "Explore the forest. Your journey is only beginning.",
    },
  },

  elder: {
    label: { pt: "Ancião", en: "Elder" },
    name: { pt: "Ancião da Alvorada", en: "Elder of Dawnvale" },
  },

  elderDialogue: {
    intro: {
      pt: [
        "Viajante, você chegou em uma hora sombria. A Floresta Sussurrante está sendo consumida por uma corrupção antiga.",
        "Um lobo corrompido ronda a Trilha da Alvorada e ataca quem se aproxima. Precisamos recuperar esse caminho antes que a escuridão alcance Alvorada.",
        "Encontre o lobo e derrote-o. Que a luz de Astra guie sua espada.",
      ],
      en: [
        "Traveler, you have arrived in a dark hour. The Whispering Forest is being consumed by an ancient corruption.",
        "A corrupted wolf stalks the Dawnvale Trail and attacks anyone who approaches. We must reclaim this path before darkness reaches Dawnvale.",
        "Find the wolf and defeat it. May Astra's light guide your sword.",
      ],
    },
    reminder: {
      pt: [
        "A Trilha da Alvorada fica adiante. Cuidado com o Lobo Corrompido e não deixe que ele cerque você.",
      ],
      en: [
        "The Dawnvale Trail lies ahead. Beware of the Corrupted Wolf and do not let it corner you.",
      ],
    },
    wolfDefeated: {
      pt: [
        "Você conseguiu! Mas a morte do lobo revelou uma presença ainda mais sombria. Siga até o coração da floresta e prepare-se para enfrentar Kael.",
      ],
      en: [
        "You did it! But the wolf's death revealed an even darker presence. Head into the heart of the forest and prepare to face Kael.",
      ],
    },
    bossAwake: {
      pt: [
        "Sinto a presença de Kael no coração da floresta. Prepare-se, viajante. Ele é muito mais perigoso que o lobo.",
      ],
      en: [
        "I sense Kael's presence deep in the forest. Prepare yourself, traveler. He is far more dangerous than the wolf.",
      ],
    },
    bossDefeated: {
      pt: [
        "Você derrotou Kael! A corrupção perdeu sua força, e Alvorada terá uma chance de reconstruir seu futuro.",
      ],
      en: [
        "You defeated Kael! The corruption has lost its power, and Dawnvale may finally rebuild its future.",
      ],
    },
  } satisfies Record<string, Localized<string[]>>,

  hints: {
    talk: { pt: "E  •  Conversar", en: "E  •  Talk" },
    continue: { pt: "E  •  Continuar", en: "E  •  Continue" },
  },

  combat: {
    wolfMissed: {
      pt: "O GOLPE NÃO ALCANÇOU O LOBO",
      en: "YOUR ATTACK MISSED THE WOLF",
    },
    kaelMissed: {
      pt: "VOCÊ PRECISA SE APROXIMAR E VIRAR PARA KAEL",
      en: "GET CLOSER AND FACE KAEL",
    },
    wolfHit: (damage: number): Localized => ({
      pt: `LOBO ATINGIDO! DANO: ${damage}`,
      en: `WOLF HIT! DAMAGE: ${damage}`,
    }),
    kaelHit: (damage: number): Localized => ({
      pt: `KAEL ATINGIDO! DANO: ${damage}`,
      en: `KAEL HIT! DAMAGE: ${damage}`,
    }),
    playerHurt: (damage: number): Localized => ({
      pt: `VOCÊ RECEBEU ${damage} DE DANO`,
      en: `YOU TOOK ${damage} DAMAGE`,
    }),
    wolfDefeated: {
      pt: "LOBO DERROTADO! VOLTE AO ANCIÃO.",
      en: "WOLF DEFEATED! RETURN TO THE ELDER.",
    },
    bossAppeared: {
      pt: "UMA PRESENÇA SOMBRIA SURGIU...",
      en: "A DARK PRESENCE HAS AWAKENED...",
    },
  },

  save: {
    checkpointSaved: {
      pt: "PEDRA ASTRAL ATIVADA • CHECKPOINT SALVO",
      en: "ASTRAL STONE ACTIVATED • CHECKPOINT SAVED",
    },
    progressLoaded: {
      pt: "PROGRESSO CARREGADO",
      en: "PROGRESS LOADED",
    },
  },

  endScreen: {
    victory: {
      pt: "KAEL FOI DERROTADO!\n\nA luz de Astra voltou a brilhar.\n\nPressione R para jogar novamente",
      en: "KAEL HAS BEEN DEFEATED!\n\nAstra's light shines once more.\n\nPress R to play again",
    },
    defeat: {
      pt: "VOCÊ FOI DERROTADO\n\nR  •  Voltar ao último checkpoint\nN  •  Começar um novo jogo",
      en: "YOU WERE DEFEATED\n\nR  •  Return to the last checkpoint\nN  •  Start a new game",
    },
  },
};

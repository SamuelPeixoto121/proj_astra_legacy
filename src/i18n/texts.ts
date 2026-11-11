// Todos os textos do jogo em português (pt) e inglês (en).
// Para corrigir ou traduzir um texto, altere apenas este arquivo.

import type { EnemyKind, Language, QuestStage } from "../types";

export type Localized<T = string> = Record<Language, T>;

export const TEXTS = {
  hud: {
    title: {
      pt: "ASTRA LEGACY  •  PRÓLOGO",
      en: "ASTRA LEGACY  •  PROLOGUE",
    },
    chapterTitle: {
      pt: "ASTRA LEGACY  •  CAPÍTULO 1",
      en: "ASTRA LEGACY  •  CHAPTER 1",
    },
    chapterComplete: {
      pt: "CAPÍTULO 1 CONCLUÍDO",
      en: "CHAPTER 1 COMPLETE",
    },
    victory: {
      pt: "FRAGMENTO RECUPERADO • VITÓRIA",
      en: "FRAGMENT RECOVERED • VICTORY",
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
    ruins: {
      pt: "NOVO OBJETIVO: AS RUÍNAS DO SANTUÁRIO\nSiga a trilha ao norte da clareira de Kael.",
      en: "NEW OBJECTIVE: THE SANCTUARY RUINS\nFollow the trail north of Kael's clearing.",
    },
    guardian: {
      pt: "MISSÃO: O PRIMEIRO FRAGMENTO\nEncontre o guardião que protege o Fragmento Astral.",
      en: "QUEST: THE FIRST FRAGMENT\nFind the guardian protecting the Astral Fragment.",
    },
    fragment: {
      pt: "MISSÃO: O PRIMEIRO FRAGMENTO\nPegue o Fragmento Astral no altar.",
      en: "QUEST: THE FIRST FRAGMENT\nTake the Astral Fragment from the altar.",
    },
    complete: {
      pt: "CAPÍTULO 1 CONCLUÍDO!\nVocê recuperou o primeiro Fragmento Astral.",
      en: "CHAPTER 1 COMPLETE!\nYou recovered the first Astral Fragment.",
    },
  } satisfies Record<QuestStage, Localized>,

  places: {
    trail: { pt: "TRILHA DA ALVORADA", en: "DAWNVALE TRAIL" },
    forest: { pt: "FLORESTA SUSSURRANTE", en: "WHISPERING FOREST" },
    ruins: { pt: "RUÍNAS DO SANTUÁRIO", en: "SANCTUARY RUINS" },
  },

  page: {
    title: {
      pt: "Astra Legacy — Os Fragmentos Astrais",
      en: "Astra Legacy — The Astral Fragments",
    },
    eyebrow: { pt: "UM RPG DE FANTASIA SOMBRIA", en: "A DARK FANTASY RPG" },
    subtitle: {
      pt: "Em busca dos Fragmentos Astrais",
      en: "In search of the Astral Fragments",
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
      pt: "Explore, lute e recupere a luz de Astra.",
      en: "Explore, fight and restore Astra's light.",
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
        "Você derrotou Kael! Mas a corrupção não nasceu dele... algo o alimentava.",
        "Sinto a luz de um Fragmento Astral nas Ruínas do Santuário, ao norte. Siga a trilha além da clareira e recupere-o antes que a escuridão o consuma.",
      ],
      en: [
        "You defeated Kael! But the corruption did not come from him... something was feeding it.",
        "I sense the light of an Astral Fragment in the Sanctuary Ruins to the north. Follow the trail beyond the clearing and recover it before the darkness consumes it.",
      ],
    },
  } satisfies Record<string, Localized<string[]>>,

  hints: {
    talk: { pt: "E  •  Conversar", en: "E  •  Talk" },
    continue: { pt: "E  •  Continuar", en: "E  •  Continue" },
  },

  // Textos de cada inimigo comum (separados para respeitar o gênero:
  // "lobo atingido", "aranha atingida").
  enemies: {
    wolf: {
      hit: (damage: number): Localized => ({
        pt: `LOBO ATINGIDO! DANO: ${damage}`,
        en: `WOLF HIT! DAMAGE: ${damage}`,
      }),
      defeated: {
        pt: "LOBO DERROTADO! VOLTE AO ANCIÃO.",
        en: "WOLF DEFEATED! RETURN TO THE ELDER.",
      },
    },
    spider: {
      hit: (damage: number): Localized => ({
        pt: `ARANHA ATINGIDA! DANO: ${damage}`,
        en: `SPIDER HIT! DAMAGE: ${damage}`,
      }),
      defeated: {
        pt: "ARANHA CORROMPIDA DERROTADA!",
        en: "CORRUPTED SPIDER DEFEATED!",
      },
    },
  } satisfies Record<
    EnemyKind,
    { hit: (damage: number) => Localized; defeated: Localized }
  >,

  combat: {
    missed: {
      pt: "O GOLPE NÃO ALCANÇOU NENHUM INIMIGO",
      en: "YOUR ATTACK DIDN'T REACH ANY ENEMY",
    },
    playerHurt: (damage: number): Localized => ({
      pt: `VOCÊ RECEBEU ${damage} DE DANO`,
      en: `YOU TOOK ${damage} DAMAGE`,
    }),
  },

  // Textos de cada chefe.
  bosses: {
    kael: {
      name: { pt: "KAEL", en: "KAEL" },
      appeared: {
        pt: "UMA PRESENÇA SOMBRIA SURGIU...",
        en: "A DARK PRESENCE HAS AWAKENED...",
      },
      missed: {
        pt: "VOCÊ PRECISA SE APROXIMAR E VIRAR PARA KAEL",
        en: "GET CLOSER AND FACE KAEL",
      },
      hit: (damage: number): Localized => ({
        pt: `KAEL ATINGIDO! DANO: ${damage}`,
        en: `KAEL HIT! DAMAGE: ${damage}`,
      }),
      defeated: {
        pt: "KAEL DERROTADO! A BARREIRA AO NORTE SE DESFEZ.",
        en: "KAEL DEFEATED! THE BARRIER TO THE NORTH HAS FADED.",
      },
      charging: {
        pt: "KAEL VAI AVANÇAR! SAIA DO CAMINHO!",
        en: "KAEL IS ABOUT TO CHARGE! GET OUT OF THE WAY!",
      },
      stunned: {
        pt: "KAEL BATEU E FICOU ATORDOADO! ATAQUE AGORA!",
        en: "KAEL CRASHED AND IS STUNNED! ATTACK NOW!",
      },
    },
    sentinel: {
      name: { pt: "SENTINELA DE PEDRA", en: "STONE SENTINEL" },
      appeared: {
        pt: "A SENTINELA DE PEDRA DESPERTOU!",
        en: "THE STONE SENTINEL HAS AWAKENED!",
      },
      missed: {
        pt: "APROXIME-SE E VIRE PARA A SENTINELA",
        en: "GET CLOSER AND FACE THE SENTINEL",
      },
      hit: (damage: number): Localized => ({
        pt: `SENTINELA ATINGIDA! DANO: ${damage}`,
        en: `SENTINEL HIT! DAMAGE: ${damage}`,
      }),
      defeated: {
        pt: "SENTINELA DERROTADA! O FRAGMENTO FOI LIBERTADO.",
        en: "SENTINEL DEFEATED! THE FRAGMENT HAS BEEN RELEASED.",
      },
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
    progressSaved: {
      pt: "PROGRESSO SALVO",
      en: "PROGRESS SAVED",
    },
  },

  endScreen: {
    victory: {
      pt: "CAPÍTULO 1 CONCLUÍDO!\n\nVocê recuperou o primeiro Fragmento Astral.\nA luz de Astra volta a brilhar.\n\nPressione R para jogar novamente",
      en: "CHAPTER 1 COMPLETE!\n\nYou recovered the first Astral Fragment.\nAstra's light shines once more.\n\nPress R to play again",
    },
    defeat: {
      pt: "VOCÊ FOI DERROTADO\n\nR  •  Voltar ao último checkpoint\nN  •  Começar um novo jogo",
      en: "YOU WERE DEFEATED\n\nR  •  Return to the last checkpoint\nN  •  Start a new game",
    },
  },
};

// Todos os textos do jogo em português (pt) e inglês (en).
// Para corrigir ou traduzir um texto, altere apenas este arquivo.

import type {
  EnemyKind,
  EquipmentSlot,
  ItemId,
  Language,
  QuestStage,
} from "../types";

export type Localized<T = string> = Record<Language, T>;

/** Milissegundos → segundos ("0,35" em português, "0.35" em inglês). */
function seconds(ms: number, language: Language): string {
  const text = (ms / 1000).toFixed(2);
  return language === "pt" ? text.replace(".", ",") : text;
}

/** Fração → porcentagem inteira (0.65 → 65). */
function percent(fraction: number): number {
  return Math.round(fraction * 100);
}

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
    chapter2Title: {
      pt: "ASTRA LEGACY  •  CAPÍTULO 2",
      en: "ASTRA LEGACY  •  CHAPTER 2",
    },
    chapter3Title: {
      pt: "ASTRA LEGACY  •  CAPÍTULO 3",
      en: "ASTRA LEGACY  •  CHAPTER 3",
    },
    chapterComplete: {
      pt: "CAPÍTULO 3 CONCLUÍDO",
      en: "CHAPTER 3 COMPLETE",
    },
    victory: {
      pt: "SEGUNDO FRAGMENTO RECUPERADO • VITÓRIA",
      en: "SECOND FRAGMENT RECOVERED • VICTORY",
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
    portal: {
      pt: "NOVO OBJETIVO: O PORTAL DE LUZ\nAtravesse o portal atrás do altar.",
      en: "NEW OBJECTIVE: THE PORTAL OF LIGHT\nStep through the portal behind the altar.",
    },
    witch: {
      pt: "MISSÃO: O SEGUNDO FRAGMENTO\nEncontre a feiticeira no coração do pântano.",
      en: "QUEST: THE SECOND FRAGMENT\nFind the sorceress in the heart of the swamp.",
    },
    fragment2: {
      pt: "MISSÃO: O SEGUNDO FRAGMENTO\nPegue o Fragmento Astral.",
      en: "QUEST: THE SECOND FRAGMENT\nTake the Astral Fragment.",
    },
    portal2: {
      pt: "NOVO OBJETIVO: O PORTAL GELADO\nAtravesse o portal na clareira do pântano.",
      en: "NEW OBJECTIVE: THE FROZEN PORTAL\nStep through the portal in the swamp clearing.",
    },
    winter: {
      pt: "MISSÃO: O TERCEIRO FRAGMENTO\nSuba até o topo dos Picos Congelados.",
      en: "QUEST: THE THIRD FRAGMENT\nClimb to the top of the Frozen Peaks.",
    },
    fragment3: {
      pt: "MISSÃO: O TERCEIRO FRAGMENTO\nPegue o Fragmento Astral.",
      en: "QUEST: THE THIRD FRAGMENT\nTake the Astral Fragment.",
    },
    complete: {
      pt: "CAPÍTULO 3 CONCLUÍDO!\nVocê recuperou o terceiro Fragmento Astral.",
      en: "CHAPTER 3 COMPLETE!\nYou recovered the third Astral Fragment.",
    },
  } satisfies Record<QuestStage, Localized>,

  places: {
    trail: { pt: "TRILHA DA ALVORADA", en: "DAWNVALE TRAIL" },
    forest: { pt: "FLORESTA SUSSURRANTE", en: "WHISPERING FOREST" },
    ruins: { pt: "RUÍNAS DO SANTUÁRIO", en: "SANCTUARY RUINS" },
    swamp: { pt: "PÂNTANO SOMBRIO", en: "SHADOW SWAMP" },
    peaks: { pt: "PICOS CONGELADOS", en: "FROZEN PEAKS" },
  },

  // Mensagens das áreas do Capítulo 2.
  chapter2: {
    portalOpened: {
      pt: "FRAGMENTO RECUPERADO! UM PORTAL SE ABRIU ATRÁS DO ALTAR.",
      en: "FRAGMENT RECOVERED! A PORTAL HAS OPENED BEHIND THE ALTAR.",
    },
    mud: {
      pt: "A LAMA PRENDE SEUS PÉS... (ROLAR NÃO É AFETADO)",
      en: "THE MUD GRIPS YOUR FEET... (ROLLING IS NOT AFFECTED)",
    },
  },

  // Mensagens das áreas do Capítulo 3.
  chapter3: {
    portalOpened: {
      pt: "FRAGMENTO RECUPERADO! UM PORTAL GELADO SE ABRIU NA CLAREIRA.",
      en: "FRAGMENT RECOVERED! A FROZEN PORTAL HAS OPENED IN THE CLEARING.",
    },
    ice: {
      pt: "GELO! VOCÊ ESCORREGA AO ANDAR (ROLAR AINDA FUNCIONA).",
      en: "ICE! YOU SLIDE AS YOU WALK (ROLLING STILL WORKS).",
    },
  },

  page: {
    title: {
      pt: "Astra Legacy — Os Fragmentos Astrais",
      en: "Astra Legacy — The Astral Fragments",
    },
    subtitle: {
      pt: "Em busca dos Fragmentos Astrais",
      en: "In search of the Astral Fragments",
    },
    controls: {
      pt: [
        ["WASD / setas", "mover"],
        ["J", "atacar"],
        ["Shift", "rolar"],
        ["Q", "poção"],
        ["Tab", "equipamento"],
        ["E", "interagir"],
        ["L", "idioma"],
        ["M", "som"],
        ["Esc", "menu"],
      ],
      en: [
        ["WASD / arrows", "move"],
        ["J", "attack"],
        ["Shift", "roll"],
        ["Q", "potion"],
        ["Tab", "equipment"],
        ["E", "interact"],
        ["L", "language"],
        ["M", "sound"],
        ["Esc", "menu"],
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
    firstFragment: {
      pt: [
        "Você recuperou um Fragmento Astral! Sinto a luz de Astra mais forte em você.",
        "Mas outro fragmento chama além do portal, perdido nas águas escuras de um pântano. Alguém o guarda... alguém que conhece magia. Tenha cuidado, viajante.",
      ],
      en: [
        "You recovered an Astral Fragment! I feel Astra's light stronger within you.",
        "But another fragment calls from beyond the portal, lost in the dark waters of a swamp. Someone guards it... someone who knows magic. Be careful, traveler.",
      ],
    },
    secondFragment: {
      pt: [
        "Dois fragmentos! A luz de Astra volta a aquecer estas terras.",
        "O próximo está no alto dos Picos Congelados, onde o inverno nunca termina. Dizem que algo antigo desperta no topo... algo que muda de forma quando ferido.",
      ],
      en: [
        "Two fragments! Astra's light is warming these lands again.",
        "The next one lies atop the Frozen Peaks, where winter never ends. They say something ancient awakens at the summit... something that changes form when wounded.",
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
    wisp: {
      hit: (damage: number): Localized => ({
        pt: `ESPÍRITO ATINGIDO! DANO: ${damage}`,
        en: `SPIRIT HIT! DAMAGE: ${damage}`,
      }),
      defeated: {
        pt: "ESPÍRITO DO PÂNTANO DISSIPADO!",
        en: "SWAMP SPIRIT DISPELLED!",
      },
    },
  } satisfies Record<
    EnemyKind,
    { hit: (damage: number) => Localized; defeated: Localized }
  >,

  // Equipamentos: nome e descrição de cada item.
  items: {
    ironSword: {
      name: { pt: "ESPADA DE FERRO", en: "IRON SWORD" },
      description: {
        pt: "Uma espada simples e confiável. Golpes rápidos.",
        en: "A simple, reliable sword. Quick strikes.",
      },
    },
    corruptedBlade: {
      name: { pt: "LÂMINA CORROMPIDA", en: "CORRUPTED BLADE" },
      description: {
        pt: "A espada de Kael. Golpes mais fortes, porém mais lentos.",
        en: "Kael's sword. Stronger but slower strikes.",
      },
    },
    travelerTunic: {
      name: { pt: "TÚNICA DE VIAJANTE", en: "TRAVELER'S TUNIC" },
      description: {
        pt: "Roupa leve de viagem. Não protege, mas não pesa.",
        en: "Light travel clothes. No protection, but no weight.",
      },
    },
    stoneArmor: {
      name: { pt: "ARMADURA DE PEDRA", en: "STONE ARMOR" },
      description: {
        pt: "Feita dos restos da Sentinela. Reduz o dano, mas pesa.",
        en: "Made from the Sentinel's remains. Reduces damage, but is heavy.",
      },
    },
    swampAmulet: {
      name: { pt: "AMULETO DO PÂNTANO", en: "SWAMP AMULET" },
      description: {
        pt: "Magia da feiticeira. Poções curam mais e o rolamento recarrega rápido.",
        en: "The sorceress's magic. Potions heal more and rolls recharge faster.",
      },
    },
  } satisfies Record<ItemId, { name: Localized; description: Localized }>,

  equipment: {
    obtained: (name: Localized): Localized => ({
      pt: `ITEM OBTIDO E EQUIPADO: ${name.pt}  (TAB: EQUIPAMENTO)`,
      en: `ITEM OBTAINED AND EQUIPPED: ${name.en}  (TAB: EQUIPMENT)`,
    }),
    title: { pt: "EQUIPAMENTO", en: "EQUIPMENT" },
    slots: {
      weapon: { pt: "ARMA", en: "WEAPON" },
      armor: { pt: "ARMADURA", en: "ARMOR" },
      amulet: { pt: "AMULETO", en: "AMULET" },
    } satisfies Record<EquipmentSlot, Localized>,
    noAmulet: {
      name: { pt: "NENHUM", en: "NONE" },
      description: {
        pt: "Nenhum amuleto equipado.",
        en: "No amulet equipped.",
      },
    },
    equippedTag: { pt: "(EM USO)", en: "(EQUIPPED)" },
    changed: (name: Localized): Localized => ({
      pt: `EQUIPADO: ${name.pt}`,
      en: `EQUIPPED: ${name.en}`,
    }),
    weaponStats: (damage: number, cooldownMs: number): Localized => ({
      pt: `Dano ${damage}  •  um golpe a cada ${seconds(cooldownMs, "pt")} s`,
      en: `Damage ${damage}  •  one strike every ${seconds(cooldownMs, "en")} s`,
    }),
    armorStats: (damageTaken: number, speed: number): Localized => ({
      pt: `Dano recebido ${percent(damageTaken)}%  •  velocidade ${percent(speed)}%`,
      en: `Damage taken ${percent(damageTaken)}%  •  speed ${percent(speed)}%`,
    }),
    amuletStats: (potionHeal: number, rollCooldown: number): Localized => ({
      pt: `Poções curam ${potionHeal}  •  rolamento recarrega em ${seconds(rollCooldown, "pt")} s`,
      en: `Potions heal ${potionHeal}  •  roll recharges in ${seconds(rollCooldown, "en")} s`,
    }),
    heroStats: (
      damage: number,
      damageTaken: number,
      speed: number,
      potionHeal: number,
    ): Localized => ({
      pt: `HERÓI  •  dano ${damage}  •  dano recebido ${percent(damageTaken)}%  •  velocidade ${percent(speed)}%  •  poção +${potionHeal}`,
      en: `HERO  •  damage ${damage}  •  damage taken ${percent(damageTaken)}%  •  speed ${percent(speed)}%  •  potion +${potionHeal}`,
    }),
    hintSlots: {
      pt: "↑ ↓  escolher   •   Enter  trocar   •   Tab / Esc  fechar",
      en: "↑ ↓  select   •   Enter  change   •   Tab / Esc  close",
    },
    hintItems: {
      pt: "↑ ↓  escolher   •   Enter  equipar   •   Tab / Esc  voltar",
      en: "↑ ↓  select   •   Enter  equip   •   Tab / Esc  back",
    },
  },

  // Poções de cura.
  potions: {
    drank: (heal: number): Localized => ({
      pt: `POÇÃO BEBIDA! +${heal} DE VIDA`,
      en: `POTION USED! +${heal} HEALTH`,
    }),
    none: {
      pt: "VOCÊ NÃO TEM POÇÕES",
      en: "YOU HAVE NO POTIONS",
    },
    fullHealth: {
      pt: "SUA VIDA JÁ ESTÁ CHEIA",
      en: "YOUR HEALTH IS ALREADY FULL",
    },
    picked: (count: number, max: number): Localized => ({
      pt: `POÇÃO OBTIDA! (${count}/${max})`,
      en: `POTION FOUND! (${count}/${max})`,
    }),
    bagFull: {
      pt: "VOCÊ JÁ CARREGA O MÁXIMO DE POÇÕES",
      en: "YOU ARE ALREADY CARRYING THE MAXIMUM POTIONS",
    },
    refilled: {
      pt: "PEDRA ASTRAL: POÇÕES RECARREGADAS",
      en: "ASTRAL STONE: POTIONS REFILLED",
    },
    checkpointRefilled: {
      pt: "CHECKPOINT SALVO • POÇÕES RECARREGADAS",
      en: "CHECKPOINT SAVED • POTIONS REFILLED",
    },
  },

  combat: {
    deflected: {
      pt: "PROJÉTIL REBATIDO!",
      en: "PROJECTILE DEFLECTED!",
    },
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
    witch: {
      name: { pt: "FEITICEIRA DO PÂNTANO", en: "SWAMP SORCERESS" },
      appeared: {
        pt: "A FEITICEIRA DO PÂNTANO DESPERTOU!",
        en: "THE SWAMP SORCERESS HAS AWAKENED!",
      },
      missed: {
        pt: "APROXIME-SE E VIRE PARA A FEITICEIRA",
        en: "GET CLOSER AND FACE THE SORCERESS",
      },
      hit: (damage: number): Localized => ({
        pt: `FEITICEIRA ATINGIDA! DANO: ${damage}`,
        en: `SORCERESS HIT! DAMAGE: ${damage}`,
      }),
      teleported: {
        pt: "A FEITICEIRA SE TELEPORTOU!",
        en: "THE SORCERESS TELEPORTED!",
      },
      marks: {
        pt: "MARCAS SOMBRIAS! NÃO PARE DE SE MOVER!",
        en: "SHADOW MARKS! KEEP MOVING!",
      },
      enraged: {
        pt: "A FEITICEIRA ESTÁ FURIOSA!",
        en: "THE SORCERESS IS ENRAGED!",
      },
      defeated: {
        pt: "FEITICEIRA DERROTADA! O SEGUNDO FRAGMENTO FOI LIBERTADO.",
        en: "SORCERESS DEFEATED! THE SECOND FRAGMENT HAS BEEN RELEASED.",
      },
    },
  },

  // Tela inicial.
  title: {
    continue: { pt: "Continuar", en: "Continue" },
    newGame: { pt: "Novo jogo", en: "New game" },
    confirmNewGame: {
      pt: "Apagar o progresso e começar?  (Enter)",
      en: "Erase progress and start?  (Enter)",
    },
    language: { pt: "Idioma: Português", en: "Language: English" },
    languagePanelTitle: { pt: "Escolha o idioma", en: "Choose your language" },
    back: { pt: "Voltar", en: "Back" },
    hint: {
      pt: "↑ ↓  escolher   •   Enter  confirmar",
      en: "↑ ↓  select   •   Enter  confirm",
    },
    panelHint: {
      pt: "↑ ↓  escolher   •   Enter  confirmar   •   Esc  voltar",
      en: "↑ ↓  select   •   Enter  confirm   •   Esc  back",
    },
    soundOn: { pt: "M  som ligado", en: "M  sound on" },
    soundOff: { pt: "M  som desligado", en: "M  sound off" },
  },

  // Menu de pausa (Esc durante o jogo).
  pause: {
    title: { pt: "PAUSADO", en: "PAUSED" },
    resume: { pt: "Continuar", en: "Resume" },
    soundOn: { pt: "Som: ligado", en: "Sound: on" },
    soundOff: { pt: "Som: desligado", en: "Sound: off" },
    toTitle: { pt: "Tela inicial", en: "Title screen" },
    hint: {
      pt: "↑ ↓  escolher   •   Enter  confirmar   •   Esc  continuar",
      en: "↑ ↓  select   •   Enter  confirm   •   Esc  resume",
    },
  },

  sound: {
    on: { pt: "SOM LIGADO (M)", en: "SOUND ON (M)" },
    off: { pt: "SOM DESLIGADO (M)", en: "SOUND OFF (M)" },
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
      pt: "CAPÍTULO 2 CONCLUÍDO!\n\nVocê recuperou o segundo Fragmento Astral.\nA névoa do pântano começa a se dissipar.\n\nEnter  •  Continuar explorando\nEsc  •  Tela inicial",
      en: "CHAPTER 2 COMPLETE!\n\nYou recovered the second Astral Fragment.\nThe swamp mist begins to fade.\n\nEnter  •  Keep exploring\nEsc  •  Title screen",
    },
    defeat: {
      pt: "VOCÊ FOI DERROTADO\n\nR  •  Voltar ao último checkpoint\nN  •  Começar um novo jogo\nEsc  •  Tela inicial",
      en: "YOU WERE DEFEATED\n\nR  •  Return to the last checkpoint\nN  •  Start a new game\nEsc  •  Title screen",
    },
  },
};

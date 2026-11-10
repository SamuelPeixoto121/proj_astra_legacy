# Astra Legacy

**RPG de ação 2D de fantasia sombria**, com visão de cima, feito com Phaser 4 e TypeScript.

### [▶ Jogue agora no navegador](https://samuelpeixoto121.github.io/proj_astra_legacy/)

![Captura de tela do Astra Legacy](docs/screenshot.png)

> O mundo foi devastado por Ignis, o Dragão das Sombras, que destruiu o Fragmento
> Central de Astra. Você chega ao Vilarejo da Alvorada no momento em que uma
> corrupção antiga começa a consumir a Floresta Sussurrante.

O **prólogo** está completo e jogável: explore a floresta, converse com o Ancião
da Alvorada, derrote o Lobo Corrompido e enfrente Kael, o Senhor da Corrupção.

## Funcionalidades

- **Movimentação em 8 direções** com colisão no cenário e câmera que acompanha o herói
- **Combate corpo a corpo** com alcance e direção do golpe, efeitos de corte,
  impacto, números de dano e barras de vida
- **Inimigos com perseguição**: o Lobo Corrompido da missão e Aranhas Corrompidas
  espalhadas pela floresta, além de um **chefe** que só aparece depois de cumprir a missão
- **Sistema de missões** em etapas e **diálogos** que mudam conforme o progresso
- **Salvamento automático** e **checkpoint** (Pedra Astral): ao ser derrotado,
  o jogador volta ao último checkpoint sem perder o progresso
- **Português e inglês**: todo o jogo e a página trocam de idioma na hora
- **Animações procedurais**: caminhada, golpe de espada e efeitos de dano
- **Herói com poses por direção**: frente, costas e perfil, montadas a partir
  de uma tabela de dados (a esquerda é o perfil espelhado)
- Todos os gráficos são **desenhados por código**, sem imagens externas

## Controles

| Tecla | Ação |
|---|---|
| `W` `A` `S` `D` / setas | Mover |
| `J` | Atacar |
| `E` | Conversar / avançar diálogo |
| `L` | Trocar idioma (PT/EN) |
| `R` | Voltar ao último checkpoint / jogar de novo |
| `N` | Começar um novo jogo (na tela de derrota) |

## Como rodar

Pré-requisitos: [Node.js](https://nodejs.org/) 22 ou mais recente e Git.

```bash
git clone https://github.com/SamuelPeixoto121/proj_astra_legacy.git
cd proj_astra_legacy
npm install
npm run dev
```

Depois abra **http://localhost:5173** no navegador.

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarregamento automático |
| `npm run typecheck` | Verifica os tipos do TypeScript |
| `npm run build` | Verifica os tipos e gera a versão de produção em `dist/` |
| `npm run preview` | Abre a versão de produção localmente |

A cada push na branch `main`, o GitHub Actions gera o build e publica o jogo
automaticamente no GitHub Pages (`.github/workflows/deploy.yml`).

## Tecnologias

- **[Phaser 4](https://phaser.io/)**: engine de jogos 2D (renderização, física Arcade, tweens)
- **[TypeScript](https://www.typescriptlang.org/)** em modo `strict`
- **[Vite](https://vite.dev/)**: servidor de desenvolvimento e build

## Arquitetura

```
src/
├── main.ts                    Configuração do Phaser e ponto de entrada
├── config.ts                  Balanceamento: vida, dano, velocidade, checkpoints
├── types.ts                   Tipos compartilhados
├── i18n/
│   ├── texts.ts               Todos os textos em PT e EN
│   └── page.ts                Tradução da página HTML ao redor do jogo
├── scenes/
│   └── ForestScene.ts         Regras do jogo: missões, combate, diálogo, HUD
├── characters/                Aparência e animações do herói, Ancião, Lobo, Aranha e Kael
├── world/                     Cenário da floresta e checkpoint
├── effects/                   Efeitos visuais de combate
└── systems/
    ├── enemies.ts             Tipos de inimigos descritos por dados
    └── saveGame.ts            Salvamento no navegador
```

Algumas decisões do projeto:

- **Separação entre regras e aparência.** A cena cuida da lógica. Os personagens,
  o cenário e os efeitos ficam em módulos próprios que só desenham.
- **Textos centralizados.** Todo texto visível fica em `i18n/texts.ts`, com tipagem
  que obriga a ter as duas traduções. Trocar de idioma atualiza o jogo inteiro e,
  por meio de um evento, a página HTML, sem o jogo depender do HTML.
- **Balanceamento em um só lugar.** Vida, dano, velocidade e alcance ficam em
  `config.ts`, separados da lógica.
- **Save robusto.** O salvamento tem número de versão e é validado campo a campo
  ao carregar: um save corrompido ou antigo é ignorado em vez de travar o jogo.
- **Personagem = corpo físico + desenho.** Cada personagem tem um retângulo
  invisível com física e um desenho que o acompanha. A perseguição dos inimigos
  é uma função só, reaproveitada por todos eles e pelo chefe.
- **Inimigos orientados a dados.** Cada tipo de inimigo é um registro com
  atributos, cores, barra de vida e função de desenho (`systems/enemies.ts`).
  A cena trata todos da mesma forma: adicionar um inimigo novo não exige
  mudar a lógica de combate.

## Próximos passos

- [x] Animações do herói por direção
- [ ] Novos inimigos e áreas
- [ ] Continuação da história: os Fragmentos Astrais e Ignis
- [ ] Sistema de equipamentos

## Autor

Desenvolvido por **Samuel Peixoto**: [github.com/SamuelPeixoto121](https://github.com/SamuelPeixoto121)

---

### English summary

**Astra Legacy** is a top-down 2D dark fantasy action RPG built with **Phaser 4**,
**TypeScript** (strict) and **Vite**. The playable prologue features 8-direction
movement, directional melee combat with visual effects, enemy AI, a boss fight,
a staged quest system, dialogue, **autosave with checkpoints**, and full
**Portuguese/English** localization. All graphics are drawn procedurally in code.

**[Play it in your browser](https://samuelpeixoto121.github.io/proj_astra_legacy/)**,
or run it locally with `npm install` and `npm run dev`, then open http://localhost:5173.
Controls: WASD/arrows to move, J to attack, E to interact, L to switch language.

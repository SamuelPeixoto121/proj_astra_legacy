// Ponto de entrada: configura o Phaser e inicia o jogo.

import Phaser from "phaser";
import "./style.css";
import { ForestScene } from "./scenes/ForestScene";
import { LANGUAGE_CHANGED_EVENT, updatePageLanguage } from "./i18n/page";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 540,
  backgroundColor: "#17251b",
  pixelArt: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [ForestScene],
});

// A cena avisa quando o idioma muda; aqui traduzimos a página ao redor do jogo.
game.events.on(LANGUAGE_CHANGED_EVENT, updatePageLanguage);

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy(true));
}

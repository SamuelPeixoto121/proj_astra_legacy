// Ponto de entrada: configura o Phaser e inicia o jogo.

import Phaser from "phaser";
import "./style.css";
import { TitleScene } from "./scenes/TitleScene";
import { ForestScene } from "./scenes/ForestScene";
import { RuinsScene } from "./scenes/RuinsScene";
import { SwampScene } from "./scenes/SwampScene";
import { PeaksScene } from "./scenes/PeaksScene";
import { VolcanoScene } from "./scenes/VolcanoScene";
import { PauseScene } from "./scenes/PauseScene";
import { EquipmentScene } from "./scenes/EquipmentScene";
import { LANGUAGE_CHANGED_EVENT, updatePageLanguage } from "./i18n/page";
import { audio } from "./audio/engine";

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
  // A tela inicial abre primeiro; dela se continua o save ou começa um jogo novo.
  // A pausa vem por último para ser desenhada por cima das áreas.
  scene: [TitleScene, ForestScene, RuinsScene, SwampScene, PeaksScene, VolcanoScene, PauseScene, EquipmentScene],
});

// A cena avisa quando o idioma muda; aqui traduzimos a página ao redor do jogo.
game.events.on(LANGUAGE_CHANGED_EVENT, updatePageLanguage);

// Navegadores só liberam o som depois de uma tecla ou clique.
const unlockAudio = (): void => audio.unlock();

window.addEventListener("keydown", unlockAudio);
window.addEventListener("pointerdown", unlockAudio);

// Recarga automática do Vite (npm run dev): desliga o jogo e o som antigos.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
    window.removeEventListener("keydown", unlockAudio);
    window.removeEventListener("pointerdown", unlockAudio);
    audio.dispose();
  });
}

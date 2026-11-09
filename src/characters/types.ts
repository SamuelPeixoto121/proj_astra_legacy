import type Phaser from "phaser";

/**
 * Todo personagem tem duas partes:
 * - body: retângulo invisível com física (colisão e movimento);
 * - container: o desenho que o jogador vê, que segue o body.
 */
export interface CharacterSprite {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Rectangle;
}

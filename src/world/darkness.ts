// Escuridão: uma camada escura por cima do mapa, com "buracos" de luz em
// volta do herói e das tochas acesas. A cada quadro a camada é pintada de
// escuro de novo e os círculos de luz são apagados nela (com bordas suaves).

import Phaser from "phaser";

export interface LightSource {
  x: number;
  y: number;
  radius: number;
}

export interface Darkness {
  layer: Phaser.GameObjects.RenderTexture;
  /** Quanta escuridão cobre o mapa (0 = nenhuma, 1 = preto total). */
  alpha: number;
  /** Redesenha a escuridão com as luzes dadas (posições no mapa). */
  update: (lights: LightSource[]) => void;
}

const LIGHT_TEXTURE = "light-circle";
/** Raio (px) da textura de luz; cada luz é desenhada nessa escala. */
const LIGHT_TEXTURE_RADIUS = 128;
const DARK_COLOR = 0x05040a;

export function createDarkness(scene: Phaser.Scene, alpha: number): Darkness {
  createLightTexture(scene);

  const { width, height } = scene.scale;
  const layer = scene.add
    .renderTexture(0, 0, width, height)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(2700);

  // Pincéis (imagens invisíveis) carimbados para apagar a escuridão.
  // Cada luz precisa do SEU pincel: o Phaser só desenha os comandos no fim
  // (em render()), então um pincel só ficaria na posição da última luz.
  // (Criados sem entrar na lista de desenho da cena.)
  const brushes: Phaser.GameObjects.Image[] = [];

  const brushFor = (index: number): Phaser.GameObjects.Image => {
    if (!brushes[index]) {
      brushes[index] = new Phaser.GameObjects.Image(scene, 0, 0, LIGHT_TEXTURE);
    }

    return brushes[index];
  };

  const resize = (gameSize: Phaser.Structs.Size): void => {
    layer.setSize(gameSize.width, gameSize.height);
  };

  scene.scale.on("resize", resize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off("resize", resize);
    brushes.forEach((brush) => brush.destroy());
  });

  const darkness: Darkness = { layer, alpha, update: () => {} };

  darkness.update = (lights: LightSource[]): void => {
    const view = scene.cameras.main.worldView;

    layer.clear();
    layer.fill(DARK_COLOR, darkness.alpha);

    lights.forEach((light, index) => {
      const brush = brushFor(index)
        .setScale(light.radius / LIGHT_TEXTURE_RADIUS)
        .setPosition(light.x - view.x, light.y - view.y);

      layer.erase(brush);
    });

    layer.render();
  };

  return darkness;
}

/** Círculo branco que vai sumindo para as bordas (a luz com borda suave). */
function createLightTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(LIGHT_TEXTURE)) {
    return;
  }

  const size = LIGHT_TEXTURE_RADIUS * 2;
  const texture = scene.textures.createCanvas(LIGHT_TEXTURE, size, size);

  if (!texture) {
    return;
  }

  const context = texture.getContext();
  const gradient = context.createRadialGradient(
    LIGHT_TEXTURE_RADIUS,
    LIGHT_TEXTURE_RADIUS,
    0,
    LIGHT_TEXTURE_RADIUS,
    LIGHT_TEXTURE_RADIUS,
    LIGHT_TEXTURE_RADIUS,
  );

  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.55, "rgba(255, 255, 255, 0.85)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  texture.refresh();
}

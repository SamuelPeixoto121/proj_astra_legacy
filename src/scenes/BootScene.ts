// Primeira cena: lê o save e abre a área certa.

import Phaser from "phaser";
import { startFromSave } from "./areas";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    startFromSave(this);
  }
}

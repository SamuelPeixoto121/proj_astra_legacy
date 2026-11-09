import { defineConfig } from "vite";

// No GitHub Pages o jogo fica em https://<usuario>.github.io/proj_astra_legacy/,
// então os arquivos gerados precisam usar esse caminho como base.
// Em desenvolvimento (npm run dev) continua sendo a raiz "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/proj_astra_legacy/" : "/",
}));

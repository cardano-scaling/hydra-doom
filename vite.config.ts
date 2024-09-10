import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), topLevelAwait(), wasm()],
  optimizeDeps: {
    esbuildOptions: {
      target: "ES2022",
    },
    exclude: ["lucid-cardano"],
  },
  build: {
    target: "ES2022",
  },
});

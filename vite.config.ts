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
  define: {
    'import.meta.env.SERVER_URL': JSON.stringify(process.env.SERVER_URL),
    'import.meta.env.REGION': JSON.stringify(process.env.REGION),
    'import.meta.env.CABINET_KEY': JSON.stringify(process.env.CABINET_KEY),
    'import.meta.env.PERSISTENT_SESSION': JSON.stringify(process.env.PERSISTENT_SESSION),
  },
  resolve: {
        alias: {
          'node-fetch': 'node-fetch-polyfill',
          buffer: 'rollup-plugin-node-polyfills/polyfills/buffer-es6',
        },
    },
});

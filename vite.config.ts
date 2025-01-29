import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import topLevelAwait from "vite-plugin-top-level-await";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";
import wasm from "vite-plugin-wasm";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "stream/web": "web-streams-polyfill/ponyfill/es6",
      stream: "stream-browserify",
      "node-fetch": "whatwg-fetch",
    },
  },
  plugins: [
    viteCommonjs(),
    react(),
    nodePolyfills({
      protocolImports: true,
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    wasm(),
    topLevelAwait(),
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: "ES2022",
    },
    exclude: ["lucid-cardano"],
  },
  server: {
    port: 3000,
  },
  build: {
    target: "ES2022",
  },
  define: {
    "import.meta.env.IS_LOCAL": JSON.stringify(process.env.VITE_IS_LOCAL),
    "import.meta.env.LOCAL_HOST": JSON.stringify(process.env.VITE_LOCAL_HOST),
    "import.meta.env.LOCAL_GAME_PORT": JSON.stringify(
      process.env.VITE_LOCAL_GAME_PORT,
    ),
    "import.meta.env.LOCAL_HEALTH_PORT": JSON.stringify(
      process.env.VITE_LOCAL_HEALTH_PORT,
    ),
    "import.meta.env.LOCAL_HYDRA_PORT": JSON.stringify(
      process.env.VITE_LOCAL_HYDRA_PORT,
    ),
    "import.meta.env.SERVER_URL": JSON.stringify(process.env.SERVER_URL),
    "import.meta.env.REGION": JSON.stringify(process.env.REGION),
    "import.meta.env.CABINET_KEY": JSON.stringify(process.env.CABINET_KEY),
    "import.meta.env.PERSISTENT_SESSION": JSON.stringify(
      process.env.PERSISTENT_SESSION,
    ),
  },
});

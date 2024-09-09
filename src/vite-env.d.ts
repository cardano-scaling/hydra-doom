/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL: string;
  readonly VITE_CABINET_KEY: string;
  readonly VITE_REGION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

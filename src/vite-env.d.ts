/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SERVER_URL: string;
  readonly CABINET_KEY: string;
  readonly REGION: string;
  readonly PERSISTENT_SESSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

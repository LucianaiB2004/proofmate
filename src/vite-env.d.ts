/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_DEMO?: string;
  readonly VITE_BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

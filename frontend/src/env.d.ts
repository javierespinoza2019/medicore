/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENVIRONMENT?: string;
  readonly VITE_SHOW_ENV_BANNER?: string;
  readonly VITE_IS_DEMO?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_TENANT_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

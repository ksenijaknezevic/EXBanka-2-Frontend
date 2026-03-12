/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production'
  readonly VITE_ACCESS_TOKEN_TTL_MS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

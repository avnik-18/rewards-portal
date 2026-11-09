/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the public recognition site the LinkedIn share points at. */
  readonly VITE_RECOGNITION_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

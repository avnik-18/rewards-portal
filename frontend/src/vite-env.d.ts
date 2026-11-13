/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the public recognition site the LinkedIn share points at. */
  readonly VITE_RECOGNITION_BASE_URL?: string
  /** Base URL of the recog-api FastAPI backend, e.g. http://localhost:8000. */
  readonly VITE_API_BASE_URL?: string
  /** Demo employee code sent as X-Demo-User — backend local-mode identity. */
  readonly VITE_DEMO_USER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

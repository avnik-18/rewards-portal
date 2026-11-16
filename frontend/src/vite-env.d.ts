/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the public recognition site the LinkedIn share points at. */
  readonly VITE_RECOGNITION_BASE_URL?: string

  /** Full backend mount point including the /api/v1 prefix (scheme + host + prefix). */
  readonly VITE_API_BASE_URL?: string

  /** Dev-only identity header value (X-Demo-User), used in local dev only. */
  readonly VITE_DEMO_USER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

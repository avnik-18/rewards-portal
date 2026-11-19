import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Self-hosted fonts (sir's review: no Google Fonts requests in an enterprise SPA)
import '@fontsource-variable/inter'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/600.css'
import '@fontsource/jetbrains-mono/700.css'
import '@fontsource/jetbrains-mono/800.css'
import App from './App'
import './globals.css'
import { ensureLookupsLive } from '@/lib/data-api'

// Hydrate the values/templates catalog from the live API BEFORE the first
// render, so the value picker and template grids read real rows on mount.
// Never blocks on a cold backend: the static demo catalog is the fallback.
void ensureLookupsLive().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
})

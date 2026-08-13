import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Repair broken OAuth returns like /##access_token=... so supabase-js can parse the session
if (window.location.hash.startsWith('##')) {
  const { pathname, search } = window.location
  window.location.replace(`${pathname}${search}${window.location.hash.slice(1)}`)
}

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

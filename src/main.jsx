import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './pwa/register.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker : production uniquement (en dev, `sw.js` n'existe pas et le
// HMR ne supporte pas un worker qui met en cache les modules).
if (import.meta.env.PROD) {
  registerServiceWorker({ swUrl: `${import.meta.env.BASE_URL}sw.js` })
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Apply the persisted theme class BEFORE the first React render to prevent flash.
// Dark preference lives in the auth session (sessionStorage) so it's scoped per login.
try {
  const saved = sessionStorage.getItem('nexus-auth');
  if (saved && JSON.parse(saved)?.state?.dark) {
    document.documentElement.classList.add('dark');
  }
} catch {
  // sessionStorage unavailable or corrupt — stay in light mode
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

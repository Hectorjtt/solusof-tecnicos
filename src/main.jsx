import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Avisa al watchdog de index.html que el bundle sí llegó a ejecutarse y
// React sí montó algo, para que no fuerce un refresh innecesario.
window.__solusofAppMounted = true

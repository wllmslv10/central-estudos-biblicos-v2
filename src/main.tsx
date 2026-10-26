import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './installCeb.css'
import InstallCeb from './InstallCeb'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <InstallCeb />
  </React.StrictMode>,
)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/central-estudos-biblicos-v2/sw.js').catch((error) => {
      console.warn('Registro do PWA indisponível:', error)
    })
  })
}

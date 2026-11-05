import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './installCeb.css'
import InstallCeb from './InstallCeb'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {import.meta.env.VITE_CEB_LABORATORY === 'true' && <aside role="status" style={{background:'#fff3cd',color:'#533f03',padding:'10px 18px',textAlign:'center'}}>Laboratório CEB — use somente materiais e contas de teste. Os dados da versão oficial não são alterados.</aside>}
    <App />
    <InstallCeb />
  </React.StrictMode>,
)
if ('serviceWorker' in navigator && import.meta.env.VITE_CEB_LABORATORY !== 'true') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/central-estudos-biblicos-v2/sw.js').catch((error) => {
      console.warn('Registro do PWA indisponível:', error)
    })
  })
}

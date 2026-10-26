import { useEffect, useState } from 'react'
import type { BeforeInstallPromptEvent } from './pwaTypes'

export default function InstallCeb() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    setInstalled(standalone)
    const ready = (event: Event) => { event.preventDefault(); setPrompt(event as BeforeInstallPromptEvent) }
    const done = () => { setInstalled(true); setPrompt(null); setShowHelp(false) }
    window.addEventListener('beforeinstallprompt', ready)
    window.addEventListener('appinstalled', done)
    return () => { window.removeEventListener('beforeinstallprompt', ready); window.removeEventListener('appinstalled', done) }
  }, [])
  if (installed) return null
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  return (
    <div className="ceb-install" aria-label="Instalar aplicativo da CEB">
      <span className="ceb-install-label">CEB · Igreja Batista Nova Esperança</span>
      {prompt ? (
        <button type="button" onClick={async () => {
          await prompt.prompt()
          await prompt.userChoice
          setPrompt(null)
        }}>Instalar aplicativo</button>
      ) : (
        <button type="button" onClick={() => setShowHelp(!showHelp)}>Como instalar</button>
      )}
      {showHelp && <p>{isIOS
        ? 'No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.'
        : 'No Chrome ou Edge, abra o menu do navegador e escolha Instalar aplicativo ou Adicionar à tela inicial. Se a opção não aparecer, aguarde a atualização do site e tente novamente.'}</p>}
    </div>
  )
}

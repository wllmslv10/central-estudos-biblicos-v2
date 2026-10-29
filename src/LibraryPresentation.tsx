import PresentationCover, { defaultPresentationCover } from './PresentationCover'
import type { PresentationOptions } from './presentation.mjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPresentationHtml, defaultPresentationMode, presentationUsesExpandedIdentity, type PresentationMode, type PresentationStudy } from './presentation.mjs'
import cebLogo from '../public/ceb-book.png?inline'
import churchLogo from '../public/icon-192.png?inline'
import circularChurchLogo from '../identidade-visual/logo-circular-azul-2.png?inline'

export function savedPresentationHtml(study: PresentationStudy, mode: PresentationMode, options: PresentationOptions = {cover:defaultPresentationCover(study.collection)}) {
  return createPresentationHtml(study, mode, { ceb: cebLogo, church: presentationUsesExpandedIdentity(study,mode) ? circularChurchLogo : churchLogo }, options)
}
export function downloadSavedPresentation(study: PresentationStudy, mode: PresentationMode, options: PresentationOptions = {cover:defaultPresentationCover(study.collection)}) {
  const url = URL.createObjectURL(new Blob([savedPresentationHtml(study, mode, options)], { type: 'text/html;charset=utf-8' }))
  const link = document.createElement('a')
  const name = (study.title || 'apresentacao-ceb').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  link.href = url; link.download = `${name}-${mode}.html`; document.body.append(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export default function LibraryPresentation({ study, onClose }: { study: PresentationStudy; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [mode, setMode] = useState<PresentationMode>(() => defaultPresentationMode(study))
  const [cover, setCover] = useState(() => defaultPresentationCover(study.collection))
  const html = useMemo(() => savedPresentationHtml(study, mode, {cover,review:true}), [study, mode, cover])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current!; element.showModal()
    return () => { element.close(); previous?.focus() }
  }, [])
  return <dialog ref={dialog} className="library-presentation-dialog" aria-labelledby="library-presentation-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="library-presentation-heading"><div><span className="eyebrow">APRESENTAÇÃO DO MATERIAL SALVO</span><h2 id="library-presentation-title">{study.title}</h2></div><button className="secondary-button" onClick={onClose} autoFocus>Fechar apresentação ×</button></div>
    <div className="library-presentation-tools"><label>Modelo de apresentação <select value={mode} onChange={event => setMode(event.target.value as PresentationMode)}><option value="explicativo">Explicativo — nova apresentação</option><option value="ampliado">Ampliado</option><option value="resumido">Resumido</option></select></label><button className="primary-button" onClick={() => downloadSavedPresentation(study, mode, {cover})}>Gerar HTML ↓</button></div>
    <PresentationCover value={cover} onChange={setCover} />
    <iframe title="Apresentação HTML do material salvo" sandbox="allow-scripts allow-popups allow-modals" allow="fullscreen" allowFullScreen srcDoc={html} />
    <p>A apresentação utiliza o conteúdo deste documento salvo. Use as setas, os botões de navegação ou a tela cheia.</p>
  </dialog>
}

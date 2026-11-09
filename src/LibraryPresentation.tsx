import {useBibleTranslation} from './useBibleTranslation'
import {TeacherControls,type TeacherResource} from './TeacherMode'
import {withTeacherBridge} from './teacherBridge.mjs'
import PresentationCover, { defaultPresentationCover } from './PresentationCover'
import type { PresentationOptions } from './presentation.mjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPresentationHtml, type PresentationMode, type PresentationStudy } from './presentation.mjs'
import cebLogo from '../public/ceb-book.png?inline'
import circularChurchLogo from '../identidade-visual/logo-circular-azul-2.png?inline'

export function savedPresentationHtml(study: PresentationStudy, mode: PresentationMode, options: PresentationOptions = {cover:defaultPresentationCover(study.collection)}) {
  return createPresentationHtml(study, mode, { ceb: cebLogo, church: circularChurchLogo }, {...options,official:true})
}
export function downloadSavedPresentation(study: PresentationStudy, mode: PresentationMode, options: PresentationOptions = {cover:defaultPresentationCover(study.collection)}) {
  const url = URL.createObjectURL(new Blob([savedPresentationHtml(study, mode, options)], { type: 'text/html;charset=utf-8' }))
  const link = document.createElement('a')
  const name = (study.title || 'apresentacao-ceb').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  link.href = url; link.download = `${name}-${mode}.html`; document.body.append(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export default function LibraryPresentation({ study, onClose,token='',resource }: { study: PresentationStudy; onClose: () => void;token?:string;resource?:TeacherResource }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const {sync}=useBibleTranslation(frame)
  const channel = useMemo(()=>crypto.randomUUID(),[])
  const [mode, setMode] = useState<PresentationMode>('completa')
  const [reviewed, setReviewed] = useState(study.contentVersion === 1 || study.studentReviewed === true)
  const [cover, setCover] = useState(() => defaultPresentationCover(study.collection))
  const html = useMemo(() => reviewed ? withTeacherBridge(savedPresentationHtml({...study,studentReviewed:true}, mode, {cover,review:true}),channel,mode) : '', [study, mode, cover, reviewed])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current!; element.showModal()
    return () => { element.close(); previous?.focus() }
  }, [])
  return <dialog ref={dialog} className="library-presentation-dialog" aria-labelledby="library-presentation-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="library-presentation-heading"><div><span className="eyebrow">APRESENTAÇÃO DO MATERIAL SALVO</span><h2 id="library-presentation-title">{study.title}</h2></div><button className="secondary-button" onClick={onClose} autoFocus>Fechar apresentação ×</button></div>
    <div className="library-presentation-tools"><TeacherControls token={token} resource={resource} title={study.title} frame={frame} channel={channel} seed={study.teacherNotes||''}/><label>Modelo de apresentação <select value={mode} onChange={event => setMode(event.target.value as PresentationMode)}><option value="simples">Simples — conteúdo essencial</option><option value="media">Média — desenvolvimento intermediário</option><option value="completa">Completa — todo o conteúdo do aluno</option></select></label><button className="primary-button" disabled={!reviewed} onClick={() => downloadSavedPresentation({...study,studentReviewed:true}, mode, {cover})}>Gerar HTML ↓</button></div>
    {study.contentVersion !== 1 && <label className="notice"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> Revisei o texto: ele contém somente conteúdo destinado aos alunos, sem gabarito ou orientações reservadas ao professor.</label>}
    <p>As modalidades respeitam a estrutura do estudo: Simples destaca a explicação essencial e a aplicação de cada tópico; Média acrescenta desenvolvimento e introdução; Completa preserva o conteúdo integral destinado aos alunos. Nenhuma modalidade inventa explicações. Confira a prévia antes de apresentar.</p>
    <PresentationCover value={cover} onChange={setCover} />
    <iframe ref={frame} onLoad={sync} title="Apresentação HTML do material salvo" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-modals" allow="fullscreen" allowFullScreen srcDoc={html} />
    <p>A apresentação utiliza o conteúdo deste documento salvo. Use as setas, os botões de navegação ou a tela cheia.</p>
  </dialog>
}

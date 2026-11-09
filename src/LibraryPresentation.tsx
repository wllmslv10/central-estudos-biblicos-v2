import {useBibleTranslation} from './useBibleTranslation'
import {TeacherControls,type TeacherResource} from './TeacherMode'
import {withTeacherBridge} from './teacherBridge.mjs'
import PresentationCover, { defaultPresentationCover } from './PresentationCover'
import type { PresentationOptions } from './presentation.mjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSlides, createPresentationHtml, type PresentationMode, type PresentationStudy } from './presentation.mjs'
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
const layoutChoices = [
  ['regular','Slide comum'], ['ceb-contracapa','Contracapa de reflexão'],
  ['showtime-slide','Animação de abertura'], ['dinamica-titulo','Título da dinâmica'],
  ['dinamica-ceb','Dinâmica de ofertas'], ['ponte-biblica-ceb','Ponte bíblica'],
  ['homework-slide','Atividade para casa'],
]

export default function LibraryPresentation({ study, onClose,token='',resource }: { study: PresentationStudy; onClose: () => void;token?:string;resource?:TeacherResource }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const {sync}=useBibleTranslation(frame)
  const channel = useMemo(()=>crypto.randomUUID(),[])
  const [mode, setMode] = useState<PresentationMode>('completa')
  const [reviewed, setReviewed] = useState(study.contentVersion === 1 || study.studentReviewed === true)
  const [cover, setCover] = useState(() => defaultPresentationCover(study.collection))
  const [sectionLayouts,setSectionLayouts] = useState<Record<string,string>>({})
  const approvedStudy = useMemo(()=>({...study,studentReviewed:true}),[study])
  const sections = useMemo(()=>reviewed ? buildSlides(approvedStudy,mode).filter(section=>section.topic) : [],[approvedStudy,mode,reviewed])
  const html = useMemo(() => reviewed ? withTeacherBridge(savedPresentationHtml(approvedStudy, mode, {cover,review:true,sectionLayouts}),channel,mode) : '', [approvedStudy, mode, cover, reviewed, channel, sectionLayouts])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current!; element.showModal()
    return () => { element.close(); previous?.focus() }
  }, [])
  return <dialog ref={dialog} className="library-presentation-dialog" aria-labelledby="library-presentation-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="library-presentation-heading"><div><span className="eyebrow">APRESENTAÇÃO DO MATERIAL SALVO</span><h2 id="library-presentation-title">{study.title}</h2></div><button className="secondary-button" onClick={onClose} autoFocus>Fechar apresentação ×</button></div>
    <div className="library-presentation-tools"><TeacherControls token={token} resource={resource} title={study.title} frame={frame} channel={channel} seed={study.teacherNotes||''}/><label>Modelo de apresentação <select value={mode} onChange={event => setMode(event.target.value as PresentationMode)}><option value="simples">Simples — conteúdo essencial</option><option value="media">Média — desenvolvimento intermediário</option><option value="completa">Completa — todo o conteúdo do aluno</option></select></label><button className="primary-button" disabled={!reviewed} onClick={() => downloadSavedPresentation(approvedStudy, mode, {cover,sectionLayouts})}>Gerar HTML ↓</button></div>
    {study.contentVersion !== 1 && <label className="notice"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> Revisei o texto: ele contém somente conteúdo destinado aos alunos, sem gabarito ou orientações reservadas ao professor.</label>}
    <p>As modalidades respeitam a estrutura do estudo: Simples destaca a explicação essencial e a aplicação de cada tópico; Média acrescenta desenvolvimento e introdução; Completa preserva o conteúdo integral destinado aos alunos. Nenhuma modalidade inventa explicações. Confira a prévia antes de apresentar.</p>
    <PresentationCover value={cover} onChange={setCover} />
    {sections.length>0&&<details className="presentation-cover-settings"><summary>Escolher layouts especiais</summary>
      <small>A escolha vale para a prévia e o HTML baixado. Use parágrafos separados para as ofertas e suas condições.</small>
      {sections.map(section=>{
        const topic=section.topic!
        const marker=section.title.match(/^\[([a-z-]+)\]\s*/)
        const defaultLayout=layoutChoices.some(([id])=>id===marker?.[1])?marker![1]:'regular'
        return <label key={topic}>{defaultLayout==='regular'?section.title:section.title.slice(marker![0].length)}
          <select value={sectionLayouts[topic]??defaultLayout} onChange={event=>{
            const layout=event.target.value
            setSectionLayouts(current=>({...current,[topic]:layout}))
          }}>{layoutChoices.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
        </label>
      })}
    </details>}
    <iframe ref={frame} onLoad={sync} title="Apresentação HTML do material salvo" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-modals" allow="fullscreen" allowFullScreen srcDoc={html} />
    <p>A apresentação utiliza o conteúdo deste documento salvo. Use as setas, os botões de navegação ou a tela cheia.</p>
  </dialog>
}

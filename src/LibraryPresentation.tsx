import {createPresentationWorkspace} from './presentationWorkspace.mjs'
import {useBibleTranslation} from './useBibleTranslation'
import {TeacherControls,type TeacherResource} from './TeacherMode'
import {withTeacherBridge} from './teacherBridge.mjs'
import PresentationCover, { defaultPresentationCover } from './PresentationCover'
import type { PresentationOptions } from './presentation.mjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { buildSlides, createPresentationHtml, type PresentationMode, type PresentationStudy } from './presentation.mjs'
import cebLogo from '../public/ceb-book.png?inline'
import circularChurchLogo from '../identidade-visual/logo-circular-azul-2.png?inline'

export function savedPresentationHtml(study: PresentationStudy, mode: PresentationMode, options: PresentationOptions = {cover:defaultPresentationCover(study.collection)}, arBible?: Record<string, unknown>) {
  const html = createPresentationHtml(study, mode, { ceb: cebLogo, church: circularChurchLogo }, {...options,official:true})
  if (!arBible) return html
  const payload = JSON.stringify(arBible).replace(/</g,'\\u003c')
  return html.replace(new RegExp('</body>', 'i'), () => `<script>window.__CEB_AR_VERSES=${payload};</script></body>`)
}
export function exportedPresentationHtml(study: PresentationStudy, mode: PresentationMode, options?: PresentationOptions, arBible?: Record<string, unknown>) {
  return createPresentationWorkspace(savedPresentationHtml(study, mode, options, arBible), study.title, mode)
}
export function downloadSavedPresentation(study: PresentationStudy, mode: PresentationMode, options: PresentationOptions = {cover:defaultPresentationCover(study.collection)}, arBible?: Record<string, unknown>) {
  const url = URL.createObjectURL(new Blob([exportedPresentationHtml(study, mode, options, arBible)], { type: 'text/html;charset=utf-8' }))
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
  const [arBible,setArBible] = useState<Record<string,unknown> | undefined>()
  const [arError,setArError] = useState('')
  useEffect(()=>{let active=true;fetch('/central-estudos-biblicos-v2/almeida-recebida.json').then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{if(active&&data&&typeof (data.verses?.['40.4.1']??data['40']?.['4']?.['1'])==='string')setArBible(data)}).catch(()=>{});return()=>{active=false}},[])
  const [workspaceError,setWorkspaceError] = useState('')
  const importAr = async (file?: File) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as Record<string,any>
      if (data.edition !== 'Almeida Recebida' || data.version !== '1.7' || !(data.verses || data['40']) || typeof (data.verses?.['40.4.1'] ?? data['40']?.['4']?.['1']) !== 'string') throw Error('O arquivo não corresponde à base Almeida Recebida 1.7 completa.')
      setArBible(data);setArError('')
    } catch(error) {setArBible(undefined);setArError(error instanceof Error?error.message:'Não foi possível ler a base bíblica.')}
  }
  const [reviewed, setReviewed] = useState(study.contentVersion === 1 || study.studentReviewed === true)
  const [cover, setCover] = useState(() => defaultPresentationCover(study.collection))
  const [sectionLayouts,setSectionLayouts] = useState<Record<string,string>>({})
  const approvedStudy = useMemo(()=>({...study,studentReviewed:true}),[study])
  const sections = useMemo(()=>reviewed ? buildSlides(approvedStudy,mode).filter(section=>section.topic) : [],[approvedStudy,mode,reviewed])
  const html = useMemo(() => reviewed ? withTeacherBridge(savedPresentationHtml(approvedStudy, mode, {cover,review:true,sectionLayouts},arBible),channel,mode) : '', [approvedStudy, mode, cover, reviewed, channel, sectionLayouts, arBible])
  const openWorkspace = () => {
    const page = window.open('', '_blank')
    if (!page) { setWorkspaceError('Permita janelas pop-up para abrir o Modo Professor.'); return }
    setWorkspaceError('')
    page.opener = null
    page.document.open()
    page.document.write(exportedPresentationHtml(approvedStudy, mode, {cover,sectionLayouts}, arBible))
    page.document.close()
  }
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const element = dialog.current!; element.showModal()
    return () => { element.close(); previous?.focus() }
  }, [])
  return <dialog ref={dialog} className="library-presentation-dialog" aria-labelledby="library-presentation-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="library-presentation-heading"><div><span className="eyebrow">APRESENTAÇÃO DO MATERIAL SALVO</span><h2 id="library-presentation-title">{study.title}</h2></div><button className="secondary-button" onClick={onClose} autoFocus>Fechar apresentação ×</button></div>
    <div className="library-presentation-tools"><TeacherControls token={token} resource={resource} title={study.title} frame={frame} channel={channel} seed={study.teacherNotes||''}/><label>Modelo de apresentação <select value={mode} onChange={event => setMode(event.target.value as PresentationMode)}><option value="simples">Simples — conteúdo essencial</option><option value="media">Média — desenvolvimento intermediário</option><option value="completa">Completa — todo o conteúdo do aluno</option></select></label><button className="secondary-button" disabled={!reviewed} onClick={openWorkspace}>Abrir painel de apresentação ↗</button><button className="primary-button" disabled={!reviewed} onClick={() => downloadSavedPresentation(approvedStudy, mode, {cover,sectionLayouts}, arBible)}>Gerar HTML ↓</button></div>
    <label className="notice">Base bíblica offline (opcional): <input type="file" accept=".json,application/json" onChange={event=>void importAr(event.target.files?.[0])}/> {arBible?'Almeida Recebida 1.7 carregada — incluída no HTML exportado.':'Selecione sua cópia da Almeida Recebida 1.7 para consulta offline. Ao compartilhar o HTML, mantenha os créditos e observe a licença CC BY-NC-SA 3.0 da base.'}</label>
    {arError&&<p role="alert">{arError}</p>}
    {workspaceError&&<p role="alert">{workspaceError}</p>}
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

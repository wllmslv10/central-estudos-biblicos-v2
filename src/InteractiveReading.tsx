import {useEffect,useMemo,useRef} from 'react'
import type {PresentationStudy} from './presentation.mjs'
import {createReadingHtml} from './interactiveReading.mjs'
export default function InteractiveReading({study,onClose,audience='teacher',notice='',allowDownload=true,onSlides}:{study:PresentationStudy;onClose:()=>void;audience?:'teacher'|'student';notice?:string;allowDownload?:boolean;onSlides?:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null)
 const html=useMemo(()=>createReadingHtml(study,{audience,notice}),[study,audience,notice])
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;try { if(dialog.current && !dialog.current.open) dialog.current.showModal() } catch { dialog.current?.setAttribute('open','') } return()=>{if(dialog.current?.open) dialog.current.close();previous?.focus()}},[])
 const download=()=>{const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='leitura-interativa-ceb.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <dialog ref={dialog} className="library-presentation-dialog interactive-reading-dialog" aria-label="Leitura Interativa" onCancel={e=>{e.preventDefault();onClose()}}><div className="library-presentation-heading"><strong>📖 Leitura Interativa</strong><div>{onSlides&&<button onClick={onSlides}>Slides Simples / Média / Completa</button>} {allowDownload&&<button onClick={download}>Baixar leitura HTML ↓</button>} <button autoFocus onClick={onClose}>Fechar ×</button></div></div><iframe title="Leitura Interativa do estudo completo" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-modals" srcDoc={html}/></dialog>
}

import {bibleTranslations} from './bibleTranslations.mjs'
import {chooseBibleTranslation,useBibleTranslation} from './useBibleTranslation'
import {useEffect,useMemo,useRef,useState} from 'react'
import type {PresentationStudy} from './presentation.mjs'
import {createReadingHtml} from './interactiveReading.mjs'
export default function InteractiveReading({study,onClose,audience='teacher',notice='',allowDownload=true,onSlides}:{study:PresentationStudy;onClose:()=>void;audience?:'teacher'|'student';notice?:string;allowDownload?:boolean;onSlides?:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null)
 const frame=useRef<HTMLIFrameElement>(null)
 const {translation,sync}=useBibleTranslation(frame)
 const [arBible,setArBible]=useState<Record<string,unknown>|undefined>()
 useEffect(()=>{let active=true;fetch('/central-estudos-biblicos-v2/almeida-recebida.json').then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{if(active&&data&&typeof (data.verses?.['40.4.1']??data['40']?.['4']?.['1'])==='string')setArBible(data)}).catch(()=>{});return()=>{active=false}},[])
 const html=useMemo(()=>createReadingHtml(study,{audience,notice,translation,arBible}),[study,audience,notice,translation,arBible])
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;try { if(dialog.current && !dialog.current.open) dialog.current.showModal() } catch { dialog.current?.setAttribute('open','') } return()=>{if(dialog.current?.open) dialog.current.close();previous?.focus()}},[])
 const [pdfError,setPdfError]=useState('')
 const [pdfBusy,setPdfBusy]=useState(false)
 const downloadPdf=async()=>{
   setPdfBusy(true)
   setPdfError('')
   try {
     const {downloadReadingPdf}=await import('./readingPdf.mjs')
     await downloadReadingPdf(study,audience)
   } catch {
     setPdfError('Não foi possível gerar o PDF. Tente novamente.')
   } finally {
     setPdfBusy(false)
   }
 }
 const download=()=>{const url=URL.createObjectURL(new Blob([createReadingHtml(study,{audience,notice,translation,arBible})],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='leitura-interativa-ceb.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <dialog ref={dialog} className="library-presentation-dialog interactive-reading-dialog" aria-label="Leitura Interativa" onCancel={e=>{e.preventDefault();onClose()}}><div className="library-presentation-heading" style={{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:"12px",padding:"12px 16px"}}><strong>📖 Leitura Interativa</strong><label style={{display:'flex',alignItems:'center',gap:6}}>Tradução <select aria-label="Tradução bíblica preferida" value={translation} onChange={e=>chooseBibleTranslation(e.target.value)}>{Object.entries(bibleTranslations).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>{onSlides&&<button onClick={onSlides}>Slides Simples / Média / Completa</button>} {allowDownload&&<><button onClick={download}>Baixar leitura HTML ↓</button><button disabled={pdfBusy} onClick={downloadPdf}>{pdfBusy?"Gerando PDF…":"Baixar PDF da Leitura"}</button></>} <button autoFocus onClick={onClose}>Fechar ×</button></div></div>{pdfError&&<p role="alert">{pdfError}</p>}<iframe ref={frame} onLoad={sync} style={{display:"block",width:"100%",height:"min(78dvh,900px)",minHeight:"320px",border:0}} title="Leitura Interativa do estudo completo" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-modals" srcDoc={html}/></dialog>
}

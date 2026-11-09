import {useEffect,useLayoutEffect,useMemo,useRef,useState,type RefObject} from 'react'
import {createPortal} from 'react-dom'
import {cebApi,downloadCloudMaterial,originalFile} from './cebApi'
import {withTeacherBridge,embeddedTeacherNotes} from './teacherBridge.mjs'
import {savedPresentationHtml} from './LibraryPresentation'
import type {PresentationStudy} from './presentation.mjs'

export type TeacherResource={kind:'study'|'material';id:string;fileId?:string}
type PublicState={index:number;total:number;title:string;text:string;key:string;sync:string}
const initial:PublicState={index:0,total:1,title:'Acompanhamento manual',text:'',key:'manual:0',sync:'manual'}
// Paginate by measured viewport, preserving every character at a readable font size.
function PagedText({text,label}:{text:string;label:string}){
 const box=useRef<HTMLDivElement>(null),measure=useRef<HTMLDivElement>(null)
 const [pages,setPages]=useState<string[]>(['']),[page,setPage]=useState(0)
 useLayoutEffect(()=>{
  const paginate=()=>{if(!box.current||!measure.current)return;const b=box.current,m=measure.current;const width=b.clientWidth,height=b.clientHeight;if(width<20||height<30)return;m.style.width=width+'px';const chunks:string[]=[];let remaining=text||'Nenhuma anotação salva para esta parte. Clique em Editar anotações.';
   while(remaining.length){let low=1,high=remaining.length;while(low<high){const mid=Math.ceil((low+high)/2);m.textContent=remaining.slice(0,mid);if(m.scrollHeight<=height)low=mid;else high=mid-1;}let end=low;if(end<remaining.length){const boundary=remaining.slice(0,end).search(/\s+\S*$/);if(boundary>end*.65)end=boundary+1;}if(end>1&&remaining.charCodeAt(end-1)>=0xD800&&remaining.charCodeAt(end-1)<=0xDBFF)end--;chunks.push(remaining.slice(0,end));remaining=remaining.slice(end);}
   setPages(chunks);setPage(p=>Math.min(p,chunks.length-1));
  };paginate();const observer=new ResizeObserver(paginate);if(box.current)observer.observe(box.current);return()=>observer.disconnect();
 },[text])
 useEffect(()=>setPage(0),[text])
 return <div className="tm-paged"><div className="tm-text" ref={box} aria-label={label}>{pages[page]}</div><div className="tm-measure tm-text" ref={measure} aria-hidden="true"/><nav aria-label={'Páginas de '+label}><button disabled={!page} onClick={()=>setPage(page-1)}>← Página</button><span>{page+1} / {pages.length}</span><button disabled={page>=pages.length-1} onClick={()=>setPage(page+1)}>Página →</button></nav></div>
}

const bibleBooks='Gênesis|Êxodo|Levítico|Números|Deuteronômio|Josué|Juízes|Rute|1\\s*Samuel|2\\s*Samuel|1\\s*Reis|2\\s*Reis|1\\s*Crônicas|2\\s*Crônicas|Esdras|Neemias|Ester|Jó|Salmos?|Provérbios|Eclesiastes|Cantares|Isaías|Jeremias|Lamentações|Ezequiel|Daniel|Oseias|Joel|Amós|Obadias|Jonas|Miqueias|Naum|Habacuque|Sofonias|Ageu|Zacarias|Malaquias|Mateus|Marcos|Lucas|João|Atos|Romanos|1\\s*Coríntios|2\\s*Coríntios|Gálatas|Efésios|Filipenses|Colossenses|1\\s*Tessalonicenses|2\\s*Tessalonicenses|1\\s*Timóteo|2\\s*Timóteo|Tito|Filemom|Hebreus|Tiago|1\\s*Pedro|2\\s*Pedro|1\\s*João|2\\s*João|3\\s*João|Judas|Apocalipse|Gn|Ex|Lv|Nm|Dt|Js|Jz|Rt|Sl|Pv|Ec|Ct|Is|Jr|Lm|Ez|Dn|Os|Jl|Am|Ob|Jn|Mq|Na|Hc|Sf|Ag|Zc|Ml|Mt|Mc|Lc|Jo|At|Rm|Gl|Ef|Fp|Cl|Tg|Hb|Ap|1\\s*Sm|2\\s*Sm|1\\s*Rs|2\\s*Rs|1\\s*Cr|2\\s*Cr|1\\s*Co|2\\s*Co|1\\s*Ts|2\\s*Ts|1\\s*Tm|2\\s*Tm|1\\s*Pe|2\\s*Pe|1\\s*Jo|2\\s*Jo|3\\s*Jo'
export function slideBibleReferences(text:string):string[]{
 const pattern=new RegExp('(?:^|[^\\p{L}\\p{N}])((?:'+bibleBooks+')\\.?\\s*\\d{1,3}\\s*[:.]\\s*\\d{1,3}(?:\\s*[-–—]\\s*(?:\\d{1,3}\\s*[:.]\\s*)?\\d{1,3})?)','giu')
 return [...new Set([...text.matchAll(pattern)].map(m=>m[1].trim()))].slice(0,30)
}

const bibleCodes:Record<string,string>={
 'gênesis':'gn','gn':'gn','êxodo':'ex','ex':'ex','levítico':'lv','lv':'lv','números':'nm','nm':'nm','deuteronômio':'dt','dt':'dt','josué':'js','js':'js','juízes':'jz','jz':'jz','rute':'rt','rt':'rt','1 samuel':'1sm','1sm':'1sm','2 samuel':'2sm','2sm':'2sm','1 reis':'1rs','1rs':'1rs','2 reis':'2rs','2rs':'2rs','1 crônicas':'1cr','1cr':'1cr','2 crônicas':'2cr','2cr':'2cr','esdras':'ed','neemias':'ne','ester':'et','jó':'jó','salmos':'sl','salmo':'sl','sl':'sl','provérbios':'pv','pv':'pv','eclesiastes':'ec','ec':'ec','cantares':'ct','ct':'ct','isaías':'is','is':'is','jeremias':'jr','jr':'jr','lamentações':'lm','lm':'lm','ezequiel':'ez','ez':'ez','daniel':'dn','dn':'dn','oseias':'os','os':'os','joel':'jl','jl':'jl','amós':'am','am':'am','obadias':'ob','ob':'ob','jonas':'jn','jn':'jn','miqueias':'mq','mq':'mq','naum':'na','na':'na','habacuque':'hc','hc':'hc','sofonias':'sf','sf':'sf','ageu':'ag','ag':'ag','zacarias':'zc','zc':'zc','malaquias':'ml','ml':'ml','mateus':'mt','mt':'mt','marcos':'mc','mc':'mc','lucas':'lc','lc':'lc','joão':'jo','jo':'jo','atos':'at','at':'at','romanos':'rm','rm':'rm','1 coríntios':'1co','1co':'1co','2 coríntios':'2co','2co':'2co','gálatas':'gl','gl':'gl','efésios':'ef','ef':'ef','filipenses':'fp','fp':'fp','colossenses':'cl','cl':'cl','1 tessalonicenses':'1ts','1ts':'1ts','2 tessalonicenses':'2ts','2ts':'2ts','1 timóteo':'1tm','1tm':'1tm','2 timóteo':'2tm','2tm':'2tm','tito':'tt','filemom':'fm','hebreus':'hb','hb':'hb','tiago':'tg','tg':'tg','1 pedro':'1pe','1pe':'1pe','2 pedro':'2pe','2pe':'2pe','1 joão':'1jo','1jo':'1jo','2 joão':'2jo','2jo':'2jo','3 joão':'3jo','3jo':'3jo','judas':'jd','apocalipse':'ap','ap':'ap'}
async function loadAcfReference(ref:string,signal:AbortSignal):Promise<string>{
 const m=ref.match(/^(.+?)\.?\s+(\d{1,3})\s*[:.]\s*(\d{1,3})(?:\s*[-–—]\s*(?:(\d{1,3})\s*[:.]\s*)?(\d{1,3}))?$/u)
 if(!m)throw new Error('Formato de referência não reconhecido.')
 const code=bibleCodes[m[1].toLowerCase().replace(/\\s+/g,' ').trim()]
 if(!code)throw new Error('Livro não reconhecido para consulta automática.')
 const chapter=Number(m[2]),first=Number(m[3]),last=Number(m[5]||m[3])
 if(m[4]&&Number(m[4])!==chapter)throw new Error('Intervalos entre capítulos precisam ser consultados no link da Bíblia.')
 if(first<1||last<first||last-first>80)throw new Error('Intervalo inválido ou muito extenso.')
 const response=await fetch('https://abibliadigital.api.br/api/verses/acf/'+code+'/'+chapter,{signal,headers:{Accept:'application/json'}})
 if(!response.ok)throw new Error(response.status===429?'Limite de consultas da Bíblia atingido. Tente novamente mais tarde.':'Consulta indisponível ('+response.status+').')
 const data=await response.json() as {book?:{version?:string};verses?:{number:number;text:string}[]}
 if(data.book?.version?.toLowerCase()!=='acf'||!Array.isArray(data.verses))throw new Error('Não foi possível confirmar a tradução ACF.')
 const verses=data.verses.filter(v=>v.number>=first&&v.number<=last)
 if(verses.length!==last-first+1)throw new Error('Passagem incompleta; consulte a Bíblia.')
 return verses.map(v=>v.number+'. '+v.text).join('\\n')
}
function SlideBibleReferences({text}:{text:string}){
 const refs=useMemo(()=>slideBibleReferences(text),[text])
 const [active,setActive]=useState<string|null>(null),[verse,setVerse]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false)
 useEffect(()=>setActive(null),[text])
 useEffect(()=>{
  if(!active){setVerse('');setError('');setLoading(false);return}
  const controller=new AbortController();setVerse('');setError('');setLoading(true)
  loadAcfReference(active,controller.signal).then(setVerse).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Falha ao consultar o texto.')}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>controller.abort()
 },[active])
 return <section className="tm-bible" aria-label="Referências bíblicas do slide"><details><summary>📖 Referências bíblicas do slide ({refs.length})</summary>{refs.length?<div className="tm-bible-list">{refs.map(ref=><div key={ref} className="tm-bible-item"><button type="button" title={'Ler '+ref} onMouseEnter={()=>setActive(ref)} onFocus={()=>setActive(ref)} onClick={()=>setActive(active===ref?null:ref)}>{ref}</button>{active===ref&&<div role="status" className="tm-bible-preview"><strong>{ref} — ACF</strong><p>{loading?'Carregando texto bíblico…':error||verse}</p><a href={'https://www.bibliaonline.com.br/acf/'+encodeURIComponent(ref)} target="_blank" rel="noopener noreferrer">Consultar na Bíblia Online ↗</a><button type="button" onClick={()=>setActive(null)}>Fechar</button></div>}</div>)}</div>:<p>Nenhuma referência explícita identificada neste slide.</p>}</details></section>
}

const css=`.tm-bible{background:white;border-radius:8px;padding:8px 12px}.tm-bible summary{cursor:pointer;font-weight:650;font-size:16px}.tm-bible-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.tm-bible-item{position:relative}.tm-bible-preview{position:absolute;z-index:10;top:100%;left:0;width:min(330px,80vw);background:white;border:1px solid #a9c4e2;box-shadow:0 4px 14px #0002;border-radius:8px;padding:12px}.tm-bible-preview p{font-size:14px;white-space:pre-wrap;max-height:260px;overflow:auto}.tm-bible-preview a{font-size:14px;color:#15549a}html,body,#teacher-root{margin:0;height:100%;font-family:system-ui,sans-serif;color:#18304b;background:#f3f7fc}*{box-sizing:border-box}.tm-shell{height:100dvh;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto auto;gap:10px;padding:14px}.tm-shell header{background:#2563A6;color:white;border-radius:10px;padding:12px}.tm-shell h1{font-size:21px;margin:0}.tm-shell h2{font-size:20px;margin:4px 0}.tm-shell nav,.tm-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.tm-shell button,.tm-shell select,.tm-shell input{font:600 15px system-ui;padding:9px;border:1px solid #b9cde1;border-radius:8px;background:white;color:#18304b}.tm-shell button{cursor:pointer;min-height:42px}.tm-shell button:disabled{opacity:.4}.tm-main{min-height:0;display:grid;grid-template-rows:minmax(0,1fr) auto;gap:8px}.tm-main.tm-expanded{grid-template-rows:minmax(0,1fr) minmax(130px,38%)}.tm-paged{min-height:0;display:grid;grid-template-rows:minmax(0,1fr) auto;gap:8px;background:white;border-radius:10px;padding:12px}.tm-text{min-height:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:22px;line-height:1.5;overflow:hidden}.tm-measure{position:fixed;left:-100000px;top:0;height:auto;visibility:hidden;pointer-events:none}.tm-paged nav{justify-content:center}.tm-optional{min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:6px}.tm-shell .tm-toggle{font-size:17px;text-align:left;padding:8px;background:#e2edfa;border-radius:8px}.tm-shell textarea{width:100%;height:100%;resize:none;font:20px/1.5 system-ui;padding:12px;color:#18304b}.tm-edit{display:grid;grid-template-rows:minmax(0,1fr) auto;min-height:0}.tm-status{font-size:14px;white-space:pre-wrap}.tm-shell label{font-size:14px}.tm-shell input{width:80px}@media(max-width:500px){.tm-shell{padding:6px;gap:6px}.tm-text{font-size:20px}.tm-shell h1{font-size:18px}}`
export function TeacherControls({token,resource,title,frame,channel,seed='',seedNotes={},fallbackText=''}:{token:string;resource?:TeacherResource;title:string;frame:RefObject<HTMLIFrameElement|null>;channel:string;seed?:string;seedNotes?:Record<string,string>;fallbackText?:string}){
 const [popup,setPopup]=useState<Window|null>(null),[root,setRoot]=useState<HTMLElement|null>(null)
 const [state,setState]=useState<PublicState>({...initial,text:fallbackText}),[notes,setNotes]=useState<Record<string,string>>({}),[revision,setRevision]=useState(0),[loaded,setLoaded]=useState(false),[status,setStatus]=useState(''),[optional,setOptional]=useState(false),[editing,setEditing]=useState(false),[draft,setDraft]=useState(''),[editKey,setEditKey]=useState(''),[saving,setSaving]=useState(false)
 const dirty=useRef(false)
 const key=resource?`${resource.kind}:${resource.id}${resource.fileId?':'+resource.fileId:''}`:''
 const path='/library/teacher-notes/'+encodeURIComponent(key)
 useEffect(()=>{
  setLoaded(false);setEditing(false);setNotes({});setRevision(0);setStatus('');dirty.current=false;
  if(!token||!key){setStatus('Salve o material na CEB para guardar anotações permanentemente.');return}
  let active=true;cebApi<{notes:Record<string,string>;revision:number}>(path,{token}).then(r=>{if(active){setNotes(r.notes);setRevision(r.revision);setLoaded(true)}}).catch(e=>{if(active)setStatus(e.message)});return()=>{active=false}
 },[key,token,path])
 useEffect(()=>{
  const listener=(event:MessageEvent)=>{if(event.source!==frame.current?.contentWindow||event.data?.type!=='ceb-teacher-public'||event.data.channel!==channel)return;const d=event.data;if(!Number.isInteger(d.index)||!Number.isInteger(d.total)||d.index<0||d.total<1||d.total>10000||d.index>=d.total||typeof d.key!=='string'||typeof d.text!=='string'||typeof d.title!=='string')return;setState({index:d.index,total:d.total,title:d.title.slice(0,500),text:d.text.slice(0,100000),key:d.key,sync:d.sync});};window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener)
 },[frame,channel])
 useEffect(()=>{const id=setInterval(()=>{if(popup?.closed){setPopup(null);setRoot(null)}},800);return()=>clearInterval(id)},[popup])
 useEffect(()=>()=>{popup?.close()},[popup])
 useEffect(()=>{if(!popup)return;const warn=(e:BeforeUnloadEvent)=>{if(dirty.current){e.preventDefault();e.returnValue=''}};popup.addEventListener('beforeunload',warn);return()=>popup.removeEventListener('beforeunload',warn)},[popup])
 const poll=()=>frame.current?.contentWindow?.postMessage({type:'ceb-teacher-poll',channel},'*')
 const open=()=>{
  if(popup&&!popup.closed){popup.focus();poll();return}
  const win=window.open('','ceb-professor-'+channel,'popup,width=1150,height=850');if(!win){setStatus('O navegador bloqueou a janela. Permita pop-ups para a CEB e clique novamente.');return}
  win.document.title='Professor — '+title;win.document.body.replaceChildren();const style=win.document.createElement('style');style.textContent=css;win.document.head.append(style);const node=win.document.createElement('div');node.id='teacher-root';win.document.body.append(node);setPopup(win);setRoot(node);poll();
 }
 useEffect(()=>setOptional(false),[state.key])
 const text=notes[state.key]??seedNotes[state.key]??(seed?seed:'')
 const beginEdit=()=>{setDraft(text);setEditKey(state.key);setEditing(true);dirty.current=false}
 const save=async()=>{if(!loaded||saving)return;setSaving(true);try{const next={...notes,[editKey]:draft};const r=await cebApi<{revision:number}>(path,{token,method:'PUT',body:{notes:next,revision}});setNotes(next);setRevision(r.revision);setStatus('Anotações salvas na CEB.');dirty.current=false;setEditing(false)}catch(e){setStatus(e instanceof Error?e.message:'Falha ao salvar. Seu texto continua no editor.')}finally{setSaving(false)}}
 const navigate=(index:number)=>{
  if(editing&&dirty.current){setStatus('Salve ou cancele a edição antes de mudar de parte.');return}
  setEditing(false);
  if(state.sync==='manual'){setState(s=>({...s,index:Math.max(0,index),total:Math.max(s.total,index+1),key:'manual:'+Math.max(0,index),title:'Página / tópico '+(Math.max(0,index)+1)}));return}
  frame.current?.contentWindow?.postMessage({type:'ceb-teacher-go',channel,index},'*');
 }
 useEffect(()=>{if(!popup)return;const onKey=(event:KeyboardEvent)=>{if((event.target as HTMLElement)?.closest('textarea,input,select,button'))return;if(event.key==='ArrowRight'||event.key==='PageDown'){event.preventDefault();navigate(state.index+1)}if(event.key==='ArrowLeft'||event.key==='PageUp'){event.preventDefault();navigate(state.index-1)}};popup.addEventListener('keydown',onKey);return()=>popup.removeEventListener('keydown',onKey)},[popup,state.index,state.sync,editing])
 return <><button type="button" onClick={open}>👨‍🏫 Abrir Modo Professor</button>{status&&!root&&<p role="status">{status}</p>}{root&&createPortal(<div className="tm-shell"><header><h1>{title}</h1><h2>{state.index+1} / {state.total} — {state.title}</h2><small>Conteúdo reservado ao professor · mova esta janela para o notebook.</small></header><div><nav><button disabled={state.index===0} onClick={()=>navigate(state.index-1)}>← Voltar</button><button disabled={state.sync!=='manual'&&state.index>=state.total-1} onClick={()=>navigate(state.index+1)}>Avançar →</button><span>{state.sync==='manual'?'Acompanhamento manual: mude a página no original e o tópico aqui.':'Sincronização ativa: '+(state.sync==='slides'?'slides':'seções')}</span><button disabled={editing} onClick={beginEdit}>Editar anotações</button></nav></div><main className={"tm-main"+(optional?" tm-expanded":"")}>{editing?<div className="tm-edit"><textarea aria-label="Anotações particulares" value={draft} onChange={e=>{setDraft(e.target.value);dirty.current=true}}/><div className="tm-actions"><button disabled={!loaded||saving} onClick={()=>void save()}>{saving?'Salvando…':'Salvar anotações'}</button><button onClick={()=>{if(dirty.current&&!popup?.confirm('Descartar as alterações não salvas?'))return;dirty.current=false;setEditing(false)}}>Cancelar</button><button onClick={()=>{if(draft.trim()&&!popup?.confirm('Acrescentar um roteiro ao final das anotações?'))return;setDraft(draft+'\n\nContexto bíblico e histórico:\n\nExplicação:\n\nPergunta à turma:\nResposta sugerida e contrapergunta:\n\nExemplo e aplicação prática:\n\nTransição / conclusão:\n');dirty.current=true}}>Acrescentar roteiro</button></div></div>:<PagedText text={text} label="Explicações do professor"/>}<section className="tm-optional"><button className="tm-toggle" aria-expanded={optional} onClick={()=>setOptional(v=>!v)}>Consultar conteúdo do slide (opcional)</button>{optional&&<PagedText text={state.text||fallbackText||'Este visualizador não disponibiliza o texto da página. Consulte o arquivo original.'} label="Conteúdo público"/>}</section></main><SlideBibleReferences text={state.text}/><footer><div className="tm-status" role="status">{status||(!loaded?'Carregando anotações…':'Anotações vinculadas a este material e a esta parte.')} {editing?'A edição pode rolar; a leitura divide o texto em páginas sem cortes.':''}</div><small>Sem anotações? Abra o editor e prepare explicações, perguntas, respostas e aplicações. O roteiro é apenas um modelo, sem geração por IA.</small></footer></div>,root)}</>
}

export default function TeacherWorkspace({token,resource,title,study,mime,onClose}:{token:string;resource:TeacherResource;title:string;study?:PresentationStudy;mime?:string;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),frame=useRef<HTMLIFrameElement>(null)
 const channel=useMemo(()=>crypto.randomUUID(),[])
 const [html,setHtml]=useState(''),[url,setUrl]=useState(''),[error,setError]=useState(''),[reviewed,setReviewed]=useState(study?.contentVersion===1||study?.studentReviewed===true)
 const [rawHtml,setRawHtml]=useState('')
 const isHtml=!!study||mime==='text/html'
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[])
 useEffect(()=>{
  if(study){if(reviewed)setHtml(withTeacherBridge(savedPresentationHtml({...study,studentReviewed:true},'completa'),channel,'completa'));else setHtml('');return}
  let active=true,objectUrl='';(resource.fileId?originalFile(token,resource.id,resource.fileId,'view'):downloadCloudMaterial(token,resource.id)).then(async blob=>{if(!active)return;objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);if(mime==='text/html'){const text=await blob.text();if(active)setRawHtml(text)}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl)}
 },[token,resource.id,resource.fileId,mime,channel,reviewed,study])
 useEffect(()=>{if(rawHtml&&reviewed)setHtml(withTeacherBridge(rawHtml,channel))},[rawHtml,reviewed,channel])
 return <dialog ref={dialog} className="library-presentation-dialog" aria-label="Apresentar com Modo Professor" onCancel={e=>{e.preventDefault();onClose()}}><div className="library-presentation-heading"><strong>{title}</strong><button onClick={onClose}>Fechar ×</button></div><div className="library-presentation-tools"><TeacherControls token={token} resource={resource} title={title} frame={frame} channel={channel} seed={study?.teacherNotes||''} seedNotes={embeddedTeacherNotes(rawHtml)}/><button onClick={()=>void frame.current?.requestFullscreen()}>Tela cheia / Datashow</button></div>{isHtml&&!reviewed&&<label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> Revisei o original: contém somente conteúdo destinado aos alunos. Arquivos mistos devem ser projetados apenas após revisão.</label>}{error&&<p role="alert">{error}</p>}{!isHtml&&<p>PDF: visualização original preservada; acompanhe manualmente as páginas no professor. Word, PowerPoint e outros formatos: abra o original no aplicativo apropriado e acompanhe os tópicos manualmente. A CEB não altera nem converte o arquivo.</p>}{isHtml?<iframe ref={frame} title="Material público original" sandbox="allow-scripts allow-popups allow-modals" allow="fullscreen" srcDoc={html}/>:mime==='application/pdf'?<iframe ref={frame} title="PDF original" src={url}/>:url&&<p><a href={url} download={title}>Baixar e abrir original</a></p>}<p>Fechar apenas a janela do professor mantém o material aberto. Use Windows → Estender e mova a visualização em tela cheia para o datashow.</p></dialog>
}

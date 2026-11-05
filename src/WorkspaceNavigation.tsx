import {useEffect,useRef,useState} from 'react'
export type NavigationItem = {id:string;label:string;icon:string}
export default function WorkspaceNavigation({items,active,onNavigate}:{items:NavigationItem[];active:string;onNavigate:(id:string)=>void}) {
 const [collapsed,setCollapsed]=useState(()=>{try{return localStorage.getItem('ceb-sidebar-collapsed')==='true'}catch{return false}})
 const [open,setOpen]=useState(false)
 const drawer=useRef<HTMLElement>(null),trigger=useRef<HTMLButtonElement>(null)
 useEffect(()=>{try{localStorage.setItem('ceb-sidebar-collapsed',String(collapsed))}catch{}},[collapsed])
 useEffect(()=>{
  document.documentElement.classList.toggle('ceb-menu-collapsed',collapsed)
  return()=>document.documentElement.classList.remove('ceb-menu-collapsed')
 },[collapsed])
 useEffect(()=>{const resize=()=>{if(window.innerWidth>1024)setOpen(false)};window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize)},[])
 useEffect(()=>{
  if(!open)return
  const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';drawer.current?.querySelector<HTMLButtonElement>('.sidebar-close')?.focus()
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){setOpen(false);trigger.current?.focus()}
   if(event.key==='Tab'){
    const buttons=Array.from(drawer.current?.querySelectorAll<HTMLButtonElement>('button')||[]).filter(e=>e.getClientRects().length)
    if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1)?.focus()}
    else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0]?.focus()}
   }
  }
  document.addEventListener('keydown',key);return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',key)}
 },[open])
 function close(){setOpen(false);trigger.current?.focus()}
 return <>
  <button ref={trigger} className="sidebar-mobile-trigger" aria-label="Abrir menu" aria-controls="ceb-workspace-menu" aria-expanded={open} onClick={()=>setOpen(true)}><span aria-hidden="true">☰</span> Menu</button>
  {open&&<div className="sidebar-backdrop" onClick={close} aria-hidden="true"/>}
  <aside ref={drawer} className={`workspace-sidebar${open?' is-open':''}`} aria-label="Menu da CEB" {...(open?{role:'dialog','aria-modal':true as const}:{})}>
   <div className="sidebar-heading"><img src="/central-estudos-biblicos-v2/icon-192.png" alt="Igreja Batista Nova Esperança"/><div><strong>CEB</strong><small>Espaço de ensino</small></div><button className="sidebar-close" aria-label="Fechar menu" onClick={close}>×</button></div>
   <span className="sidebar-caption">ÁREA DO PROFESSOR</span>
   <nav id="ceb-workspace-menu" aria-label="Navegação principal">{items.map(item=><button key={item.id} title={item.label} aria-label={item.id==='administracao'?'⚙️ '+item.label:item.label} aria-current={active===item.id?'page':undefined} onClick={()=>{onNavigate(item.id);if(open)close()}}><span className="sidebar-icon" aria-hidden="true">{item.icon}</span><span className="sidebar-label">{item.label}</span>{active===item.id&&<span className="sidebar-active-dot" aria-hidden="true"/>}</button>)}</nav>
   <div className="sidebar-bottom"><p><strong>Palavra · Ensino · Prática</strong><small>Igreja Batista Nova Esperança</small></p><button className="sidebar-collapse" onClick={()=>setCollapsed(c=>!c)} aria-label={collapsed?'Expandir menu':'Recolher menu'} aria-expanded={!collapsed}><span aria-hidden="true">{collapsed?'›':'‹'}</span><span className="sidebar-label">Recolher menu</span></button></div>
  </aside>
 </>
}

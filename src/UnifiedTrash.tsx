import { useEffect, useRef, useState } from 'react'
import { changeTrash,listTrash,trashKey,trashSelection,confirmTrashAction,type TrashItem } from './trashApi'
export default function UnifiedTrash({token,onChanged,onClose}:{token:string;onChanged:()=>Promise<void>;onClose:()=>void}) {
 const [items,setItems]=useState<TrashItem[]>([]),[selected,setSelected]=useState<Set<string>>(new Set()),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const lock=useRef(false)
 const refresh=async()=>{const r=await listTrash(token);setItems(r.items);setSelected(current=>new Set([...current].filter(k=>r.items.some(i=>trashKey(i)===k))))}
 useEffect(()=>{let active=true;listTrash(token).then(r=>{if(active)setItems(r.items)}).catch(()=>{if(active)setMessage('Não foi possível consultar a Lixeira.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[token])
 const all=items.length>0&&items.every(i=>selected.has(trashKey(i)))
 const act=async(action:'restore'|'purge',every=false)=>{
  if(lock.current)return
  const snapshot=trashSelection(items,selected,every)
  if(!snapshot.length)return
  if(!confirmTrashAction(action,snapshot.length,every,message=>window.confirm(message)))return
  lock.current=true;setBusy(true);setMessage('')
  try{
   const results=await changeTrash(token,action,snapshot,action==='purge'),failed=results.filter(r=>!r.ok)
   setSelected(new Set(failed.map(trashKey)))
   setMessage(`${results.length-failed.length} de ${snapshot.length} material(is) ${action==='purge'?'excluído(s) definitivamente':'restaurado(s)'}.`+(failed.length?' '+failed.map(r=>r.error).filter((v,i,a)=>a.indexOf(v)===i).join(' '):''))
  }catch{setMessage('A comunicação foi interrompida. A operação pode ter concluído parte da seleção; atualize a Lixeira antes de tentar novamente.')}
  finally{try{await refresh();await onChanged()}catch{setMessage(m=>m+' Não foi possível atualizar a listagem; reabra a Lixeira.')}lock.current=false;setBusy(false)}
 }
 return <section className="detail-panel" aria-label="Lixeira unificada">
 <h3>Lixeira</h3><p>Excluir na Biblioteca apenas move para cá. Restaurar mantém pastas, permissões e vínculos. A remoção definitiva preserva os históricos protegidos; documentos importados têm seu original apagado.</p>
 <div className="import-actions"><button type="button" disabled={busy} onClick={onClose}>Fechar Lixeira</button><button type="button" disabled={busy||loading} onClick={()=>{setLoading(true);void refresh().catch(()=>setMessage('Não foi possível atualizar a Lixeira.')).finally(()=>setLoading(false))}}>Atualizar Lixeira</button></div>
 {loading?<p>Consultando Lixeira…</p>:<>
 <label><input type="checkbox" checked={all} disabled={busy||!items.length} onChange={e=>setSelected(e.target.checked?new Set(items.map(trashKey)):new Set())}/> Selecionar todos os materiais da Lixeira ({items.length})</label>
 <div>{items.map(item=><div key={trashKey(item)} className="library-item"><label><input type="checkbox" aria-label={'Selecionar '+item.title} checked={selected.has(trashKey(item))} disabled={busy} onChange={e=>setSelected(current=>{const next=new Set(current);if(e.target.checked)next.add(trashKey(item));else next.delete(trashKey(item));return next})}/> <strong>{item.title}</strong> · {item.category}{item.filename?' · '+item.filename:''}</label>{item.parentTrashed&&<small> Lição vinculada também está na Lixeira. Restaure a lição antes ou junto com o questionário.</small>}{item.pending&&<small role="status"> Exclusão do original pendente. A restauração está bloqueada; selecione para concluir a exclusão definitiva.</small>}</div>)}</div>
 {!items.length&&<p>Lixeira vazia.</p>}
 <p>{selected.size} material(is) selecionado(s).</p>
 <div className="import-actions"><button type="button" disabled={busy||!selected.size} onClick={()=>void act('restore')}>Restaurar selecionados</button><button type="button" className="danger-button" disabled={busy||!selected.size} onClick={()=>void act('purge')}>Excluir definitivamente selecionados</button><button type="button" disabled={busy||!items.length} onClick={()=>void act('restore',true)}>Restaurar todos</button><button type="button" className="danger-button" disabled={busy||!items.length} onClick={()=>void act('purge',true)}>Limpar Lixeira</button></div>
 </>}{busy&&<p role="status">Processando somente a seleção confirmada…</p>}{message&&<p role="status">{message}</p>}
 </section>
}

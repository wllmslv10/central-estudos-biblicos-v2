import { cebApi } from './cebApi'
export type TrashItem = { type:'study'|'material'|'quiz'; id:string; title:string; category:string; filename?:string; pending?:boolean; parentId?:string; parentTrashed?:boolean }
export type TrashResult = { type:TrashItem['type'];id:string;ok:boolean;error?:string }
export const trashKey=(item:Pick<TrashItem,'type'|'id'>)=>item.type+':'+item.id
export const listTrash=(token:string)=>cebApi<{items:TrashItem[]}>('/library/trash',{token})
export async function changeTrash(token:string,action:'trash'|'restore'|'purge',items:Pick<TrashItem,'type'|'id'>[],confirmed=false) {
 // A frozen explicit selection, never a server-side unbounded "delete all".
 const unique=[...new Map(items.map(i=>[trashKey(i),{type:i.type,id:i.id}])).values()]
 const rank=action==='purge'?{quiz:0,material:1,study:2}:{study:0,quiz:1,material:2}
 unique.sort((a,b)=>rank[a.type]-rank[b.type]||a.id.localeCompare(b.id))
 const results:TrashResult[]=[]
 for(let offset=0;offset<unique.length;offset+=25){const batch=unique.slice(offset,offset+25)
  const response=await cebApi<{results:TrashResult[]}>('/library/trash',{token,method:'POST',body:{action,items:batch,...(action==='purge'?{confirmed,confirmCount:batch.length}:{})}})
  results.push(...response.results)
 }
 return results
}

export function trashSelection(items:TrashItem[],selected:Set<string>,every=false) {
 return items.filter(item=>every||selected.has(trashKey(item))).map(item=>({...item}))
}
export function confirmTrashAction(action:'restore'|'purge',count:number,every:boolean,confirm:(message:string)=>boolean) {
 if(!count)return false
 if(action==='purge')return confirm(`Excluir definitivamente ${count} material(is) da Biblioteca e da Lixeira? Os arquivos originais importados serão apagados. Os históricos de questionários serão preservados. Esta ação não pode ser desfeita pela Biblioteca.`)
 if(every)return confirm(`Restaurar todos os ${count} material(is) da Lixeira?`)
 return true
}

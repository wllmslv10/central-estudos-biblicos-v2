import { useEffect, useState } from 'react'
import { cebApi, type CloudStudy } from './cebApi'

type Student = { id: string; display_name: string; username: string; app_role: string; is_active: boolean; password_admin_managed?: boolean }
type Access = { read: boolean; download: boolean; quiz: boolean }
type Sharing = { enabled?: boolean; audience?: string; userIds?: string[]; allowDownload?: boolean; quizEnabled?: boolean; downloadUserIds?: string[]; quizUserIds?: string[] }

export default function IBNESharing({token, study, onSaved, onQuiz}: {
  token: string; study: CloudStudy; onSaved: () => void; onQuiz: () => void
}) {
  const [students,setStudents] = useState<Student[]>([])
  const [access,setAccess] = useState<Record<string,Access>>({})
  const [reviewed,setReviewed] = useState(false)
  const [loading,setLoading] = useState(true)
  const [saving,setSaving] = useState(false)
  const [message,setMessage] = useState('')
  const ready = study.quiz_summary?.reviewed === true
  useEffect(() => {
    let active = true
    cebApi<{users:Student[]}>('/admin/users',{token}).then(({users}) => {
      if (!active) return
      const enrolled = users.filter(u => u.is_active && (u.app_role === 'user' || u.password_admin_managed))
      const sharing = study.content.sharing as Sharing | undefined
      setStudents(enrolled)
      setAccess(Object.fromEntries(enrolled.map(student => {
        const read = !!sharing?.enabled && (sharing.audience === 'all' || !!sharing.userIds?.includes(student.id))
        return [student.id,{read,download:read && (sharing?.downloadUserIds?.includes(student.id) ?? !!sharing?.allowDownload),quiz:read && (sharing?.quizUserIds?.includes(student.id) ?? !!sharing?.quizEnabled)}]
      })))
      setLoading(false)
    }).catch(() => {if(active) setMessage('Não foi possível carregar as matrículas. Feche e reabra o painel.')})
    return () => {active=false}
  },[token,study])
  const update = (id:string,key:keyof Access,value:boolean) => {
    setAccess(current=>({...current,[id]:key==='read'&&!value?{read:false,download:false,quiz:false}:{...current[id],[key]:value}}))
  }
  const save = async () => {
    setSaving(true);setMessage('')
    const userIds = students.filter(s=>access[s.id]?.read).map(s=>s.id)
    const downloadUserIds = userIds.filter(id=>access[id].download)
    const quizUserIds = ready ? userIds.filter(id=>access[id].quiz) : []
    try {
      await cebApi(`/studies/${study.id}/sharing`,{token,method:'PUT',body:{
        enabled:userIds.length>0,studentReviewed:reviewed,audience:'selected',userIds,
        allowDownload:false,quizEnabled:false,downloadUserIds,quizUserIds,
      }})
      setMessage('Permissões salvas.')
      onSaved()
    }catch(e){setMessage(e instanceof Error?e.message:'Falha ao salvar as permissões.')}
    finally{setSaving(false)}
  }
  return <div className="ibne-permissions">
    <h4>Permissões por aluno</h4>
    <p>A leitura é liberada por aluno. Download e questionário são opcionais.</p>
    <button type="button" onClick={onQuiz}>{ready?'Revisar questionário':'Preparar ou revisar questionário'}</button>
    {!ready && <p>Revise o questionário para habilitar a coluna Responder.</p>}
    {loading && !message ? <p>Carregando matrículas…</p> : null}
    {!loading && !students.length && <p>Nenhum aluno ativo disponível.</p>}
    {!loading && !!students.length && <div className="ibne-permissions-table"><table><thead><tr><th scope="col">Aluno</th><th scope="col">Ler</th><th scope="col">Baixar</th><th scope="col">Responder</th></tr></thead><tbody>
      {students.map(s=>{const name=s.display_name||s.username;const item=access[s.id];return <tr key={s.id}><th scope="row">{name}</th>{(['read','download','quiz'] as const).map((key,i)=><td key={key}><input type="checkbox" aria-label={['Ler','Baixar','Responder'][i]+' · '+name} checked={item[key]} disabled={saving||(key!=='read'&&!item.read)||(key==='quiz'&&!ready)} onChange={e=>update(s.id,key,e.target.checked)}/></td>)}</tr>})}
    </tbody></table></div>}
    {!loading && <><label><input type="checkbox" checked={reviewed} disabled={saving} onChange={e=>setReviewed(e.target.checked)}/> Conferi a leitura destinada aos alunos.</label><button type="button" className="primary-button" disabled={saving||(!reviewed&&Object.values(access).some(a=>a.read))} onClick={()=>void save()}>Salvar permissões</button></>}
    <p role="status">{message}</p>
  </div>
}

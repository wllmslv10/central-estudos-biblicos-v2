import ConsumptionPanel from './ConsumptionPanel'
import StudentManagement from './StudentManagement'
import { useEffect, useState, type FormEvent } from 'react'
import { cebApi } from './cebApi'

type ManagedUser = { id: string; username: string; display_name: string; app_role: 'admin' | 'user'; is_active: boolean; must_change_password: boolean; password_admin_managed?: boolean; is_primary_admin?: boolean }

export default function CebAdmin({ token, ownId, onBack }: { token: string; ownId: string; onBack: () => void }) {
  const [openPanel, setOpenPanel] = useState<'create' | 'users' | 'edit' | 'students' | null>(null)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [resetPassword, setResetPassword] = useState('')

  function inviteAdmin(user: ManagedUser) {
    const input = window.prompt('Telefone do administrador com DDD (ex.: 31 99999-9999):')
    if (input === null) return
    const raw = input.replace(/\D/g, '')
    const local = raw.startsWith('55') && raw.length > 11 ? raw.slice(2) : raw
    if (!/^\d{10,11}$/.test(local)) { setError('Informe um telefone válido com DDD.'); return }
    const message = [
      'Olá, ' + user.display_name + '! Seu acesso à Central de Estudos Bíblicos da Igreja Batista Nova Esperança está disponível.',
      'Acesse: https://ceb.ibne.workers.dev/',
      'Usuário: ' + user.username,
      'Android: abra no Chrome e escolha Instalar aplicativo ou Adicionar à tela inicial.',
      'iPhone: abra no Safari e escolha Compartilhar > Adicionar à Tela de Início.',
      'Computador: abra no Chrome ou Edge e escolha Instalar aplicativo.',
      'A senha será informada separadamente por segurança.'
    ].join(String.fromCharCode(10))
    window.open('https://wa.me/55' + local + '?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer')
    setError('')
  }
  async function refresh() {
    try {
      const result = await cebApi<{ users: ManagedUser[] }>('/admin/users', { token })
      setUsers(result.users)
      setError('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível consultar usuários.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [token])

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!/^[a-z0-9]{6}$/.test(password)) { setError('A senha deve ter exatamente 6 letras minúsculas ou números.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      await cebApi('/admin/users', { method: 'POST', token, body: { username: username.trim(), display_name: name.trim(), temporary_password: password, role: 'admin' } })
      setName(''); setUsername(''); setPassword('')
      setNotice('Usuário cadastrado com sucesso! A senha temporária deverá ser trocada no primeiro acesso.')
      await refresh()
      setOpenPanel(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível criar a conta.') }
    finally { setBusy(false) }
  }
  function beginEdit(user: ManagedUser) {
    if(user.password_admin_managed){setOpenPanel('students');return}
    setOpenPanel('edit'); setEditing(user); setEditName(user.display_name); setEditUsername(user.username); setResetPassword(''); setError(''); setNotice('')
  }
  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    setBusy(true); setError(''); setNotice('')
    try {
      await cebApi(`/admin/users/${encodeURIComponent(editing.id)}`, { method: 'PATCH', token, body: { display_name: editName.trim(), username: editUsername.trim() } })
      setEditing(null)
      setOpenPanel(null)
      await refresh()
      setNotice('Usuário atualizado com sucesso!')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível editar o usuário.') }
    finally { setBusy(false) }
  }
  async function savePassword() {
    if (!editing || !/^[a-z0-9]{6}$/.test(resetPassword)) { setError('A senha temporária deve ter exatamente 6 letras minúsculas ou números.'); return }
    if (!window.confirm('Redefinir a senha de ' + editing.display_name + '? O usuário precisará trocar a senha no próximo acesso e as sessões atuais serão encerradas.')) return
    setBusy(true); setError(''); setNotice('')
    try {
      await cebApi('/admin/users/' + encodeURIComponent(editing.id) + '/reset-password', { method: 'POST', token, body: { temporary_password: resetPassword } })
      setResetPassword('')
      setEditing(null)
      setOpenPanel(null)
      await refresh()
      setNotice('Senha temporária redefinida. O usuário deverá trocá-la no próximo acesso.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível redefinir a senha.') }
    finally { setBusy(false) }
  }
  async function toggle(user: ManagedUser) {
    if (user.id === ownId || !window.confirm(`Deseja ${user.is_active ? 'desativar' : 'ativar'} a conta de ${user.display_name}?`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      await cebApi(`/admin/users/${encodeURIComponent(user.id)}`, { method: 'PATCH', token, body: { is_active: !user.is_active } })
      setNotice(`Conta ${user.is_active ? 'desativada' : 'ativada'} com sucesso!`)
      await refresh()
      setOpenPanel(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível atualizar a conta.') }
    finally { setBusy(false) }
  }
  async function removeUser(user: ManagedUser) {
    if (user.id === ownId) return
    if(user.password_admin_managed){setOpenPanel('students');return}
    if (!window.confirm(`Excluir definitivamente a conta de ${user.display_name} (${user.username})? Esta ação não pode ser desfeita. Contas com estudos vinculados não poderão ser excluídas.`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      await cebApi(`/admin/users/${encodeURIComponent(user.id)}`, { method: 'DELETE', token })
      setNotice('Usuário excluído com sucesso!')
      await refresh()
      setOpenPanel(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível excluir a conta.') }
    finally { setBusy(false) }
  }
  return <section className="ceb-admin-page">
    <button type="button" onClick={onBack} style={{marginBottom:16}}>← Voltar à página principal</button>
    <h1>⚙️ Administração do Sistema</h1>
    <p>Gerencie usuários e permissões de acesso à Central de Estudos Bíblicos.</p>
    <button type="button" aria-expanded={openPanel==='students'} onClick={()=>setOpenPanel(current=>current==='students'?null:'students')}>👥 Gestão de Alunos</button>
    <p style={{margin:'8px 0 16px',color:'#42566e',lineHeight:1.6}}>Cadastre e matricule alunos, consulte e atualize seus dados, gerencie o acesso à CEB e envie convites com orientações de instalação pelo WhatsApp.</p>
    {openPanel==='students' && <StudentManagement token={token} ownId={ownId} onChanged={() => void refresh()} /> }
    {error && <p role="alert" className="ceb-auth-error">{error}</p>}
    {notice && <p role="status" className="ceb-auth-success">{notice}</p>}
    <details className="ceb-admin-panel" open={openPanel === 'create'}>
      <summary onClick={e => { e.preventDefault(); setOpenPanel(current => current === 'create' ? null : 'create') }}><strong>Cadastrar administrador</strong></summary>
      <form onSubmit={create} className="ceb-auth-form">
        <label>Nome de exibição<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Nome de usuário<input required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" value={username} onChange={e => setUsername(e.target.value)} /></label>
        <label>Senha temporária<input required type="password" minLength={6} maxLength={6} pattern="[a-z0-9]{6}" title="Exatamente 6 letras minúsculas ou números" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Criar usuário'}</button>
      </form>
    </details>
    {editing && <details className="ceb-admin-panel" open={openPanel === 'edit'}>
      <summary onClick={e => { e.preventDefault(); setOpenPanel(current => current === 'edit' ? null : 'edit') }}><strong>Editar usuário</strong></summary>
      <form onSubmit={saveEdit} className="ceb-auth-form">
        <label>Nome de exibição<input required maxLength={120} value={editName} onChange={e => setEditName(e.target.value)} /></label>
        <label>Nome de usuário<input required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" value={editUsername} onChange={e => setEditUsername(e.target.value)} /></label>
        <p><small>A senha atual não será modificada ao salvar os dados acima.</small></p>
        {editing.id !== ownId && <div className="ceb-admin-panel">
          <h3>🔑 Redefinir senha</h3>
          <p>Defina uma senha temporária. O usuário deverá trocá-la no próximo acesso.</p>
          <label>Nova senha temporária<input type="password" autoComplete="new-password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} minLength={6} maxLength={6} pattern="[a-z0-9]{6}" placeholder="6 letras minúsculas ou números" /></label>
          <button type="button" disabled={busy || !/^[a-z0-9]{6}$/.test(resetPassword)} onClick={() => void savePassword()}>Redefinir senha</button>
        </div>}
        {editing.id === ownId && <p><small>Para sua própria conta, use a troca de senha pessoal.</small></p>}
        <div className="ceb-admin-actions"><button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar alterações'}</button><button type="button" disabled={busy} onClick={() => { setEditing(null); setOpenPanel(null) }}>Cancelar</button></div>
      </form>
    </details>}
    <details className="ceb-admin-panel" open={openPanel === 'users'}>
      <summary onClick={e => { e.preventDefault(); setOpenPanel(current => current === 'users' ? null : 'users') }}><strong>Administradores cadastrados</strong></summary>
      {loading ? <p>Carregando usuários…</p> : <div className="ceb-admin-users">{users.filter(user => user.app_role === 'admin' && !user.password_admin_managed).map(user => <div className="ceb-admin-user" key={user.id}>
        <div><strong>{user.display_name}</strong> <small>({user.username})</small><p>Administrador · {user.is_active ? 'Ativo' : 'Inativo'}{user.must_change_password ? ' · Troca de senha pendente' : ''}</p></div>
        <div className="ceb-admin-actions"><button type="button" disabled={busy || (!!user.is_primary_admin && user.id !== ownId)} onClick={() => beginEdit(user)}>Editar</button><button type="button" disabled={busy || !user.is_active} onClick={() => inviteAdmin(user)}>Enviar acesso pelo WhatsApp</button><button type="button" disabled={busy || user.id === ownId || user.is_primary_admin} onClick={() => void toggle(user)}>{user.id === ownId ? 'Sua conta' : user.is_active ? 'Desativar' : 'Ativar'}</button>{user.id !== ownId && !user.is_primary_admin && <button type="button" disabled={busy} onClick={() => void removeUser(user)}>Excluir usuário</button>}</div>
      </div>)}</div>}
    </details>
    <ConsumptionPanel token={token} />
    <p><small>Por segurança, senhas existentes não são exibidas. A redefinição de senha exige confirmação e encerra as sessões do usuário afetado.</small></p>
  </section>
}

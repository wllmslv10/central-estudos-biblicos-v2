import { useEffect, useState, type FormEvent } from 'react'
import { cebApi } from './cebApi'

type ManagedUser = { id: string; username: string; display_name: string; app_role: 'admin' | 'user'; is_active: boolean; must_change_password: boolean }

export default function CebAdmin({ token, ownId }: { token: string; ownId: string }) {
  const [openPanel, setOpenPanel] = useState<'create' | 'users' | 'edit' | null>(null)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user')
  const [resetPassword, setResetPassword] = useState('')

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
      await cebApi('/admin/users', { method: 'POST', token, body: { username: username.trim(), display_name: name.trim(), temporary_password: password, role } })
      setName(''); setUsername(''); setPassword(''); setRole('user')
      setNotice('Usuário cadastrado com sucesso! A senha temporária deverá ser trocada no primeiro acesso.')
      await refresh()
      setOpenPanel(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível criar a conta.') }
    finally { setBusy(false) }
  }
  function beginEdit(user: ManagedUser) {
    setOpenPanel('edit'); setEditing(user); setEditName(user.display_name); setEditUsername(user.username); setEditRole(user.app_role); setResetPassword(''); setError(''); setNotice('')
  }
  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    setBusy(true); setError(''); setNotice('')
    try {
      await cebApi(`/admin/users/${encodeURIComponent(editing.id)}`, { method: 'PATCH', token, body: { display_name: editName.trim(), username: editUsername.trim(), role: editRole } })
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
    if (!window.confirm(`Excluir definitivamente a conta de ${user.display_name} (${user.username})? Esta ação não pode ser desfeita. Contas com estudos vinculados não poderão ser excluídas.`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      await cebApi(`/admin/users/${encodeURIComponent(user.id)}`, { method: 'DELETE', token })
      setNotice('Usuário excluído com sucesso!')
      await refresh()
      if (usersPanel.current) usersPanel.current.open = false
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível excluir a conta.') }
    finally { setBusy(false) }
  }
  return <main className="ceb-admin-page">
    <h1>⚙️ Administração do Sistema</h1>
    <p>Gerencie usuários e permissões de acesso à Central de Estudos Bíblicos.</p>
    {error && <p role="alert" className="ceb-auth-error">{error}</p>}
    {notice && <p role="status" className="ceb-auth-success">{notice}</p>}
    <details className="ceb-admin-panel" open={openPanel === 'create'} onToggle={e => { if (e.currentTarget.open && openPanel !== 'create') setOpenPanel('create') }}>
      <summary><strong>Cadastrar usuário</strong></summary>
      <form onSubmit={create} className="ceb-auth-form">
        <label>Nome de exibição<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Nome de usuário<input required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" value={username} onChange={e => setUsername(e.target.value)} /></label>
        <label>Senha temporária<input required type="password" minLength={6} maxLength={6} pattern="[a-z0-9]{6}" title="Exatamente 6 letras minúsculas ou números" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label>Permissão<select value={role} onChange={e => setRole(e.target.value as 'user' | 'admin')}><option value="user">Usuário comum</option><option value="admin">Administrador</option></select></label>
        <button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Criar usuário'}</button>
      </form>
    </details>
    {editing && <details className="ceb-admin-panel" open={openPanel === 'edit'} onToggle={e => { if (e.currentTarget.open && openPanel !== 'edit') setOpenPanel('edit') }}>
      <summary><strong>Editar usuário</strong></summary>
      <form onSubmit={saveEdit} className="ceb-auth-form">
        <label>Nome de exibição<input required maxLength={120} value={editName} onChange={e => setEditName(e.target.value)} /></label>
        <label>Nome de usuário<input required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" value={editUsername} onChange={e => setEditUsername(e.target.value)} /></label>
        <label>Permissão<select value={editRole} disabled={editing.id === ownId} onChange={e => setEditRole(e.target.value as 'user' | 'admin')}><option value="user">Usuário comum</option><option value="admin">Administrador</option></select></label>
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
    <details className="ceb-admin-panel" open={openPanel === 'users'} onToggle={e => { if (e.currentTarget.open && openPanel !== 'users') setOpenPanel('users') }}>
      <summary><strong>Usuários cadastrados</strong></summary>
      {loading ? <p>Carregando usuários…</p> : <div className="ceb-admin-users">{users.map(user => <div className="ceb-admin-user" key={user.id}>
        <div><strong>{user.display_name}</strong> <small>({user.username})</small><p>{user.app_role === 'admin' ? 'Administrador' : 'Usuário comum'} · {user.is_active ? 'Ativo' : 'Inativo'}{user.must_change_password ? ' · Troca de senha pendente' : ''}</p></div>
        <div className="ceb-admin-actions"><button type="button" disabled={busy} onClick={() => beginEdit(user)}>Editar</button><button type="button" disabled={busy || user.id === ownId} onClick={() => void toggle(user)}>{user.id === ownId ? 'Sua conta' : user.is_active ? 'Desativar' : 'Ativar'}</button>{user.id !== ownId && <button type="button" disabled={busy} onClick={() => void removeUser(user)}>Excluir usuário</button>}</div>
      </div>)}</div>}
    </details>
    <p><small>Por segurança, senhas existentes não são exibidas. A redefinição de senha exige confirmação e encerra as sessões do usuário afetado.</small></p>
  </main>
}

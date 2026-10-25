import { useEffect, useState, type FormEvent } from 'react'
import { cebApi } from './cebApi'

type ManagedUser = { id: string; username: string; display_name: string; app_role: 'admin' | 'user'; is_active: boolean; must_change_password: boolean }

export default function CebAdmin({ token, ownId }: { token: string; ownId: string }) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')

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
    if (password.length < 12) { setError('A senha temporária precisa ter pelo menos 12 caracteres.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      await cebApi('/admin/users', { method: 'POST', token, body: { username: username.trim(), display_name: name.trim(), temporary_password: password, role } })
      setName(''); setUsername(''); setPassword(''); setRole('user')
      setNotice('Conta criada. A pessoa deverá trocar a senha temporária no primeiro acesso.')
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível criar a conta.') }
    finally { setBusy(false) }
  }
  async function toggle(user: ManagedUser) {
    if (user.id === ownId || !window.confirm(`Deseja ${user.is_active ? 'desativar' : 'ativar'} a conta de ${user.display_name}?`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      await cebApi(`/admin/users/${encodeURIComponent(user.id)}`, { method: 'PATCH', token, body: { is_active: !user.is_active } })
      setNotice(`Conta ${user.is_active ? 'desativada' : 'ativada'}.`)
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível atualizar a conta.') }
    finally { setBusy(false) }
  }
  return <main className="ceb-admin-page">
    <h1>⚙️ Administração do Sistema</h1>
    <p>Gerencie usuários e permissões de acesso à Central de Estudos Bíblicos.</p>
    {error && <p role="alert" className="ceb-auth-error">{error}</p>}
    {notice && <p role="status" className="ceb-auth-success">{notice}</p>}
    <section className="ceb-admin-panel">
      <h2>Cadastrar usuário</h2>
      <form onSubmit={create} className="ceb-auth-form">
        <label>Nome de exibição<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Nome de usuário<input required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" value={username} onChange={e => setUsername(e.target.value)} /></label>
        <label>Senha temporária<input required type="password" minLength={12} maxLength={200} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label>Permissão<select value={role} onChange={e => setRole(e.target.value as 'user' | 'admin')}><option value="user">Usuário comum</option><option value="admin">Administrador</option></select></label>
        <button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Criar usuário'}</button>
      </form>
    </section>
    <section className="ceb-admin-panel">
      <h2>Usuários cadastrados</h2>
      {loading ? <p>Carregando usuários…</p> : <div className="ceb-admin-users">{users.map(user => <div className="ceb-admin-user" key={user.id}>
        <div><strong>{user.display_name}</strong> <small>({user.username})</small><p>{user.app_role === 'admin' ? 'Administrador' : 'Usuário comum'} · {user.is_active ? 'Ativo' : 'Inativo'}{user.must_change_password ? ' · Troca de senha pendente' : ''}</p></div>
        <button type="button" disabled={busy || user.id === ownId} onClick={() => void toggle(user)}>{user.id === ownId ? 'Sua conta' : user.is_active ? 'Desativar' : 'Ativar'}</button>
      </div>)}</div>}
    </section>
    <p><small>Por segurança, senhas existentes não são exibidas. A redefinição administrativa de senhas e a alteração de permissões de contas existentes ainda não estão disponíveis nesta versão.</small></p>
  </main>
}

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { cebApi } from './cebApi'

type Sex = 'female' | 'male' | 'unspecified'
type Student = {
  id: string
  username: string
  display_name: string
  given_name: string | null
  surname: string | null
  date_of_birth: string | null
  phone: string | null
  sex: Sex | null
  is_active: boolean
  app_role: 'user' | 'admin'
  profile_revision: number
  is_primary_admin: boolean
}
const sexLabels: Record<Sex, string> = { female: 'Feminino', male: 'Masculino', unspecified: 'Prefiro não informar' }
const message = (e: unknown) => e instanceof Error ? e.message : 'Não foi possível concluir a operação.'
const birthPassword = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(8, 10) + date.slice(5, 7) + date.slice(2, 4) : ''
const emptyForm = { given: '', surname: '', username: '', birth: '', phone: '', sex: '' as Sex | '', active: true, administrator: false, password: '', reset: false }
const formatPhone = (value: string) => {
  const raw = value.replace(/\D/g, '')
  const digits = (raw.startsWith('55') && raw.length > 11 ? raw.slice(2) : raw).slice(0, 11)
  if (!digits) return ''
  const area = digits.slice(0, 2)
  const local = digits.slice(2)
  return '+55 ' + area + (local ? ' ' + (local.length > 4 ? local.slice(0, -4) + '-' + local.slice(-4) : local) : '')
}
const sendInvite = (student: Student) => {
  const name = student.display_name
  const phone = (student.phone ?? '').replace(/\D/g, '')
  const number = phone.startsWith('55') ? phone : '55' + phone
  const text = [
    'Olá, ' + name + '! Seja bem-vindo(a) à Central de Estudos Bíblicos (CEB) da Igreja Batista Nova Esperança.',
    '',
    'Acesse: https://ceb.ibne.workers.dev/',
    'Seu usuário: ' + student.username,
    '',
    'Para instalar no celular:',
    'Android: abra o link no Chrome e escolha no menu “Instalar aplicativo” ou “Adicionar à tela inicial”.',
    'iPhone: abra no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.',
    'No computador: abra no Chrome ou Edge e procure “Instalar aplicativo”.',
    '',
    'Sua senha deve ser informada separadamente, por um canal seguro.'
  ].join('\n')
  window.open('https://wa.me/' + (/^55\d{10,11}$/.test(number) ? number : '') + '?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer')
}
const sortStudents = (a: Student, b: Student) => a.display_name.localeCompare(b.display_name, 'pt-BR')

export default function StudentManagement({ token, ownId, onChanged }: { token: string; ownId: string; onChanged: () => void }) {
  const [students, setStudents] = useState<Student[]>([])
  const [editing, setEditing] = useState<Student | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<'form' | 'students' | null>('students')
  const formStart = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const lock = useRef(false)
  const passwordTouched = useRef(false)

  useEffect(() => {
    let mounted = true
    cebApi<{ students: Student[] }>('/admin/students', { token })
      .then(r => { if (mounted) setStudents(r.students) })
      .catch(e => { if (mounted) setError(message(e)) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [token])

  useEffect(() => {
    if (activePanel === 'form' && editing) formStart.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [activePanel, editing])

  function update(patch: Partial<typeof emptyForm>) {
    setForm(current => ({ ...current, ...patch }))
  }
  function closeForm() {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(false)
    passwordTouched.current = false
    setActivePanel('students')
  }
  function openForm(student: Student | null) {
    setError('')
    setNotice('')
    setEditing(student)
    passwordTouched.current = false
    setForm(student ? {
      ...emptyForm,
      given: student.given_name ?? student.display_name,
      surname: student.surname ?? '',
      username: student.username,
      birth: student.date_of_birth?.slice(0, 10) ?? '',
      phone: formatPhone(student.phone ?? ''),
      sex: student.sex ?? '',
      active: student.is_active,
      administrator: student.app_role === 'admin',
    } : emptyForm)
    setFormOpen(true)
    setActivePanel('form')

  }
  function finish(student: Student | null, id: string, confirmation: string) {
    setStudents(current => [...current.filter(item => item.id !== id), ...(student ? [student] : [])].sort(sortStudents))
    setNotice(confirmation)
    closeForm()
    onChanged()
  }
  async function perform(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try { await action() }
    catch (e) { setError(message(e)) }
    finally { lock.current = false; setBusy(false) }
  }
  const promoting = !!editing && editing.app_role === 'user' && form.administrator
  const setPassword = !editing || form.reset || promoting
  const ownAccount = editing?.id === ownId

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = {
      given_name: form.given.trim(), surname: form.surname.trim(), username: form.username.trim(),
      date_of_birth: form.birth || null, phone: form.phone.replace(/\D/g, '') || null, sex: form.sex || null,
      is_active: form.active, administrator: form.administrator,
      ...(editing ? { profile_revision: editing.profile_revision } : {}),
      ...(setPassword ? { password: form.password } : {}),
    }
    await perform(async () => {
      const { student } = await cebApi<{ student: Student }>('/admin/students' + (editing ? '/' + editing.id : ''), { token, method: editing ? 'PUT' : 'POST', body })
      const changes = [
        ...(editing && editing.app_role !== student.app_role ? [student.app_role === 'admin' ? 'Acesso de administrador concedido.' : 'Acesso de administrador retirado.'] : []),
        ...(editing && setPassword ? ['Senha redefinida com sucesso.'] : []),
        ...(editing && editing.is_active !== student.is_active ? [student.is_active ? 'Matrícula reativada.' : 'Matrícula desativada. O histórico foi preservado.'] : []),
      ]
      finish(student, student.id, editing ? ['Matrícula atualizada.', ...changes].join(' ') : 'Aluno matriculado com sucesso.')
    })
  }
  function deactivate(student: Student) {
    if (!window.confirm(`Desativar a matrícula de ${student.display_name}? O histórico será preservado e a conta poderá ser reativada.`)) return
    void perform(async () => {
      const result = await cebApi<{ student: Student }>(`/admin/students/${student.id}/deactivate`, { token, method: 'POST' })
      finish(result.student, student.id, 'Matrícula desativada. O histórico foi preservado.')
    })
  }
  function remove(student: Student) {
    if (!window.confirm(`Excluir definitivamente a matrícula de ${student.display_name} (${student.username})? Esta ação é irreversível e só será concluída se não houver vínculos protegidos.`)) return
    void perform(async () => {
      await cebApi(`/admin/students/${student.id}/permanent`, { token, method: 'DELETE', body: { confirmation: student.id } })
      finish(null, student.id, 'Matrícula excluída definitivamente.')
    })
  }

  const filtered = students.filter(s => [s.display_name, s.username, s.phone].join(' ').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  return <section className="ceb-admin-panel" aria-label="Gestão de Alunos">
    <h2>👥 Gestão de Alunos</h2>
    <p style={{color:'#42566e',lineHeight:1.6,margin:'8px 0 18px'}}>Esta área permite matricular novos alunos, consultar e atualizar cadastros, administrar o acesso à CEB e enviar orientações de entrada e instalação pelo WhatsApp. Use os cartões abaixo para realizar cada tarefa.</p>
    <div ref={formStart} className="ceb-admin-panel">
      <button type="button" aria-expanded={activePanel === 'form'} disabled={busy || loading} onClick={() => activePanel === 'form' ? closeForm() : openForm(null)}>{editing ? 'Editar matrícula' : 'Nova matrícula'} {activePanel === 'form' ? '▴' : '▾'}</button>
    {activePanel === 'form' && formOpen && <form className="ceb-auth-form" onSubmit={event => void save(event)}>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <legend>{editing ? 'Editar matrícula' : 'Nova matrícula'}</legend>
        <label>Nome do aluno<input required maxLength={120} value={form.given} onChange={e => update({ given: e.target.value })} /></label>
        <label>Sobrenome (opcional)<input maxLength={80} value={form.surname} onChange={e => update({ surname: e.target.value })} /></label>
        <label>Nome de usuário/login<input required minLength={3} maxLength={32} pattern="[A-Za-z0-9._\-]+" value={form.username} onChange={e => update({ username: e.target.value })} autoComplete="off" /></label>
        <label>Data de nascimento<input type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={form.birth} onChange={e => {
          const birth = e.target.value
          update({ birth, ...(setPassword && !passwordTouched.current && !form.administrator ? { password: birthPassword(birth) } : {}) })
        }} /></label>
        <label>Telefone (opcional)<input type="tel" inputMode="tel" maxLength={17} placeholder="+55 31 99999-9999" value={form.phone} onChange={e => update({ phone: formatPhone(e.target.value) })} /></label>
        <label>Sexo (opcional)<select value={form.sex} onChange={e => update({ sex: e.target.value as Sex | '' })}>
          <option value="">Selecione</option>
          {Object.entries(sexLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label>Situação<select disabled={ownAccount} value={form.active ? 'active' : 'inactive'} onChange={e => update({ active: e.target.value === 'active' })}>
          <option value="active">Ativo</option><option value="inactive">Inativo</option>
        </select></label>
        <label><input type="checkbox" disabled={ownAccount} checked={form.administrator} onChange={e => {
          const administrator = e.target.checked
          update({ administrator, ...(!passwordTouched.current && (!editing || form.reset || administrator) ? { password: administrator ? '' : birthPassword(form.birth) } : {}) })
        }} /> Conceder acesso de Administrador</label>
        {editing && !promoting && <label><input type="checkbox" disabled={ownAccount} checked={form.reset} onChange={e => {
          passwordTouched.current = false
          update({ reset: e.target.checked, password: e.target.checked && !form.administrator ? birthPassword(form.birth) : '' })
        }} /> Redefinir senha</label>}
        {setPassword ? <>
          <label>Senha definitiva<input type="password" inputMode="numeric" autoComplete="new-password" required minLength={6} maxLength={6} pattern="[0-9]{6}" value={form.password} onChange={e => {
            passwordTouched.current = true
            update({ password: e.target.value })
          }} /></label>
          <small>{form.administrator ? 'Escolha seis números diferentes da data de nascimento. Ao conceder acesso, é necessário definir uma nova senha.' : 'A data de nascimento preenche a sugestão no formato DDMMAA. Você pode escolher outros seis números.'}</small>
        </> : <small>A senha atual será preservada.</small>}
        <div className="ceb-admin-actions"><button type="submit">💾 Salvar</button><button type="button" onClick={closeForm}>Cancelar</button></div>
      </fieldset>
    </form>}
    </div>
    {error && <p role="alert" className="ceb-auth-error">{error}</p>}
    {notice && <p role="status" className="ceb-auth-success">{notice}</p>}
    <div className="ceb-admin-panel">
    <button type="button" aria-expanded={activePanel === 'students'} onClick={() => setActivePanel(current => current === 'students' ? null : 'students')}>Alunos cadastrados ({students.length}) {activePanel === 'students' ? '▴' : '▾'}</button>
    {activePanel === 'students' && <>
    <label>Pesquisar aluno<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome, login ou telefone" /></label>
    {loading ? <p>Carregando alunos…</p> : <div className="ceb-admin-users">
      {filtered.map(s => <article key={s.id} className="ceb-admin-user">
        <div><strong>{s.display_name}</strong>
          <p>{s.username} · {s.app_role === 'admin' ? 'Aluno e Administrador' : 'Aluno'} · {s.is_active ? 'Ativo' : 'Inativo'}</p>
          <small>Nascimento {s.date_of_birth ? s.date_of_birth.slice(0, 10).split('-').reverse().join('/') : 'não informado'} · Telefone {s.phone ? formatPhone(s.phone) : 'não informado'} · Sexo {s.sex ? sexLabels[s.sex] : 'não informado'}</small>
        </div>
        <div className="ceb-admin-actions">
          <button type="button" disabled={busy || s.is_primary_admin} onClick={() => openForm(s)}>Editar</button>
          <button type="button" disabled={!s.is_active} onClick={() => sendInvite(s)}>Enviar acesso pelo WhatsApp</button>
          <button type="button" disabled={busy || !s.is_active || s.id === ownId || s.is_primary_admin} onClick={() => deactivate(s)}>Desativar</button>
          <button type="button" disabled={busy || s.id === ownId || s.is_primary_admin} onClick={() => remove(s)}>Excluir definitivamente</button>
        </div>
      </article>)}
      {!filtered.length && <p>Nenhum aluno encontrado.</p>}
    </div>}</>}
    </div>

  </section>
}

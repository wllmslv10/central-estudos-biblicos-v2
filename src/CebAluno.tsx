import OriginalFiles, {type OriginalBundle} from './OriginalFiles'
import { StudentQuiz } from './Quiz'
import { useEffect, useMemo, useState } from 'react'
import { cebApi, listCloudStudies, type CloudStudy } from './cebApi'

type Point = { title?: string; explanation?: string; application?: string }
type Question = { question: string; options?: string[]; answer?: number; explanation?: string }
type Lesson = { passage?: string; theme?: string; introduction?: string; points?: Point[]; conclusion?: string; ebdCourse?: string; lessonDate?: string; questions?: Question[]; materials?: { title: string; url: string }[] }
type Progress = Record<string, { read?: boolean; favorite?: boolean; notes?: string; answers?: Record<string, string>; reflection?: string }>
type Tab = 'inicio' | 'licoes' | 'caderno' | 'atividades' | 'calendario' | 'favoritos'
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Início', icon: '⌂' }, { id: 'licoes', label: 'Lições', icon: '📖' },
  { id: 'caderno', label: 'Meu caderno', icon: '✎' }, { id: 'atividades', label: 'Atividades', icon: '✓' },
  { id: 'calendario', label: 'Calendário', icon: '▦' }, { id: 'favoritos', label: 'Favoritos', icon: '☆' },
]
function validUrl(value: string) { try { const url = new URL(value); return url.protocol === 'https:' } catch { return false } }
function downloadText(filename: string, value: string) {
  const url = URL.createObjectURL(new Blob([value], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function textLesson(study: CloudStudy) {
  const c = study.content as Lesson
  return [study.title, c.passage, c.theme, c.introduction, ...(c.points || []).flatMap(p => [p.title, p.explanation, p.application]), c.conclusion].filter(Boolean).join('\n\n')
}
export default function CebAluno({ token, name, userId }: { token: string; name: string; userId: string }) {
  const [studies, setStudies] = useState<CloudStudy[]>([])
  const [quizStudy, setQuizStudy] = useState<CloudStudy | null>(null)
  const [selected, setSelected] = useState<CloudStudy | null>(null)
  const [tab, setTab] = useState<Tab>('inicio')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [fontSize, setFontSize] = useState(18)
  const [progress, setProgress] = useState<Progress>(() => {
    try { return JSON.parse(localStorage.getItem('ceb-aluno-v1-' + userId) || '{}') as Progress } catch { return {} }
  })
  const [question, setQuestion] = useState('')
  useEffect(() => { try { localStorage.setItem('ceb-aluno-v1-' + userId, JSON.stringify(progress)) } catch { /* armazenamento indisponível */ } }, [progress, userId])
  useEffect(() => {
    let mounted = true
    setLoading(true)
    listCloudStudies(token).then(({ studies }) => {
      if (mounted) setStudies(studies.filter(item => item.visibility === 'shared' && item.status === 'published'))
    }).catch((err: unknown) => {
      if (mounted) setError(err instanceof Error ? err.message : 'Não foi possível carregar as lições.')
    }).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [token])
  const update = (id: string, patch: Partial<Progress[string]>) => setProgress(old => ({ ...old, [id]: { ...old[id], ...patch } }))
  const filtered = useMemo(() => studies.filter(study => {
    const c = study.content as Lesson
    const match = [study.title, c.passage, c.ebdCourse].join(' ').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
    return match && (tab !== 'favoritos' || progress[study.id]?.favorite)
  }), [studies, search, tab, progress])
  const readCount = studies.filter(s => progress[s.id]?.read).length
  const lesson = selected?.content as Lesson | undefined
  const downloadLesson = async (study: CloudStudy) => {
    try {
      const result = await cebApi<{study: CloudStudy}>(`/studies/${encodeURIComponent(study.id)}/download`, {token})
      downloadText('licao-ceb.txt', textLesson(result.study))
    } catch (err) { setError(err instanceof Error ? err.message : 'Download não autorizado.') }
  }
  const selectLesson = (study: CloudStudy) => { setSelected(study); setQuestion('') }
  const card = (study: CloudStudy) => {
    const c = study.content as Lesson
    return <div key={study.id} className="ceb-aluno-lesson">
      <div><strong>{study.title}</strong><p>{c.passage || 'Estudo bíblico'}{c.ebdCourse ? ' · ' + c.ebdCourse : ''}</p>
        {c.lessonDate && <small>Data da aula: {c.lessonDate}</small>}
        {progress[study.id]?.read && <small> ✓ Estudada</small>}
      </div>
      {tab !== 'inicio' && <div className="ceb-aluno-actions">
        <button type="button" onClick={() => update(study.id, { favorite: !progress[study.id]?.favorite })} aria-label={progress[study.id]?.favorite ? 'Remover favorito' : 'Adicionar favorito'}>{progress[study.id]?.favorite ? '★' : '☆'}</button>
        <button type="button" onClick={() => selectLesson(study)}>Abrir lição</button>{study.quiz_available !== false && (study.content.sharing as {quizEnabled?:boolean}|undefined)?.quizEnabled && <button type="button" onClick={()=>setQuizStudy(study)}>📝 Responder questionário</button>}
      </div>}
    </div>
  }
  const openTab = (next: Tab) => { setTab(next); setSelected(null); setSearch('') }
  return <main className="ceb-aluno">
    {quizStudy && <StudentQuiz key={quizStudy.id} token={token} studyId={quizStudy.id} userId={userId} title={quizStudy.title} onClose={()=>setQuizStudy(null)} />}
    <header className="ceb-aluno-hero">
      <small>IGREJA BATISTA NOVA ESPERANÇA · CENTRAL DE ESTUDOS BÍBLICOS</small>
      <h1>🎓 Minha Área de Estudos</h1>
      <p>Bem-vindo(a), <strong>{name}</strong>. Crescendo no conhecimento da Palavra de Deus.</p>
    </header>
    <nav className="ceb-aluno-tabs" aria-label="Navegação da área do aluno">
      {tabs.map(item => <button type="button" key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => openTab(item.id)}>{item.icon} {item.label}</button>)}
    </nav>
    {loading && <p role="status">Carregando materiais publicados…</p>}
    {error && <p role="alert" className="ceb-auth-error">{error}</p>}
    {!loading && !error && <>
      {selected ? <section className="ceb-aluno-panel">
        <button type="button" onClick={() => setSelected(null)}>← Voltar</button>
        <div className="ceb-aluno-actions">
          <button type="button" onClick={() => setFontSize(v => Math.max(15, v - 2))}>A−</button>
          <button type="button" onClick={() => setFontSize(v => Math.min(28, v + 2))}>A+</button>
          <button type="button" onClick={() => update(selected.id, { favorite: !progress[selected.id]?.favorite })}>{progress[selected.id]?.favorite ? '★ Favorita' : '☆ Favoritar'}</button>
          {(selected.content as Lesson & {sharing?:{allowDownload?:boolean}}).sharing?.allowDownload === true && !selected.content.originalBundle && <button type="button" onClick={() => void downloadLesson(selected)}>Baixar lição</button>}
        </div>
        {selected.quiz_available !== false && (selected.content.sharing as {quizEnabled?:boolean}|undefined)?.quizEnabled && <button type="button" onClick={()=>setQuizStudy(selected)}>📝 Responder questionário</button>}
        <article style={{ fontSize, lineHeight: 1.75, overflowWrap: 'anywhere' }}>
          <h2>{selected.title}</h2>{!!selected.content.originalBundle && <OriginalFiles token={token} studyId={selected.id} bundle={selected.content.originalBundle as OriginalBundle} allowDownload={(selected.content.sharing as {allowDownload?:boolean}|undefined)?.allowDownload===true}/>}
          {lesson?.passage && <p><strong>Texto bíblico:</strong> {lesson.passage}</p>}
          {lesson?.theme && <p><strong>Tema:</strong> {lesson.theme}</p>}
          {lesson?.introduction && <><h3>Introdução</h3><p className="ceb-aluno-paragraph">{lesson.introduction}</p></>}
          {lesson?.points?.map((p, i) => <section key={i}><h3>{i + 1}. {p.title || 'Ponto de estudo'}</h3>
            {p.explanation && <p className="ceb-aluno-paragraph">{p.explanation}</p>}
            {p.application && <p className="ceb-aluno-paragraph"><strong>Aplicação:</strong> {p.application}</p>}</section>)}
          {lesson?.conclusion && <><h3>Conclusão</h3><p className="ceb-aluno-paragraph">{lesson.conclusion}</p></>}
        </article>
        <label className="ceb-aluno-field">Minhas anotações (particulares neste navegador)
          <textarea rows={5} maxLength={12000} value={progress[selected.id]?.notes || ''} onChange={e => update(selected.id, { notes: e.target.value })} placeholder="O que aprendi? Quais dúvidas surgiram?" />
        </label>
        <div className="ceb-aluno-actions">
          <button type="button" onClick={() => update(selected.id, { read: !progress[selected.id]?.read })}>{progress[selected.id]?.read ? '✓ Lição estudada' : 'Marcar como estudada'}</button>
          <button type="button" onClick={() => downloadText('anotacoes-ceb.txt', progress[selected.id]?.notes || '')}>Exportar anotações</button>
        </div>
        {!!lesson?.materials?.length && <section><h3>Materiais de apoio</h3>{lesson.materials.filter(m => validUrl(m.url)).map((m, i) => <p key={i}><a href={m.url} target="_blank" rel="noopener noreferrer">{m.title || 'Abrir material'} ↗</a></p>)}</section>}
        <section><h3>Enviar uma dúvida ao professor</h3><p>Escreva sua pergunta e copie para compartilhar com o professor pelo canal combinado com a turma.</p>
          <textarea rows={3} maxLength={2000} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Minha dúvida sobre esta lição…" />
          <button type="button" disabled={!question.trim()} onClick={() => downloadText('pergunta-ao-professor.txt', 'Lição: ' + selected.title + '\nAluno: ' + name + '\nPergunta: ' + question)}>Salvar pergunta para enviar</button>
          <small>O envio direto ao professor ainda não está habilitado.</small>
        </section>
      </section> : <>
        {tab === 'inicio' && <><div className="ceb-aluno-summary">
          <div><strong>{studies.length}</strong><span>Lições disponíveis</span></div>
          <div><strong>{readCount}</strong><span>Estudadas</span></div>
          <div><strong>{studies.filter(s => progress[s.id]?.favorite).length}</strong><span>Favoritas</span></div>
        </div><section className="ceb-aluno-panel"><h2>Continue seus estudos</h2><p>Escolha uma lição para ler, anotar e acompanhar seu progresso.</p>{studies.slice(0, 4).map(card)}</section></>}
        {(tab === 'licoes' || tab === 'favoritos') && <section className="ceb-aluno-panel"><h2>{tab === 'favoritos' ? 'Minhas lições favoritas' : 'Lições publicadas'}</h2>
          <label className="ceb-aluno-field">Pesquisar<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Título, passagem ou curso" /></label>
          {filtered.map(card)}{!filtered.length && <p>Nenhuma lição encontrada. O professor precisa publicar materiais compartilhados para que apareçam aqui.</p>}
        </section>}
        {tab === 'caderno' && <section className="ceb-aluno-panel"><h2>Meu caderno</h2><p>Suas anotações são particulares e ficam salvas somente neste navegador. Exporte uma cópia para não perdê-las.</p>
          {studies.filter(s => progress[s.id]?.notes?.trim()).map(s => <div className="ceb-aluno-lesson" key={s.id}><div><strong>{s.title}</strong><p>{progress[s.id].notes}</p></div><button onClick={() => selectLesson(s)}>Editar</button></div>)}
          {!studies.some(s => progress[s.id]?.notes?.trim()) && <p>Abra uma lição para começar suas anotações.</p>}
          <button onClick={() => downloadText('meu-caderno-ceb.txt', studies.map(s => s.title + '\n' + (progress[s.id]?.notes || '')).join('\n\n---\n\n'))}>Exportar meu caderno</button>
        </section>}
        {tab === 'calendario' && <section className="ceb-aluno-panel"><h2>Calendário da EBD</h2><p>Datas informadas pelo professor nas lições publicadas.</p>
          {studies.filter(s => (s.content as Lesson).lessonDate).sort((a, b) => String((a.content as Lesson).lessonDate).localeCompare(String((b.content as Lesson).lessonDate))).map(s => <div className="ceb-aluno-lesson" key={s.id}><div><strong>{(s.content as Lesson).lessonDate}</strong><p>{s.title}</p></div><button onClick={() => selectLesson(s)}>Abrir</button></div>)}
          {!studies.some(s => (s.content as Lesson).lessonDate) && <p>Ainda não há datas de aulas cadastradas nas lições.</p>}
        </section>}
        {tab === 'atividades' && <section className="ceb-aluno-panel"><h2>Atividades e revisão</h2><p>Responda às perguntas de reflexão. As respostas ficam salvas neste navegador.</p>
          {studies.map(s => { const c = s.content as Lesson; const questions: Question[] = c.questions?.length ? c.questions : c.points?.filter(p => p.title).map(p => ({ question: 'Como posso aplicar em minha vida: ' + p.title + '?' })) || []
            return questions.length ? <section key={s.id}><h3>{s.title}</h3>{questions.map((q, i) => {
              const answer = progress[s.id]?.answers?.[String(i)] || ''
              return <div key={i} className="ceb-aluno-question"><label><strong>{i + 1}. {q.question}</strong>
                {q.options?.length ? <select value={answer} onChange={e => update(s.id, { answers: { ...progress[s.id]?.answers, [String(i)]: e.target.value } })}><option value="">Escolha uma resposta</option>{q.options.map((opt, j) => <option key={j} value={String(j)}>{opt}</option>)}</select>
                  : <textarea rows={3} maxLength={3000} value={answer} onChange={e => update(s.id, { answers: { ...progress[s.id]?.answers, [String(i)]: e.target.value } })} placeholder="Sua reflexão" />}
              </label>{q.options && answer !== '' && Number.isInteger(q.answer) && <p>{Number(answer) === q.answer ? '✓ Resposta correta.' : 'Revise o conteúdo e tente novamente.'} {q.explanation || ''}</p>}</div>
            })}</section> : null
          })}
          {!studies.length && <p>As atividades aparecerão quando houver lições publicadas.</p>}
        </section>}
      </>}
    </>}
    <footer className="ceb-aluno-footer">CENTRAL DE ESTUDOS BÍBLICOS · IGREJA BATISTA NOVA ESPERANÇA</footer>
  </main>
}

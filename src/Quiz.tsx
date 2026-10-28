import { useEffect, useRef, useState, useId, type ReactNode } from 'react'
import { cebApi } from './cebApi'
import './quiz.css'

type Question = { id: string; question: string; options: string[]; answer?: number; explanation?: string; reference: string; points: number }
type Definition = { policy: 'single' | 'multiple' | 'authorized'; mode?: string; showAnswers: boolean; questions: Question[] }
type Quiz = { id: string; revision: number; reviewed: boolean; definition: Definition }
type Attempt = { id: string; version_id: string; definition: Definition; answers: (number | null)[]; draft_revision: number; submitted_at: string | null; started_at: string; correct: number; score: number; maximum: number; percent: number }
type StudentResult = { id: string; name: string; authorized: boolean; status: string; attemptCount: number; best: Attempt | null; history: Attempt[] }
type Results = { students: StudentResult[]; summary: { authorized: number; answered: number; pending: number; average: number } }
const blankQuestion = (): Question => ({ id: crypto.randomUUID(), question: '', options: ['', '', '', ''], answer: 0, explanation: '', reference: '', points: 1 })
const date = (v: string) => new Date(v).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Não foi possível concluir. Tente novamente.'

function QuizShell({ children, onClose, busy, label }: { children: ReactNode; onClose: () => void; busy: boolean; label: string }) {
 const dialog = useRef<HTMLDialogElement>(null)
 useEffect(() => { const el = dialog.current!; const previous = document.activeElement as HTMLElement | null; const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; el.showModal(); return () => { el.close(); document.body.style.overflow = overflow; previous?.focus() } }, [])
 return <dialog ref={dialog} className="quiz-dialog" aria-label={label} onCancel={e => { e.preventDefault(); if (!busy) onClose() }}>{children}</dialog>
}

function QuestionView({ q, index, chosen, onChange, reveal }: { q: Question; index: number; chosen?: number | null; onChange?: (n: number) => void; reveal?: boolean }) {
 const group = useId()
 return <fieldset className="quiz-question"><legend>{index + 1}. {q.question} <small>({q.points} {q.points === 1 ? 'ponto' : 'pontos'})</small></legend>
  {q.reference && <p className="quiz-reference">Referência indicada pelo professor: {q.reference}</p>}
  {q.options.map((option, j) => <label key={j} className={reveal && q.answer === j ? 'quiz-correct' : ''}><input type="radio" name={group + q.id} checked={chosen === j} disabled={!onChange} onChange={() => onChange?.(j)} /> <strong>{'ABCD'[j]}.</strong> {option}</label>)}
  {reveal && <p><strong>Resposta: {'ABCD'[q.answer ?? 0]}.</strong> {q.explanation}</p>}
 </fieldset>
}

export function TeacherQuiz({ token, studyId, title, onClose }: { token: string; studyId: string; title: string; onClose: () => void }) {
 const path = `/studies/${studyId}/quiz`
 const [quiz, setQuiz] = useState<Quiz | null>(null), [questions, setQuestions] = useState<Question[]>(() => Array.from({ length: 10 }, blankQuestion))
 const [policy, setPolicy] = useState<Definition['policy']>('single'), [showAnswers, setShowAnswers] = useState(false), [reviewed, setReviewed] = useState(false)
 const [mode, setMode] = useState('manual'), [tab, setTab] = useState('editor'), [results, setResults] = useState<Results | null>(null)
 const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
 const saveLock = useRef(false)
 useEffect(() => { let active = true; cebApi<{ quiz: Quiz | null }>(path, { token }).then(r => { if (!active) return; setQuiz(r.quiz); if (r.quiz) { setQuestions(r.quiz.definition.questions); setPolicy(r.quiz.definition.policy); setShowAnswers(r.quiz.definition.showAnswers); setReviewed(r.quiz.reviewed) } }).catch(e => { if (active) setError(errorText(e)) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [path, token])
 useEffect(() => { const guard = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }; window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload', guard) }, [dirty])
 const changed = () => { setDirty(true); setReviewed(false); setNotice('') }
 const update = (i: number, patch: Partial<Question>) => { changed(); setQuestions(qs => qs.map((q, n) => n === i ? { ...q, ...patch } : q)) }
 const resize = (n: number) => { if (!Number.isInteger(n) || n < 1 || n > 30) return; if (n < questions.length && questions.slice(n).some(q => q.question || q.options.some(Boolean)) && !window.confirm('Remover as últimas questões deste rascunho? O histórico já entregue será preservado.')) return; changed(); setQuestions(qs => n < qs.length ? qs.slice(0, n) : [...qs, ...Array.from({ length: n - qs.length }, blankQuestion)]) }
 const close = () => { if (!dirty || window.confirm('Fechar sem salvar as alterações do questionário?')) onClose() }
 const save = async () => {
  if (saveLock.current) return; saveLock.current = true; setBusy(true); setError('')
  try { const r = await cebApi<{ quiz: Quiz }>(path, { token, method: 'PUT', body: { revision: quiz?.revision ?? 0, questions, policy, mode, showAnswers, reviewed } }); setQuiz(r.quiz); setDirty(false); setNotice('Questionário salvo. Para liberar aos alunos, use a opção na janela Compartilhar.') }
  catch (e) { setError(errorText(e)) } finally { setBusy(false); saveLock.current = false }
 }
 const loadResults = async () => { setTab('results'); setError(''); setBusy(true); try { setResults(await cebApi<Results>(path + '/results', { token })) } catch (e) { setError(errorText(e)) } finally { setBusy(false) } }
 const grant = async (userId: string) => { setBusy(true); setError(''); try { await cebApi(path + '/grant', { token, method: 'POST', body: { userId } }); setNotice('Uma nova tentativa foi autorizada para este aluno.'); await loadResults() } catch (e) { setError(errorText(e)) } finally { setBusy(false) } }
 return <QuizShell onClose={close} busy={busy} label="Questionário do professor">
  <header><div><small>IGREJA BATISTA NOVA ESPERANÇA</small><h2>📝 Questionário</h2><p>{title}</p></div><button onClick={close} disabled={busy}>Fechar ×</button></header>
  <nav aria-label="Painel do questionário"><button onClick={() => setTab('editor')}>Elaborar e configurar</button><button onClick={() => setTab('preview')}>Visualizar e revisar</button><button onClick={() => void loadResults()} disabled={!quiz || busy}>📊 Resultados dos alunos</button></nav>
  {loading ? <p role="status">Carregando questionário…</p> : <>
   {tab === 'editor' && <><div className="quiz-settings">
    <label>Quantidade de questões<input aria-label="Quantidade de questões" type="number" min={1} max={30} value={questions.length} onChange={e => resize(Number(e.target.value))} /></label>
    <label>Modo de elaboração<select value={mode} onChange={e => { setMode(e.target.value); setNotice('') }}><option value="manual">Manual</option><option value="automatic">Automático</option><option value="mixed">Misto</option></select></label>
    <label>Tentativas por aluno<select value={policy} onChange={e => { changed(); setPolicy(e.target.value as Definition['policy']) }}><option value="single">Uma tentativa</option><option value="multiple">Várias tentativas — manter a maior nota</option><option value="authorized">Uma tentativa — nova com autorização do professor</option></select></label>
    <label><input type="checkbox" checked={showAnswers} onChange={e => { changed(); setShowAnswers(e.target.checked) }} /> Mostrar gabarito e explicações após entrega válida</label>
   </div>
   {mode !== 'manual' && <div className="quiz-notice" role="status">Nenhum serviço de IA está configurado. A geração automática e o modo misto estão indisponíveis. Nenhuma pergunta foi gerada.<button onClick={() => setMode('manual')}>Continuar no modo manual</button></div>}
   <p>Exatamente quatro alternativas e uma resposta correta. Confira o conteúdo e as referências na Bíblia antes de disponibilizar.</p>
   {questions.map((q, i) => <fieldset className="quiz-question" key={q.id} disabled={busy}><legend>Questão {i + 1}</legend>
    <label>Enunciado<textarea aria-label={`Enunciado ${i + 1}`} maxLength={1500} value={q.question} onChange={e => update(i, { question: e.target.value })} /></label>
    {q.options.map((o, j) => <label key={j}>Alternativa {'ABCD'[j]}<input aria-label={`Questão ${i + 1} alternativa ${'ABCD'[j]}`} maxLength={600} value={o} onChange={e => update(i, { options: q.options.map((v, k) => k === j ? e.target.value : v) })} /></label>)}
    <div className="quiz-settings"><label>Resposta correta<select aria-label={`Resposta correta ${i + 1}`} value={q.answer} onChange={e => update(i, { answer: Number(e.target.value) })}>{['A', 'B', 'C', 'D'].map((l, j) => <option value={j} key={l}>{l}</option>)}</select></label><label>Pontos<input aria-label={`Pontos ${i + 1}`} type="number" min={0.01} max={100} step={0.01} value={q.points} onChange={e => update(i, { points: Number(e.target.value) })} /></label></div>
    <label>Referência bíblica (opcional)<input aria-label={`Referência ${i + 1}`} maxLength={200} value={q.reference} onChange={e => update(i, { reference: e.target.value })} placeholder="Livro, capítulo e versículo — conferir na Bíblia" /></label>
    <label>Explicação (opcional)<textarea aria-label={`Explicação ${i + 1}`} maxLength={2000} value={q.explanation || ''} onChange={e => update(i, { explanation: e.target.value })} /></label>
    <button disabled={questions.length === 1} onClick={() => { if (window.confirm('Excluir esta questão do rascunho? Tentativas anteriores serão preservadas.')) { changed(); setQuestions(qs => qs.filter((_, n) => n !== i)) } }}>Excluir questão</button><button onClick={() => { if (window.confirm('Substituir esta questão por uma questão manual em branco?')) update(i, blankQuestion()) }}>Substituir por questão manual</button>
   </fieldset>)}<button disabled={questions.length >= 30 || busy} onClick={() => resize(questions.length + 1)}>+ Acrescentar questão</button></>}
   {tab === 'preview' && <><p>Prévia do professor — inclui o gabarito. O aluno não recebe as respostas antes de uma entrega válida.</p>{questions.map((q, i) => <QuestionView key={q.id} q={q} index={i} reveal />)}</>}
   {tab === 'results' && results && <><div className="quiz-summary"><span>Autorizados: <strong>{results.summary.authorized}</strong></span><span>Responderam: <strong>{results.summary.answered}</strong></span><span>Pendentes: <strong>{results.summary.pending}</strong></span><span>Média das melhores notas: <strong>{results.summary.average}%</strong></span></div>
    <button onClick={() => void loadResults()} disabled={busy}>Atualizar resultados</button>
    {results.students.map(s => <article className="quiz-result" key={s.id}><h3>{s.name}</h3><p>{s.status} · {s.attemptCount} tentativa(s){!s.authorized && ' · acesso atualmente revogado/inativo'}</p>{s.best && <p>Melhor resultado: {s.best.correct} acertos · {s.best.score}/{s.best.maximum} pontos · {s.best.percent}%</p>}
     {policy === 'authorized' && s.authorized && s.best && <button disabled={busy} onClick={() => void grant(s.id)}>Autorizar uma nova tentativa</button>}
     {s.history.map((a, i) => <details key={a.id}><summary>Tentativa {i + 1} — {a.submitted_at ? `Entregue ${date(a.submitted_at)} · ${a.percent}%` : `Iniciada ${date(a.started_at)}`}</summary><p>{a.correct ?? '—'} acertos · {a.score ?? '—'}/{a.maximum ?? '—'} pontos</p>{a.definition.questions.map((q, n) => <QuestionView key={q.id} q={q} index={n} chosen={a.answers[n]} reveal />)}</details>)}
    </article>)}{!results.students.length && <p>Nenhum aluno autorizado ou tentativa registrada.</p>}</>}
   {tab !== 'results' && <footer><label><input type="checkbox" checked={reviewed} onChange={e => { setReviewed(e.target.checked); setDirty(true) }} /> Revisei todas as perguntas, alternativas, respostas e referências bíblicas.</label><button className="primary-button" disabled={busy || mode !== 'manual'} onClick={() => void save()}>{busy ? 'Salvando…' : 'Salvar questionário'}</button><small>Sem revisão, fica em rascunho. A liberação é independente e fica em Compartilhar.</small></footer>}
  </>}{error && <p role="alert" className="quiz-error">{error}</p>}{notice && <p role="status">{notice}</p>}
 </QuizShell>
}

export function StudentQuiz({ token, studyId, userId, title, onClose }: { token: string; studyId: string; userId: string; title: string; onClose: () => void }) {
 const path = `/studies/${studyId}/quiz`
 const [data, setData] = useState<{ attempts: Attempt[]; canStart: boolean; bestPercent: number } | null>(null), [attempt, setAttempt] = useState<Attempt | null>(null)
 const [answers, setAnswers] = useState<(number | null)[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [review, setReview] = useState(false)
 const current = useRef<Attempt | null>(null), latest = useRef<(number | null)[]>([]), queue = useRef<Promise<void>>(Promise.resolve()), submitLock = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null)
 const cacheKey = (a: Attempt) => `ceb-quiz-draft:${userId}:${studyId}:${a.id}`
 useEffect(() => { let active = true; cebApi<{ attempts: Attempt[]; canStart: boolean; bestPercent: number }>(path, { token }).then(d => { if (active) setData(d) }).catch(e => { if (active) setError(errorText(e)) }); return () => { active = false; if (timer.current) clearTimeout(timer.current) } }, [path, token])
 useEffect(() => { const guard = (e: BeforeUnloadEvent) => { if (current.current && !current.current.submitted_at) { e.preventDefault(); e.returnValue = '' } }; window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload', guard) }, [])
 const storeDraft = (a: Attempt, values: (number | null)[]) => { try { localStorage.setItem(cacheKey(a), JSON.stringify({ version: a.version_id, draftRevision: a.draft_revision, answers: values })) } catch { setNotice('Não foi possível guardar uma cópia neste navegador. Use Salvar respostas antes de sair.') } }
 const save = (submit = false) => {
  const job = queue.current.catch(() => {}).then(async () => {
   const a = current.current; if (!a || a.submitted_at) return
   const values = [...latest.current]
   const r = await cebApi<{ attempt: Attempt }>(path + '/attempt', { token, method: 'POST', body: { id: a.id, answers: values, draftRevision: a.draft_revision, submit } })
   current.current = r.attempt; setAttempt(r.attempt); if (!submit) storeDraft(r.attempt, latest.current); setNotice(submit ? 'Entrega confirmada pelo servidor.' : 'Respostas salvas na nuvem.')
   if (submit) { try { localStorage.removeItem(cacheKey(a)) } catch { /* optional cache */ } }
  }); queue.current = job; return job
 }
 const start = async () => { if (submitLock.current) return; submitLock.current = true; setBusy(true); setError(''); try {
  const { attempt: a } = await cebApi<{ attempt: Attempt }>(path + '/start', { token, method: 'POST', body: {} }); current.current = a; setAttempt(a)
  let restored = a.answers; try { const cached = JSON.parse(localStorage.getItem(cacheKey(a)) || 'null'); if (cached?.version === a.version_id && cached?.draftRevision === a.draft_revision && Array.isArray(cached.answers) && cached.answers.length === a.answers.length && cached.answers.every((v: unknown) => v === null || (Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 3))) restored = cached.answers } catch { /* server draft remains */ }
  latest.current = restored; setAnswers(restored); storeDraft(a, restored); setReview(false)
 } catch (e) { setError(errorText(e)) } finally { setBusy(false); submitLock.current = false } }
 const choose = (i: number, value: number) => { const a = current.current; if (!a || a.submitted_at || busy) return; const next = latest.current.map((v, n) => n === i ? value : v); latest.current = next; setAnswers(next); storeDraft(a, next); setNotice('Resposta guardada neste navegador; sincronizando…'); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { void save().catch(e => setError(errorText(e))) }, 600) }
 const deliver = async () => { if (submitLock.current || !current.current || current.current.submitted_at) return; if (!window.confirm('Confirmar a entrega? As respostas desta tentativa não poderão ser alteradas.')) return; submitLock.current = true; setBusy(true); setError(''); if (timer.current) clearTimeout(timer.current); try { await save(true) } catch (e) { setError(errorText(e)) } finally { setBusy(false); submitLock.current = false } }
 const close = () => { if (!attempt || attempt.submitted_at || window.confirm('Sair do preenchimento? As respostas guardadas neste navegador poderão ser recuperadas ao continuar esta tentativa.')) onClose() }
 return <QuizShell onClose={close} busy={busy} label="Responder questionário"><header><div><small>IGREJA BATISTA NOVA ESPERANÇA</small><h2>📝 Questionário</h2><p>{title}</p></div><button onClick={close} disabled={busy}>Fechar ×</button></header>
  {!attempt && <>{data ? <><p>Melhor aproveitamento: {data.bestPercent}% · {data.attempts.length} tentativa(s).</p><button className="primary-button" disabled={busy || !data.canStart} onClick={() => void start()}>{data.attempts.some(a => !a.submitted_at) ? 'Continuar tentativa' : 'Iniciar tentativa'}</button>{!data.canStart && <p>O limite de tentativas foi atingido. Consulte o professor.</p>}{data.attempts.filter(a => a.submitted_at).map((a, i) => <details key={a.id}><summary>Tentativa {i + 1}: {a.score}/{a.maximum} pontos · {a.percent}% · {date(a.submitted_at!)}</summary><p>{a.correct} acertos</p>{a.definition.questions.map((q, n) => <QuestionView key={q.id} q={q} index={n} chosen={a.answers[n]} reveal={q.answer !== undefined} />)}</details>)}</> : !error && <p>Carregando…</p>}</>}
  {attempt && !attempt.submitted_at && <><p>Escolha uma alternativa em cada questão. Suas respostas são guardadas durante o preenchimento.</p>{review && <h3>Revise suas respostas antes de confirmar</h3>}
   {attempt.definition.questions.map((q, i) => <QuestionView key={q.id} q={q} index={i} chosen={answers[i]} onChange={busy ? undefined : n => choose(i, n)} />)}
   <footer><p>{answers.filter(a => a !== null).length} de {answers.length} respondidas</p><button disabled={busy} onClick={() => { setBusy(true); void save().catch(e => setError(errorText(e))).finally(() => setBusy(false)) }}>Salvar respostas</button>{!review ? <button disabled={busy || answers.some(a => a === null)} onClick={() => setReview(true)}>Revisar respostas</button> : <><button disabled={busy} onClick={() => setReview(false)}>Voltar ao preenchimento</button><button className="primary-button" disabled={busy || answers.some(a => a === null)} onClick={() => void deliver()}>{busy ? 'Enviando…' : 'Confirmar entrega'}</button></>}</footer>
  </>}
  {attempt?.submitted_at && <><h3>Entrega concluída</h3><p>{attempt.correct} acertos · <strong>{attempt.score}/{attempt.maximum} pontos · {attempt.percent}%</strong></p><p>{date(attempt.submitted_at)}</p>{attempt.definition.questions.map((q, i) => <QuestionView key={q.id} q={q} index={i} chosen={attempt.answers[i]} reveal={q.answer !== undefined} />)}</>}
  {error && <p role="alert" className="quiz-error">{error}</p>}{notice && <p role="status">{notice}</p>}
 </QuizShell>
}

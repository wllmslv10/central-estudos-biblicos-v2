import { changeTrash } from './trashApi'
import { useEffect, useRef, useState, useId, useMemo, type ReactNode } from 'react'
import { cebApi } from './cebApi'
import './quiz.css'
import { findSimilarQuestions } from './quizSimilarity'

type Question = { id: string; question: string; options: string[]; answer?: number; explanation?: string; reference: string; points: number; evidence?: string }
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

type GenerationState = 'idle' | 'preparing' | 'generating' | 'validating' | 'complete' | 'error'
const generationSteps = [
 {state:'preparing',label:'Preparando o pedido da lição…'},
 {state:'generating',label:'Gerando perguntas bíblicas…'},
 {state:'validating',label:'Conferindo o retorno das questões…'},
 {state:'complete',label:'Concluído: questões prontas para revisão.'},
] as const
const paintGenerationState = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
function checkGeneratedQuestions(value: unknown, count: number): Question[] {
 if (!Array.isArray(value) || value.length !== count) throw new Error('O retorno da geração está incompleto. O rascunho anterior foi preservado.')
 const ids = new Set<string>()
 for (const q of value) {
  if (!q || typeof q.id !== 'string' || !q.id || ids.has(q.id) || typeof q.question !== 'string' || !q.question.trim() || !Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o:unknown)=>typeof o!=='string'||!o.trim()) || new Set(q.options.map((o:string)=>o.trim().toLocaleLowerCase('pt-BR'))).size!==4 || !Number.isInteger(q.answer) || q.answer<0 || q.answer>3 || typeof q.points!=='number' || !Number.isFinite(q.points) || q.points<=0 || typeof q.evidence!=='string' || !q.evidence.trim()) throw new Error('As questões retornadas não passaram na conferência do editor. O rascunho anterior foi preservado.')
  ids.add(q.id)
 }
 return value as Question[]
}

function parseImportedQuiz(raw: string): Question[] {
 const data: unknown = JSON.parse(raw)
 const items = Array.isArray(data) ? data : (data && typeof data === 'object' && 'questions' in data ? (data as {questions: unknown}).questions : null)
 if (!Array.isArray(items) || items.length < 1 || items.length > 30) throw new Error('Informe de 1 a 30 questões no campo questions.')
 return items.map((entry: unknown, index: number) => {
  if (!entry || typeof entry !== 'object') throw new Error('Questão ' + (index + 1) + ' inválida.')
  const q = entry as Record<string, unknown>
  const options = q.options
  const answerRaw = q.answer
  const answer = typeof answerRaw === 'string' && /^[A-Da-d]$/.test(answerRaw) ? answerRaw.toUpperCase().charCodeAt(0) - 65 : answerRaw
  if (typeof q.question !== 'string' || !q.question.trim() || q.question.length > 1500 ||
      !Array.isArray(options) || options.length !== 4 ||
      options.some(o => typeof o !== 'string' || !o.trim() || o.length > 600) ||
      new Set(options.map(o => (o as string).trim().toLocaleLowerCase('pt-BR'))).size !== 4 ||
      !Number.isInteger(answer) || (answer as number) < 0 || (answer as number) > 3 ||
      (q.explanation !== undefined && (typeof q.explanation !== 'string' || q.explanation.length > 2000)) ||
      (q.reference !== undefined && (typeof q.reference !== 'string' || q.reference.length > 200))) {
   throw new Error('Questão ' + (index + 1) + ': confira enunciado, quatro alternativas, resposta A–D, explicação e referência.')
  }
  return { id: crypto.randomUUID(), question: q.question, options: options as string[], answer: answer as number,
   explanation: (q.explanation as string | undefined) ?? '', reference: (q.reference as string | undefined) ?? '', points: 1 }
 })
}

export function TeacherQuiz({ token, studyId, title, onClose }: { token: string; studyId: string; title: string; onClose: () => void }) {
 const path = `/studies/${studyId}/quiz`
 const [quiz, setQuiz] = useState<Quiz | null>(null), [questions, setQuestions] = useState<Question[]>(() => Array.from({ length: 10 }, blankQuestion))
 const [policy, setPolicy] = useState<Definition['policy']>('single'), [showAnswers, setShowAnswers] = useState(false), [reviewed, setReviewed] = useState(false)
 const [aiAvailable,setAiAvailable]=useState(false),[generationCount,setGenerationCount]=useState(10)
 const [mode, setMode] = useState('manual'), [tab, setTab] = useState('editor'), [results, setResults] = useState<Results | null>(null)
 const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
 const [importText,setImportText]=useState(''), [importOpen,setImportOpen]=useState(false)
 const [generationState,setGenerationState]=useState<GenerationState>('idle')
 const isGenerating=['preparing','generating','validating'].includes(generationState)
 const generationIndex=generationSteps.findIndex(step=>step.state===generationState)
 const saveLock = useRef(false)
 const similarities = useMemo(() => findSimilarQuestions(questions), [questions])
 useEffect(() => { let active = true; cebApi<{ quiz: Quiz | null; aiAvailable?:boolean }>(path, { token }).then(r => { if (!active) return; setQuiz(r.quiz); setAiAvailable(!!r.aiAvailable); if (r.quiz) { setQuestions(r.quiz.definition.questions); setPolicy(r.quiz.definition.policy); setShowAnswers(r.quiz.definition.showAnswers); setReviewed(r.quiz.reviewed);setMode(r.quiz.definition.mode??'manual') } }).catch(e => { if (active) setError(errorText(e)) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [path, token])
 useEffect(() => { const guard = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }; window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload', guard) }, [dirty])
 const changed = () => { setDirty(true); setReviewed(false); setNotice('') }
 const update = (i: number, patch: Partial<Question>) => { changed(); setQuestions(qs => qs.map((q, n) => n === i ? { ...q, ...patch } : q)) }
 const resize = (n: number) => { if (!Number.isInteger(n) || n < 1 || n > 30) return; if (n < questions.length && questions.slice(n).some(q => q.question || q.options.some(Boolean)) && !window.confirm('Remover as últimas questões deste rascunho? O histórico já entregue será preservado.')) return; changed(); setQuestions(qs => n < qs.length ? qs.slice(0, n) : [...qs, ...Array.from({ length: n - qs.length }, blankQuestion)]) }
 const moveQuizToTrash = async () => {
  if (!quiz || busy || saveLock.current || !window.confirm('Mover o questionário para a Lixeira? As tentativas e notas serão preservadas.'+(dirty?' As alterações ainda não salvas serão descartadas.':''))) return
  saveLock.current=true;setBusy(true);setError('')
  try { const results=await changeTrash(token,'trash',[{type:'quiz',id:quiz.id}]);if(!results[0]?.ok)throw new Error(results[0]?.error||'Não foi possível mover o questionário.');setDirty(false);onClose() }
  catch(e){setError(errorText(e))}finally{saveLock.current=false;setBusy(false)}
 }
 const close = () => { if (!dirty || window.confirm('Fechar sem salvar as alterações do questionário?')) onClose() }
 const save = async () => {
  if (saveLock.current) return; saveLock.current = true; setBusy(true); setError('')
  try { const r = await cebApi<{ quiz: Quiz }>(path, { token, method: 'PUT', body: { revision: quiz?.revision ?? 0, questions, policy, mode, showAnswers, reviewed } }); setQuiz(r.quiz); setDirty(false); setNotice('Questionário salvo. Para liberar aos alunos, use a opção na janela Compartilhar.') }
  catch (e) { setError(errorText(e)) } finally { setBusy(false); saveLock.current = false }
 }
 const generate = async (replaceIndex?:number) => {
  if(saveLock.current || !aiAvailable)return
  const count=replaceIndex!==undefined?1:mode==='mixed'?generationCount:questions.length
  const kept=questions.filter(q=>q.question.trim()||q.options.some(o=>o.trim()))
  if(mode==='mixed' && replaceIndex===undefined && kept.length+count>30){setError('A geração excederia 30 questões. Reduza a quantidade ou substitua uma questão.');return}
  if(replaceIndex===undefined && mode==='automatic' && kept.length && !window.confirm('Substituir o rascunho atual por questões geradas? O questionário salvo e o histórico permanecerão intactos até você salvar uma nova versão.'))return
  saveLock.current=true;setBusy(true);setError('');setNotice('');setGenerationState('preparing')
  try {
   await paintGenerationState()
   const body={count}
   setGenerationState('generating')
   const r=await cebApi<{questions:Question[];model:string;reviewRequired:boolean}>(path+'/generate',{token,method:'POST',body})
   setGenerationState('validating');await paintGenerationState()
   const incoming=checkGeneratedQuestions(r.questions,count)
   if(r.reviewRequired!==true)throw new Error('Não foi possível confirmar a revisão obrigatória. O rascunho anterior foi preservado.')
   changed();setQuestions(current=>replaceIndex!==undefined?current.map((q,i)=>i===replaceIndex?{...incoming[0],points:q.points}:q):mode==='mixed'?[...kept,...incoming]:incoming)
   setNotice('Rascunho gerado por '+r.model+'. Revise todas as questões, as respostas e as referências antes de salvar.');setTab('editor');setGenerationState('complete')
  }catch(e){setGenerationState('error');setError(errorText(e))}finally{setBusy(false);saveLock.current=false}
 }
 const loadResults = async () => { setTab('results'); setError(''); setBusy(true); try { setResults(await cebApi<Results>(path + '/results', { token })) } catch (e) { setError(errorText(e)) } finally { setBusy(false) } }
 const grant = async (userId: string) => { setBusy(true); setError(''); try { await cebApi(path + '/grant', { token, method: 'POST', body: { userId } }); setNotice('Uma nova tentativa foi autorizada para este aluno.'); await loadResults() } catch (e) { setError(errorText(e)) } finally { setBusy(false) } }
 return <QuizShell onClose={close} busy={busy} label="Questionário do professor">
  <header><div><small>IGREJA BATISTA NOVA ESPERANÇA</small><h2>📝 Questionário</h2><p>{title}</p></div><div className="import-actions">{quiz && <button type="button" className="danger-button" disabled={busy} onClick={()=>void moveQuizToTrash()}>Excluir questionário</button>}<button onClick={close} disabled={busy}>Fechar ×</button></div></header>
  <nav aria-label="Painel do questionário"><button onClick={() => setTab('editor')}>Elaborar e configurar</button><button onClick={() => setTab('preview')}>Visualizar e revisar</button><button onClick={() => void loadResults()} disabled={!quiz || busy}>📊 Resultados dos alunos</button></nav>
  {generationState!=='idle'&&<section className={'quiz-generation '+(generationState==='error'?'quiz-generation-error':'')} aria-label="Progresso da geração" data-generation-state={generationState}>
   <p role="status" aria-live="polite">{isGenerating&&<span className="quiz-generation-spinner" aria-hidden="true"/>}<strong>{generationState==='error'?'Geração interrompida. O rascunho anterior foi preservado.':generationSteps[generationIndex]?.label}</strong></p>
   <ol aria-hidden="true">{generationSteps.map((step,i)=><li key={step.state} className={generationState==='complete'||i<generationIndex?'done':i===generationIndex?'active':''}>{step.label}</li>)}</ol>
  </section>}
  {loading ? <p role="status">Carregando questionário…</p> : <>
   {tab === 'editor' && <><div className="quiz-settings">
    <label>Quantidade de questões<input aria-label="Quantidade de questões" type="number" min={1} max={30} disabled={busy} value={questions.length} onChange={e => resize(Number(e.target.value))} /></label>
    <label>Modo de elaboração<select value={mode} disabled={busy} onChange={e => { setMode(e.target.value); setNotice('') }}><option value="manual">Manual</option><option value="automatic">Automático</option><option value="mixed">Misto</option></select></label>
    <label>Tentativas por aluno<select value={policy} onChange={e => { changed(); setPolicy(e.target.value as Definition['policy']) }}><option value="single">Uma tentativa</option><option value="multiple">Várias tentativas — manter a maior nota</option><option value="authorized">Uma tentativa — nova com autorização do professor</option></select></label>
    <label><input type="checkbox" checked={showAnswers} onChange={e => { changed(); setShowAnswers(e.target.checked) }} /> Mostrar gabarito e explicações após entrega válida</label>
   </div>
   {mode !== 'manual' && (aiAvailable ? <div className="quiz-notice"><p>Gerar a partir do conteúdo salvo da lição. A IA pode errar: revisão e conferência bíblica são obrigatórias. A geração não publica nem altera tentativas existentes.</p>{mode==='mixed'&&<label>Quantidade a acrescentar<input type="number" aria-label="Quantidade a acrescentar" min={1} max={30} value={generationCount} onChange={e=>setGenerationCount(Number(e.target.value))}/></label>}<button disabled={busy||!Number.isInteger(generationCount)||generationCount<1||generationCount>30} onClick={()=>void generate()}>{busy?'Gerando…':mode==='mixed'?'Gerar e acrescentar questões':'Gerar todas as questões'}</button></div> : <div className="quiz-notice" role="status">A geração com IA não está disponível: a integração precisa estar ativa e ter a franquia gratuita confirmada. Nenhuma pergunta foi gerada.<button onClick={() => setMode('manual')}>Continuar no modo manual</button></div>)}
   {mode === 'manual' && <section className="quiz-notice" aria-label="Importar questionário pronto">
    <button type="button" disabled={busy} onClick={() => setImportOpen(v => !v)}>{importOpen ? 'Fechar importação' : 'Importar questionário pronto (JSON)'}</button>
    {importOpen && <div><p>Cole um JSON com a propriedade <code>questions</code> contendo de 1 a 30 questões. Cada questão deve ter <code>question</code>, <code>options</code> (quatro textos), <code>answer</code> (A, B, C ou D), <code>explanation</code> e <code>reference</code>. Nenhuma IA será utilizada.</p>
     <textarea aria-label="Questionário pronto em JSON" rows={8} value={importText} onChange={e => setImportText(e.target.value)} placeholder={'{"questions":[{"question":"Pergunta","options":["Opção A","Opção B","Opção C","Opção D"],"answer":"A","explanation":"Explicação","reference":"Mateus 4:1-11"}]}'}/>
     <button type="button" disabled={busy || !importText.trim()} onClick={() => { try {
      const imported = parseImportedQuiz(importText)
      if (questions.some(q => q.question.trim() || q.options.some(Boolean)) && !window.confirm('Substituir o rascunho atual pelas questões importadas? O questionário salvo só será alterado quando você salvar.')) return
      changed(); setQuestions(imported); setReviewed(false); setNotice('Questões importadas sem IA. Confira e marque a revisão antes de salvar.'); setError(''); setImportOpen(false)
     } catch (e) { setError(e instanceof SyntaxError ? 'JSON inválido. Confira vírgulas, aspas e colchetes.' : errorText(e)) } }}>Carregar questões no editor</button>
    </div>}
   </section>}
   <p>Exatamente quatro alternativas e uma resposta correta. Confira o conteúdo e as referências na Bíblia antes de disponibilizar.</p>
   {questions.map((q, i) => <fieldset className="quiz-question" key={q.id} disabled={busy}><legend>Questão {i + 1}</legend>
    {similarities[i] && <p className="quiz-similarity" role="note"><strong>⚠️ Possivelmente semelhante à questão {similarities[i]!.questionNumber}</strong><small>{similarities[i]!.reason} Aviso informativo: você pode editar ou manter esta questão.</small></p>}
    <label>Enunciado<textarea aria-label={`Enunciado ${i + 1}`} maxLength={1500} value={q.question} onChange={e => update(i, { question: e.target.value })} /></label>
    {q.options.map((o, j) => <label key={j}>Alternativa {'ABCD'[j]}<input aria-label={`Questão ${i + 1} alternativa ${'ABCD'[j]}`} maxLength={600} value={o} onChange={e => update(i, { options: q.options.map((v, k) => k === j ? e.target.value : v) })} /></label>)}
    <div className="quiz-settings"><label>Resposta correta<select aria-label={`Resposta correta ${i + 1}`} value={q.answer} onChange={e => update(i, { answer: Number(e.target.value) })}>{['A', 'B', 'C', 'D'].map((l, j) => <option value={j} key={l}>{l}</option>)}</select></label><label>Pontos<input aria-label={`Pontos ${i + 1}`} type="number" min={0.01} max={100} step={0.01} value={q.points} onChange={e => update(i, { points: Number(e.target.value) })} /></label></div>
    <label>Referência bíblica (opcional)<input aria-label={`Referência ${i + 1}`} maxLength={200} value={q.reference} onChange={e => update(i, { reference: e.target.value })} placeholder="Livro, capítulo e versículo — conferir na Bíblia" /></label>
    {q.evidence&&<p className="quiz-reference"><strong>Trecho de apoio da lição:</strong> {q.evidence}</p>}
    <label>Explicação (opcional)<textarea aria-label={`Explicação ${i + 1}`} maxLength={2000} value={q.explanation || ''} onChange={e => update(i, { explanation: e.target.value })} /></label>
    <button disabled={questions.length === 1} onClick={() => { if (window.confirm('Excluir esta questão do rascunho? Tentativas anteriores serão preservadas.')) { changed(); setQuestions(qs => qs.filter((_, n) => n !== i)) } }}>Excluir questão</button><button onClick={() => { if (window.confirm('Substituir esta questão por uma questão manual em branco?')) update(i, blankQuestion()) }}>Substituir por questão manual</button>{aiAvailable&&mode!=='manual'&&<button onClick={()=>void generate(i)}>Substituir com IA</button>}
   </fieldset>)}<button disabled={questions.length >= 30 || busy} onClick={() => resize(questions.length + 1)}>+ Acrescentar questão</button></>}
   {tab === 'preview' && <><p>Prévia do professor — inclui o gabarito. O aluno não recebe as respostas antes de uma entrega válida.</p>{questions.map((q, i) => <QuestionView key={q.id} q={q} index={i} reveal />)}</>}
   {tab === 'results' && results && <><div className="quiz-summary"><span>Autorizados: <strong>{results.summary.authorized}</strong></span><span>Responderam: <strong>{results.summary.answered}</strong></span><span>Pendentes: <strong>{results.summary.pending}</strong></span><span>Média das melhores notas: <strong>{results.summary.average}%</strong></span></div>
    <button onClick={() => void loadResults()} disabled={busy}>Atualizar resultados</button>
    {results.students.map(s => <article className="quiz-result" key={s.id}><h3>{s.name}</h3><p>{s.status} · {s.attemptCount} tentativa(s){!s.authorized && ' · acesso atualmente revogado/inativo'}</p>{s.best && <p>Melhor resultado: {s.best.correct} acertos · {s.best.score}/{s.best.maximum} pontos · {s.best.percent}%</p>}
     {policy === 'authorized' && s.authorized && s.best && <button disabled={busy} onClick={() => void grant(s.id)}>Autorizar uma nova tentativa</button>}
     {s.history.map((a, i) => <details key={a.id}><summary>Tentativa {i + 1} — {a.submitted_at ? `Entregue ${date(a.submitted_at)} · ${a.percent}%` : `Iniciada ${date(a.started_at)}`}</summary><p>{a.correct ?? '—'} acertos · {a.score ?? '—'}/{a.maximum ?? '—'} pontos</p>{a.definition.questions.map((q, n) => <QuestionView key={q.id} q={q} index={n} chosen={a.answers[n]} reveal />)}</details>)}
    </article>)}{!results.students.length && <p>Nenhum aluno autorizado ou tentativa registrada.</p>}</>}
   {tab !== 'results' && <footer><label><input type="checkbox" checked={reviewed} onChange={e => { setReviewed(e.target.checked); setDirty(true) }} /> Revisei todas as perguntas, alternativas, respostas e referências bíblicas.</label><button className="primary-button" disabled={busy || (mode !== 'manual' && !aiAvailable)} onClick={() => void save()}>{busy ? (isGenerating?'Gerando…':'Salvando…') : 'Salvar questionário'}</button><small>Sem revisão, fica em rascunho. A liberação é independente e fica em Compartilhar.</small></footer>}
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
 const storeDraft = (a: Attempt, values: (number | null)[]) => { try { localStorage.setItem(cacheKey(a), JSON.stringify({ version: a.version_id, draftRevision: a.draft_revision, answers: values })) } catch { setNotice('Não foi possível guardar uma cópia neste navegador. Use Salvar rascunho antes de sair.') } }
 const save = (submit = false) => {
  const job = queue.current.catch(() => {}).then(async () => {
   const a = current.current; if (!a || a.submitted_at) return
   const values = [...latest.current]
   const r = await cebApi<{ attempt: Attempt }>(path + '/attempt', { token, method: 'POST', body: { id: a.id, answers: values, draftRevision: a.draft_revision, submit } })
   if (!r.attempt || r.attempt.id !== a.id || (submit && !r.attempt.submitted_at)) throw new Error('O servidor não confirmou a entrega. Seu rascunho foi preservado; consulte a tentativa antes de tentar novamente.')
   current.current = r.attempt; setAttempt(r.attempt)
   if (r.attempt.submitted_at) { latest.current = r.attempt.answers; setAnswers(r.attempt.answers); setNotice(''); try { localStorage.removeItem(cacheKey(a)) } catch { /* optional cache */ } }
   else { storeDraft(r.attempt, latest.current); setNotice('Rascunho salvo na nuvem. O questionário ainda não foi entregue.') }
  }); queue.current = job; return job
 }
 const start = async () => { if (submitLock.current) return; submitLock.current = true; setBusy(true); setError(''); try {
  const { attempt: a } = await cebApi<{ attempt: Attempt }>(path + '/start', { token, method: 'POST', body: {} }); current.current = a; setAttempt(a)
  let restored = a.answers; try { const cached = JSON.parse(localStorage.getItem(cacheKey(a)) || 'null'); if (cached?.version === a.version_id && cached?.draftRevision === a.draft_revision && Array.isArray(cached.answers) && cached.answers.length === a.answers.length && cached.answers.every((v: unknown) => v === null || (Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 3))) restored = cached.answers } catch { /* server draft remains */ }
  latest.current = restored; setAnswers(restored); storeDraft(a, restored); setReview(false)
 } catch (e) { setError(errorText(e)) } finally { setBusy(false); submitLock.current = false } }
 const choose = (i: number, value: number) => { const a = current.current; if (!a || a.submitted_at || busy) return; const next = latest.current.map((v, n) => n === i ? value : v); latest.current = next; setAnswers(next); storeDraft(a, next); setNotice('Resposta guardada neste navegador; sincronizando…'); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => { void save().catch(e => setError(errorText(e))) }, 600) }
 const deliver = async () => { if (!review || submitLock.current || !current.current || current.current.submitted_at) return; submitLock.current = true; setBusy(true); setError(''); setNotice(''); if (timer.current) clearTimeout(timer.current); try { await save(true) } catch (e) { setError(errorText(e)); setNotice('A entrega não foi confirmada. Seu rascunho foi preservado.') } finally { setBusy(false); submitLock.current = false } }
 const close = () => { if (!attempt || attempt.submitted_at || window.confirm('Sair do preenchimento? As respostas guardadas neste navegador poderão ser recuperadas ao continuar esta tentativa.')) onClose() }
 return <QuizShell onClose={close} busy={busy} label="Responder questionário"><header><div><small>IGREJA BATISTA NOVA ESPERANÇA</small><h2>📝 Questionário</h2><p>{title}</p></div><button onClick={close} disabled={busy}>Fechar ×</button></header>
  {!attempt && <>{data ? <><p>Melhor aproveitamento: {data.bestPercent}% · {data.attempts.length} tentativa(s).</p><button className="primary-button" disabled={busy || !data.canStart} onClick={() => void start()}>{data.attempts.some(a => !a.submitted_at) ? 'Continuar tentativa' : 'Iniciar tentativa'}</button>{!data.canStart && <p>O limite de tentativas foi atingido. Consulte o professor.</p>}{data.attempts.filter(a => a.submitted_at).map((a, i) => <details key={a.id}><summary>Tentativa {i + 1} entregue em {date(a.submitted_at!)}: {a.score}/{a.maximum} pontos · {a.percent}%</summary><p>{a.correct} acertos</p>{a.definition.questions.map((q, n) => <QuestionView key={q.id} q={q} index={n} chosen={a.answers[n]} reveal={q.answer !== undefined} />)}</details>)}</> : !error && <p>Carregando…</p>}</>}
  {attempt && !attempt.submitted_at && <><p>Suas respostas são guardadas como rascunho durante o preenchimento. Para finalizar, use Entregar questionário e confirme a entrega.</p>{review && <section aria-label="Confirmação de entrega"><h3>Confirme a entrega do questionário</h3><p>Confira suas respostas abaixo. Após confirmar e receber a confirmação do servidor, esta tentativa ficará bloqueada para alterações.</p></section>}
   {attempt.definition.questions.map((q, i) => <QuestionView key={q.id} q={q} index={i} chosen={answers[i]} onChange={busy || review ? undefined : n => choose(i, n)} />)}
   <footer><p>{answers.filter(a => a !== null).length} de {answers.length} respondidas</p>{!review ? <><button disabled={busy} onClick={() => { setBusy(true); setError(''); void save().catch(e => setError(errorText(e))).finally(() => setBusy(false)) }}>Salvar rascunho</button><button className="primary-button" disabled={busy || answers.some(a => a === null)} onClick={() => { setReview(true); setError('') }}>Entregar questionário</button></> : <><button disabled={busy} onClick={() => setReview(false)}>Voltar e revisar</button><button className="primary-button" disabled={busy || answers.some(a => a === null)} onClick={() => void deliver()}>{busy ? 'Enviando…' : 'Confirmar entrega'}</button></>}</footer>
  </>}
  {attempt?.submitted_at && <><h3>Questionário entregue com sucesso</h3><p role="status">Entregue em {date(attempt.submitted_at)}. As respostas desta tentativa estão bloqueadas para alterações.</p><p>{attempt.correct} acertos · <strong>{attempt.score}/{attempt.maximum} pontos · {attempt.percent}%</strong></p>{attempt.definition.questions.map((q, i) => <QuestionView key={q.id} q={q} index={i} chosen={attempt.answers[i]} reveal={q.answer !== undefined} />)}</>}
  {error && <p role="alert" className="quiz-error">{error}</p>}{notice && <p role="status">{notice}</p>}
 </QuizShell>
}

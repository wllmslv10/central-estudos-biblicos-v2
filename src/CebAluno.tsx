import { useEffect, useState } from 'react'
import { listCloudStudies, type CloudStudy } from './cebApi'

type Lesson = { passage?: string; theme?: string; introduction?: string; points?: { title?: string; explanation?: string; application?: string }[]; conclusion?: string; ebdCourse?: string }

export default function CebAluno({ token, name }: { token: string; name: string }) {
  const [studies, setStudies] = useState<CloudStudy[]>([])
  const [selected, setSelected] = useState<CloudStudy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [fontSize, setFontSize] = useState(18)
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
  const filtered = studies.filter(study => {
    const content = study.content as Lesson
    return [study.title, content.passage, content.ebdCourse].join(' ').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
  })
  const lesson = selected?.content as Lesson | undefined
  return <main className="ceb-admin-page" style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 64px' }}>
    <p style={{ fontWeight: 700, letterSpacing: 1 }}>IGREJA BATISTA NOVA ESPERANÇA</p>
    <h1>🎓 Área do Aluno</h1>
    <p>Bem-vindo(a), <strong>{name}</strong>. Acompanhe as lições e os estudos disponibilizados pelo professor.</p>
    {selected ? <section className="ceb-admin-panel">
      <button type="button" onClick={() => setSelected(null)}>← Voltar às lições</button>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <span>Tamanho da letra</span>
        <button type="button" onClick={() => setFontSize(value => Math.max(15, value - 2))} aria-label="Diminuir fonte">A−</button>
        <button type="button" onClick={() => setFontSize(value => Math.min(28, value + 2))} aria-label="Aumentar fonte">A+</button>
      </div>
      <article style={{ fontSize, lineHeight: 1.7, overflowWrap: 'anywhere' }}>
        <h2>{selected.title}</h2>
        {lesson?.passage && <p><strong>Texto bíblico:</strong> {lesson.passage}</p>}
        {lesson?.ebdCourse && <p><strong>Curso:</strong> {lesson.ebdCourse}</p>}
        {lesson?.theme && <p><strong>Tema:</strong> {lesson.theme}</p>}
        {lesson?.introduction && <><h3>Introdução</h3><p style={{ whiteSpace: 'pre-wrap' }}>{lesson.introduction}</p></>}
        {lesson?.points?.map((point, index) => <section key={index}>
          <h3>{index + 1}. {point.title || 'Ponto de estudo'}</h3>
          {point.explanation && <p style={{ whiteSpace: 'pre-wrap' }}>{point.explanation}</p>}
          {point.application && <p style={{ whiteSpace: 'pre-wrap' }}><strong>Aplicação:</strong> {point.application}</p>}
        </section>)}
        {lesson?.conclusion && <><h3>Conclusão</h3><p style={{ whiteSpace: 'pre-wrap' }}>{lesson.conclusion}</p></>}
      </article>
    </section> : <section className="ceb-admin-panel">
      <h2>Materiais disponíveis</h2>
      <label>Pesquisar lições<input style={{ display: 'block', width: '100%', maxWidth: 480, marginTop: 8 }} value={search} onChange={event => setSearch(event.target.value)} placeholder="Título, texto bíblico ou curso" /></label>
      {loading && <p>Carregando lições…</p>}
      {error && <p role="alert" className="ceb-auth-error">{error}</p>}
      {!loading && !error && filtered.length === 0 && <p>{studies.length ? 'Nenhum material encontrado para sua pesquisa.' : 'Ainda não há lições publicadas para os alunos. Quando o professor publicar uma lição compartilhada, ela aparecerá aqui.'}</p>}
      {!loading && filtered.map(study => {
        const item = study.content as Lesson
        return <div key={study.id} className="ceb-admin-user">
          <div><strong>{study.title}</strong><p>{item.passage || 'Estudo bíblico'}{item.ebdCourse ? ' · ' + item.ebdCourse : ''}</p></div>
          <button type="button" onClick={() => setSelected(study)}>Ler lição</button>
        </div>
      })}
    </section>}
  </main>
}

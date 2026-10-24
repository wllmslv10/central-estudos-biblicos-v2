import { useState } from 'react'

type Section = 'inicio' | 'estudos' | 'pregacoes' | 'ebd' | 'biblioteca'

const navigation: { id: Section; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Início', icon: '⌂' },
  { id: 'estudos', label: 'Estudos bíblicos', icon: '📖' },
  { id: 'pregacoes', label: 'Esboços de pregação', icon: '✦' },
  { id: 'ebd', label: 'Escola Bíblica Dominical', icon: '🎓' },
  { id: 'biblioteca', label: 'Biblioteca', icon: '▤' },
]

const cards = [
  {
    icon: '📖',
    title: 'Estudos bíblicos',
    description: 'Prepare estudos com texto bíblico, explicação, aplicações práticas e perguntas para reflexão.',
    section: 'estudos' as Section,
    tag: 'APRENDER',
  },
  {
    icon: '✦',
    title: 'Esboços de pregação',
    description: 'Organize a mensagem com tema, texto-base, introdução, pontos principais e conclusão.',
    section: 'pregacoes' as Section,
    tag: 'ENSINAR',
  },
  {
    icon: '🎓',
    title: 'Escola Bíblica Dominical',
    description: 'Reúna lições, apostilas, manual do professor e apresentações em um só lugar.',
    section: 'ebd' as Section,
    tag: 'FORMAR',
  },
  {
    icon: '📚',
    title: 'Biblioteca de materiais',
    description: 'Um espaço para organizar e consultar seus conteúdos bíblicos.',
    section: 'biblioteca' as Section,
    tag: 'CONSULTAR',
  },
]

const sectionContent: Record<Exclude<Section, 'inicio'>, { title: string; subtitle: string; details: string[] }> = {
  estudos: {
    title: 'Estudos bíblicos',
    subtitle: 'Conteúdos organizados para compreender a Palavra e aplicá-la à vida.',
    details: ['Estudo por passagem bíblica', 'Contexto e explicação do texto', 'Pontos principais e aplicações práticas', 'Perguntas para reflexão'],
  },
  pregacoes: {
    title: 'Esboços de pregação',
    subtitle: 'Uma estrutura clara para desenvolver mensagens bíblicas.',
    details: ['Tema e texto bíblico principal', 'Introdução e contexto', 'Pontos principais com explicação', 'Aplicações, conclusão e convite'],
  },
  ebd: {
    title: 'Escola Bíblica Dominical',
    subtitle: 'Materiais de apoio para professores e alunos da EBD.',
    details: ['Lições e apostilas', 'Manual do professor', 'Apresentações para aula', 'Perguntas e atividades de revisão'],
  },
  biblioteca: {
    title: 'Biblioteca',
    subtitle: 'Um espaço para reunir materiais de estudo e consulta.',
    details: ['Organização por tema', 'Materiais para consulta', 'Conteúdos de apoio às aulas', 'Preparação para futuras ferramentas de busca'],
  },
}

function App() {
  const [active, setActive] = useState<Section>('inicio')

  const openSection = (section: Section) => {
    setActive(section)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selectedSection = active === 'inicio' ? null : sectionContent[active]

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" onClick={(event) => { event.preventDefault(); openSection('inicio') }}>
          <span className="brand-mark" aria-hidden="true">✝</span>
          <span className="brand-copy">
            <strong>CEB</strong>
            <small>Central de Estudos Bíblicos</small>
          </span>
        </a>
        <span className="topbar-note">Palavra · Ensino · Prática</span>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">CRESCER NO CONHECIMENTO DA PALAVRA</span>
            <h1>Estude a Palavra.<br /><em>Compartilhe a verdade.</em></h1>
            <p>Um espaço para preparar estudos bíblicos, desenvolver mensagens e organizar materiais para o ensino cristão.</p>
            <button className="primary-button" onClick={() => openSection('estudos')}>Explorar estudos <span aria-hidden="true">→</span></button>
          </div>
          <div className="hero-ornament" aria-hidden="true">
            <div className="ornament-circle"><span>✝</span></div>
            <div className="verse-card">
              <span>“</span>
              <p>Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.</p>
              <small>SALMO 119:105 · ACF</small>
            </div>
          </div>
        </section>

        <section className="content-section" id="conteudos">
          {selectedSection ? (
            <div className="section-view">
              <button className="back-link" onClick={() => openSection('inicio')}>← Voltar ao início</button>
              <span className="eyebrow">CENTRAL DE ESTUDOS BÍBLICOS</span>
              <h2>{selectedSection.title}</h2>
              <p className="section-intro">{selectedSection.subtitle}</p>
              <div className="detail-panel">
                <h3>O que esta área vai reunir</h3>
                <ul>{selectedSection.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
                <p className="coming-soon">Esta é a estrutura inicial. As ferramentas de criação, edição e salvamento serão desenvolvidas nas próximas etapas.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">SEU ESPAÇO DE PREPARAÇÃO</span>
                  <h2>O que vamos estudar hoje?</h2>
                </div>
                <p>Recursos para aprender, preparar e ensinar com clareza.</p>
              </div>
              <div className="feature-grid">
                {cards.map((card) => (
                  <button className="feature-card" key={card.title} onClick={() => openSection(card.section)}>
                    <span className="card-topline"><span className="card-icon">{card.icon}</span><span className="card-tag">{card.tag}</span></span>
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                    <span className="card-link">Abrir área <span aria-hidden="true">→</span></span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="quote-strip">
          <span className="quote-icon">✦</span>
          <div><p>“Procura apresentar-te a Deus aprovado, como obreiro que não tem de que se envergonhar...”</p><small>2 TIMÓTEO 2:15 · ACF</small></div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-brand"><span className="brand-mark small">✝</span><strong>Central de Estudos Bíblicos</strong></div>
        <span>Um projeto em desenvolvimento para apoiar o estudo e o ensino da Bíblia.</span>
      </footer>

      <nav className="mobile-nav" aria-label="Navegação principal">
        {navigation.map((item) => (
          <button key={item.id} className={active === item.id ? 'nav-item active' : 'nav-item'} onClick={() => openSection(item.id)}>
            <span>{item.icon}</span><small>{item.label}</small>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
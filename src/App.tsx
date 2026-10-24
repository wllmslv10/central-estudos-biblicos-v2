import { useEffect, useMemo, useState } from 'react'

type Section = 'inicio' | 'estudos' | 'pregacoes' | 'ebd' | 'biblioteca'
type Point = { title: string; explanation: string; application: string }
type Study = { title: string; passage: string; theme: string; introduction: string; points: Point[]; conclusion: string }

const blankStudy: Study = {
  title: 'A esperança não decepciona',
  passage: 'Romanos 5:1-5',
  theme: 'A esperança cristã está firmada na obra de Cristo e no amor de Deus.',
  introduction: 'A esperança bíblica não é um desejo incerto. Ela nasce da paz com Deus por meio de Jesus Cristo e permanece mesmo em meio às tribulações.',
  points: [
    { title: 'Descanse na paz conquistada por Cristo', explanation: 'Nossa esperança começa na obra de Jesus, não no controle das circunstâncias. Justificados pela fé, temos paz com Deus por meio de nosso Senhor Jesus Cristo.', application: 'Lembre-se diariamente de que sua segurança está em Cristo. Ore e tome decisões confiando na graça de Deus.' },
    { title: 'Permita que Deus trabalhe em meio às tribulações', explanation: 'Paulo ensina que a tribulação produz perseverança, experiência e esperança. Deus pode usar os períodos difíceis para amadurecer nossa fé.', application: 'Diante da dificuldade, em vez de desistir, busque o Senhor, permaneça fiel e procure aprender o que a Palavra ensina.' },
    { title: 'Confie no amor de Deus derramado em seu coração', explanation: 'A esperança não decepciona porque o amor de Deus foi derramado em nosso coração pelo Espírito Santo que nos foi dado.', application: 'Alimente sua confiança nas promessas bíblicas e demonstre esse amor por meio do cuidado e do serviço ao próximo.' },
  ],
  conclusion: 'A esperança cristã permanece porque está firmada em Cristo. Descanse na paz que Ele conquistou, persevere com fé e viva hoje à luz do amor de Deus.',
}

const navigation: { id: Section; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Início', icon: '⌂' },
  { id: 'estudos', label: 'Estudos bíblicos', icon: '📖' },
  { id: 'pregacoes', label: 'Esboços', icon: '✦' },
  { id: 'ebd', label: 'EBD', icon: '🎓' },
  { id: 'biblioteca', label: 'Biblioteca', icon: '▤' },
]

const cards = [
  { icon: '📖', title: 'Estudos bíblicos', description: 'Prepare estudos com texto bíblico, explicação, aplicações práticas e perguntas para reflexão.', section: 'estudos' as Section, tag: 'APRENDER' },
  { icon: '✦', title: 'Esboços de pregação', description: 'Organize a mensagem com tema, texto-base, introdução, pontos principais e conclusão.', section: 'pregacoes' as Section, tag: 'ENSINAR' },
  { icon: '🎓', title: 'Escola Bíblica Dominical', description: 'Reúna lições, apostilas, manual do professor e apresentações em um só lugar.', section: 'ebd' as Section, tag: 'FORMAR' },
  { icon: '📚', title: 'Biblioteca de materiais', description: 'Organize e consulte os conteúdos bíblicos que você preparar.', section: 'biblioteca' as Section, tag: 'CONSULTAR' },
]

const sectionContent: Record<Exclude<Section, 'inicio'>, { title: string; subtitle: string }> = {
  estudos: { title: 'Estudos bíblicos', subtitle: 'Prepare estudos com explicação do texto, pontos principais e aplicações para a vida.' },
  pregacoes: { title: 'Esboços de pregação', subtitle: 'Estruture mensagens bíblicas com introdução, desenvolvimento e conclusão.' },
  ebd: { title: 'Escola Bíblica Dominical', subtitle: 'Prepare materiais para a aula e apresentações para exibir em sala.' },
  biblioteca: { title: 'Biblioteca', subtitle: 'Consulte os materiais salvos neste navegador.' },
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char)
}

function buildSlides(study: Study) {
  const slides: { kicker: string; title: string; body: string[]; note?: string }[] = [
    { kicker: 'IGREJA BATISTA NOVA ESPERANÇA', title: study.title || 'Estudo bíblico', body: [study.theme || ''], note: study.passage || '' },
    { kicker: 'INTRODUÇÃO', title: 'Entendendo o tema', body: [study.introduction || ''], note: study.passage || '' },
  ]
  study.points.forEach((point, index) => {
    slides.push({ kicker: `DESENVOLVIMENTO · PONTO ${index + 1}`, title: point.title || `Ponto ${index + 1}`, body: [point.explanation || ''], note: point.application ? `APLICAÇÃO PRÁTICA: ${point.application}` : '' })
  })
  slides.push({ kicker: 'CONCLUSÃO', title: 'Vivendo a Palavra', body: [study.conclusion || ''], note: study.passage || '' })
  return slides
}

function createPresentationHtml(study: Study) {
  const slides = buildSlides(study)
  const slidesHtml = slides.map((slide) => `<section class="slide"><div class="content"><div class="brand">CENTRAL DE ESTUDOS BÍBLICOS <span>· IGREJA BATISTA NOVA ESPERANÇA</span></div><div class="kicker">${escapeHtml(slide.kicker)}</div><h1>${escapeHtml(slide.title)}</h1>${slide.body.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}${slide.note ? `<aside>${escapeHtml(slide.note)}</aside>` : ''}<div class="footer">ESTUDO BÍBLICO · CEB <span>${escapeHtml(study.passage)}</span></div></div></section>`).join('')
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(study.title)} — Apresentação CEB</title>
<style>
:root{--navy:#102744;--navy2:#1b3c5d;--gold:#d9b56d;--ink:#f8fbff;--muted:#dce6f0}
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font-family:Arial,Helvetica,sans-serif;background:#102744;color:var(--ink)}body{overflow:hidden}.slide{display:none;width:100vw;height:100vh;aspect-ratio:16/9;background:linear-gradient(135deg,#102744,#1b3c5d);padding:5.5vh 7vw 7vh;position:relative;overflow:hidden}.slide.active{display:flex;align-items:center;justify-content:center}.slide:before{content:"";position:absolute;width:45vw;height:45vw;right:-19vw;top:-25vw;border:1px solid #d9b56d35;border-radius:50%;box-shadow:0 0 0 4vw #ffffff05,0 0 0 8vw #ffffff03}.content{width:100%;max-width:1300px;position:relative;z-index:1;max-height:100%;display:flex;flex-direction:column;justify-content:center}.brand{font-size:clamp(11px,1.1vw,17px);letter-spacing:.13em;font-weight:700;color:var(--gold);margin-bottom:5vh}.brand span{font-weight:400;color:#dce6f0}.kicker{font-size:clamp(12px,1.2vw,18px);font-weight:700;letter-spacing:.18em;color:var(--gold);margin-bottom:2vh}h1{font-size:clamp(34px,5vw,76px);line-height:1.1;margin:0 0 3vh;font-weight:800;letter-spacing:-.025em;max-width:1100px}p{font-size:clamp(21px,2.2vw,34px);line-height:1.5;max-width:1100px;margin:0 0 2vh;color:#f2f6fb;white-space:pre-wrap}aside{border-left:5px solid var(--gold);padding:1.3vh 0 1.3vh 1.5vw;margin-top:2vh;color:#f3dba9;font-size:clamp(16px,1.6vw,24px);line-height:1.4;max-width:1100px}.footer{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:space-between;border-top:1px solid #ffffff25;padding:1.8vh 7vw;color:#c4d0dc;font-size:clamp(10px,.9vw,14px);letter-spacing:.08em}.controls{position:fixed;z-index:5;bottom:2vh;right:2vw;display:flex;gap:8px;opacity:.88}.controls button{border:1px solid #d9b56d88;border-radius:7px;background:#091a2bd9;color:#fff;padding:10px 14px;font-size:14px;cursor:pointer}.controls button:hover{background:#284766}.counter{position:fixed;left:2vw;bottom:2.4vh;color:#fff9;font-size:12px}@media(max-width:650px){.slide{padding:5vh 6vw 10vh}.brand{margin-bottom:4vh}.footer{padding:1.4vh 6vw}.controls{right:2vw;bottom:1vh}.controls button{padding:9px;font-size:12px}p{line-height:1.35}}@media print{body{overflow:visible}.slide,.slide.active{display:flex;width:100%;height:100vh;page-break-after:always;break-after:page;-webkit-print-color-adjust:exact;print-color-adjust:exact}.controls,.counter{display:none}}
</style></head><body>
${slidesHtml}
<div class="counter" id="counter"></div><div class="controls"><button onclick="move(-1)" aria-label="Slide anterior">← Voltar</button><button onclick="move(1)" aria-label="Próximo slide">Avançar →</button><button onclick="full()">Tela cheia</button><button onclick="window.print()">Imprimir</button></div>
<script>const slides=[...document.querySelectorAll('.slide')];let current=0;function show(){slides.forEach((s,i)=>s.classList.toggle('active',i===current));document.getElementById('counter').textContent=(current+1)+' / '+slides.length}function move(n){current=Math.max(0,Math.min(slides.length-1,current+n));show()}function full(){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()}document.addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();move(1)}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();move(-1)}if(e.key==='Home'){current=0;show()}if(e.key==='End'){current=slides.length-1;show()}if(e.key==='Escape'&&document.fullscreenElement)document.exitFullscreen?.()});let x=0;document.addEventListener('touchstart',e=>x=e.changedTouches[0].screenX,{passive:true});document.addEventListener('touchend',e=>{const d=e.changedTouches[0].screenX-x;if(Math.abs(d)>60)move(d<0?1:-1)},{passive:true});show();</script></body></html>`
}

function App() {
  const [active, setActive] = useState<Section>('inicio')
  const [study, setStudy] = useState<Study>(() => {
    try { const saved = localStorage.getItem('ceb-study-draft'); return saved ? JSON.parse(saved) as Study : blankStudy } catch { return blankStudy }
  })
  const [savedStudies, setSavedStudies] = useState<Study[]>(() => {
    try { return JSON.parse(localStorage.getItem('ceb-saved-studies') || '[]') as Study[] } catch { return [] }
  })
  const [showPreview, setShowPreview] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => { localStorage.setItem('ceb-study-draft', JSON.stringify(study)) }, [study])
  useEffect(() => { localStorage.setItem('ceb-saved-studies', JSON.stringify(savedStudies)) }, [savedStudies])

  const slides = useMemo(() => buildSlides(study), [study])
  const openSection = (section: Section) => { setActive(section); setShowPreview(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const updateStudy = (key: keyof Study, value: string) => setStudy((current) => ({ ...current, [key]: value }))
  const updatePoint = (index: number, key: keyof Point, value: string) => setStudy((current) => ({ ...current, points: current.points.map((point, i) => i === index ? { ...point, [key]: value } : point) }))
  const saveStudy = () => {
    const next = [...savedStudies.filter((item) => !(item.title === study.title && item.passage === study.passage)), { ...study }]
    setSavedStudies(next)
    setNotice('Estudo salvo neste navegador.')
    window.setTimeout(() => setNotice(''), 3000)
  }
  const downloadHtml = () => {
    const blob = new Blob([createPresentationHtml(study)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const fileName = (study.title || 'apresentacao-ceb').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'apresentacao-ceb'
    link.href = url; link.download = `${fileName}.html`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
    setNotice('Apresentação HTML gerada para baixar.')
    window.setTimeout(() => setNotice(''), 3000)
  }
  const loadStudy = (item: Study) => { setStudy({ ...item, points: item.points.map((p) => ({ ...p })) }); setActive('estudos'); setShowPreview(false) }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" onClick={(event) => { event.preventDefault(); openSection('inicio') }}>
          <span className="brand-mark" aria-hidden="true">✝</span><span className="brand-copy"><strong>CEB</strong><small>Central de Estudos Bíblicos</small></span>
        </a><span className="topbar-note">Palavra · Ensino · Prática</span>
      </header>
      <main>
        {active === 'inicio' ? <>
          <section className="hero"><div className="hero-content"><span className="eyebrow">CRESCER NO CONHECIMENTO DA PALAVRA</span><h1>Estude a Palavra.<br /><em>Compartilhe a verdade.</em></h1><p>Um espaço para preparar estudos bíblicos, desenvolver mensagens e organizar materiais para o ensino cristão.</p><button className="primary-button" onClick={() => openSection('estudos')}>Preparar um estudo <span aria-hidden="true">→</span></button></div><div className="hero-ornament" aria-hidden="true"><div className="ornament-circle"><span>✝</span></div><div className="verse-card"><span>“</span><p>Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.</p><small>SALMO 119:105 · ACF</small></div></div></section>
          <section className="content-section"><div className="section-heading"><div><span className="eyebrow">SEU ESPAÇO DE PREPARAÇÃO</span><h2>O que vamos estudar hoje?</h2></div><p>Recursos para aprender, preparar e ensinar com clareza.</p></div><div className="feature-grid">{cards.map((card) => <button className="feature-card" key={card.title} onClick={() => openSection(card.section)}><span className="card-topline"><span className="card-icon">{card.icon}</span><span className="card-tag">{card.tag}</span></span><h3>{card.title}</h3><p>{card.description}</p><span className="card-link">Abrir área <span aria-hidden="true">→</span></span></button>)}</div></section>
          <section className="quote-strip"><span className="quote-icon">✦</span><div><p>“Procura apresentar-te a Deus aprovado, como obreiro que não tem de que se envergonhar...”</p><small>2 TIMÓTEO 2:15 · ACF</small></div></section>
        </> : active === 'biblioteca' ? <section className="content-section section-view"><button className="back-link" onClick={() => openSection('inicio')}>← Voltar ao início</button><span className="eyebrow">MATERIAIS SALVOS</span><h2>{sectionContent.biblioteca.title}</h2><p className="section-intro">{sectionContent.biblioteca.subtitle}</p>{savedStudies.length ? <div className="library-list">{savedStudies.map((item, index) => <article className="library-item" key={item.title + item.passage + index}><div><h3>{item.title}</h3><p>{item.passage}</p><small>{item.theme}</small></div><button className="secondary-button" onClick={() => loadStudy(item)}>Abrir / editar</button></article>)}</div> : <div className="detail-panel"><h3>A biblioteca começará com seus próprios materiais</h3><p>Use a área de estudos para preparar um conteúdo e clique em “Salvar estudo”. Ele aparecerá aqui neste navegador.</p><button className="primary-button" onClick={() => openSection('estudos')}>Preparar estudo →</button></div>}</section> : <section className="content-section section-view">
          <button className="back-link" onClick={() => openSection('inicio')}>← Voltar ao início</button><span className="eyebrow">CENTRAL DE ESTUDOS BÍBLICOS</span><h2>{sectionContent[active].title}</h2><p className="section-intro">{sectionContent[active].subtitle}</p>
          {active === 'ebd' && <div className="notice-box">Você pode usar o editor abaixo para preparar o conteúdo da lição e gerar a apresentação HTML para a aula.</div>}
          {active === 'pregacoes' && <div className="notice-box">O editor também pode ser usado para montar o esboço de uma pregação. Organize cada ponto com explicação e aplicação prática.</div>}
          <div className="editor-toolbar"><span className="editor-label">EDITOR DE CONTEÚDO</span><span className="autosave-label">Rascunho salvo automaticamente neste navegador</span></div>
          <div className="study-form">
            <label>Título do estudo<input value={study.title} onChange={(e) => updateStudy('title', e.target.value)} placeholder="Ex.: A esperança não decepciona" /></label>
            <div className="form-row"><label>Texto bíblico<input value={study.passage} onChange={(e) => updateStudy('passage', e.target.value)} placeholder="Ex.: Romanos 5:1-5" /></label><label>Tema central<input value={study.theme} onChange={(e) => updateStudy('theme', e.target.value)} placeholder="Qual é a mensagem principal?" /></label></div>
            <label>Introdução<textarea rows={3} value={study.introduction} onChange={(e) => updateStudy('introduction', e.target.value)} placeholder="Apresente o contexto e a ideia do estudo." /></label>
            <div className="points-heading"><h3>Desenvolvimento do esboço</h3><span>Os pontos terão explicação e aplicação prática.</span></div>
            {study.points.map((point, index) => <fieldset className="point-editor" key={index}><legend>Ponto principal {index + 1}</legend><label>Título do ponto<input value={point.title} onChange={(e) => updatePoint(index, 'title', e.target.value)} placeholder="Ex.: Descanse na paz conquistada por Cristo" /></label><label>Explicação<textarea rows={3} value={point.explanation} onChange={(e) => updatePoint(index, 'explanation', e.target.value)} placeholder="Explique o ensino do texto bíblico." /></label><label>Aplicação prática<textarea rows={2} value={point.application} onChange={(e) => updatePoint(index, 'application', e.target.value)} placeholder="Como aplicar esta verdade no dia a dia?" /></label></fieldset>)}
            <label>Conclusão<textarea rows={3} value={study.conclusion} onChange={(e) => updateStudy('conclusion', e.target.value)} placeholder="Retome a mensagem principal e convide à prática." /></label>
          </div>
          {notice && <div className="success-notice" role="status">{notice}</div>}
          <div className="action-bar"><button className="secondary-button" onClick={saveStudy}>Salvar estudo</button><button className="secondary-button" onClick={() => setShowPreview((value) => !value)}>{showPreview ? 'Ocultar apresentação' : 'Ver apresentação'}</button><button className="primary-button" onClick={downloadHtml}>Gerar apresentação HTML ↓</button></div>
          {showPreview && <div className="presentation-preview"><div className="preview-heading"><div><span className="eyebrow">PRÉ-VISUALIZAÇÃO · {slides.length} SLIDES</span><h3>Apresentação: {study.title}</h3></div><button className="secondary-button" onClick={downloadHtml}>Baixar HTML</button></div><div className="preview-slide-grid">{slides.map((slide, index) => <article className="preview-slide" key={index}><span>{String(index + 1).padStart(2, '0')} / {slides.length}</span><small>{slide.kicker}</small><h4>{slide.title}</h4><p>{slide.body[0]}</p>{slide.note && <aside>{slide.note}</aside>}</article>)}</div><p className="preview-help">O arquivo baixado abre diretamente no navegador e inclui botões Voltar/Avançar, tela cheia, setas do teclado e impressão.</p></div>}
        </section>}
      </main>
      <footer className="footer"><div className="footer-brand"><span className="brand-mark small">✝</span><strong>Central de Estudos Bíblicos</strong></div><span>Igreja Batista Nova Esperança · Palavra, ensino e prática.</span></footer>
      <nav className="mobile-nav" aria-label="Navegação principal">{navigation.map((item) => <button key={item.id} className={active === item.id ? 'nav-item active' : 'nav-item'} onClick={() => openSection(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
    </div>
  )
}

export default App

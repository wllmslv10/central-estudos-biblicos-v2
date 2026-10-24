import { useEffect, useMemo, useState } from 'react'

type Section = 'inicio' | 'estudos' | 'pregacoes' | 'ebd' | 'biblioteca' | 'importar'
type Point = { title: string; explanation: string; application: string }
type Study = { title: string; passage: string; theme: string; introduction: string; points: Point[]; conclusion: string; kind?: 'estudo' | 'esboco' }
type ReadingTheme = 'claro' | 'creme' | 'escuro'
type ReadingPreferences = { fontSize: number; lineHeight: number; theme: ReadingTheme }

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
  { id: 'importar', label: 'Importar', icon: '📥' },
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
  importar: { title: 'Importar materiais', subtitle: 'Traga seus estudos e esboços em PDF ou Word, guarde o arquivo original e organize o texto para edição.' },
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char)
}

const BIBLE_REFERENCE_PATTERN = /\b((?:[123]\s*)?(?:Gênesis|Genesis|Gn|Êxodo|Exodo|Êx|Levítico|Levitico|Lv|Números|Numeros|Nm|Deuteronômio|Deuteronomio|Dt|Josué|Josue|Js|Juízes|Juizes|Jz|Rute|Rt|[12]\s*Samuel|[12]\s*Sm|[12]\s*Reis|[12]\s*Rs|[12]\s*Crônicas|[12]\s*Cr|Esdras|Ed|Neemias|Ne|Ester|Et|Jó|Jo|Salmos|Salmo|Sl|Provérbios|Proverbios|Pv|Eclesiastes|Ec|Cânticos|Canticos|Ct|Isaías|Isaias|Is|Jeremias|Jr|Lamentações|Lamentacoes|Lm|Ezequiel|Ez|Daniel|Dn|Oseias|Os|Joel|Jl|Amós|Amos|Am|Obadias|Ob|Jonas|Jn|Miqueias|Mq|Naum|Na|Habacuque|Hc|Sofonias|Sf|Ageu|Ag|Zacarias|Zc|Malaquias|Ml|Mateus|Mt|Marcos|Mc|Lucas|Lc|João|Joao|Jo|Atos|At|Romanos|Rm|[12]\s*Coríntios|[12]\s*Corintios|[12]\s*Co|Gálatas|Galatas|Gl|Efésios|Efesios|Ef|Filipenses|Fp|Colossenses|Cl|[12]\s*Tessalonicenses|[12]\s*Ts|[12]\s*Timóteo|[12]\s*Timoteo|[12]\s*Tm|Tito|Tt|Filemom|Fm|Hebreus|Hb|Tiago|Tg|[12]\s*Pedro|[12]\s*Pe|[123]\s*João|[123]\s*Jo|Judas|Jd|Apocalipse|Ap)\s+\d{1,3}:\d{1,3}(?:\s*[-–]\s*\d{1,3})?)/giu

function ScriptureReference({ reference }: { reference: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verse, setVerse] = useState<{ text: string; citation: string } | null>(null)
  const [error, setError] = useState('')
  const loadVerse = async () => {
    setOpen(true)
    if (verse || loading) return
    setLoading(true)
    setError('')
    try {
      const url = `https://api.midvash.com/v1/passages?refs=${encodeURIComponent(reference)}&version=almeida-livre`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Não foi possível consultar a referência agora.')
      const payload = await response.json()
      const item = Array.isArray(payload.data) ? payload.data[0] : payload.data
      const textValue = item?.text || (Array.isArray(item?.verses) ? item.verses.join(' ') : '')
      if (!textValue) throw new Error('A referência não foi localizada. Confira a escrita e tente novamente.')
      setVerse({ text: textValue, citation: payload.meta?.copyright || 'Bíblia Livre (Almeida 1819)' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o versículo.')
    } finally { setLoading(false) }
  }
  return <span className="scripture-reference-wrap">
    <button type="button" className="scripture-reference" aria-expanded={open} onClick={() => { if (open) setOpen(false); else void loadVerse() }}>📖 {reference}</button>
    {open && <span className="scripture-popover" role="dialog" aria-label={`Texto bíblico ${reference}`} onClick={(event) => event.stopPropagation()}>
      <strong>{reference}</strong>
      {loading && <span className="scripture-loading">Carregando versículo…</span>}
      {verse && <><span className="scripture-verse-text">{verse.text}</span><small>{verse.citation}</small></>}
      {error && <><span className="scripture-error">{error}</span><a href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=ARC`} target="_blank" rel="noreferrer">Consultar referência online ↗</a></>}
      <button type="button" className="scripture-close" onClick={() => setOpen(false)} aria-label="Fechar versículo">Fechar ×</button>
    </span>}
  </span>
}

function renderReferences(text: string) {
  const parts = text.split(BIBLE_REFERENCE_PATTERN)
  return parts.map((part, index) => index % 2 === 1 && part.length > 0
    ? <ScriptureReference key={`${part}-${index}`} reference={part.trim()} />
    : <span key={index}>{part}</span>)
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
:root{--navy:#dceefa;--navy2:#e7f4fc;--gold:#9a6a00;--gold2:#805900;--ink:#102d4b;--muted:#294965;--blue:#286b9f;--line:rgba(30,91,139,.40)}
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font-family:"Segoe UI",Arial,Helvetica,sans-serif;background:var(--navy);color:var(--ink)}body{display:flex;align-items:center;justify-content:center;overflow:hidden}.slide{display:none;width:min(100vw,177.7778vh);height:min(100vh,56.25vw);aspect-ratio:16/9;box-shadow:0 0 35px #183b5522;background:radial-gradient(ellipse at 85% 12%,rgba(232,194,103,.18),transparent 38%),linear-gradient(135deg,#f4f8fc 0%,#e6f0f8 55%,#f8f4e9 100%);padding:5.5vh 7vw 7vh;position:relative;overflow:hidden}.slide.active{display:flex;align-items:center;justify-content:center}.slide:before{content:"";position:absolute;width:45vw;height:45vw;right:-19vw;top:-25vw;border:1px solid #9a6a0030;border-radius:50%;box-shadow:0 0 0 4vw #1e5b8b08,0 0 0 8vw #1e5b8b05}.content{width:100%;max-width:1300px;position:relative;z-index:1;max-height:100%;display:flex;flex-direction:column;justify-content:center}.brand{font-size:clamp(11px,1.1vw,17px);letter-spacing:.13em;font-weight:700;color:var(--gold);margin-bottom:5vh}.brand span{font-weight:400;color:var(--muted)}.kicker{font-size:clamp(12px,1.2vw,18px);font-weight:700;letter-spacing:.18em;color:var(--blue);margin-bottom:2vh}h1{font-size:clamp(34px,5vw,76px);line-height:1.1;margin:0 0 3vh;font-weight:800;letter-spacing:-.025em;max-width:1100px;color:var(--gold)}p{font-size:clamp(21px,2.2vw,34px);line-height:1.5;max-width:1100px;margin:0 0 2vh;color:var(--ink);white-space:pre-wrap}aside{border-left:5px solid var(--gold);padding:1.3vh 0 1.3vh 1.5vw;margin-top:2vh;color:#3d321b;font-size:clamp(16px,1.6vw,24px);line-height:1.4;max-width:1100px;background:linear-gradient(90deg,#fff8e1aa,transparent);}.footer{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:space-between;border-top:1px solid #1e5b8b30;padding:1.8vh 7vw;color:var(--muted);font-size:clamp(10px,.9vw,14px);letter-spacing:.08em}.controls{position:fixed;z-index:5;bottom:2vh;right:2vw;display:flex;gap:8px;opacity:.96}.controls button{border:1px solid #6e9bbd;border-radius:10px;background:#e8f4fc;color:#102d4b;padding:10px 14px;font-size:14px;font-weight:700;cursor:pointer}.controls button:hover{background:#d2e9f8}.counter{position:fixed;left:2vw;bottom:2.4vh;color:#294965;font-size:12px}@media(max-width:650px){.slide{padding:5vh 6vw 10vh}.brand{margin-bottom:4vh}.footer{padding:1.4vh 6vw}.controls{right:2vw;bottom:1vh}.controls button{padding:9px;font-size:12px}p{line-height:1.35}}@media print{body{overflow:visible}.slide,.slide.active{display:flex;width:100%;height:100vh;page-break-after:always;break-after:page;-webkit-print-color-adjust:exact;print-color-adjust:exact}.controls,.counter{display:none}}
</style></head><body>
${slidesHtml}
<div class="counter" id="counter"></div><div class="controls"><button onclick="move(-1)" aria-label="Slide anterior">← Voltar</button><button onclick="move(1)" aria-label="Próximo slide">Avançar →</button><button onclick="full()">Tela cheia</button><button onclick="window.print()">Imprimir</button></div>
<script>const slides=[...document.querySelectorAll('.slide')];let current=0;function show(){slides.forEach((s,i)=>s.classList.toggle('active',i===current));document.getElementById('counter').textContent=(current+1)+' / '+slides.length}function move(n){current=Math.max(0,Math.min(slides.length-1,current+n));show()}function full(){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()}document.addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();move(1)}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();move(-1)}if(e.key==='Home'){current=0;show()}if(e.key==='End'){current=slides.length-1;show()}if(e.key==='Escape'&&document.fullscreenElement)document.exitFullscreen?.()});let x=0;document.addEventListener('touchstart',e=>x=e.changedTouches[0].screenX,{passive:true});document.addEventListener('touchend',e=>{const d=e.changedTouches[0].screenX-x;if(Math.abs(d)>60)move(d<0?1:-1)},{passive:true});function attachBibleReferences(){const pattern=/\b((?:[123]\s*)?(?:Gênesis|Genesis|Gn|Êxodo|Exodo|Êx|Levítico|Levitico|Lv|Números|Numeros|Nm|Deuteronômio|Deuteronomio|Dt|Josué|Josue|Js|Juízes|Juizes|Jz|Rute|Rt|[12]\s*Samuel|[12]\s*Sm|[12]\s*Reis|[12]\s*Rs|[12]\s*Crônicas|[12]\s*Cr|Esdras|Ed|Neemias|Ne|Ester|Et|Jó|Jo|Salmos|Salmo|Sl|Provérbios|Proverbios|Pv|Eclesiastes|Ec|Cânticos|Canticos|Ct|Isaías|Isaias|Is|Jeremias|Jr|Lamentações|Lamentacoes|Lm|Ezequiel|Ez|Daniel|Dn|Oseias|Os|Joel|Jl|Amós|Amos|Am|Obadias|Ob|Jonas|Jn|Miqueias|Mq|Naum|Na|Habacuque|Hc|Sofonias|Sf|Ageu|Ag|Zacarias|Zc|Malaquias|Ml|Mateus|Mt|Marcos|Mc|Lucas|Lc|João|Joao|Atos|At|Romanos|Rm|[12]\s*Coríntios|[12]\s*Corintios|[12]\s*Co|Gálatas|Galatas|Gl|Efésios|Efesios|Ef|Filipenses|Fp|Colossenses|Cl|[12]\s*Tessalonicenses|[12]\s*Ts|[12]\s*Timóteo|[12]\s*Timoteo|[12]\s*Tm|Tito|Tt|Filemom|Fm|Hebreus|Hb|Tiago|Tg|[12]\s*Pedro|[12]\s*Pe|[123]\s*João|[123]\s*Jo|Judas|Jd|Apocalipse|Ap)\s+\d{1,3}:\d{1,3}(?:\s*[-–]\s*\d{1,3})?)/giu;const walker=document.createTreeWalker(document.querySelector('.content')||document.body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode()){const n=walker.currentNode;if(n.parentElement&&!n.parentElement.closest('button,a,.bible-ref,.footer'))nodes.push(n)}nodes.forEach(node=>{const value=node.nodeValue||'';pattern.lastIndex=0;if(!pattern.test(value))return;pattern.lastIndex=0;const frag=document.createDocumentFragment();let last=0;for(const match of value.matchAll(pattern)){const start=match.index||0;frag.append(document.createTextNode(value.slice(last,start)));const ref=document.createElement('button');ref.type='button';ref.className='bible-ref';ref.textContent='📖 '+match[0];ref.dataset.reference=match[0];ref.setAttribute('aria-label','Consultar '+match[0]);const wrap=document.createElement('span');wrap.className='bible-ref-wrap';wrap.append(ref);frag.append(wrap);last=start+match[0].length}frag.append(document.createTextNode(value.slice(last)));node.parentNode.replaceChild(frag,node)});document.addEventListener('click',async e=>{const ref=e.target.closest('.bible-ref');if(!ref){if(!e.target.closest('.bible-popover'))document.querySelectorAll('.bible-popover').forEach(x=>x.remove());return}e.preventDefault();const existing=ref.parentElement.querySelector('.bible-popover');if(existing){if(e.detail!==0)existing.remove();return}document.querySelectorAll('.bible-popover').forEach(x=>x.remove());const pop=document.createElement('span');pop.className='bible-popover';pop.innerHTML='<strong></strong><span class="bible-loading">Carregando versículo…</span><button type="button" class="bible-close">Fechar ×</button>';pop.querySelector('strong').textContent=ref.dataset.reference;ref.parentElement.insertAdjacentElement('beforeend',pop);try{const url='https://api.midvash.com/v1/passages?refs='+encodeURIComponent(ref.dataset.reference)+'&version=almeida-livre';const response=await fetch(url);if(!response.ok)throw new Error('Não foi possível consultar esta referência agora.');const payload=await response.json();const item=Array.isArray(payload.data)?payload.data[0]:payload.data;const text=item?.text||(Array.isArray(item?.verses)?item.verses.join(' '):'');if(!text)throw new Error('Referência não localizada.');pop.querySelector('.bible-loading')?.remove();const p=document.createElement('span');p.className='bible-text';p.textContent=text;const credit=document.createElement('small');credit.textContent=payload.meta?.copyright||'Bíblia Livre (Almeida 1819)';pop.insertBefore(p,pop.querySelector('.bible-close'));pop.insertBefore(credit,pop.querySelector('.bible-close'))}catch(err){pop.querySelector('.bible-loading').textContent=(err.message||'Falha ao carregar.')+' Você pode consultar em BibleGateway.';const a=document.createElement('a');a.href='https://www.biblegateway.com/passage/?search='+encodeURIComponent(ref.dataset.reference)+'&version=ARC';a.target='_blank';a.rel='noreferrer';a.textContent='Abrir referência ↗';pop.insertBefore(a,pop.querySelector('.bible-close'))}});document.addEventListener('click',e=>{if(e.target.classList.contains('bible-close'))e.target.closest('.bible-popover').remove()});}function attachBibleReferenceStyles(){const style=document.createElement('style');style.textContent='.bible-ref-wrap{position:relative;display:inline-block}.bible-ref{display:inline;padding:0;border:0;border-bottom:1px dotted #286b9f;background:transparent;color:#286b9f;font:inherit;font-weight:800;cursor:pointer}.bible-popover{position:absolute;z-index:20;display:flex;flex-direction:column;gap:8px;width:min(350px,80vw);max-height:50vh;overflow:auto;padding:15px;border:1px solid #d9b56d;border-radius:10px;background:#fffdf8;color:#24364b;box-shadow:0 12px 35px #0005;font:14px/1.6 Arial,sans-serif;white-space:normal}.bible-popover strong{color:#8c6b31}.bible-popover small{color:#68788a;font-size:10px}.bible-close{align-self:flex-start;padding:5px 9px;border:1px solid #ddd;border-radius:6px;background:white;color:#24364b;cursor:pointer}.bible-popover a{color:#8c6b31;font-weight:bold}';document.head.append(style)}attachBibleReferenceStyles();attachBibleReferences();show();</script></body></html>`
}

type ImportedMaterial = { id: string; name: string; size: number; type: string; importedAt: string; text: string; studyTitle: string; kind?: 'estudo' | 'esboco' }
type ImportPreview = { id: string; file: File; text: string; title: string; passage: string }
function openMaterialsDb(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const request = indexedDB.open('ceb-imported-materials', 1); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('materials')) request.result.createObjectStore('materials', { keyPath: 'id' }) }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) }) }
async function listImportedMaterials(): Promise<ImportedMaterial[]> { const db = await openMaterialsDb(); return new Promise((resolve, reject) => { const request = db.transaction('materials', 'readonly').objectStore('materials').getAll(); request.onsuccess = () => { resolve((request.result as Array<ImportedMaterial & { blob: Blob }>).map(({ blob: _blob, ...item }) => item)); db.close() }; request.onerror = () => { db.close(); reject(request.error) } }) }
async function storeImportedMaterial(material: ImportedMaterial, file: Blob) { const db = await openMaterialsDb(); return new Promise<void>((resolve, reject) => { const tx = db.transaction('materials', 'readwrite'); tx.objectStore('materials').put({ ...material, blob: file }); tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => { db.close(); reject(tx.error) } }) }
async function getImportedBlob(id: string): Promise<Blob | undefined> { const db = await openMaterialsDb(); return new Promise((resolve, reject) => { const request = db.transaction('materials', 'readonly').objectStore('materials').get(id); request.onsuccess = () => { db.close(); resolve(request.result?.blob as Blob | undefined) }; request.onerror = () => { db.close(); reject(request.error) } }) }
async function deleteImportedMaterial(id: string) { const db = await openMaterialsDb(); return new Promise<void>((resolve, reject) => { const tx = db.transaction('materials', 'readwrite'); tx.objectStore('materials').delete(id); tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => { db.close(); reject(tx.error) } }) }
const importModule = (url: string): Promise<any> => (new Function('url', 'return import(url)') as (url: string) => Promise<any>)(url)
async function extractImportedText(file: File): Promise<string> {
  const extension = file.name.toLowerCase().split('.').pop()
  if (extension === 'pdf' || file.type === 'application/pdf') {
    const pdfjs = await importModule('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs'
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
    const pages: string[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) { const page = await pdf.getPage(pageNumber); const content = await page.getTextContent(); pages.push(content.items.map((item: { str?: string; hasEOL?: boolean }) => (item.str || '') + (item.hasEOL ? '\\n' : ' ')).join('').replace(/[ \\t]+\\n/g, '\\n').trim()) }
    const text = pages.join('\n\n').trim()
    if (!text) throw new Error('Este PDF parece ser uma digitalização sem texto selecionável. Será necessário OCR antes da conversão.')
    return text
  }
  if (extension === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammothModule = await importModule('https://esm.sh/mammoth@1.9.0?bundle')
    const mammoth = mammothModule.default || mammothModule
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    const text = String(result.value || '').trim()
    if (!text) throw new Error('Não encontrei texto no documento Word.')
    return text
  }
  if (extension === 'doc') throw new Error('Este é um Word antigo (.doc). Abra-o no Word e use “Salvar como” → “Documento do Word (.docx)” para permitir a extração do texto.')
  throw new Error('Formato não reconhecido. Selecione um arquivo PDF ou Word (.docx).')
}

function App() {
  const [active, setActive] = useState<Section>('inicio')
  const [study, setStudy] = useState<Study>(() => {
    try { const saved = localStorage.getItem('ceb-study-draft'); return saved ? JSON.parse(saved) as Study : blankStudy } catch { return blankStudy }
  })
  const [savedStudies, setSavedStudies] = useState<Study[]>(() => {
    try { return JSON.parse(localStorage.getItem('ceb-saved-studies') || '[]') as Study[] } catch { return [] }
  })
  const [importedMaterials, setImportedMaterials] = useState<ImportedMaterial[]>([])
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [importKind, setImportKind] = useState<'estudo' | 'esboco'>('estudo')
  const [libraryView, setLibraryView] = useState<'inicio' | 'estudos' | 'esbocos' | 'estudos-prontos' | 'estudos-criados' | 'esbocos-prontos' | 'esbocos-criados'>('inicio')
  const [showPreview, setShowPreview] = useState(false)
  const [notice, setNotice] = useState('')
  const [readingMode, setReadingMode] = useState(false)
  const [readingPreferences, setReadingPreferences] = useState<ReadingPreferences>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ceb-reading-preferences') || '{}') as Partial<ReadingPreferences>
      return { fontSize: Math.min(32, Math.max(16, Number(saved.fontSize) || 21)), lineHeight: Math.min(2.2, Math.max(1.35, Number(saved.lineHeight) || 1.7)), theme: saved.theme === 'creme' || saved.theme === 'escuro' ? saved.theme : 'claro' }
    } catch { return { fontSize: 21, lineHeight: 1.7, theme: 'claro' } }
  })

  useEffect(() => { localStorage.setItem('ceb-study-draft', JSON.stringify(study)) }, [study])
  useEffect(() => { localStorage.setItem('ceb-reading-preferences', JSON.stringify(readingPreferences)) }, [readingPreferences])
  useEffect(() => {
    if (!readingMode) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setReadingMode(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown) }
  }, [readingMode])
  const changeReadingPreference = <K extends keyof ReadingPreferences,>(key: K, value: ReadingPreferences[K]) => setReadingPreferences((current) => ({ ...current, [key]: value }))
  const toggleReadingFullscreen = async () => {
    try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.(); else await document.exitFullscreen?.() } catch { setNotice('A tela cheia não está disponível neste navegador.') }
  }
  useEffect(() => { localStorage.setItem('ceb-saved-studies', JSON.stringify(savedStudies)) }, [savedStudies])
  useEffect(() => { void listImportedMaterials().then(setImportedMaterials).catch(() => setNotice('Não foi possível carregar os arquivos importados neste navegador.')) }, [])
  const prepareImport = async (file?: File) => {
    if (!file) return
    setImportBusy(true); setNotice('')
    try {
      const text = await extractImportedText(file)
      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      const title = (lines[0] || file.name.replace(/\.[^.]+$/, '')).slice(0, 180)
      const passageMatch = text.match(BIBLE_REFERENCE_PATTERN)
      setImportPreview({ id: crypto.randomUUID(), file, text, title, passage: passageMatch?.[0] || '' })
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível ler o arquivo.') } finally { setImportBusy(false) }
  }
  const confirmImport = async () => {
    if (!importPreview) return
    const preview = importPreview
    const material: ImportedMaterial = { id: preview.id, name: preview.file.name, size: preview.file.size, type: preview.file.type || 'application/octet-stream', importedAt: new Date().toISOString(), text: preview.text, studyTitle: preview.title, kind: importKind }
    try {
      await storeImportedMaterial(material, preview.file)
      setImportedMaterials((current) => [material, ...current.filter((item) => item.id !== material.id)])
      const importedStudy: Study = { title: preview.title, passage: preview.passage, theme: '', introduction: preview.text, points: [], conclusion: '', kind: importKind }
      setSavedStudies((current) => [importedStudy, ...current.filter((item) => !(item.title === importedStudy.title && item.passage === importedStudy.passage && item.kind === importedStudy.kind))])
      setStudy(importedStudy)
      setActive('importar'); setImportPreview(null)
      setNotice(importKind === 'esboco' ? 'Esboço importado em Biblioteca › Esboços › Criados por mim. O original está guardado aqui; use “Abrir na preparação” para editar.' : 'Estudo importado em Biblioteca › Estudos bíblicos › Criados por mim. O original está guardado aqui; use “Abrir na preparação” para editar.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch { setNotice('Não foi possível guardar o arquivo original neste navegador. Verifique o espaço disponível e tente novamente.') }
  }
  const downloadImportedOriginal = async (item: ImportedMaterial) => {
    try { const blob = await getImportedBlob(item.id); if (!blob) { setNotice('O arquivo original não foi encontrado neste navegador.'); return }; const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = item.name; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000) }
    catch { setNotice('Não foi possível abrir o arquivo original.') }
  }
  const removeImported = async (item: ImportedMaterial) => {
    if (!window.confirm('Excluir “' + item.name + '” e seu arquivo original desta biblioteca?')) return
    try { await deleteImportedMaterial(item.id); setImportedMaterials((current) => current.filter((entry) => entry.id !== item.id)); setNotice('Material e arquivo original excluídos deste navegador.') } catch { setNotice('Não foi possível excluir este material.') }
  }

  const slides = useMemo(() => buildSlides(study), [study])
  const openSection = (section: Section) => { if (section === 'biblioteca') setLibraryView('inicio'); setActive(section); setShowPreview(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const updateStudy = (key: 'title' | 'passage' | 'theme' | 'introduction' | 'conclusion', value: string) => setStudy((current) => ({ ...current, [key]: value }))
  const updatePoint = (index: number, key: keyof Point, value: string) => setStudy((current) => ({ ...current, points: current.points.map((point, i) => i === index ? { ...point, [key]: value } : point) }))
  const saveStudy = () => {
    const kind = active === 'pregacoes' ? 'esboco' : (study.kind || 'estudo')
    const itemToSave: Study = { ...study, kind }
    const next = [...savedStudies.filter((item) => !(item.title === itemToSave.title && item.passage === itemToSave.passage && (item.kind || 'estudo') === kind)), itemToSave]
    setSavedStudies(next)
    setStudy(itemToSave)
    setNotice(kind === 'esboco' ? 'Esboço salvo em Biblioteca › Esboços › Criados por mim.' : 'Estudo salvo em Biblioteca › Estudos bíblicos › Criados por mim.')
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
  const loadStudy = (item: Study) => { const kind = item.kind || 'estudo'; setStudy({ ...item, kind, points: item.points.map((p) => ({ ...p })) }); setActive(kind === 'esboco' ? 'pregacoes' : 'estudos'); setShowPreview(false) }
  const openLibraryView = (view: typeof libraryView) => { setLibraryView(view); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openPreparedMaterial = (item: Study, kind: 'estudo' | 'esboco') => { setStudy({ ...item, kind, points: item.points.map((p) => ({ ...p })) }); setActive('biblioteca'); setReadingMode(true) }
  const editPreparedCopy = (item: Study, kind: 'estudo' | 'esboco') => { const copy = { ...item, title: `${item.title} — Minha versão`, kind, points: item.points.map((p) => ({ ...p })) }; setStudy(copy); setActive(kind === 'esboco' ? 'pregacoes' : 'estudos'); setShowPreview(false); setNotice('Você está editando uma cópia. O modelo pronto da Biblioteca não será alterado.'); window.scrollTo({ top: 0, behavior: 'smooth' }) }

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
        </> : active === 'biblioteca' ? <section className="content-section section-view">
          <button className="back-link" onClick={() => libraryView === 'inicio' ? openSection('inicio') : openLibraryView(libraryView === 'estudos' || libraryView === 'esbocos' ? 'inicio' : libraryView.startsWith('estudos') ? 'estudos' : 'esbocos')}>{libraryView === 'inicio' ? '← Voltar ao início' : libraryView === 'estudos' || libraryView === 'esbocos' ? '← Voltar à Biblioteca' : libraryView.startsWith('estudos') ? '← Voltar a Estudos bíblicos' : '← Voltar a Esboços de pregação'}</button>
          <span className="eyebrow">CONSULTA E ORGANIZAÇÃO</span>
          <h2>{libraryView === 'inicio' ? 'Biblioteca de materiais' : libraryView.startsWith('estudos') ? 'Estudos bíblicos' : 'Esboços de pregação'}</h2>
          <p className="section-intro">{libraryView === 'inicio' ? 'Escolha o tipo de material que deseja consultar ou editar.' : libraryView === 'estudos' || libraryView === 'esbocos' ? (libraryView === 'estudos' ? 'Escolha entre estudos prontos e estudos criados por você.' : 'Escolha entre esboços prontos e esboços criados por você.') : libraryView.endsWith('prontos') ? 'Materiais de referência já organizados para leitura e inspiração.' : 'Conteúdos que você criou ou importou e guardou nesta biblioteca.'}</p>
          {libraryView === 'inicio' ? <>
            <div className="library-category-grid">
              <button className="library-category-card" onClick={() => openLibraryView('estudos')}><span>📖</span><strong>Estudos bíblicos</strong><small>Estudos prontos e estudos criados por mim</small><b>Explorar estudos →</b></button>
              <button className="library-category-card" onClick={() => openLibraryView('esbocos')}><span>🎙️</span><strong>Esboços de pregação</strong><small>Esboços prontos e esboços criados por mim</small><b>Explorar esboços →</b></button>
            </div>
            <div className="import-actions" style={{ justifyContent: 'center', marginTop: '1.25rem' }}>
              <button className="primary-button" onClick={() => openSection('importar')}>📥 Importar PDF ou Word</button>
            </div>
          </> : <>
            {(libraryView === 'estudos' || libraryView === 'esbocos' || libraryView.startsWith('estudos') || libraryView.startsWith('esbocos')) && <div className="library-subnav">
              {libraryView.startsWith('estudos') ? <>
                <button className={libraryView === 'estudos-prontos' ? 'selected' : ''} onClick={() => openLibraryView('estudos-prontos')}>📘 Estudos prontos</button>
                <button className={libraryView === 'estudos-criados' ? 'selected' : ''} onClick={() => openLibraryView('estudos-criados')}>✍️ Estudos criados por mim</button>
              </> : <>
                <button className={libraryView === 'esbocos-prontos' ? 'selected' : ''} onClick={() => openLibraryView('esbocos-prontos')}>📗 Esboços prontos</button>
                <button className={libraryView === 'esbocos-criados' ? 'selected' : ''} onClick={() => openLibraryView('esbocos-criados')}>✍️ Esboços criados por mim</button>
              </>}
            </div>}
            {libraryView === 'estudos-prontos' && <div className="ready-material-card"><span className="ready-badge">MODELO DE REFERÊNCIA</span><h3>{blankStudy.title}</h3><p className="material-passage">{renderReferences(blankStudy.passage)}</p><p>{blankStudy.theme}</p><div className="import-actions"><button className="primary-button" onClick={() => openPreparedMaterial(blankStudy, 'estudo')}>📖 Ler estudo formatado</button><button className="secondary-button" onClick={() => editPreparedCopy(blankStudy, 'estudo')}>✍️ Editar uma cópia</button></div></div>}
            {libraryView === 'esbocos-prontos' && <div className="ready-material-card"><span className="ready-badge">MODELO DE REFERÊNCIA</span><h3>A esperança não decepciona — esboço de pregação</h3><p className="material-passage">{renderReferences(blankStudy.passage)}</p><p>Modelo de estrutura para uma mensagem: tema, introdução, desenvolvimento com explicação e aplicação, e conclusão.</p><div className="import-actions"><button className="primary-button" onClick={() => openPreparedMaterial({ ...blankStudy, title: 'A esperança não decepciona — esboço de pregação' }, 'esboco')}>📖 Ler esboço formatado</button><button className="secondary-button" onClick={() => editPreparedCopy({ ...blankStudy, title: 'A esperança não decepciona — esboço de pregação' }, 'esboco')}>✍️ Editar uma cópia</button></div></div>}
            {libraryView.endsWith('criados') && <div className="library-list">
              {savedStudies.filter((item) => (item.kind || 'estudo') === (libraryView.startsWith('esbocos') ? 'esboco' : 'estudo')).length ? savedStudies.filter((item) => (item.kind || 'estudo') === (libraryView.startsWith('esbocos') ? 'esboco' : 'estudo')).map((item, index) => <article className="library-item" key={item.title + item.passage + index}><div><h3>{item.title || 'Sem título'}</h3><p>{renderReferences(item.passage || 'Texto bíblico não informado')}</p><small>{renderReferences(item.theme || 'Sem tema central informado')}</small></div><div className="import-actions"><button className="secondary-button" onClick={() => openPreparedMaterial(item, item.kind || 'estudo')}>📖 Ler formatado</button><button className="secondary-button" onClick={() => loadStudy(item)}>✍️ Editar conteúdo</button></div></article>) : <div className="detail-panel"><h3>Ainda não há materiais nesta seção</h3><p>Você pode preparar um novo conteúdo ou importar um arquivo PDF/Word. Depois de salvar, ele aparecerá aqui automaticamente.</p><button className="primary-button" onClick={() => openSection(libraryView.startsWith('esbocos') ? 'pregacoes' : 'estudos')}>Criar agora →</button><button className="secondary-button" onClick={() => openSection('importar')}>Importar material</button></div>}
            </div>}
          </>}
        </section> : active === 'importar' ? <section className="content-section section-view">
          <button className="back-link" onClick={() => openSection('biblioteca')}>← Voltar à Biblioteca</button><span className="eyebrow">PDF · WORD · ORGANIZAÇÃO</span><h2>Importar materiais</h2><p className="section-intro">Escolha o tipo de conteúdo. O arquivo original será preservado neste navegador e o texto extraído ficará na categoria correspondente da Biblioteca.</p>
          <div className="import-panel">
            <h3>📥 Selecione um arquivo</h3><p>Formatos aceitos: PDF com texto selecionável e Word (.docx). PDF digitalizado sem texto exige OCR; documentos antigos .doc precisam ser convertidos para .docx.</p>
            <label className="study-form"><span className="import-kind-label">Este material é:</span><select value={importKind} onChange={(event) => setImportKind(event.target.value as 'estudo' | 'esboco')}><option value="estudo">📖 Estudo bíblico</option><option value="esboco">🎙️ Esboço de pregação</option></select></label>
            <label className="import-file-label">Selecionar PDF ou Word (.docx)<input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { void prepareImport(event.target.files?.[0]); event.currentTarget.value = '' }} /></label>
            {importBusy && <p role="status">Lendo o documento… arquivos grandes podem levar alguns instantes.</p>}
            {importPreview && <div className="import-preview"><h4>Prévia antes de importar: {importPreview.file.name}</h4><p><strong>Título identificado:</strong> {importPreview.title}</p><p><strong>Texto bíblico identificado:</strong> {importPreview.passage || 'Nenhuma referência identificada automaticamente'}</p><pre>{importPreview.text.slice(0, 4500)}{importPreview.text.length > 4500 ? '\n\n… (prévia parcial; o texto completo será preservado)' : ''}</pre><div className="import-actions"><button className="primary-button" onClick={() => void confirmImport()}>Guardar original e adicionar aos criados</button><button className="secondary-button" onClick={() => setImportPreview(null)}>Cancelar</button></div></div>}
          </div>
          <div className="library-imported"><h3>Arquivos originais guardados neste navegador ({importedMaterials.length})</h3>{importedMaterials.length ? importedMaterials.map((item) => <article className="library-item" key={item.id}><div><h3>{item.name}</h3><p>{item.kind === 'esboco' ? 'Esboço de pregação' : 'Estudo bíblico'} · {(item.size / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB · importado em {new Date(item.importedAt).toLocaleDateString('pt-BR')}</p><small>Texto extraído: {item.text.length.toLocaleString('pt-BR')} caracteres</small></div><div className="import-actions"><button className="secondary-button" onClick={() => void downloadImportedOriginal(item)}>Baixar original</button><button className="secondary-button" onClick={() => { const kind = item.kind || 'estudo'; const importedStudy: Study = { title: item.studyTitle, passage: item.text.match(BIBLE_REFERENCE_PATTERN)?.[0] || '', theme: '', introduction: item.text, points: [], conclusion: '', kind }; setStudy(importedStudy); setActive(kind === 'esboco' ? 'pregacoes' : 'estudos') }}>Abrir na preparação</button><button className="danger-button" onClick={() => void removeImported(item)}>Excluir original</button></div></article>) : <p className="library-empty">Nenhum arquivo original importado ainda.</p>}</div>
          {notice && <div className="success-notice" role="status">{notice}</div>}
        </section> : <section className="content-section section-view">
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
          <div className="action-bar"><button className="secondary-button" onClick={saveStudy}>Salvar estudo</button><button className="secondary-button" onClick={() => setReadingMode(true)}>📖 Modo de leitura</button><button className="secondary-button" onClick={() => setShowPreview((value) => !value)}>{showPreview ? 'Ocultar apresentação' : 'Ver apresentação'}</button><button className="primary-button" onClick={downloadHtml}>Gerar apresentação HTML ↓</button></div>
          {showPreview && <div className="presentation-preview"><div className="preview-heading"><div><span className="eyebrow">PRÉ-VISUALIZAÇÃO · {slides.length} SLIDES</span><h3>Apresentação: {study.title}</h3></div><button className="secondary-button" onClick={downloadHtml}>Baixar HTML</button></div><div className="preview-slide-grid">{slides.map((slide, index) => <article className="preview-slide" key={index}><span>{String(index + 1).padStart(2, '0')} / {slides.length}</span><small>{slide.kicker}</small><h4>{slide.title}</h4><p>{renderReferences(slide.body[0])}</p>{slide.note && <aside>{renderReferences(slide.note)}</aside>}</article>)}</div><p className="preview-help">O arquivo baixado abre diretamente no navegador e inclui botões Voltar/Avançar, tela cheia, setas do teclado e impressão.</p></div>}
        </section>}
      </main>
      {readingMode && <div className={`reading-overlay reading-${readingPreferences.theme}`} role="dialog" aria-modal="true" aria-label={`Modo de leitura: ${study.title}`}>
        <div className="reading-toolbar">
          <div className="reading-toolbar-title"><strong>📖 Modo de leitura</strong><span>{study.kind === 'esboco' || active === 'pregacoes' ? 'Esboço de pregação' : active === 'ebd' ? 'Estudo para EBD' : 'Estudo bíblico'}</span></div>
          <div className="reading-controls">
            <div className="reading-control-group" aria-label="Tamanho da fonte"><span>Fonte</span><button type="button" onClick={() => changeReadingPreference('fontSize', Math.max(16, readingPreferences.fontSize - 1))} aria-label="Diminuir fonte">A−</button><strong>{readingPreferences.fontSize}px</strong><button type="button" onClick={() => changeReadingPreference('fontSize', Math.min(32, readingPreferences.fontSize + 1))} aria-label="Aumentar fonte">A+</button></div>
            <label className="reading-line-control">Espaçamento <input type="range" min="1.35" max="2.2" step="0.05" value={readingPreferences.lineHeight} onChange={(event) => changeReadingPreference('lineHeight', Number(event.target.value))} /></label>
            <div className="reading-control-group" aria-label="Cor de fundo"><span>Fundo</span><button type="button" className={readingPreferences.theme === 'claro' ? 'selected' : ''} onClick={() => changeReadingPreference('theme', 'claro')}>Claro</button><button type="button" className={readingPreferences.theme === 'creme' ? 'selected' : ''} onClick={() => changeReadingPreference('theme', 'creme')}>Creme</button><button type="button" className={readingPreferences.theme === 'escuro' ? 'selected' : ''} onClick={() => changeReadingPreference('theme', 'escuro')}>Escuro</button></div>
            <button type="button" className="reading-toolbar-button" onClick={() => void toggleReadingFullscreen()}>⛶ Tela cheia</button><button type="button" className="reading-close-button" onClick={() => setReadingMode(false)}>Fechar ×</button>
          </div>
        </div>
        <article className="reading-page" style={{ fontSize: `${readingPreferences.fontSize}px`, lineHeight: readingPreferences.lineHeight }}>
          <div className="reading-church">CENTRAL DE ESTUDOS BÍBLICOS · IGREJA BATISTA NOVA ESPERANÇA</div>
          <h1>{study.title || (study.kind === 'esboco' || active === 'pregacoes' ? 'Esboço de pregação' : 'Estudo bíblico')}</h1>
          {study.passage && <p className="reading-passage">{renderReferences(study.passage)}</p>}
          {study.theme && <div className="reading-theme"><strong>Tema central</strong><p>{renderReferences(study.theme)}</p></div>}
          {study.introduction && <section className="reading-section"><h2>Introdução</h2><p>{renderReferences(study.introduction)}</p></section>}
          {study.points.some((point) => point.title || point.explanation || point.application) && <section className="reading-section"><h2>Desenvolvimento</h2>{study.points.map((point, index) => (point.title || point.explanation || point.application) && <section className="reading-point" key={`${index}-${point.title}`}><h3>{index + 1}. {point.title || `Ponto ${index + 1}`}</h3>{point.explanation && <p>{renderReferences(point.explanation)}</p>}{point.application && <p className="reading-application"><strong>Aplicação prática:</strong> {renderReferences(point.application)}</p>}</section>)}</section>}
          {study.conclusion && <section className="reading-section"><h2>Conclusão</h2><p>{renderReferences(study.conclusion)}</p></section>}
          <div className="reading-footer">CENTRAL DE ESTUDOS BÍBLICOS · IGREJA BATISTA NOVA ESPERANÇA</div>
        </article>
      </div>}
      <footer className="footer"><div className="footer-brand"><span className="brand-mark small">✝</span><strong>Central de Estudos Bíblicos</strong></div><span>Igreja Batista Nova Esperança · Palavra, ensino e prática.</span></footer>
      <nav className="mobile-nav" aria-label="Navegação principal">{navigation.map((item) => <button key={item.id} className={active === item.id ? 'nav-item active' : 'nav-item'} onClick={() => openSection(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
    </div>
  )
}

export default App

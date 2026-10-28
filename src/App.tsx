import { TeacherQuiz } from './Quiz'
import { QuizStatus } from './QuizStatus'
import LibraryPresentation, { downloadSavedPresentation, savedPresentationHtml } from './LibraryPresentation'
import { createPresentationHtml, defaultPresentationMode, type PresentationMode } from './presentation.mjs'
import cebPresentationLogo from '../public/ceb-book.png?inline'
import churchPresentationLogo from '../public/icon-192.png?inline'
import circularChurchPresentationLogo from '../identidade-visual/logo-circular-azul-2.png?inline'
import { useEffect, useState, useRef, type FormEvent } from 'react'
import { changeCebPassword, createCloudStudy, listCloudStudies, loginCeb, logoutCeb, updateCloudStudy, type CebUser, type CloudStudy, type CloudMaterial, type CloudFolder, type ImportCategory, cloudMaterials, libraryCapabilities, cloudFolders, createCloudFolder, uploadCloudMaterial, downloadCloudMaterial, patchCloudMaterial, trashCloudMaterial, restoreCloudMaterial, restoreCloudStudy, deleteCloudStudy, patchCloudStudyApplication, cebApi } from './cebApi'
import CebAdmin from './CebAdmin'
import CebAluno from './CebAluno'

type Section = 'inicio' | 'estudos' | 'pregacoes' | 'ebd' | 'biblioteca' | 'importar'
type Point = { title: string; explanation: string; application: string }
type Study = { applied?: boolean; appliedDate?: string; libraryScope?: 'general' | 'private'; cloudId?: string; title: string; passage: string; theme: string; introduction: string; points: Point[]; conclusion: string; kind?: 'estudo' | 'esboco'; collection?: 'ebd'; ebdType?: 'licao' | 'manual' | 'apresentacao' | 'apoio'; ebdCourse?: string; legacySource?: string; legacySections?: { title: string; content: string }[] }
function studyFromCloud(item: CloudStudy): Study {
  const content = item.content as unknown as Study
  return {...content, title:item.title, cloudId:item.id, libraryScope:content.libraryScope || (item.visibility === 'private' ? 'private' : 'general')}
}
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


const blankContentStudy: Study = { title: '', passage: '', theme: '', introduction: '', points: [{ title: '', explanation: '', application: '' }, { title: '', explanation: '', application: '' }, { title: '', explanation: '', application: '' }], conclusion: '', kind: 'estudo' }

const blankEbdStudy: Study = {
  title: '', passage: '', theme: '', introduction: '',
  points: [
    { title: '', explanation: '', application: '' },
    { title: '', explanation: '', application: '' },
    { title: '', explanation: '', application: '' },
  ],
  conclusion: '', kind: 'estudo', collection: 'ebd', ebdType: 'licao', ebdCourse: '',
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
  biblioteca: { title: 'Biblioteca', subtitle: 'Consulte os materiais salvos na nuvem, conforme suas permissões.' },
  importar: { title: 'Importar materiais', subtitle: 'Traga seus estudos e esboços em PDF ou Word, guarde o arquivo original e organize o texto para edição.' },
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
      const normalizedReference = reference.replace(/[–—]/g, '-')
      const url = `https://api.midvash.com/v1/passages?refs=${encodeURIComponent(normalizedReference)}&version=almeida-livre`
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


const importCategories: {id:ImportCategory;label:string}[] = [{id:'estudo',label:'Estudo bíblico'},{id:'esboco',label:'Esboço de pregação'},{id:'ebd-licao',label:'Aula / Lição da EBD'},{id:'ebd-manual',label:'Manual do professor'},{id:'ebd-apresentacao',label:'Apresentação da EBD'},{id:'ebd-apoio',label:'Material de apoio'}]
type ImportedMaterial = { id: string; name: string; size: number; type: string; importedAt: string; text: string; studyTitle: string; kind?: 'estudo' | 'esboco'; category?: ImportCategory; scope?: 'private' | 'general'; folder?: string; applied?: boolean; appliedDate?: string }
function importedStudy(item: ImportedMaterial): Study {
  return {title:item.studyTitle || item.name,passage:item.text.match(BIBLE_REFERENCE_PATTERN)?.[0] || '',theme:'',introduction:item.text,points:[],conclusion:'',kind:item.kind || 'estudo'}
}
type ImportPreview = { id: string; file: File; text: string; title: string; passage: string }
function fromCloudMaterial(item: CloudMaterial): ImportedMaterial {
  return { id: item.id, name: item.filename, size: item.byte_size, type: item.mime_type, importedAt: item.created_at, text: item.extracted_text, studyTitle: item.title, kind: item.kind, category: item.category || item.kind, scope: item.scope, folder: item.folder || undefined, applied: item.applied, appliedDate: item.applied_date?.slice(0,10) || '' }
}
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
  if (extension === 'html' || extension === 'htm') {
    const dom = new DOMParser().parseFromString(await file.text(), 'text/html')
    dom.querySelectorAll('script,style,noscript,iframe,svg,nav').forEach((node) => node.remove())
    dom.querySelectorAll('br').forEach(node => node.replaceWith('\n'))
    dom.querySelectorAll('h1,h2,h3,h4,h5,h6,p,div,li,section,article,tr').forEach(node => { node.prepend('\n'); node.append('\n') })
    const text = (dom.body?.textContent || '').replace(/[ \t]+/g, ' ').replace(/\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    if (!text) throw new Error('Não encontrei texto no HTML.')
    return text
  }
  if (extension === 'pptx') {
    const module = await importModule('https://esm.sh/jszip@3.10.1?bundle')
    const zip = await (module.default || module).loadAsync(await file.arrayBuffer())
    const paths = Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).sort((a,b) => Number(a.match(/slide(\d+)/)?.[1] || 0) - Number(b.match(/slide(\d+)/)?.[1] || 0))
    const texts: string[] = []
    for (const path of paths) {
      const xml = new DOMParser().parseFromString(await zip.files[path].async('string'), 'application/xml')
      const words = Array.from(xml.getElementsByTagName('*')).filter((node) => node.localName === 't').map((node) => node.textContent || '')
      if (words.length) texts.push(words.join(' '))
    }
    if (!texts.length) throw new Error('Não encontrei texto nos slides. Imagens não são convertidas automaticamente.')
    return texts.join('\n\n')
  }
  if (extension === 'doc') throw new Error('Este é um Word antigo (.doc). Abra-o no Word e use “Salvar como” → “Documento do Word (.docx)” para permitir a extração do texto.')
  throw new Error('Formato não reconhecido. Selecione PDF, Word (.docx), PowerPoint (.pptx) ou HTML.')
}

function CebWorkspace({ token, user }: { token: string; user: CebUser }) {
  const [active, setActive] = useState<Section>('inicio')
  const [ebdPreparationMode, setEbdPreparationMode] = useState<'choose' | 'manual' | 'automatic'>('choose')
  const [contentPreparationMode, setContentPreparationMode] = useState<'choose' | 'manual' | 'automatic'>('choose')
  const [automaticGuidance, setAutomaticGuidance] = useState('')
  const [automaticAnswer, setAutomaticAnswer] = useState('')
  const [study, setStudy] = useState<Study>(() => {
    try { const saved = localStorage.getItem('ceb-study-draft'); return saved ? JSON.parse(saved) as Study : blankStudy } catch { return blankStudy }
  })
  const [libraryPresentation, setLibraryPresentation] = useState<Study | null>(null)
  const [quizMaterial, setQuizMaterial] = useState<Study | null>(null)
  const [shareQuiz, setShareQuiz] = useState(false)
  const [shareMaterial, setShareMaterial] = useState<Study | null>(null)
  const [sharingBusy, setSharingBusy] = useState(false)
  const [shareAudience, setShareAudience] = useState<'all' | 'selected'>('all')
  const [shareEnabled, setShareEnabled] = useState(true)
  const [shareDownloads, setShareDownloads] = useState(false)
  const [shareStudents, setShareStudents] = useState<{id:string;display_name:string;username:string}[]>([])
  const [shareSelectedIds, setShareSelectedIds] = useState<string[]>([])
  const [shareError, setShareError] = useState('')
  const openSharing = async (item: Study) => {
    setShareMaterial(item); setShareError('')
    const current = (item as Study & {sharing?: {enabled?:boolean;audience?:string;userIds?:string[];allowDownload?:boolean;quizEnabled?:boolean}}).sharing
    setShareEnabled(current?.enabled ?? true)
    setShareAudience(current?.audience === 'selected' ? 'selected' : 'all')
    setShareSelectedIds(current?.userIds || [])
    setShareDownloads(!!current?.allowDownload)
    setShareQuiz(!!current?.quizEnabled)
    try {
      const result = await cebApi<{users:{id:string;display_name:string;username:string;app_role:string;is_active:boolean}[]}>('/admin/users',{token})
      setShareStudents(result.users.filter(u=>u.app_role==='user'&&u.is_active))
    } catch { setShareError('Não foi possível carregar a lista de alunos. Compartilhamento interno indisponível.') }
  }
  const saveSharing = async () => {
    if (!shareMaterial?.cloudId) { setShareError('Material não sincronizado.'); return }
    setSharingBusy(true); setShareError('')
    try {
      const body = {enabled:shareEnabled,audience:shareAudience,userIds:shareAudience==='selected'?shareSelectedIds:[],allowDownload:shareDownloads,quizEnabled:shareQuiz}
      const result = await cebApi<{study:{content:Study;visibility:string;status:string}}>(`/studies/${shareMaterial.cloudId}/sharing`, {token,method:'PUT',body})
      setSavedStudies(current=>current.map(item=>item.cloudId===shareMaterial.cloudId ? {...item,sharing:(result.study.content as Study & {sharing?:unknown}).sharing} : item))
      setStudyRecords(current => { const record = current[shareMaterial.cloudId!]; return record ? {...current, [record.id]: {...record, content: {...record.content, sharing: (result.study.content as Study & {sharing?:unknown}).sharing}, visibility: result.study.visibility as CloudStudy['visibility'], status: result.study.status as CloudStudy['status']}} : current })
      setShareMaterial(null); setNotice('Permissões de compartilhamento atualizadas no servidor.')
    } catch (error) { setShareError(error instanceof Error ? error.message : 'Falha ao salvar permissões.') }
    finally { setSharingBusy(false) }
  }
  const downloadPdfFromStudy = (item: Study) => {
    const page = window.open('', '_blank')
    if (!page) { setNotice('Permita janelas pop-up para salvar como PDF.'); return }
    const html = savedPresentationHtml(item, defaultPresentationMode(item))
    page.document.open(); page.document.write(html); page.document.close()
    setNotice('Na nova janela, use Imprimir (Ctrl+P) e escolha Salvar como PDF.')
  }
  const shareHtmlFile = async (item: Study) => {
    setSharingBusy(true)
    try {
      const html = savedPresentationHtml(item, defaultPresentationMode(item))
      const safeName = (item.title || 'estudo-ceb').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'estudo-ceb'
      const file = new File([html], safeName + '.html', { type: 'text/html' })
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ title: item.title, text: 'Material da Central de Estudos Bíblicos', files: [file] })
      } else {
        downloadSavedPresentation(item, defaultPresentationMode(item))
        setNotice('Arquivo HTML salvo. Anexe-o no WhatsApp, e-mail ou aplicativo desejado.')
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice('Não foi possível abrir o compartilhamento; use Baixar HTML.')
    } finally { setSharingBusy(false) }
  }

  const [readingDocument, setReadingDocument] = useState<Study | null>(null)
  const [studyRecords, setStudyRecords] = useState<Record<string, CloudStudy>>({})
  const [savingStudy, setSavingStudy] = useState(false)
  const savingStudyRef = useRef(false)
  const editorSession = useRef(0)
  const editingTarget = useRef<{id:string;view:typeof libraryView} | null>(null)
  const [savedStudies, setSavedStudies] = useState<Study[]>([])
  const [importedMaterials, setImportedMaterials] = useState<ImportedMaterial[]>([])
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [importKind, setImportKind] = useState<ImportCategory>('estudo')
  const [importCategoriesReady, setImportCategoriesReady] = useState(false)
  const [importFolders, setImportFolders] = useState<CloudFolder[]>([])
  const [uploadsReady, setUploadsReady] = useState(false)
  const [importScope, setImportScope] = useState<'private' | 'general'>('private')
  const [trashStudies, setTrashStudies] = useState<Study[]>([])
  const [trashMaterials, setTrashMaterials] = useState<ImportedMaterial[]>([])
  const [showTrash, setShowTrash] = useState(false)
  const [libraryReady, setLibraryReady] = useState(false)
  const [importFolder, setImportFolder] = useState('')
  const [newImportFolder, setNewImportFolder] = useState('')
  const [libraryFolderFilter, setLibraryFolderFilter] = useState('')
  const [libraryView, setLibraryView] = useState<'inicio' | 'estudos' | 'esbocos' | 'estudos-prontos' | 'estudos-criados' | 'esbocos-prontos' | 'esbocos-criados' | 'importados' | 'importados-estudos' | 'importados-esbocos' | 'ebd' | 'ebd-cursos' | 'ebd-manuais' | 'ebd-apresentacoes' | 'ebd-apoio'>('inicio')
  const [showPreview, setShowPreview] = useState(false)
  const [presentationMode, setPresentationMode] = useState<PresentationMode>(() => defaultPresentationMode(study))
  const [notice, setNotice] = useState('')
  const [cloudStatus, setCloudStatus] = useState('Sincronizando biblioteca…')
  const [readingMode, setReadingMode] = useState(false)
  const [readingPreferences, setReadingPreferences] = useState<ReadingPreferences>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ceb-reading-preferences') || '{}') as Partial<ReadingPreferences>
      return { fontSize: Math.min(32, Math.max(16, Number(saved.fontSize) || 21)), lineHeight: Math.min(2.2, Math.max(1.35, Number(saved.lineHeight) || 1.7)), theme: saved.theme === 'creme' || saved.theme === 'escuro' ? saved.theme : 'claro' }
    } catch { return { fontSize: 21, lineHeight: 1.7, theme: 'claro' } }
  })

  const createImportFolder = async () => {
    const name = newImportFolder.trim()
    if (!name) { setNotice('Digite o nome da pasta.'); return }
    try {
      const { folder } = await createCloudFolder(token, name, importScope)
      setImportFolders(current => [...current.filter(f=>f.id!==folder.id), folder].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')))
      setImportFolder(folder.id); setNewImportFolder(''); setNotice('Pasta salva na nuvem: ' + folder.name)
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível criar a pasta na nuvem.') }
  }
  useEffect(() => { localStorage.setItem('ceb-study-draft', JSON.stringify(study)) }, [study])
  useEffect(() => { localStorage.setItem('ceb-reading-preferences', JSON.stringify(readingPreferences)) }, [readingPreferences])
  useEffect(() => {
    if (!readingMode) { setReadingDocument(null); return }
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
  useEffect(() => {
    let active = true
    listCloudStudies(token).then(({ studies }) => {
      if (!active) return
      const cloudItems: Study[] = studies.map(studyFromCloud)
      setStudyRecords(Object.fromEntries(studies.map(item => [item.id,item])))
      setSavedStudies(cloudItems)
      setCloudStatus('Biblioteca sincronizada com a nuvem.')
    }).catch(() => {
      if (active) setCloudStatus('Não foi possível consultar o Neon. Nenhum material foi salvo localmente.')
    })
    return () => { active = false }
  }, [token])
  useEffect(() => {
    let active = true
    Promise.all([libraryCapabilities(token), cloudMaterials(token), cloudFolders(token)]).then(([capabilities, { materials }, { folders }]) => {
      if (!active) return
      setLibraryReady(true); setUploadsReady(capabilities.uploads); setImportCategoriesReady(capabilities.material_categories === true)
      setImportedMaterials(materials.map(fromCloudMaterial))
      setImportFolders(folders.filter(folder => folder.owner_user_id === user.id || user.role === 'admin' && folder.scope === 'general'))
    }).catch(() => { if (active) { setLibraryReady(false); setUploadsReady(false) } })
    return () => { active = false }
  }, [token, user.id])
  const prepareImport = async (file?: File) => {
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { setNotice('O limite por arquivo é de 20 MB.'); return }
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
    if (!importPreview || importBusy || !uploadsReady) return
    setImportBusy(true)
    try {
      const { material } = await uploadCloudMaterial(token, importPreview.file, { title: importPreview.title, text: importPreview.text, kind: importKind === 'esboco' ? 'esboco' : 'estudo', category: importKind, folderId: importFolder || undefined, scope: importScope })
      setImportedMaterials(current => [fromCloudMaterial(material), ...current.filter(item => item.id !== material.id)])
      setImportPreview(null); setNotice('Material e arquivo original salvos na nuvem.')
    } catch (error) { setNotice('Não foi possível confirmar o salvamento: ' + (error instanceof Error ? error.message : 'Falha no upload.')) }
    finally { setImportBusy(false) }
  }
  const downloadImportedOriginal = async (item: ImportedMaterial) => {
    try { const blob = await downloadCloudMaterial(token,item.id); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = item.name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000) }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível abrir o arquivo original.') }
  }
  const updateImportedApplication = async (item: ImportedMaterial, applied: boolean, appliedDate = '') => {
    try {
      await patchCloudMaterial(token,item.id,applied,appliedDate)
      setImportedMaterials(current => current.map(entry => entry.id === item.id ? { ...entry, applied, appliedDate: applied ? appliedDate : '' } : entry))
      setNotice('Aplicação atualizada na nuvem.')
    } catch { setNotice('Não foi possível atualizar a aplicação na nuvem.') }
  }
  const removeImported = async (item: ImportedMaterial) => {
    if (user.role !== 'admin') return
    if (!window.confirm('Mover “' + item.name + '” para a Lixeira? O original poderá ser recuperado.')) return
    try { await trashCloudMaterial(token,item.id); setImportedMaterials(current=>current.filter(entry=>entry.id!==item.id)); setNotice('Material movido para a Lixeira na nuvem.') }
    catch { setNotice('Não foi possível excluir este material.') }
  }
  const updateStudyApplication = async (item: Study, applied: boolean, date = '') => {
    if (!item.cloudId) return
    try { await patchCloudStudyApplication(token,item.cloudId,applied,date); setSavedStudies(current=>current.map(entry=>entry.cloudId===item.cloudId ? {...entry,applied,appliedDate:applied?date:''} : entry)) }
    catch { setNotice('Não foi possível salvar a aplicação na nuvem.') }
  }
  const removeStudy = async (item: Study) => {
    if (user.role !== 'admin') return
    if (!item.cloudId || !window.confirm('Mover “' + item.title + '” para a Lixeira?')) return
    try { await deleteCloudStudy(token,item.cloudId); setSavedStudies(current=>current.filter(entry=>entry.cloudId!==item.cloudId)); setNotice('Material movido para a Lixeira.') }
    catch { setNotice('Não foi possível excluir o material na nuvem.') }
  }
  const loadTrash = async () => {
    try {
      const [{ studies },{ materials }] = await Promise.all([cebApi<{ studies: CloudStudy[] }>('/studies?trash=1',{token}),cloudMaterials(token,true)])
      setTrashStudies(studies.map(studyFromCloud))
      setTrashMaterials(materials.map(fromCloudMaterial)); setShowTrash(true)
    } catch { setNotice('Não foi possível consultar a Lixeira.') }
  }
  const restoreMaterial = async (id: string, imported: boolean) => {
    try {
      if (imported) { await restoreCloudMaterial(token,id); const { materials }=await cloudMaterials(token); setImportedMaterials(materials.map(fromCloudMaterial)) }
      else { await restoreCloudStudy(token,id); const { studies }=await listCloudStudies(token); setStudyRecords(Object.fromEntries(studies.map(item=>[item.id,item]))); setSavedStudies(studies.map(studyFromCloud)) }
      await loadTrash(); setNotice('Material restaurado na nuvem.')
    } catch { setNotice('Não foi possível restaurar o material.') }
  }
  const studyControls = (item: Study) => libraryReady ? <>
    <label className="ceb-material-applied"><input type="checkbox" checked={!!item.applied} onChange={event=>void updateStudyApplication(item,event.target.checked,item.appliedDate)} /> Material aplicado</label>
    {item.applied && <label>Data (opcional)<input type="date" value={item.appliedDate || ''} onChange={event=>void updateStudyApplication(item,true,event.target.value)} /></label>}

  </> : null

  const openSection = (section: Section) => {
    editingTarget.current = null; editorSession.current++
    if (section === 'biblioteca') setLibraryView('inicio')
    if (section === 'ebd') {
      setPresentationMode('ampliado')
      try { localStorage.setItem('ceb-general-study-draft', JSON.stringify(study)) } catch {}
      setStudy({ ...blankEbdStudy, points: blankEbdStudy.points.map((point) => ({ ...point })) })
      setEbdPreparationMode('choose'); setAutomaticGuidance(''); setAutomaticAnswer('')
    } else if (active === 'ebd') {
      try { localStorage.setItem('ceb-ebd-study-draft', JSON.stringify(study)) } catch {}
      try { const generalDraft = localStorage.getItem('ceb-general-study-draft'); if (generalDraft) setStudy(JSON.parse(generalDraft) as Study) } catch {}
      setEbdPreparationMode('choose')
    }
    if (section === 'estudos' || section === 'pregacoes') { setPresentationMode('resumido'); setStudy({ ...blankContentStudy, points: blankContentStudy.points.map((point) => ({ ...point })), kind: section === 'pregacoes' ? 'esboco' : 'estudo' }); setContentPreparationMode('choose'); setAutomaticGuidance(''); setAutomaticAnswer('') }
    else if (active === 'estudos' || active === 'pregacoes') setContentPreparationMode('choose')
    setActive(section); setShowPreview(false); setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const chooseEbdMode = (mode: 'manual' | 'automatic') => {
    setStudy({ ...blankEbdStudy, points: blankEbdStudy.points.map((point) => ({ ...point })) })
    setEbdPreparationMode(mode); setAutomaticGuidance(''); setAutomaticAnswer(''); setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const buildContentPrompt = () => { const sermon = active === 'pregacoes'; const kind = sermon ? 'esboço de pregação bíblica' : 'estudo bíblico'; const point = sermon ? 'DIVISÃO' : 'PONTO'; const explanation = sermon ? 'EXPLICAÇÃO' : 'DESENVOLVIMENTO'; return `Atue como assistente de preparação de ${kind}, fiel ao contexto bíblico e usando preferencialmente a Almeida Corrigida Fiel (ACF). Não invente citações; diferencie o que o texto afirma de inferências. ${sermon ? 'Crie um esboço pregável, com divisões que avancem o argumento bíblico, transições e conclusão pastoral.' : 'Ajude a compreender o texto, seu contexto, a verdade central e aplicações práticas.'}

Título: ${study.title.trim() || 'Sugira um título adequado'}
Texto bíblico: ${study.passage.trim() || 'Sugira um texto-base coerente'}
Tema/ideia central: ${study.theme.trim() || 'Proponha uma ideia central fiel ao texto'}
Orientações adicionais: ${automaticGuidance.trim() || 'Use linguagem clara, profundidade bíblica e aplicações concretas.'}

Use exatamente estes rótulos, cada um em uma linha:
TÍTULO:
TEXTO BÍBLICO:
TEMA CENTRAL:
INTRODUÇÃO:
${point} 1:
${explanation} 1:
APLICAÇÃO 1:
${point} 2:
${explanation} 2:
APLICAÇÃO 2:
${point} 3:
${explanation} 3:
APLICAÇÃO 3:
${point} 4:
${explanation} 4:
APLICAÇÃO 4:
CONCLUSÃO:
REFERÊNCIAS COMPLEMENTARES:

Use 3 a 4 pontos/divisões, títulos claros, explicações substanciais e aplicações concretas. Entregue uma primeira versão para revisão humana.` }
  const openChatGptForContent = async () => { const prompt = buildContentPrompt(); const chatWindow = window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer'); let copied = false; try { await navigator.clipboard.writeText(prompt); copied = true } catch {}; const label = active === 'pregacoes' ? 'esboço de pregação' : 'estudo bíblico'; setNotice(copied ? `Instruções copiadas! Cole-as na aba do ChatGPT para preparar o ${label}.` : chatWindow ? 'O ChatGPT foi aberto. Se as instruções não foram copiadas, use o botão Copiar instruções.' : 'O navegador bloqueou a nova aba. Permita pop-ups para a CEB e tente novamente.') }
  const chooseContentMode = (mode: 'manual' | 'automatic') => { setStudy({ ...blankContentStudy, points: blankContentStudy.points.map((point) => ({ ...point })), kind: active === 'pregacoes' ? 'esboco' : 'estudo' }); setContentPreparationMode(mode); setAutomaticGuidance(''); setAutomaticAnswer(''); setNotice('') }
  const importAutomaticContentAnswer = () => { const text = automaticAnswer.trim(); if (!text) { setNotice('Cole primeiro a resposta do ChatGPT.'); return }; const sermon = active === 'pregacoes'; const pLabel = sermon ? 'DIVISÃO' : 'PONTO'; const eLabel = sermon ? 'EXPLICAÇÃO' : 'DESENVOLVIMENTO'; const labels = ['TÍTULO','TEXTO BÍBLICO','TEMA CENTRAL','INTRODUÇÃO','PONTO 1','DIVISÃO 1','EXPLICAÇÃO 1','DESENVOLVIMENTO 1','APLICAÇÃO 1','PONTO 2','DIVISÃO 2','EXPLICAÇÃO 2','DESENVOLVIMENTO 2','APLICAÇÃO 2','PONTO 3','DIVISÃO 3','EXPLICAÇÃO 3','DESENVOLVIMENTO 3','APLICAÇÃO 3','PONTO 4','DIVISÃO 4','EXPLICAÇÃO 4','DESENVOLVIMENTO 4','APLICAÇÃO 4','CONCLUSÃO','REFERÊNCIAS COMPLEMENTARES']; const read = (label: string) => { const next = labels.filter((x) => x !== label).join('|'); return (text.match(new RegExp('(?:^|\\n)\\s*' + label + '\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:' + next + ')\\s*:|$)', 'i'))?.[1] || '').trim() }; const points = [1,2,3,4].map((n) => ({ title: read(pLabel+' '+n) || read((sermon?'PONTO':'DIVISÃO')+' '+n), explanation: read(eLabel+' '+n) || read((sermon?'DESENVOLVIMENTO':'EXPLICAÇÃO')+' '+n), application: read('APLICAÇÃO '+n) })); const structured = points.some((p) => p.title || p.explanation || p.application); setStudy((c) => ({ ...c, title: read('TÍTULO') || c.title, passage: read('TEXTO BÍBLICO') || c.passage, theme: read('TEMA CENTRAL') || c.theme, introduction: read('INTRODUÇÃO') || text, points: structured ? points : c.points, conclusion: read('CONCLUSÃO') || c.conclusion, kind: sermon ? 'esboco' : 'estudo', collection: undefined })); setNotice(structured ? `${sermon?'Esboço':'Estudo'} importado. Revise, ajuste e salve quando estiver satisfeito.` : 'Resposta colocada na introdução para você organizar no editor.'); window.scrollTo({top:0,behavior:'smooth'}) }
  const buildEbdPrompt = () => `Atue como meu assistente de preparação de aulas para a Escola Bíblica Dominical da Igreja Batista Nova Esperança. Prepare uma lição bíblica completa, fiel ao contexto das Escrituras e usando preferencialmente a tradução Almeida Corrigida Fiel (ACF). Não invente citações bíblicas. Explique o contexto, apresente aplicações práticas e diferencie o que o texto afirma de inferências.\n\nDADOS DO PROFESSOR:\nTítulo/tema: ${study.title.trim() || 'Sugira um título a partir das demais informações'}\nTexto bíblico base: ${study.passage.trim() || 'Sugira um texto-base adequado ao tema'}\nTema central/orientação: ${study.theme.trim() || 'Proponha um tema central coerente com o texto'}\nOrientações adicionais: ${automaticGuidance.trim() || 'Use critério pastoral e didático, mantendo fidelidade bíblica.'}\nCurso EBD: ${study.ebdCourse?.trim() || 'Lição avulsa'}\n\nOrganize a resposta exatamente com estes rótulos, cada um em uma linha:\nTÍTULO:\nTEXTO BÍBLICO:\nTEMA CENTRAL:\nINTRODUÇÃO:\nPONTO 1:\nEXPLICAÇÃO 1:\nAPLICAÇÃO 1:\nPONTO 2:\nEXPLICAÇÃO 2:\nAPLICAÇÃO 2:\nPONTO 3:\nEXPLICAÇÃO 3:\nAPLICAÇÃO 3:\nPONTO 4:\nEXPLICAÇÃO 4:\nAPLICAÇÃO 4:\nCONCLUSÃO:\nLEITURAS COMPLEMENTARES:\n\nUse de 3 a 4 pontos principais, títulos claros, explicações substanciais, aplicações práticas e referências bíblicas pertinentes. Produza uma primeira versão para revisão do professor.`
  const openChatGptForEbd = async () => {
    const prompt = buildEbdPrompt()
    const chatWindow = window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer')
    let copied = false
    try { await navigator.clipboard.writeText(prompt); copied = true } catch {}
    setNotice(copied ? 'Instruções copiadas! Na aba do ChatGPT, cole a mensagem na conversa para preparar a lição.' : chatWindow ? 'O ChatGPT foi aberto. Se as instruções não foram copiadas automaticamente, use o botão Copiar instruções.' : 'O navegador bloqueou a nova aba. Permita pop-ups para a CEB e tente novamente.')
  }
  const importAutomaticEbdAnswer = () => {
    const text = automaticAnswer.trim()
    if (!text) { setNotice('Cole primeiro a resposta preparada pelo ChatGPT.'); return }
    const labels = ['TÍTULO','TEXTO BÍBLICO','TEMA CENTRAL','INTRODUÇÃO','PONTO 1','EXPLICAÇÃO 1','EXPLICACAO 1','APLICAÇÃO 1','APLICACAO 1','PONTO 2','EXPLICAÇÃO 2','EXPLICACAO 2','APLICAÇÃO 2','APLICACAO 2','PONTO 3','EXPLICAÇÃO 3','EXPLICACAO 3','APLICAÇÃO 3','APLICACAO 3','PONTO 4','EXPLICAÇÃO 4','EXPLICACAO 4','APLICAÇÃO 4','APLICACAO 4','CONCLUSÃO','LEITURAS COMPLEMENTARES']
    const read = (label: string) => {
      const nextLabels = labels.filter((item) => item.toUpperCase() !== label.toUpperCase()).join('|')
      const pattern = new RegExp('(?:^|\\n)\\s*' + label + '\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:' + nextLabels + ')\\s*:|$)', 'i')
      return (text.match(pattern)?.[1] || '').trim()
    }
    const points = [1,2,3,4].map((n) => ({ title: read('PONTO ' + n), explanation: read('EXPLICAÇÃO ' + n) || read('EXPLICACAO ' + n), application: read('APLICAÇÃO ' + n) || read('APLICACAO ' + n) }))
    const title = read('TÍTULO') || study.title
    const passage = read('TEXTO BÍBLICO') || study.passage
    const theme = read('TEMA CENTRAL') || study.theme
    const introduction = read('INTRODUÇÃO') || text
    const conclusion = read('CONCLUSÃO')
    const hasStructuredContent = points.some((point) => point.title || point.explanation || point.application)
    setStudy((current) => ({ ...current, title, passage, theme, introduction, points: hasStructuredContent ? points : current.points, conclusion: conclusion || current.conclusion, kind: 'estudo', collection: 'ebd', ebdType: current.ebdType || 'licao' }))
    setNotice(hasStructuredContent ? 'Lição importada para o editor. Revise, ajuste e salve quando estiver satisfeito.' : 'Resposta colocada na introdução para você organizar e revisar no editor.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const updateStudy = (key: 'title' | 'passage' | 'theme' | 'introduction' | 'conclusion', value: string) => setStudy((current) => ({ ...current, [key]: value }))
  const updatePoint = (index: number, key: keyof Point, value: string) => setStudy((current) => ({ ...current, points: current.points.map((point, i) => i === index ? { ...point, [key]: value } : point) }))
  const saveStudy = async () => {
    if (savingStudyRef.current || user.role !== 'admin') return
    if (editingTarget.current && study.cloudId !== editingTarget.current.id) { setNotice('A edição perdeu o vínculo com o material salvo. Reabra o documento pela Biblioteca.'); return }
    const isEbd = active === 'ebd'
    const kind = isEbd ? 'estudo' : active === 'pregacoes' ? 'esboco' : (study.kind || 'estudo')
    const itemToSave: Study = isEbd
      ? { ...study, kind: 'estudo', collection: 'ebd', ebdType: study.ebdType || 'licao', ebdCourse: study.ebdCourse?.trim() || 'Curso geral' }
      : { ...study, kind, collection: undefined }
    if (!itemToSave.title.trim()) { setNotice('Informe o título antes de salvar.'); return }
    const saveSession = editorSession.current
    const returnTo = editingTarget.current
    savingStudyRef.current = true; setSavingStudy(true)
    setNotice('Salvando no banco Neon…')
    try {
      const record = itemToSave.cloudId ? studyRecords[itemToSave.cloudId] : undefined
      const payload = { title: itemToSave.title, content: itemToSave as unknown as Record<string, unknown>, ...(record ? { visibility: record.visibility, status: record.status } : {}) }
      const result = itemToSave.cloudId ? await updateCloudStudy(token, itemToSave.cloudId, payload) : await createCloudStudy(token, payload)
      if (!result.study?.id || (itemToSave.cloudId && result.study.id !== itemToSave.cloudId)) throw new Error('O servidor não confirmou o identificador do material. Recarregue a Biblioteca antes de continuar.')
      const saved = { ...itemToSave, ...result.study.content as unknown as Study, title:result.study.title, cloudId: result.study.id }
      setStudyRecords(current=>({...current,[result.study.id]:result.study}))
      setSavedStudies(current => [...current.filter(item => item.cloudId !== saved.cloudId), saved])
      if (editorSession.current === saveSession) setStudy(saved)
      setCloudStatus('Biblioteca sincronizada com a nuvem.')
      setNotice('Material salvo com sucesso no Neon.')
      if (returnTo && editorSession.current === saveSession) { setLibraryView(returnTo.view); setActive('biblioteca'); editingTarget.current = null; window.scrollTo({top:0,behavior:'smooth'}) }
    } catch (e) {
      setCloudStatus('Falha no salvamento na nuvem.')
      setNotice(e instanceof Error ? 'NÃO foi salvo: ' + e.message : 'Não foi possível salvar no Neon.')
    } finally { savingStudyRef.current = false; setSavingStudy(false) }
  }
  const downloadHtml = () => {
    const blob = new Blob([createPresentationHtml(study, presentationMode, { ceb: cebPresentationLogo, church: presentationMode === 'ampliado' ? circularChurchPresentationLogo : churchPresentationLogo })], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const fileName = (study.title || 'apresentacao-ceb').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'apresentacao-ceb'
    link.href = url; link.download = `${fileName}.html`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
    setNotice('Apresentação HTML gerada para baixar.')
    window.setTimeout(() => setNotice(''), 3000)
  }
  const loadStudy = (item: Study) => {
    if (user.role !== 'admin' || !item.cloudId) return
    editorSession.current++; editingTarget.current = {id:item.cloudId,view:libraryView}
    setPresentationMode(defaultPresentationMode(item)); setStudy(structuredClone(item))
    setEbdPreparationMode('manual'); setContentPreparationMode('manual'); setAutomaticGuidance(''); setAutomaticAnswer('')
    setActive(item.collection === 'ebd' ? 'ebd' : item.kind === 'esboco' ? 'pregacoes' : 'estudos')
    setShowPreview(false); setNotice('Editando o material salvo. Salvar atualiza este mesmo documento.'); window.scrollTo({top:0,behavior:'smooth'})
  }
  const openLibraryView = (view: typeof libraryView) => { setLibraryView(view); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const libraryBack = () => {
    if (libraryView === 'inicio') { openSection('inicio'); return }
    if (libraryView === 'estudos' || libraryView === 'esbocos' || libraryView === 'importados' || libraryView === 'ebd') { openLibraryView('inicio'); return }
    if (libraryView.startsWith('estudos')) { openLibraryView('estudos'); return }
    if (libraryView.startsWith('esbocos')) { openLibraryView('esbocos'); return }
    if (libraryView.startsWith('importados')) { openLibraryView('importados'); return }
    openLibraryView('ebd')
  }
  const libraryBackLabel = () => libraryView === 'inicio' ? '← Voltar ao início' : ['estudos','esbocos','importados','ebd'].includes(libraryView) ? '← Voltar à Biblioteca' : libraryView.startsWith('estudos') ? '← Voltar a Estudos bíblicos' : libraryView.startsWith('esbocos') ? '← Voltar a Esboços de pregação' : libraryView.startsWith('importados') ? '← Voltar a Materiais importados' : '← Voltar a Estudos e materiais da EBD'
  const isImportedDuplicate = (item: Study) => importedMaterials.some((material) => material.studyTitle === item.title && (material.kind || 'estudo') === (item.kind || 'estudo'))
  const openPreparedMaterial = (item: Study, kind: 'estudo' | 'esboco') => { setReadingDocument(structuredClone({...item,kind})); setReadingMode(true) }
  const displayedStudy = readingDocument || study
  const importedMaterialCard = (item: ImportedMaterial) => <article className={`library-item${item.applied ? " library-item-applied" : ""}`} key={item.id}><div><h3>{item.studyTitle || item.name}</h3><p>{importCategories.find(c=>c.id===(item.category||item.kind||'estudo'))?.label} · Documento importado</p><small>{item.name} · {(item.size / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB · importado em {new Date(item.importedAt).toLocaleDateString('pt-BR')} · 📁 {item.folder || 'Sem pasta'}</small></div><div className="import-actions"><button className="secondary-button" onClick={() => openPreparedMaterial(importedStudy(item),item.kind||'estudo')}>📖 Ler material</button>{item.text.trim() && <><button className="secondary-button" onClick={()=>setLibraryPresentation(importedStudy(item))}>Ver HTML do texto</button><button className="secondary-button" onClick={()=>downloadSavedPresentation(importedStudy(item),'resumido')}>Gerar HTML do texto ↓</button></>}<label className="ceb-material-applied"><input type="checkbox" checked={!!item.applied} onChange={(event) => void updateImportedApplication(item, event.target.checked, item.appliedDate || '')} /> Material aplicado</label>{item.applied && <label className="ceb-material-date">Data (opcional)<input type="date" value={item.appliedDate || ''} onChange={(event) => void updateImportedApplication(item, true, event.target.value)} /></label>}<button className="secondary-button" onClick={() => void downloadImportedOriginal(item)}>⬇️ Baixar original</button><button className="danger-button" onClick={() => void removeImported(item)}>Excluir com confirmação</button></div></article>
  const selectedImportedCategory: ImportCategory | undefined = ({'importados-estudos':'estudo','importados-esbocos':'esboco','ebd-cursos':'ebd-licao','ebd-manuais':'ebd-manual','ebd-apresentacoes':'ebd-apresentacao','ebd-apoio':'ebd-apoio'} as Record<string,ImportCategory>)[libraryView]
  const visibleImportedMaterials = importedMaterials.filter(item=>(item.category||item.kind||'estudo')===selectedImportedCategory && (!libraryFolderFilter || (libraryFolderFilter==='__sem_pasta__' ? !item.folder : item.folder===libraryFolderFilter)))
  const savedStudyCard = (item: Study, index: number) => {
    const record = item.cloudId ? studyRecords[item.cloudId] : undefined
    const scope = item.libraryScope || (record?.visibility === 'private' ? 'private' : 'general')
    const canManage = user.role === 'admin' && !!record && (record.owner_user_id === user.id || !['private','particular'].includes(String(scope)))
    const type = item.collection === 'ebd' ? item.ebdType === 'manual' ? 'Manual do professor' : item.ebdType === 'apresentacao' ? 'Apresentação' : item.ebdType === 'apoio' ? 'Material de apoio' : 'Lição da EBD' : item.kind === 'esboco' ? 'Esboço de pregação' : 'Estudo bíblico'
    return <article className={`library-item library-document-card${item.applied ? ' library-item-applied' : ''}`} key={item.cloudId || index} aria-label={item.title || 'Material sem título'}>
      <div className="library-document-content"><div className="library-document-tags"><span>{type}</span><span>{['private','particular'].includes(String(scope)) ? 'Particular' : 'Biblioteca geral'}</span>{item.applied && <span>✓ Material aplicado</span>}</div>
        <h3>{item.title || 'Material sem título'}</h3><p className="library-document-passage">{renderReferences(item.passage || 'Texto bíblico não informado')}</p>
        {item.theme && <p className="library-document-theme">{item.theme}</p>}
        {canManage && record && <QuizStatus study={record} />}
        <dl className="library-document-details">{item.collection === 'ebd' && <div><dt>Curso</dt><dd>{item.ebdCourse || 'Curso geral'}</dd></div>}<div><dt>Conteúdo</dt><dd>{item.points.filter(p=>p.title||p.explanation||p.application).length} pontos de desenvolvimento</dd></div>{record?.updated_at && <div><dt>Atualizado</dt><dd>{new Date(record.updated_at).toLocaleDateString('pt-BR')}</dd></div>}</dl>
      </div>
      <div className="library-document-actions" aria-label="Ações do material salvo"><button className="primary-button" onClick={()=>openPreparedMaterial(item,item.kind||'estudo')}>📖 Ler</button><button className="secondary-button" onClick={()=>setLibraryPresentation(structuredClone(item))}>Ver HTML</button><button className="secondary-button" onClick={()=>downloadSavedPresentation(item,defaultPresentationMode(item))}>Gerar HTML ↓</button>{canManage && <><button className="secondary-button" onClick={()=>downloadPdfFromStudy(item)}>Salvar PDF</button>{item.cloudId && [item.introduction,item.theme,item.conclusion,...item.points.map(p=>p.explanation)].some(v=>v?.trim()) && <button className="secondary-button" onClick={()=>setQuizMaterial(item)}>📝 Questionário</button>}<button className="secondary-button" onClick={()=>void openSharing(item)}>📤 Compartilhar</button><button className="secondary-button" onClick={()=>loadStudy(item)}>✍️ Editar</button>{libraryReady && <button className="danger-button" onClick={()=>void removeStudy(item)}>Excluir</button>}</>}</div>
      {canManage && <div className="library-document-application">{studyControls(item)}</div>}
    </article>
  }


  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" onClick={(event) => { event.preventDefault(); openSection('inicio') }}>
          <span className="brand-mark" aria-hidden="true"><img src="/central-estudos-biblicos-v2/ceb-book.png" alt="" style={{ width: "82%", height: "82%", objectFit: "contain" }} /></span><span className="brand-copy"><strong>CEB - Igreja Batista Nova Esperança</strong><small>Central de Estudos Bíblicos</small></span>
        </a><span className="topbar-note">Palavra · Ensino · Prática</span>
      </header>
      <main>
        {active === 'inicio' ? <>
          <section className="hero"><div className="hero-content"><span className="eyebrow">CRESCER NO CONHECIMENTO DA PALAVRA</span><h1>Estude a Palavra.<br /><em>Compartilhe a verdade.</em></h1><p>Um espaço para preparar estudos bíblicos, desenvolver mensagens e organizar materiais para o ensino cristão.</p><button className="primary-button" onClick={() => openSection('estudos')}>Preparar um estudo <span aria-hidden="true">→</span></button></div><div className="hero-ornament" aria-hidden="true"><div className="ornament-circle"><span>✝</span></div><div className="verse-card"><span>“</span><p>Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.</p><small>SALMO 119:105 · ACF</small></div></div></section>
          <section className="content-section"><div className="section-heading"><div><span className="eyebrow">SEU ESPAÇO DE PREPARAÇÃO</span><h2>O que vamos estudar hoje?</h2></div><p>Recursos para aprender, preparar e ensinar com clareza.</p></div><div className="feature-grid">{cards.map((card) => <button className="feature-card" key={card.title} onClick={() => openSection(card.section)}><span className="card-topline"><span className="card-icon">{card.icon}</span><span className="card-tag">{card.tag}</span></span><h3>{card.title}</h3><p>{card.description}</p><span className="card-link">Abrir área <span aria-hidden="true">→</span></span></button>)}</div></section>
          <section className="quote-strip"><span className="quote-icon">✦</span><div><p>“Procura apresentar-te a Deus aprovado, como obreiro que não tem de que se envergonhar...”</p><small>2 TIMÓTEO 2:15 · ACF</small></div></section>
        </> : active === 'biblioteca' ? <section className="content-section section-view">
          <button className="back-link" onClick={libraryBack}>{libraryBackLabel()}</button>
          <span className="eyebrow">CONSULTA E ORGANIZAÇÃO</span>
          <h2>{libraryView === 'inicio' ? 'Biblioteca de materiais' : libraryView === 'estudos' || libraryView.startsWith('estudos') ? 'Estudos bíblicos' : libraryView === 'esbocos' || libraryView.startsWith('esbocos') ? 'Esboços de pregação' : libraryView === 'importados' || libraryView.startsWith('importados') ? 'Materiais importados' : 'Estudos e materiais da EBD'}</h2>
          <p className="section-intro">{libraryView === 'inicio' ? 'Escolha uma das quatro áreas para encontrar e organizar seus materiais.' : libraryView === 'estudos' ? 'Escolha entre estudos prontos e estudos criados por você.' : libraryView === 'esbocos' ? 'Escolha entre esboços prontos e esboços criados por você.' : libraryView === 'importados' ? 'Arquivos externos organizados separadamente dos conteúdos criados diretamente na CEB.' : libraryView === 'ebd' ? 'Organize cursos, lições, manuais do professor, apresentações e materiais de apoio da Escola Bíblica Dominical.' : libraryView === 'estudos-prontos' || libraryView === 'esbocos-prontos' ? 'Materiais de referência já organizados para leitura e inspiração.' : libraryView === 'estudos-criados' || libraryView === 'esbocos-criados' ? 'Conteúdos que você criou diretamente na CEB.' : libraryView === 'importados-estudos' ? 'Estudos trazidos de arquivos PDF ou Word, com seus originais preservados.' : libraryView === 'importados-esbocos' ? 'Esboços trazidos de arquivos PDF ou Word, com seus originais preservados.' : 'Materiais da EBD agrupados por finalidade. O nome do curso pode ser informado ao criar ou editar um conteúdo.'}</p>
          {libraryView === 'inicio' ? <>
            <div className="library-category-grid">
              <button className="library-category-card" onClick={() => openLibraryView('estudos')}><span>📖</span><strong>Estudos bíblicos</strong><small>Estudos prontos e estudos criados por mim</small><b>Explorar estudos →</b></button>
              <button className="library-category-card" onClick={() => openLibraryView('esbocos')}><span>🎙️</span><strong>Esboços de pregação</strong><small>Esboços prontos e esboços criados por mim</small><b>Explorar esboços →</b></button>
              <button className="library-category-card" onClick={() => openLibraryView('importados')}><span>📥</span><strong>Materiais importados</strong><small>Estudos e esboços de arquivos externos, sem misturar com os criados na CEB</small><b>Explorar importados →</b></button>
              <button className="library-category-card" onClick={() => openLibraryView('ebd')}><span>🏫</span><strong>Estudos e materiais da EBD</strong><small>Cursos, lições, manuais do professor, apresentações e apoio</small><b>Organizar EBD →</b></button>
            </div>
            {libraryReady && <button className="secondary-button" onClick={()=>void loadTrash()}>Abrir Lixeira</button>}
            {showTrash && <div className="detail-panel"><h3>Lixeira</h3><p>Os originais permanecem privados e podem ser restaurados.</p>{trashStudies.map(item=><p key={item.cloudId}>{item.title} <button onClick={()=>void restoreMaterial(item.cloudId!,false)}>Restaurar</button></p>)}{trashMaterials.map(item=><p key={item.id}>{item.studyTitle} <button onClick={()=>void restoreMaterial(item.id,true)}>Restaurar</button></p>)}{!trashStudies.length && !trashMaterials.length && <p>Lixeira vazia.</p>}</div>}
            {notice && <p role="status">{notice}</p>}
            <div className="import-actions" style={{ justifyContent: 'center', marginTop: '1.25rem' }}>
              <button className="primary-button" onClick={() => openSection('importar')}>📥 Importar arquivos</button>
            </div>
          </> : libraryView === 'estudos' || libraryView === 'esbocos' ? <>
            <div className="library-subnav">
              {libraryView === 'estudos' ? <>
                <button onClick={() => openLibraryView('estudos-prontos')}>📘 Estudos prontos</button>
                <button onClick={() => openLibraryView('estudos-criados')}>✍️ Estudos criados por mim</button>
              </> : <>
                <button onClick={() => openLibraryView('esbocos-prontos')}>📗 Esboços prontos</button>
                <button onClick={() => openLibraryView('esbocos-criados')}>✍️ Esboços criados por mim</button>
              </>}
            </div>
          </> : libraryView === 'importados' ? <>
            <div className="library-subnav">
              <button onClick={() => openLibraryView('importados-estudos')}>📄 Estudos bíblicos importados ({importedMaterials.filter((item) => (item.category || item.kind || 'estudo') === 'estudo').length})</button>
              <button onClick={() => openLibraryView('importados-esbocos')}>🎙️ Esboços de pregação importados ({importedMaterials.filter((item) => item.kind === 'esboco').length})</button>
            </div>
            <div className="import-actions"><button className="primary-button" onClick={() => openSection('importar')}>📥 Importar outro arquivo</button></div>
          </> : libraryView === 'ebd' ? <>
            <div className="library-category-grid">
              <button className="library-category-card" onClick={() => openLibraryView('ebd-cursos')}><span>📚</span><strong>Cursos e lições</strong><small>Lições organizadas pelo nome do curso</small><b>Ver lições →</b></button>
              <button className="library-category-card" onClick={() => openLibraryView('ebd-manuais')}><span>🧑‍🏫</span><strong>Manuais do professor</strong><small>Orientações, comentários e planos de aula</small><b>Ver manuais →</b></button>
              <button className="library-category-card" onClick={() => openLibraryView('ebd-apresentacoes')}><span>🖥️</span><strong>Apresentações</strong><small>Conteúdos preparados para exibir em sala</small><b>Ver apresentações →</b></button>
              <button className="library-category-card" onClick={() => openLibraryView('ebd-apoio')}><span>📂</span><strong>Materiais de apoio</strong><small>Perguntas, atividades e recursos complementares</small><b>Ver materiais →</b></button>
            </div>
            <div className="import-actions"><button className="primary-button" onClick={() => { setStudy((current) => ({ ...current, collection: 'ebd', ebdType: 'licao', ebdCourse: current.ebdCourse || 'Curso geral' })); openSection('ebd') }}>✍️ Criar material para EBD</button></div>
          </> : null}
          {libraryView !== 'inicio' && notice && <p role="status">{notice}</p>}
          {(libraryView === 'estudos-prontos' || libraryView === 'esbocos-prontos') && <div className="detail-panel"><h3>Sem materiais prontos</h3><p>A biblioteca foi reiniciada. Somente materiais salvos na nuvem serão mostrados.</p></div>}
           {(libraryView === 'estudos-criados' || libraryView === 'esbocos-criados') && <div className="library-list">
            {savedStudies.filter((item) => !item.collection && !isImportedDuplicate(item) && (item.kind || 'estudo') === (libraryView === 'esbocos-criados' ? 'esboco' : 'estudo')).length ? savedStudies.filter((item) => !item.collection && !isImportedDuplicate(item) && (item.kind || 'estudo') === (libraryView === 'esbocos-criados' ? 'esboco' : 'estudo')).map(savedStudyCard) : <div className="detail-panel"><h3>Ainda não há materiais nesta seção</h3><p>Você pode preparar um novo conteúdo ou importar um arquivo PDF/Word. Os arquivos importados ficam em uma área separada.</p><button className="primary-button" onClick={() => openSection(libraryView === 'esbocos-criados' ? 'pregacoes' : 'estudos')}>Criar agora →</button><button className="secondary-button" onClick={() => openSection('importar')}>Importar material</button></div>}
          </div>}
          {(libraryView === 'importados-estudos' || libraryView === 'importados-esbocos' || libraryView.startsWith('ebd-')) && <div className="import-folder-controls">
            <label className="study-form">Filtrar por pasta<select value={libraryFolderFilter} onChange={(event) => setLibraryFolderFilter(event.target.value)}><option value="">Todas as pastas</option><option value="__sem_pasta__">Sem pasta</option>{[...new Set([...importFolders.map(f=>f.name), ...importedMaterials.map((item) => item.folder).filter((folder): folder is string => !!folder)])].sort((a,b) => a.localeCompare(b,'pt-BR')).map((folder) => <option key={folder} value={folder}>{folder}</option>)}</select></label>
          </div>}
          {(libraryView === 'importados-estudos' || libraryView === 'importados-esbocos') && <div className="library-list">
            {visibleImportedMaterials.length ? visibleImportedMaterials.map(importedMaterialCard) : <div className="detail-panel"><h3>Nenhum material importado nesta categoria</h3><p>Importe um PDF ou Word para que ele apareça aqui, separado dos conteúdos criados diretamente na CEB.</p><button className="primary-button" onClick={() => openSection('importar')}>📥 Importar material</button></div>}
          </div>}
          {libraryView.startsWith('ebd-') && <div className="library-list">{visibleImportedMaterials.map(importedMaterialCard)}
            {savedStudies.filter((item) => item.collection === 'ebd' && (libraryView === 'ebd-cursos' ? (item.ebdType || 'licao') === 'licao' : libraryView === 'ebd-manuais' ? item.ebdType === 'manual' : libraryView === 'ebd-apresentacoes' ? item.ebdType === 'apresentacao' : item.ebdType === 'apoio')).length ? savedStudies.filter((item) => item.collection === 'ebd' && (libraryView === 'ebd-cursos' ? (item.ebdType || 'licao') === 'licao' : libraryView === 'ebd-manuais' ? item.ebdType === 'manual' : libraryView === 'ebd-apresentacoes' ? item.ebdType === 'apresentacao' : item.ebdType === 'apoio')).map(savedStudyCard) : !visibleImportedMaterials.length && <div className="detail-panel"><h3>Esta seção ainda está vazia</h3><p>Crie um material da EBD pelo editor e escolha o tipo de recurso e o nome do curso. Os materiais serão organizados nesta seção.</p><button className="primary-button" onClick={() => { setStudy((current) => ({ ...current, collection: 'ebd', ebdType: libraryView === 'ebd-manuais' ? 'manual' : libraryView === 'ebd-apresentacoes' ? 'apresentacao' : libraryView === 'ebd-apoio' ? 'apoio' : 'licao', ebdCourse: current.ebdCourse || 'Curso geral' })); openSection('ebd') }}>Criar material aqui →</button></div>}
          </div>}
        </section> : active === 'importar' ? <section className="content-section section-view">
          <button className="back-link" onClick={() => openSection('biblioteca')}>← Voltar à Biblioteca</button><span className="eyebrow">PDF · WORD · POWERPOINT · HTML · PASTAS</span><h2>Importar materiais</h2><p className="section-intro">Escolha o tipo de conteúdo. Somente materiais na nuvem integrarão a biblioteca. O original e as informações serão salvos na nuvem somente após sua confirmação.</p>
          <div className="import-panel">
            <h3>📥 Selecione um arquivo</h3><p>Formatos aceitos: PDF, Word (.docx), PowerPoint (.pptx) e HTML (.html/.htm). PDFs digitalizados exigem OCR e documentos .doc antigos precisam ser convertidos. Imagens e animações não são convertidas em texto.</p>
            <label className="study-form"><span className="import-kind-label">Este material é:</span><select value={importKind} onChange={(event) => setImportKind(event.target.value as ImportCategory)}><option value="estudo">📖 Estudo bíblico</option><option value="esboco">🎙️ Esboço de pregação</option>{user.role === 'admin' && importCategories.filter(c=>c.id.startsWith('ebd-')).map(c=><option key={c.id} value={c.id} disabled={!importCategoriesReady}>{c.label}</option>)}</select></label>{!importCategoriesReady && <small>As categorias EBD aguardam a migração aditiva de classificação; estudo e esboço continuam compatíveis.</small>}
            <label className="import-file-label">{uploadsReady ? "Selecionar arquivo (até 20 MB)" : "Armazenamento na nuvem em preparação"}<input type="file" disabled={!uploadsReady || importBusy} accept=".pdf,.docx,.pptx,.html,.htm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/html" onChange={(event) => { void prepareImport(event.target.files?.[0]); event.currentTarget.value = '' }} /></label>
            <div className="import-folder-controls">
              <label className="study-form">Visibilidade<select value={importScope} onChange={event=>{setImportScope(event.target.value as 'private' | 'general');setImportFolder('')}}><option value="private">Somente eu (particular)</option>{user.role === 'admin' && <option value="general">Biblioteca geral dos administradores</option>}</select></label>
              <label className="study-form">Pasta de destino<select value={importFolder} onChange={(event) => setImportFolder(event.target.value)}><option value="">Sem pasta específica</option>{importFolders.filter(f=>f.scope===importScope).map(folder=><option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>
              <label className="study-form">Criar nova pasta<input value={newImportFolder} onChange={(event) => setNewImportFolder(event.target.value)} maxLength={80} placeholder="Ex.: EBD 2026" /></label>
              <button type="button" className="secondary-button" onClick={createImportFolder}>+ Criar e selecionar pasta</button>
            </div>
            <p className="import-destination"><strong>Destino:</strong> Biblioteca → {importScope === 'general' ? 'Biblioteca geral' : 'Particular'} → {importCategories.find(c=>c.id===importKind)?.label} → {importFolders.find(f=>f.id===importFolder)?.name || 'Sem pasta específica'}</p>
            {importBusy && <p role="status">Lendo o documento… arquivos grandes podem levar alguns instantes.</p>}
            {importPreview && <div className="import-preview"><h4>Prévia antes de importar: {importPreview.file.name}</h4><p><strong>Título identificado:</strong> {importPreview.title}</p><p><strong>Texto bíblico identificado:</strong> {importPreview.passage || 'Nenhuma referência identificada automaticamente'}</p><pre>{importPreview.text.slice(0, 4500)}{importPreview.text.length > 4500 ? '\n\n… (prévia parcial; o texto completo será preservado)' : ''}</pre><div className="import-actions"><button className="primary-button" disabled={importBusy || !uploadsReady} onClick={() => void confirmImport()}>Salvar original na nuvem {importFolders.find(f=>f.id===importFolder)?.name ? 'em ' + importFolders.find(f=>f.id===importFolder)!.name : 'na categoria escolhida'}</button><button className="secondary-button" onClick={() => setImportPreview(null)}>Cancelar</button></div></div>}
          </div>
          <div className="library-imported"><h3>Arquivos originais salvos na nuvem ({importedMaterials.length})</h3>{importedMaterials.length ? importedMaterials.map((item) => <article className={`library-item${item.applied ? " library-item-applied" : ""}`} key={item.id}><div><h3>{item.name}</h3><p>{item.kind === 'esboco' ? 'Esboço de pregação' : 'Estudo bíblico'} · {(item.size / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB · importado em {new Date(item.importedAt).toLocaleDateString('pt-BR')} · 📁 {item.folder || 'Sem pasta'}</p><small>Texto extraído: {item.text.length.toLocaleString('pt-BR')} caracteres</small></div><div className="import-actions"><label className="ceb-material-applied"><input type="checkbox" checked={!!item.applied} onChange={(event) => void updateImportedApplication(item, event.target.checked, item.appliedDate || '')} /> Material aplicado</label>{item.applied && <label className="ceb-material-date">Data (opcional)<input type="date" value={item.appliedDate || ''} onChange={(event) => void updateImportedApplication(item, true, event.target.value)} /></label>}<button className="secondary-button" onClick={() => void downloadImportedOriginal(item)}>Baixar original</button><button className="danger-button" onClick={() => void removeImported(item)}>Excluir original</button></div></article>) : <p className="library-empty">Nenhum arquivo original importado ainda.</p>}</div>
          {notice && <div className="success-notice" role="status">{notice}</div>}
        </section> : <section className="content-section section-view">
          <button className="back-link" onClick={() => openSection('inicio')}>← Voltar ao início</button><span className="eyebrow">CENTRAL DE ESTUDOS BÍBLICOS</span><h2>{sectionContent[active].title}</h2><p className="section-intro">{sectionContent[active].subtitle}</p>
          {(active === 'estudos' || active === 'pregacoes') && contentPreparationMode === 'choose' && <div className="ebd-mode-selection"><h3>{active === 'pregacoes' ? 'Como deseja preparar o esboço da pregação?' : 'Como deseja preparar o estudo bíblico?'}</h3><p>Escolha uma forma de trabalhar. Você poderá revisar e modificar todo o conteúdo antes de salvar.</p><div className="ebd-mode-cards"><button type="button" className="ebd-mode-card" onClick={() => chooseContentMode('manual')}><span className="ebd-mode-icon">✍️</span><strong>{active === 'pregacoes' ? 'Preparação manual do esboço' : 'Preparação manual do estudo'}</strong><span>Comece com um formulário vazio e desenvolva o conteúdo com suas próprias palavras.</span><em>Escolher modo manual →</em></button><button type="button" className="ebd-mode-card" onClick={() => chooseContentMode('automatic')}><span className="ebd-mode-icon">🤖</span><strong>Preparação automática com ChatGPT</strong><span>{active === 'pregacoes' ? 'Receba uma estrutura pregável com divisões, explicações e conclusão, e ajuste tudo.' : 'Receba um estudo com contexto, pontos explicados e aplicações práticas, e ajuste tudo.'}</span><em>Escolher modo automático →</em></button></div><p className="ebd-mode-note">O modo automático abre o ChatGPT em outra aba e usa sua conta gratuita. Não exige chave de API nem cobrança de API pela CEB; os limites da conta continuam valendo.</p></div>}
          {active === 'ebd' && ebdPreparationMode === 'choose' && <div className="ebd-mode-selection">
            <h3>Como você deseja preparar a lição?</h3><p>Escolha uma forma de trabalhar. Você poderá revisar e modificar todo o conteúdo antes de salvar.</p>
            <div className="ebd-mode-cards">
              <button type="button" className="ebd-mode-card" onClick={() => chooseEbdMode('manual')}><span className="ebd-mode-icon">✍️</span><strong>Preparação manual</strong><span>Comece com um formulário vazio e escreva cada parte da lição com suas próprias palavras.</span><em>Escolher modo manual →</em></button>
              <button type="button" className="ebd-mode-card" onClick={() => chooseEbdMode('automatic')}><span className="ebd-mode-icon">🤖</span><strong>Preparação automática com ChatGPT</strong><span>Informe o tema e o texto bíblico, receba uma primeira versão e depois ajuste o que desejar.</span><em>Escolher modo automático →</em></button>
            </div><p className="ebd-mode-note">O modo automático usa sua conta do ChatGPT em outra aba. Não exige chave de API nem cobrança de API pela CEB. Os limites normais da conta gratuita continuam valendo.</p>
          </div>}
{(active === 'estudos' || active === 'pregacoes') && contentPreparationMode === 'automatic' && <div className="ebd-automatic-panel"><div className="ebd-automatic-panel-heading"><span className="eyebrow">ASSISTENTE DE PREPARAÇÃO</span><h3>{active === 'pregacoes' ? 'Prepare o esboço com o ChatGPT' : 'Prepare o estudo com o ChatGPT'}</h3><p>Informe o título ou tema, o texto bíblico e orientações. Depois, revise e modifique tudo no editor.</p></div><label>{active === 'pregacoes' ? 'Título ou tema da pregação' : 'Título ou tema do estudo'}<input value={study.title} onChange={(e) => updateStudy('title', e.target.value)} placeholder={active === 'pregacoes' ? 'Ex.: A esperança não decepciona' : 'Ex.: Aprendendo a perdoar'} /></label><div className="form-row"><label>Texto bíblico base<input value={study.passage} onChange={(e) => updateStudy('passage', e.target.value)} placeholder="Ex.: Romanos 5:1–5" /></label><label>{active === 'pregacoes' ? 'Ideia central da mensagem' : 'Tema central'}<input value={study.theme} onChange={(e) => updateStudy('theme', e.target.value)} placeholder="Qual verdade deseja destacar?" /></label></div><label>Orientações adicionais<textarea rows={3} value={automaticGuidance} onChange={(e) => setAutomaticGuidance(e.target.value)} placeholder={active === 'pregacoes' ? 'Ex.: público, duração, ocasião, ênfase pastoral...' : 'Ex.: público, profundidade desejada, aplicações práticas...'}/></label><div className="ebd-automatic-actions"><button type="button" className="primary-button" onClick={() => void openChatGptForContent()}>🤖 Copiar instruções e abrir ChatGPT</button><button type="button" className="secondary-button" onClick={() => { void navigator.clipboard?.writeText(buildContentPrompt()); setNotice('Instruções copiadas. Volte ao ChatGPT e cole na conversa.') }}>📋 Copiar instruções</button><button type="button" className="secondary-button" onClick={() => setContentPreparationMode('choose')}>← Trocar modo</button></div><label className="ebd-answer-label">Depois, cole aqui a resposta do ChatGPT<textarea rows={8} value={automaticAnswer} onChange={(e) => setAutomaticAnswer(e.target.value)} placeholder="Cole a resposta preparada para distribuir o conteúdo nos campos de edição." /></label><button type="button" className="secondary-button" onClick={importAutomaticContentAnswer}>Importar resposta para o editor ↓</button><p className="ebd-mode-note">A importação funciona melhor quando a resposta mantém os rótulos solicitados. Se vier em outro formato, o texto será preservado para organização manual.</p></div>}
          {(active !== 'ebd' || ebdPreparationMode !== 'choose') && <>{active === 'ebd' && ebdPreparationMode === 'automatic' && <div className="ebd-automatic-panel">
            <div className="ebd-automatic-panel-heading"><span className="eyebrow">ASSISTENTE DE PREPARAÇÃO</span><h3>Prepare uma primeira versão com o ChatGPT</h3><p>Preencha o tema e o texto bíblico aqui ou no editor abaixo; acrescente orientações e envie as instruções ao ChatGPT.</p></div>
            <label>Título ou tema<input value={study.title} onChange={(e) => updateStudy('title', e.target.value)} placeholder="Ex.: O perdão na vida de José" /></label>
            <div className="form-row"><label>Texto bíblico base<input value={study.passage} onChange={(e) => updateStudy('passage', e.target.value)} placeholder="Ex.: Gênesis 50:15–21" /></label><label>Tema central<input value={study.theme} onChange={(e) => updateStudy('theme', e.target.value)} placeholder="Qual verdade deseja destacar?" /></label></div>
            <label>Orientações adicionais<textarea rows={3} value={automaticGuidance} onChange={(e) => setAutomaticGuidance(e.target.value)} placeholder="Ex.: público adulto, aula de 45 minutos, aplicações para a família..." /></label>
            <div className="ebd-automatic-actions"><button type="button" className="primary-button" onClick={() => void openChatGptForEbd()}>🤖 Copiar instruções e abrir ChatGPT</button><button type="button" className="secondary-button" onClick={() => { void navigator.clipboard?.writeText(buildEbdPrompt()); setNotice('Instruções copiadas. Volte ao ChatGPT e cole na conversa.') }}>📋 Copiar instruções</button><button type="button" className="secondary-button" onClick={() => setEbdPreparationMode('choose')}>← Trocar modo</button></div>
            <label className="ebd-answer-label">Depois, cole aqui a resposta do ChatGPT<textarea rows={8} value={automaticAnswer} onChange={(e) => setAutomaticAnswer(e.target.value)} placeholder="Cole aqui a lição preparada. A CEB tentará distribuir o conteúdo nos campos para você revisar." /></label>
            <button type="button" className="secondary-button" onClick={importAutomaticEbdAnswer}>Importar resposta para o editor ↓</button>
            <p className="ebd-mode-note">A importação funciona melhor quando a resposta mantém os rótulos solicitados nas instruções. Se vier em outro formato, o texto será preservado para você organizar manualmente.</p>
          </div>}
          {active === 'ebd' && <><div className="notice-box">Prepare lições, manuais, apresentações ou materiais de apoio. Informe o curso para manter os conteúdos organizados.</div><div className="form-row ebd-metadata" inert={savingStudy}><label>Curso<input value={study.ebdCourse || ''} onChange={(e) => setStudy((current) => ({ ...current, ebdCourse: e.target.value }))} placeholder="Ex.: Crescendo em Cristo" /></label><label>Tipo de material<select value={study.ebdType || 'licao'} onChange={(e) => setStudy((current) => ({ ...current, ebdType: e.target.value as Study['ebdType'] }))}><option value="licao">📚 Lição do curso</option><option value="manual">🧑‍🏫 Manual do professor</option><option value="apresentacao">🖥️ Apresentação</option><option value="apoio">📂 Material de apoio</option></select></label></div></>}
          {active === 'pregacoes' && <div className="notice-box">O editor também pode ser usado para montar o esboço de uma pregação. Organize cada ponto com explicação e aplicação prática.</div>}
          {active === 'ebd' && <div className="ebd-mode-bar"><span>{ebdPreparationMode === 'automatic' ? '🤖 Modo automático · apoio do ChatGPT' : '✍️ Modo manual'}</span>{!study.cloudId && <button type="button" className="secondary-button" onClick={() => setEbdPreparationMode('choose')}>Trocar modo</button>}</div>}
          {(active === 'estudos' || active === 'pregacoes') && <div className="ebd-mode-bar"><span>{contentPreparationMode === 'automatic' ? '🤖 Modo automático · apoio do ChatGPT' : '✍️ Modo manual'}</span>{!study.cloudId && <button type="button" className="secondary-button" onClick={() => setContentPreparationMode('choose')}>Trocar modo</button>}</div>}
          <div className="editor-toolbar"><span className="editor-label">EDITOR DE CONTEÚDO</span><span className="autosave-label">Rascunho salvo automaticamente neste navegador</span></div>
          <div className="study-form" inert={savingStudy}>
            <label>Título do estudo<input value={study.title} onChange={(e) => updateStudy('title', e.target.value)} placeholder="Ex.: A esperança não decepciona" /></label>
            <div className="form-row"><label>Texto bíblico<input value={study.passage} onChange={(e) => updateStudy('passage', e.target.value)} placeholder="Ex.: Romanos 5:1-5" /></label><label>Tema central<input value={study.theme} onChange={(e) => updateStudy('theme', e.target.value)} placeholder="Qual é a mensagem principal?" /></label></div>
            <label>Introdução<textarea rows={3} value={study.introduction} onChange={(e) => updateStudy('introduction', e.target.value)} placeholder="Apresente o contexto e a ideia do estudo." /></label>
            <div className="points-heading"><h3>{active === 'pregacoes' ? 'Desenvolvimento do esboço de pregação' : 'Desenvolvimento do estudo bíblico'}</h3><span>{active === 'pregacoes' ? 'Organize divisões que avancem a mensagem, com explicação e aplicação.' : 'Cada ponto terá explicação bíblica e aplicação prática.'}</span></div>
            {study.points.map((point, index) => <fieldset className="point-editor" key={index}><legend>Ponto principal {index + 1}</legend><label>Título do ponto<input value={point.title} onChange={(e) => updatePoint(index, 'title', e.target.value)} placeholder="Ex.: Descanse na paz conquistada por Cristo" /></label><label>Explicação<textarea rows={3} value={point.explanation} onChange={(e) => updatePoint(index, 'explanation', e.target.value)} placeholder="Explique o ensino do texto bíblico." /></label><label>Aplicação prática<textarea rows={2} value={point.application} onChange={(e) => updatePoint(index, 'application', e.target.value)} placeholder="Como aplicar esta verdade no dia a dia?" /></label></fieldset>)}
            <label>Conclusão<textarea rows={3} value={study.conclusion} onChange={(e) => updateStudy('conclusion', e.target.value)} placeholder="Retome a mensagem principal e convide à prática." /></label>
          </div>
          {notice && <div className="success-notice" role="status">{notice}</div>}
          <p className="cloud-sync-status" role="status">☁️ {cloudStatus}</p>
          {user.role === 'admin' && <label className="study-form">Visibilidade do material<select disabled={!!study.cloudId} value={study.libraryScope || 'general'} onChange={event=>setStudy(current=>({...current,libraryScope:event.target.value as 'general' | 'private'}))}><option value="private">Somente eu (particular)</option><option value="general">Biblioteca geral dos administradores</option></select></label>}
          <div className="action-bar"><label>Modelo dos slides <select aria-label="Modelo de apresentação" value={presentationMode} onChange={(event) => setPresentationMode(event.target.value as PresentationMode)}><option value="ampliado">Ampliado — mais texto</option><option value="resumido">Resumido — apresentação clássica</option></select></label><button className="secondary-button" disabled={savingStudy} onClick={saveStudy}>{savingStudy ? 'Salvando…' : active === 'pregacoes' ? 'Salvar esboço' : active === 'ebd' ? 'Salvar material' : 'Salvar estudo'}</button><button className="secondary-button" onClick={() => { setReadingDocument(null); setReadingMode(true) }}>📖 Modo de leitura</button><button className="secondary-button" onClick={() => setShowPreview((value) => !value)}>{showPreview ? 'Ocultar apresentação' : 'Ver apresentação'}</button><button className="primary-button" onClick={downloadHtml}>Gerar apresentação HTML ↓</button></div>
          {showPreview && <div className="presentation-preview"><div className="preview-heading"><div><span className="eyebrow">PRÉ-VISUALIZAÇÃO · {presentationMode === 'ampliado' ? 'AMPLIADO' : 'RESUMIDO'}</span><h3>Apresentação: {study.title}</h3></div><button className="secondary-button" onClick={downloadHtml}>Baixar HTML</button></div><iframe title="Prévia da apresentação HTML" sandbox="allow-scripts allow-popups allow-modals" allowFullScreen srcDoc={showPreview ? createPresentationHtml(study, presentationMode, { ceb: cebPresentationLogo, church: presentationMode === 'ampliado' ? circularChurchPresentationLogo : churchPresentationLogo }) : ''} style={{ width: '100%', aspectRatio: '16 / 9', border: 0 }} /><p className="preview-help">O arquivo baixado abre diretamente no navegador e inclui botões Voltar/Avançar, tela cheia, setas do teclado e impressão.</p></div>}
        </>}</section>}
      </main>
      {quizMaterial?.cloudId && <TeacherQuiz token={token} studyId={quizMaterial.cloudId} title={quizMaterial.title} onClose={()=>{ setQuizMaterial(null); void listCloudStudies(token).then(({studies})=>setStudyRecords(Object.fromEntries(studies.map(item=>[item.id,item])))).catch(()=>{ setStudyRecords(current=>Object.fromEntries(Object.entries(current).map(([id,record])=>[id,{...record,quiz_summary:undefined}]))); setNotice('Não foi possível atualizar os indicadores dos questionários. Recarregue a Biblioteca.') }) }} />}
      {shareMaterial && <div className="reading-overlay" role="presentation">
        <section role="dialog" aria-modal="true" aria-label="Compartilhar material" className="detail-panel" style={{maxWidth:560,margin:'auto',padding:24,background:'white',color:'#102744',borderRadius:16}}>
          <h2>📤 Compartilhar material</h2>
          <p><strong>{shareMaterial.title}</strong></p>
          <p>Escolha os alunos autorizados a ler este material na CEB. Compartilhamentos externos são arquivos independentes.</p>
          <div style={{display:'grid',gap:10,marginBottom:16}}>
            <label><input type="checkbox" checked={shareEnabled} onChange={e=>setShareEnabled(e.target.checked)}/> Compartilhamento interno ativo</label>
            <label>Destinatários
              <select value={shareAudience} onChange={e=>setShareAudience(e.target.value as 'all'|'selected')}>
                <option value="all">Todos os alunos ativos</option>
                <option value="selected">Alunos específicos</option>
              </select>
            </label>
            {shareAudience==='selected' && <div style={{maxHeight:160,overflowY:'auto',border:'1px solid #ccc',padding:10}}>
              {shareStudents.length===0 && <p>Nenhum aluno disponível.</p>}
              {shareStudents.map(student=><label key={student.id} style={{display:'block',marginBottom:6}}>
                <input type="checkbox" checked={shareSelectedIds.includes(student.id)} onChange={e=>setShareSelectedIds(ids=>e.target.checked?[...ids,student.id]:ids.filter(id=>id!==student.id))}/>
                {' '}{student.display_name || student.username}
              </label>)}
            </div>}
            <label><input type="checkbox" checked={shareQuiz} onChange={e=>setShareQuiz(e.target.checked)}/> Disponibilizar questionário aos alunos autorizados</label>
            <label><input type="checkbox" checked={shareDownloads} onChange={e=>setShareDownloads(e.target.checked)}/> Permitir baixar a lição aos alunos autorizados</label>
            {shareError && <p role="alert" style={{color:'#a92323'}}>{shareError}</p>}
            <button type="button" className="primary-button" disabled={sharingBusy || (shareEnabled && shareAudience==='selected' && (shareSelectedIds.length===0 || shareStudents.length===0))} onClick={()=>void saveSharing()}>Salvar permissões para alunos</button>
          </div>
          <h3>Compartilhamento externo e cópias para o administrador</h3>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <button type="button" className="primary-button" disabled={sharingBusy} onClick={()=>void shareHtmlFile(shareMaterial)}>Escolher destinatário / enviar HTML</button>
            <button type="button" className="secondary-button" onClick={()=>downloadSavedPresentation(shareMaterial,defaultPresentationMode(shareMaterial))}>Baixar HTML</button>
            <button type="button" className="secondary-button" onClick={()=>downloadPdfFromStudy(shareMaterial)}>Salvar PDF</button>
            <button type="button" className="secondary-button" onClick={()=>setShareMaterial(null)}>Fechar</button>
          </div>
          <p style={{marginTop:14,fontSize:13}}>Compartilhar um arquivo externamente dá ao destinatário uma cópia que não pode ser revogada. O compartilhamento interno é controlado pelo Worker conforme as permissões salvas. Arquivos enviados externamente são cópias independentes, e não é possível revogar cópias já recebidas.</p>
        </section>
      </div>}
      {libraryPresentation && <LibraryPresentation study={libraryPresentation} onClose={()=>setLibraryPresentation(null)} />}
      {readingMode && <div className={`reading-overlay reading-${readingPreferences.theme}`} role="dialog" aria-modal="true" aria-label={`Modo de leitura: ${displayedStudy.title}`}>
        <div className="reading-toolbar">
          <div className="reading-toolbar-title"><strong>📖 Modo de leitura</strong><span>{displayedStudy.kind === 'esboco' || active === 'pregacoes' ? 'Esboço de pregação' : active === 'ebd' ? 'Estudo para EBD' : 'Estudo bíblico'}</span></div>
          <div className="reading-controls">
            <div className="reading-control-group" aria-label="Tamanho da fonte"><span>Fonte</span><button type="button" onClick={() => changeReadingPreference('fontSize', Math.max(16, readingPreferences.fontSize - 1))} aria-label="Diminuir fonte">A−</button><strong>{readingPreferences.fontSize}px</strong><button type="button" onClick={() => changeReadingPreference('fontSize', Math.min(32, readingPreferences.fontSize + 1))} aria-label="Aumentar fonte">A+</button></div>
            <label className="reading-line-control">Espaçamento <input type="range" min="1.35" max="2.2" step="0.05" value={readingPreferences.lineHeight} onChange={(event) => changeReadingPreference('lineHeight', Number(event.target.value))} /></label>
            <div className="reading-control-group" aria-label="Cor de fundo"><span>Fundo</span><button type="button" className={readingPreferences.theme === 'claro' ? 'selected' : ''} onClick={() => changeReadingPreference('theme', 'claro')}>Claro</button><button type="button" className={readingPreferences.theme === 'creme' ? 'selected' : ''} onClick={() => changeReadingPreference('theme', 'creme')}>Creme</button><button type="button" className={readingPreferences.theme === 'escuro' ? 'selected' : ''} onClick={() => changeReadingPreference('theme', 'escuro')}>Escuro</button></div>
            <button type="button" className="reading-toolbar-button" onClick={() => void toggleReadingFullscreen()}>⛶ Tela cheia</button><button type="button" className="reading-close-button" onClick={() => setReadingMode(false)}>Fechar ×</button>
          </div>
        </div>
        <article className="reading-page" style={{ fontSize: `${readingPreferences.fontSize}px`, lineHeight: readingPreferences.lineHeight }}>
          <div className="reading-church">CENTRAL DE ESTUDOS BÍBLICOS · IGREJA BATISTA NOVA ESPERANÇA</div>
          <h1>{displayedStudy.title || (displayedStudy.kind === 'esboco' || active === 'pregacoes' ? 'Esboço de pregação' : 'Estudo bíblico')}</h1>
          {displayedStudy.passage && <p className="reading-passage">{renderReferences(displayedStudy.passage)}</p>}
          {displayedStudy.theme && <div className="reading-theme"><strong>Tema central</strong><p>{renderReferences(displayedStudy.theme)}</p></div>}
          {displayedStudy.introduction && <section className="reading-section"><h2>Introdução</h2><p>{renderReferences(displayedStudy.introduction)}</p></section>}
          {displayedStudy.points.some((point) => point.title || point.explanation || point.application) && <section className="reading-section"><h2>Desenvolvimento</h2>{displayedStudy.points.map((point, index) => (point.title || point.explanation || point.application) && <section className="reading-point" key={`${index}-${point.title}`}><h3>{index + 1}. {point.title || `Ponto ${index + 1}`}</h3>{point.explanation && <p>{renderReferences(point.explanation)}</p>}{point.application && <p className="reading-application"><strong>Aplicação prática:</strong> {renderReferences(point.application)}</p>}</section>)}</section>}
          {displayedStudy.legacySections?.map((section, index) => <section className="reading-section" key={section.title + index}><h2>{section.title}</h2><p style={{ whiteSpace: 'pre-line' }}>{renderReferences(section.content)}</p></section>)}
          {displayedStudy.conclusion && <section className="reading-section"><h2>Conclusão</h2><p>{renderReferences(displayedStudy.conclusion)}</p></section>}
          <div className="reading-footer">CENTRAL DE ESTUDOS BÍBLICOS · IGREJA BATISTA NOVA ESPERANÇA</div>
        </article>
      </div>}
      <footer className="footer"><div className="footer-brand"><span className="brand-mark small"><img src="/central-estudos-biblicos-v2/ceb-book.png" alt="" style={{ width: "82%", height: "82%", objectFit: "contain" }} /></span><strong>Central de Estudos Bíblicos</strong></div><span>Igreja Batista Nova Esperança · Palavra, ensino e prática.</span></footer>
      <nav className="mobile-nav" aria-label="Navegação principal">{navigation.map((item) => <button key={item.id} className={active === item.id ? 'nav-item active' : 'nav-item'} onClick={() => openSection(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
    </div>
  )
}


function App() {
  const [user, setUser] = useState<CebUser | null>(null)
  const [token, setToken] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [adminOpen, setAdminOpen] = useState(false)
  const [studentOpen, setStudentOpen] = useState(false)

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await loginCeb(username.trim(), password)
      setUser(result.user)
      setToken(result.access_token)
      setPassword('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível entrar. Tente novamente.')
    } finally { setBusy(false) }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(''); setNotice('')
    if (!/^[a-z0-9]{6}$/.test(newPassword)) { setError('A nova senha deve ter exatamente 6 letras minúsculas ou números.'); return }
    if (newPassword !== confirmPassword) { setError('As senhas não são iguais.'); return }
    setBusy(true)
    try {
      const result = await changeCebPassword(token, currentPassword, newPassword)
      setUser(result.user)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setNotice('Senha alterada. Seu acesso foi liberado.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível alterar a senha.')
    } finally { setBusy(false) }
  }

  async function handleLogout() {
    try { if (token) await logoutCeb(token) } catch { /* encerra a sessão local mesmo se a API estiver indisponível */ }
    setUser(null); setToken(''); setPassword(''); setNewPassword(''); setConfirmPassword('')
    setError(''); setNotice('')
  }

  if (!user || !token) return (
    <div className="ceb-auth-page">
      <section className="ceb-auth-card">
        <div className="ceb-auth-mark"><img src="/central-estudos-biblicos-v2/ceb-book.png" alt="" style={{ width: "82%", height: "82%", objectFit: "contain" }} /></div>
        <p className="ceb-auth-eyebrow">IGREJA BATISTA NOVA ESPERANÇA</p>
        <h1>Central de Estudos Bíblicos</h1>
        <p className="ceb-auth-subtitle">Entre com o usuário e a senha fornecidos pelo administrador.</p>
        <form onSubmit={handleLogin} className="ceb-auth-form">
          <label>Usuário<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required minLength={3} maxLength={32} /></label>
          <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
          {error && <p className="ceb-auth-error" role="alert">{error}</p>}
          <button type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <small className="ceb-auth-footnote">Acesso pessoal aos seus estudos e materiais.</small>
      </section>
    </div>
  )

  if (user.must_change_password) return (
    <div className="ceb-auth-page">
      <section className="ceb-auth-card">
        <div className="ceb-auth-mark"><img src="/central-estudos-biblicos-v2/ceb-book.png" alt="" style={{ width: "82%", height: "82%", objectFit: "contain" }} /></div>
        <p className="ceb-auth-eyebrow">PRIMEIRO ACESSO</p>
        <h1>Crie sua senha pessoal</h1>
        <p className="ceb-auth-subtitle">Por segurança, troque a senha temporária antes de continuar. Use exatamente 6 letras minúsculas ou números.</p>
        <form onSubmit={handlePasswordChange} className="ceb-auth-form">
          <label>Senha temporária atual<input type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></label>
          <label>Nova senha<input type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} maxLength={6} pattern="[a-z0-9]{6}" /></label>
          <label>Confirme a nova senha<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} maxLength={6} pattern="[a-z0-9]{6}" /></label>
          {error && <p className="ceb-auth-error" role="alert">{error}</p>}
          {notice && <p className="ceb-auth-success" role="status">{notice}</p>}
          <button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar senha e continuar'}</button>
          <button type="button" className="ceb-auth-secondary" onClick={handleLogout} disabled={busy}>Sair</button>
        </form>
      </section>
    </div>
  )

  return <>
    <div className="ceb-session-strip">
      <span>Conectado: <strong>{user.display_name || user.username}</strong>{user.role === 'admin' ? ' · Administrador' : ''}</span>
      <div>
        {user.role === 'admin' && <>
          <button type="button" onClick={() => { setAdminOpen(false); setStudentOpen(false) }}>⌂ Página principal</button>
          <button type="button" onClick={() => { setStudentOpen(true); setAdminOpen(false) }} aria-pressed={studentOpen}>🎓 Área do Aluno</button>
          <button type="button" onClick={() => { setAdminOpen(true); setStudentOpen(false) }} aria-pressed={adminOpen}>⚙️ Administração do Sistema</button>
        </>}
        <button onClick={handleLogout}>Sair</button>
      </div>
    </div>
    {user.role === 'admin'
      ? adminOpen ? <CebAdmin token={token} ownId={user.id} />
        : studentOpen ? <CebAluno token={token} name={user.display_name || user.username} userId={user.id} />
          : <CebWorkspace token={token} user={user} />
      : <CebAluno token={token} name={user.display_name || user.username} userId={user.id} />}
  </>
}

export default App

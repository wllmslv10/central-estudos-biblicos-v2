import {unwrapOfflinePresentation} from './offlinePresentation.mjs';
import {withPresentationBible} from './presentationBible.mjs'
import {bibleTranslations,biblePassageUrl} from './bibleTranslations.mjs'
import {chooseBibleTranslation,useBibleTranslation} from './useBibleTranslation'
import TeacherWorkspace,{TeacherControls} from './TeacherMode';
import {withTeacherBridge,embeddedTeacherNotes} from './teacherBridge.mjs';
import InteractiveReading from './InteractiveReading';
import LibraryPresentation from './LibraryPresentation';
import { useEffect, useMemo, useRef, useState } from "react";
import { originalFile } from "./cebApi";

export type OriginalFile = { id: string; filename: string; mime: string; audience?: "student" | "teacher" };
export type OriginalBundle = {
  version: 1;
  description: string;
  files: OriginalFile[];
};
export function saveOriginal(file: File) {
  const url = URL.createObjectURL(file),
    a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export default function OriginalFiles({
  token,
  studyId,
  bundle,
  allowDownload = true,
  audience = "teacher",
  studentView = false,
  onDeleteFile,
  ibneKind,
}: {
  token: string;
  studyId: string;
  bundle: OriginalBundle;
  allowDownload?: boolean;
  audience?: "teacher" | "student";
  studentView?: boolean;
  ibneKind?: "ebd" | "sermon";
  onDeleteFile?: (file: OriginalFile) => Promise<void>;
}) {
  const [teacherFile,setTeacherFile] = useState<OriginalFile|null>(null);
  const [slides,setSlides] = useState(false);
  const [pdfReferences,setPdfReferences] = useState<string[]>([]);
  const [pdfReferencesBusy,setPdfReferencesBusy] = useState(false);
  const [selectedPdfVerse,setSelectedPdfVerse] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const {translation,sync} = useBibleTranslation(frame);
  const teacherChannel=useMemo(()=>crypto.randomUUID(),[]);
  const [preview, setPreview] = useState<{
      url: string;
      html?: string;
      file: OriginalFile;
    } | null>(null),
    [prepared, setPrepared] = useState<File | null>(null),
    [reader, setReader] = useState<{filename:string;pages:string[];fileId:string} | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  const originalHtmlSrcDoc = useMemo(()=>{
    if(!preview)return undefined;
    if (preview.html === undefined) return undefined;
    const translated = withPresentationBible(preview.html);
    if (audience === 'student' && !allowDownload && preview.file.filename === 'reading.html') {
      const page = new DOMParser().parseFromString(translated,'text/html');
      page.querySelector('button#save')?.setAttribute('hidden','');
      return '<!doctype html>' + page.documentElement.outerHTML;
    }
    return audience === 'teacher' ? withTeacherBridge(translated,teacherChannel) : translated;
  },[preview,audience,allowDownload,teacherChannel]);
  const load = async (
    f: OriginalFile,
    action: "view" | "download",
    share = false,
  ) => {
    if (audience === "student" && f.audience !== "student") {
      setError("Este arquivo está reservado ao professor.");
      return;
    }
    if (!allowDownload && (action === "download" || share)) {
      setError("O download deste material não foi autorizado.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const blob = await originalFile(token, studyId, f.id, action, studentView);
      const file = new File([blob], f.filename, { type: f.mime });
      if (share) setPrepared(file);
      else if (
        action === "download" ||
        !["text/html", "application/pdf"].includes(f.mime) &&
          !/\\.(?:html?|pdf)$/i.test(f.filename)
      )
        saveOriginal(file);
      else
        (setPdfReferences([]),setPreview({
          url: URL.createObjectURL(file),
          file: f,
          ...(f.mime === "text/html" || /\\.html?$/i.test(f.filename) ? { html: await file.text() } : {}),
        }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível abrir.");
    } finally {
      setBusy(false);
    }
  };
  const canReadHtml = (f: OriginalFile) =>
    f.mime === "application/pdf" || /\.pdf$/i.test(f.filename) ||
    f.mime === "text/html" || /\.html?$/i.test(f.filename) ||
    /wordprocessingml/.test(f.mime) || /\.docx$/i.test(f.filename);
  const readHtml = async (f: OriginalFile) => {
    if (audience === "student" && f.audience !== "student") {
      setError("Este arquivo está reservado ao professor.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const blob = await originalFile(token, studyId, f.id, "view");
      const pages: string[] = [];
      if (f.mime === "application/pdf" || /\.pdf$/i.test(f.filename)) {
        const pdfjsUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
        const pdfjs = await import(/* @vite-ignore */ pdfjsUrl);
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const lines: string[] = [];
          let line = "";
          for (const item of content.items) {
            if (!("str" in item)) continue;
            line += item.str;
            if (item.hasEOL) { lines.push(line.trim()); line = ""; }
            else if (item.str && !item.str.endsWith(" ")) line += " ";
          }
          if (line.trim()) lines.push(line.trim());
          pages.push(lines.filter(Boolean).join("\n"));
        }
      } else if (f.mime === "text/html" || /\.html?$/i.test(f.filename)) {
        const html = new DOMParser().parseFromString(unwrapOfflinePresentation(await blob.text()), "text/html");
        html.querySelectorAll("script,style,template,noscript,svg,nav,dialog,footer,button").forEach(node => node.remove());
        const root = html.querySelector('main,article') || html.body;
        const sourceSlides = [...root.querySelectorAll('.slide')];
        const sections = sourceSlides.length ? sourceSlides : [root];
        for (const section of sections) {
          const content = section.querySelector('.body') || section;
          content.querySelectorAll('h1,h2,h3,h4,p,li,br,section,div').forEach(node=>node.append('\n'));
          if (content.textContent?.trim()) pages.push(content.textContent.trim());
        }
      } else {
        const mammothUrl = "https://cdn.jsdelivr.net/npm/mammoth@1.9.1/mammoth.browser.min.js";
        type Mammoth = { extractRawText: (arg: {arrayBuffer:ArrayBuffer}) => Promise<{value:string}> };
        const scope = window as Window & {mammoth?:Mammoth};
        if (!scope.mammoth) {
          await new Promise<void>((resolve,reject)=>{
            const script = document.createElement("script");
            script.src = mammothUrl;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Não foi possível carregar o leitor Word."));
            document.head.appendChild(script);
          });
        }
        if (!scope.mammoth) throw new Error("Leitor Word indisponível.");
        const result = await scope.mammoth.extractRawText({arrayBuffer:await blob.arrayBuffer()});
        pages.push(result.value);
      }
      if (!pages.some(page=>page.trim())) throw new Error("O arquivo não contém texto extraível. Use Visualizar original.");
      setReader({filename:f.filename,pages,fileId:f.id});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo em HTML.");
    } finally { setBusy(false); }
  };
  const findPdfReferences = async () => {
    if (!preview || !(preview.file.mime === "application/pdf" || /\.pdf$/i.test(preview.file.filename))) return;
    setPdfReferencesBusy(true);
    setError("");
    try {
      const pdfjsUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
      const pdfjs = await import(/* @vite-ignore */ pdfjsUrl);
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
      const response = await fetch(preview.url);
      if (!response.ok) throw new Error("Não foi possível acessar o PDF.");
      const pdf = await pdfjs.getDocument({data:new Uint8Array(await response.arrayBuffer())}).promise;
      const found = new Set<string>();
      const pattern = /\\b(?:[123]\\s*)?(?:Gênesis|Genesis|Gn|Êxodo|Exodo|Salmos|Salmo|Sl|Provérbios|Isaías|Daniel|Mateus|Mt|Marcos|Mc|Lucas|Lc|João|Joao|Jo|Atos|At|Romanos|Rm|Coríntios|Corintios|Gálatas|Efésios|Filipenses|Hebreus|Hb|Tiago|Tg|Pedro|Apocalipse|Ap)\\s+\\d{1,3}:\\d{1,3}(?:\\s*[-–]\\s*\\d{1,3})?/giu;
      for(let i=1;i<=pdf.numPages;i++){
        const page=await pdf.getPage(i);
        const content=await page.getTextContent();
        const text=(content.items as Array<{str?:string}>).map((item:{str?:string})=>item.str||"").join(" ");
        for(const match of text.matchAll(pattern))found.add(match[0]);
      }
      setPdfReferences([...found]);
      if(!found.size)setError("Nenhuma referência reconhecida no texto do PDF. PDFs digitalizados podem exigir reconhecimento de texto.");
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível identificar as referências.");}
    finally{setPdfReferencesBusy(false)}
  };
  const share = async () => {
    if (!prepared) return;
    try {
      if (navigator.canShare?.({ files: [prepared] }) && navigator.share) {
        await navigator.share({ files: [prepared], title: prepared.name });
      } else {
        saveOriginal(prepared);
        setError("Arquivo baixado. Abra o WhatsApp e anexe-o como documento.");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError(
          "Compartilhamento indisponível. Use Baixar para anexar manualmente.",
        );
    }
  };
  return (
    <div className="original-files">
      <p>{bundle.description}</p>
      {audience === "student" && !bundle.files.some(f => f.audience === "student") && <p role="status">Nenhum anexo foi liberado para alunos neste material.</p>}
      {bundle.files.filter(f => audience === "teacher" || f.audience === "student").map((f) => {
        const packaged = ibneKind || audience === "student";
        const reading = packaged && f.mime === "text/html" && f.filename === "reading.html";
        const presentation = ibneKind && f.mime === "text/html" && f.filename === "presentation.html";
        if (reading || presentation) return <section key={f.id} className="ibne-attachment">
          <strong>{reading?"📖 Leitura do aluno":ibneKind==="sermon"?"🎙️ Apresentação do pregador":"📽️ Apresentação do professor"}</strong>
          <button type="button" disabled={busy} onClick={()=>reading?void load(f,"view"):setTeacherFile(f)}>
            {reading?"Abrir leitura do aluno":ibneKind==="sermon"?"Abrir Modo Pregador":"Abrir Modo Professor"}
          </button>
          {allowDownload && <details className="ibne-more"><summary>Mais opções</summary>
            <button type="button" disabled={busy} onClick={()=>void load(f,"download")}>Baixar original</button>
            {onDeleteFile && <button type="button" disabled={busy} onClick={()=>void onDeleteFile(f).catch(e=>setError(e.message))}>Excluir anexo</button>}
          </details>}
        </section>;
        return (
        <section className="import-actions original-file-card" key={f.id} aria-label={`Arquivo ${f.filename}`} style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:"10px",padding:"14px 16px",margin:"12px 0",border:"1px solid #cbdcec",borderRadius:"12px",background:"#f8fbff"}}>
          <strong className="original-file-name" style={{flex:"1 1 220px",overflowWrap:"anywhere",color:"#173f61"}}>{/\.pdf$/i.test(f.filename) ? "📕 " : /\.docx?$/i.test(f.filename) ? "📘 " : /\.html?$/i.test(f.filename) ? "🌐 " : "📄 "}{f.filename}</strong>
          <button
            disabled={
              busy ||
              (!allowDownload &&
                !canReadHtml(f))
            }
            onClick={() => void load(f, "view")}
          >
            {/wordprocessingml/.test(f.mime)
              ? "Abrir no Word (baixar)"
              : "Visualizar original"}
          </button>
          {audience === "teacher" && /\.html?$/i.test(f.filename) && !/(?:leitura|reading|quiz|question[aá]rio)/i.test(f.filename) && <button onClick={()=>setTeacherFile(f)}>👨‍🏫 Abrir Modo Professor</button>}
          {canReadHtml(f) && (
            <button disabled={busy} onClick={() => void readHtml(f)}>📖 Leitura Interativa</button>
          )}
          {onDeleteFile && audience === "teacher" && (
            <button type="button" disabled={busy}
              aria-label={`Excluir ${f.filename} deste cartão`}
              onClick={() => void onDeleteFile(f).catch(e => setError(e instanceof Error ? e.message : "Não foi possível excluir o anexo."))}
              style={{color:"#9f1d24",borderColor:"#dca7aa"}}>
              🗑️ Excluir
            </button>
          )}
          {allowDownload && (
            <>
              <button disabled={busy} onClick={() => void load(f, "download")}>
                Baixar original
              </button>
              <button
                disabled={busy}
                onClick={() => void load(f, "download", true)}
              >
                Preparar arquivo para WhatsApp
              </button>
            </>
          )}
        </section>
      );})}
      {teacherFile && <TeacherWorkspace token={token} resource={{kind:"study",id:studyId,fileId:teacherFile.id}} title={teacherFile.filename} mime={teacherFile.mime} onClose={()=>setTeacherFile(null)}/>}
      {prepared && (
        <div role="status">
          <p>{prepared.name} pronto.</p>
          <button onClick={() => void share()}>
            Compartilhar arquivo / escolher WhatsApp
          </button>
          <button onClick={() => saveOriginal(prepared)}>
            Baixar para anexar manualmente
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {reader && <InteractiveReading study={{title:reader.filename,passage:'',theme:'',introduction:'',points:[],conclusion:'',legacySections:reader.pages.map((text,i)=>({title:reader.pages.length>1?`Página ${i+1}`:'Texto do material',content:text}))}} audience={audience} allowDownload={allowDownload} onSlides={audience==='teacher'?()=>setSlides(true):undefined} notice="Texto extraído: imagens, tabelas e diagramação podem não ser reproduzidos fielmente. Confira Visualizar original. Nenhum arquivo original foi alterado." onClose={()=>{setReader(null);setSlides(false)}}/>}
      {reader && slides && <LibraryPresentation study={{title:reader.filename,passage:'',theme:'',introduction:'',points:[],conclusion:'',legacySections:reader.pages.map((text,i)=>({title:reader.pages.length>1?`Página ${i+1}`:'Texto do material',content:text}))}} token={token} resource={{kind:"study",id:studyId,fileId:reader.fileId}} onClose={()=>setSlides(false)}/>}
      {preview && (
        <section className="original-preview">
          <button onClick={() => {setSelectedPdfVerse(null);setPreview(null)}}>Fechar visualização</button>
          {audience === "teacher" && <TeacherControls token={token} resource={{kind:"study",id:studyId,fileId:preview.file.id}} title={preview.file.filename} frame={frame} channel={teacherChannel} seedNotes={embeddedTeacherNotes(preview.html||'')}/>}
          <button
            onClick={() =>
              void frame.current
                ?.requestFullscreen?.()
                .catch(() => setError("Tela cheia indisponível."))
            }
          >
            Tela cheia
          </button>
          {(preview.file.mime === "application/pdf" || /\.pdf$/i.test(preview.file.filename)) && <button disabled={pdfReferencesBusy} onClick={()=>void findPdfReferences()}>{pdfReferencesBusy?"Procurando referências…":"Referências bíblicas do PDF"}</button>}
          {(preview.file.mime === "application/pdf" || /\.pdf$/i.test(preview.file.filename)) && pdfReferences.length>0 && <aside aria-label="Referências bíblicas encontradas no PDF" style={{width:"100%",padding:"10px",background:"#eef5ff"}}><strong>Referências encontradas (texto extraído): </strong>{pdfReferences.map(ref=><button type="button" key={ref} onClick={()=>setSelectedPdfVerse(ref)} style={{marginRight:8,marginBottom:6}}>{ref}</button>)}</aside>}
          <label style={{display:'inline-flex',alignItems:'center',gap:6,marginLeft:8}}>Tradução preferida <select aria-label="Tradução bíblica preferida" value={translation} onChange={e=>chooseBibleTranslation(e.target.value)}>{Object.entries(bibleTranslations).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          {selectedPdfVerse && (preview.file.mime === "application/pdf" || /\.pdf$/i.test(preview.file.filename)) && <div role="dialog" aria-label="Consultar referência bíblica" style={{width:"100%",border:"1px solid #cbdcec",borderRadius:8,padding:12,background:"#fff"}}><strong>{selectedPdfVerse} — {bibleTranslations[translation]}</strong> <a target="_blank" rel="noopener noreferrer" href={biblePassageUrl(selectedPdfVerse,translation)}>Consultar passagem na tradução selecionada</a> <button onClick={()=>setSelectedPdfVerse(null)}>Fechar</button></div>}
          <iframe
            ref={frame} onLoad={sync}
            title={preview.file.filename}
            src={preview.html === undefined ? preview.url : undefined}
            srcDoc={originalHtmlSrcDoc}
            sandbox={
              preview.html !== undefined
                ? "allow-scripts allow-forms allow-modals allow-popups" + (allowDownload ? " allow-downloads" : "")
                : undefined
            }
            allow="fullscreen"
            style={{ width: "100%", height: "75vh", border: 0 }}
          />
        </section>
      )}
    </div>
  );
}

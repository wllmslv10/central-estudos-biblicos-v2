import InteractiveReading from './InteractiveReading';
import LibraryPresentation from './LibraryPresentation';
import { useEffect, useRef, useState } from "react";
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
}: {
  token: string;
  studyId: string;
  bundle: OriginalBundle;
  allowDownload?: boolean;
  audience?: "teacher" | "student";
}) {
  const [slides,setSlides] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const [preview, setPreview] = useState<{
      url: string;
      html?: string;
      file: OriginalFile;
    } | null>(null),
    [prepared, setPrepared] = useState<File | null>(null),
    [reader, setReader] = useState<{filename:string;pages:string[]} | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  const load = async (
    f: OriginalFile,
    action: "view" | "download",
    share = false,
  ) => {
    setBusy(true);
    setError("");
    try {
      const blob = await originalFile(token, studyId, f.id, action);
      const file = new File([blob], f.filename, { type: f.mime });
      if (share) setPrepared(file);
      else if (
        action === "download" ||
        !["text/html", "application/pdf"].includes(f.mime)
      )
        saveOriginal(file);
      else
        setPreview({
          url: URL.createObjectURL(file),
          file: f,
          ...(f.mime === "text/html" ? { html: await file.text() } : {}),
        });
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
        const html = new DOMParser().parseFromString(await blob.text(), "text/html");
        html.querySelectorAll("script,style,template,noscript,svg,nav,dialog,footer,button").forEach(node => node.remove());
        const root = html.querySelector('main,article') || html.body;
        root.querySelectorAll('h1,h2,h3,h4,p,li,br,section,div').forEach(node=>node.append('\n'));
        pages.push(root.textContent || "");
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
      setReader({filename:f.filename,pages});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo em HTML.");
    } finally { setBusy(false); }
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
      {bundle.files.filter(f => audience === "teacher" || f.audience === "student").map((f) => (
        <section className="import-actions original-file-card" key={f.id} aria-label={`Arquivo ${f.filename}`}>
          <strong className="original-file-name">{/\.pdf$/i.test(f.filename) ? "📕 " : /\.docx?$/i.test(f.filename) ? "📘 " : /\.html?$/i.test(f.filename) ? "🌐 " : "📄 "}{f.filename}</strong>
          <button
            disabled={
              busy ||
              (!allowDownload &&
                !["text/html", "application/pdf"].includes(f.mime))
            }
            onClick={() => void load(f, "view")}
          >
            {/wordprocessingml/.test(f.mime)
              ? "Abrir no Word (baixar)"
              : "Visualizar original"}
          </button>
          {canReadHtml(f) && (
            <button disabled={busy} onClick={() => void readHtml(f)}>📖 Leitura Interativa</button>
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
      ))}
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
      {reader && slides && <LibraryPresentation study={{title:reader.filename,passage:'',theme:'',introduction:reader.pages.join('\n\n'),points:[],conclusion:'',legacySections:reader.pages.map((text,i)=>({title:reader.pages.length>1?`Página ${i+1}`:'Texto do material',content:text}))}} onClose={()=>setSlides(false)}/>}
      {preview && (
        <section className="original-preview">
          <button onClick={() => setPreview(null)}>Fechar visualização</button>
          <button
            onClick={() =>
              void frame.current
                ?.requestFullscreen?.()
                .catch(() => setError("Tela cheia indisponível."))
            }
          >
            Tela cheia
          </button>
          <iframe
            ref={frame}
            title={preview.file.filename}
            src={preview.html === undefined ? preview.url : undefined}
            srcDoc={preview.html}
            sandbox={
              preview.file.mime === "text/html"
                ? "allow-scripts allow-forms allow-modals allow-downloads allow-popups"
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

import { useEffect, useRef, useState } from "react";
import { originalFile } from "./cebApi";

export type OriginalFile = { id: string; filename: string; mime: string };
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
}: {
  token: string;
  studyId: string;
  bundle: OriginalBundle;
  allowDownload?: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [preview, setPreview] = useState<{
      url: string;
      html?: string;
      file: OriginalFile;
    } | null>(null),
    [prepared, setPrepared] = useState<File | null>(null),
    [reader, setReader] = useState<{filename:string;pages:string[]} | null>(null),
    [fontSize,setFontSize] = useState(21),
    [lineHeight,setLineHeight] = useState(1.7),
    [theme,setTheme] = useState<"claro"|"creme"|"escuro">("claro"),
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
  const readHtml = async (f: OriginalFile) => {
    setBusy(true);
    setError("");
    try {
      const blob = await originalFile(token, studyId, f.id, "view");
      const pdfjsUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
      const pdfjs = await import(/* @vite-ignore */ pdfjsUrl);
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
      const document = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= document.numPages; i++) {
        const page = await document.getPage(i);
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
      setReader({filename:f.filename,pages});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível ler o PDF em HTML.");
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
      {bundle.files.map((f) => (
        <div className="import-actions" key={f.id}>
          <strong>{f.filename}</strong>
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
          {f.mime === "application/pdf" && f.filename === "Estudo-Professor-APROVADO.pdf" && (
            <button disabled={busy} onClick={() => void readHtml(f)}>Ler em HTML</button>
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
        </div>
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
      {reader && (
        <div className={`reading-overlay reading-${theme}`} role="dialog" aria-modal="true" aria-label={`Modo de leitura: ${reader.filename}`}>
          <div className="reading-toolbar">
            <div className="reading-toolbar-title"><strong>📖 Modo de leitura</strong><span>{reader.filename}</span></div>
            <div className="reading-controls">
              <div className="reading-control-group" aria-label="Tamanho da fonte"><span>Fonte</span>
                <button type="button" onClick={() => setFontSize(n => Math.max(16,n-2))}>A−</button>
                <span>{fontSize}px</span>
                <button type="button" onClick={() => setFontSize(n => Math.min(32,n+2))}>A+</button>
              </div>
              <label className="reading-line-control">Espaçamento <input type="range" min="1.35" max="2.2" step="0.05" value={lineHeight} onChange={e=>setLineHeight(Number(e.target.value))}/></label>
              <div className="reading-control-group" aria-label="Cor de fundo"><span>Fundo</span>
                {(["claro","creme","escuro"] as const).map(value=><button key={value} type="button" className={theme===value?"selected":""} onClick={()=>setTheme(value)}>{value==="claro"?"Claro":value==="creme"?"Creme":"Escuro"}</button>)}
              </div>
              <button type="button" className="reading-toolbar-button" onClick={() => void document.querySelector(".original-reading-dialog")?.requestFullscreen?.().catch(()=>setError("Tela cheia indisponível."))}>⛶ Tela cheia</button>
              <button type="button" className="reading-close-button" onClick={()=>setReader(null)}>Fechar</button>
            </div>
          </div>
          <div className="original-reading-dialog">
            <article className="reading-page" style={{fontSize:`${fontSize}px`,lineHeight}}>
              <div className="reading-church">CENTRAL DE ESTUDOS BÍBLICOS · IGREJA BATISTA NOVA ESPERANÇA</div>
              <h1>{reader.filename.replace(/\.pdf$/i,"")}</h1>
              {reader.pages.map((page,i)=><section className="reading-section" key={i}>
                <h2>Página {i+1}</h2>
                {page.split("\n").filter(Boolean).map((paragraph,j)=><p key={j} style={{whiteSpace:"pre-wrap",marginBottom:"0.65em"}}>{paragraph}</p>)}
              </section>)}
              <p className="reading-footer">Texto extraído do PDF. Para imagens e diagramação original, use “Visualizar original”.</p>
            </article>
          </div>
        </div>
      )}
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

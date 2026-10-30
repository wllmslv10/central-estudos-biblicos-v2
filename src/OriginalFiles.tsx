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

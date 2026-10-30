import { useEffect, useRef, useState } from "react";
import {
  cebApi,
  createCloudStudy,
  updateCloudStudy,
  deleteCloudStudy,
  listCloudStudies,
  cloudMaterials,
  uploadCloudMaterial,
  patchCloudStudyApplication,
  patchCloudMaterial,
  type CloudStudy,
  type CloudMaterial,
} from "./cebApi";
import { TeacherQuiz } from "./Quiz";
import OriginalFiles, {
  type OriginalBundle,
  type OriginalFile,
} from "./OriginalFiles";
type BundleStudy = CloudStudy & {
  content: CloudStudy["content"] & { originalBundle: OriginalBundle };
};
export default function OriginalMaterials({
  token,
  onShare,
  onChanged,
}: {
  token: string;
  onShare: (s: CloudStudy) => void;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<BundleStudy[]>([]),
    [existing, setExisting] = useState<CloudMaterial[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [files, setFiles] = useState<File[]>([]),
    [uploaded, setUploaded] = useState<OriginalFile[]>([]),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [editing, setEditing] = useState<BundleStudy | null>(null),
    [quiz, setQuiz] = useState<BundleStudy | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [scope, setScope] = useState("general");
  const lock = useRef(false);
  const refresh = async () => {
    const [s, m] = await Promise.all([
      listCloudStudies(token),
      cloudMaterials(token),
    ]);
    setItems(
      s.studies.filter((s) => !!s.content.originalBundle) as BundleStudy[],
    );
    setExisting(m.materials);
  };
  useEffect(() => {
    void refresh().catch((e) => setNotice(e.message));
  }, [token]);
  const clear = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setSelected([]);
    setFiles([]);
    setUploaded([]);
  };
  const save = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    const staged = [...uploaded];
    try {
      if (selected.length + files.length > 12)
        throw new Error("O cartão permite até 12 arquivos.");
      for (let i = staged.length; i < files.length; i++) {
        const file = files[i];
        const r = await uploadCloudMaterial(token, file, {
          title: file.name,
          kind: "estudo",
          text: "",
          scope,
        });
        staged.push({
          id: r.material.id,
          filename: r.material.filename,
          mime: r.material.mime_type,
        });
        setUploaded([...staged]);
      }
      const linked = existing
        .filter((f) => selected.includes(f.id))
        .map((f) => ({ id: f.id, filename: f.filename, mime: f.mime_type }));
      const attachments = [...linked, ...staged];
      if (!attachments.length)
        throw new Error("Selecione ao menos um arquivo original.");
      const content = {
        ...(editing?.content || {}),
        collection: "originals",
        libraryScope: scope,
        title: title.trim(),
        passage: "",
        theme: description,
        introduction: "",
        points: [],
        conclusion: "",
        originalBundle: { version: 1, description, files: attachments },
      };
      if (editing)
        await updateCloudStudy(token, editing.id, {
          title: title.trim(),
          content,
          status: editing.status,
        });
      else
        await createCloudStudy(token, {
          title: title.trim(),
          content,
          status: "draft",
        });
      clear();
      await refresh();
      onChanged();
      setNotice(
        "Cartão salvo. Os arquivos originais foram preservados sem conversão.",
      );
    } catch (e) {
      setNotice(
        (e instanceof Error ? e.message : "Falha ao salvar.") +
          (staged.length
            ? " Os uploads concluídos foram preservados; tente salvar novamente."
            : ""),
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  const edit = (s: BundleStudy) => {
    setEditing(s);
    setTitle(s.title);
    setDescription(s.content.originalBundle.description);
    setScope(String(s.content.libraryScope || "general"));
    setSelected(s.content.originalBundle.files.map((f) => f.id));
    setFiles([]);
    setUploaded([]);
  };
  const remove = async (s: BundleStudy) => {
    if (
      !confirm(
        `Mover “${s.title}” para a Lixeira? Anexos e resultados serão preservados.`,
      )
    )
      return;
    setBusy(true);
    try {
      await deleteCloudStudy(token, s.id);
      await refresh();
      onChanged();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Falha ao excluir.");
    } finally {
      setBusy(false);
    }
  };
  const apply = async (s: BundleStudy, applied: boolean, date: string) => {
    setBusy(true);
    try {
      await patchCloudStudyApplication(token, s.id, applied, date);
      await refresh();
      onChanged();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Falha ao atualizar.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="content-section">
      <h2>Materiais Originais</h2>
      <p>
        PDF, Word e apresentação HTML reunidos com um questionário no mesmo
        cartão. Os arquivos são guardados sem conversão.
      </p>
      <form
        className="study-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h3>
          {editing ? "Editar informações e anexos" : "Novo cartão de materiais"}
        </h3>
        <label>
          Título
          <input
            required
            maxLength={240}
            disabled={busy}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Breve identificação
          <textarea
            maxLength={2000}
            disabled={busy}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Visibilidade
          <select
            disabled={busy}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="general">
              Biblioteca geral (compartilhamento configurado separadamente)
            </option>
            <option value="private">Particular</option>
          </select>
        </label>
        <label>
          Adicionar arquivos PDF, Word (.docx) ou HTML
          <input
            disabled={busy || uploaded.length > 0}
            type="file"
            multiple
            accept=".pdf,.docx,.html,.htm"
            onChange={(e) => {
              setFiles(Array.from(e.target.files || []));
              setUploaded([]);
            }}
          />
        </label>
        <small>
          Até 12 arquivos por cartão, 20 MB por arquivo. Para preservar imagens
          e scripts, use HTML com recursos incorporados ou endereços absolutos.
        </small>
        <fieldset disabled={busy}>
          <legend>Ou reunir originais já importados</legend>
          {existing.map((f) => (
            <label key={f.id} style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={selected.includes(f.id)}
                onChange={(e) =>
                  setSelected((ids) =>
                    e.target.checked
                      ? [...ids, f.id]
                      : ids.filter((id) => id !== f.id),
                  )
                }
              />
              {f.filename}
            </label>
          ))}
        </fieldset>
        <button
          className="primary-button"
          disabled={busy || selected.length + files.length > 12}
        >
          Salvar cartão
        </button>
        <button type="button" disabled={busy} onClick={clear}>
          Cancelar / limpar
        </button>
      </form>
      {notice && <p role="status">{notice}</p>}
      {quiz && (
        <TeacherQuiz
          allowOriginalImport
          token={token}
          studyId={quiz.id}
          title={quiz.title}
          onClose={() => setQuiz(null)}
        />
      )}
      {items.map((s) => (
        <article
          className={`library-item${s.content.applied ? " library-item-applied" : ""}`}
          key={s.id}
        >
          <div>
            <h3>{s.title}</h3>
            <OriginalFiles
              token={token}
              studyId={s.id}
              bundle={s.content.originalBundle}
            />
            <div className="import-actions">
              <button disabled={busy} onClick={() => edit(s)}>
                Editar informações / anexos
              </button>
              <button onClick={() => setQuiz(s)}>
                Questionário, correção e resultados
              </button>
              <button
                onClick={() =>
                  void listCloudStudies(token)
                    .then((r) => {
                      const current = r.studies.find(
                        (item) => item.id === s.id,
                      );
                      if (current) onShare(current);
                    })
                    .catch((e) => setNotice(e.message))
                }
              >
                Compartilhar com alunos / permissões
              </button>
              <button disabled={busy} onClick={() => void remove(s)}>
                Mover para Lixeira
              </button>
              <label>
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={!!s.content.applied}
                  onChange={(e) =>
                    void apply(
                      s,
                      e.target.checked,
                      String(s.content.appliedDate || ""),
                    )
                  }
                />{" "}
                Material aplicado
              </label>
              {!!s.content.applied && (
                <label>
                  Data de aplicação
                  <input
                    disabled={busy}
                    type="date"
                    value={String(s.content.appliedDate || "")}
                    onChange={(e) => void apply(s, true, e.target.value)}
                  />
                </label>
              )}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
type Applied = {
  id: string;
  title: string;
  identification: string;
  applied_date: string | null;
  source: "study" | "material";
};
export function AppliedMaterials({
  token,
  onChanged,
}: {
  token: string;
  onChanged: (item: Applied, applied: boolean, date: string) => void;
}) {
  const [items, setItems] = useState<Applied[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () =>
    cebApi<{ materials: Applied[] }>("/library/applied", { token }).then((r) =>
      setItems(r.materials),
    );
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [token]);
  const update = async (item: Applied, applied: boolean, date: string) => {
    setBusy(true);
    setError("");
    try {
      if (item.source === "study")
        await patchCloudStudyApplication(token, item.id, applied, date);
      else await patchCloudMaterial(token, item.id, applied, date);
      await load();
      onChanged(item, applied, date);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="content-section">
      <h2>Materiais Aplicados</h2>
      <p>Registro de aplicação: somente título, identificação e data.</p>
      {error && <p role="alert">{error}</p>}
      {items.map((item) => (
        <article className="library-item" key={item.source + item.id}>
          <div>
            <h3>{item.title}</h3>
            <p>{item.identification}</p>
            <label>
              Data de aplicação
              <input
                type="date"
                disabled={busy}
                value={item.applied_date || ""}
                onChange={(e) => void update(item, true, e.target.value)}
              />
            </label>
            <button
              disabled={busy}
              onClick={() => void update(item, false, "")}
            >
              Desmarcar aplicação
            </button>
          </div>
        </article>
      ))}
      {!items.length && !error && <p>Nenhum material marcado como aplicado.</p>}
    </section>
  );
}

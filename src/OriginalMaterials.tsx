import { matchesMaterial } from './materialSearch.mjs';
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
import { QuizStatus } from "./QuizStatus";
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
    [fileQuery, setFileQuery] = useState(""),
    [files, setFiles] = useState<File[]>([]),
    [uploaded, setUploaded] = useState<OriginalFile[]>([]),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [editing, setEditing] = useState<BundleStudy | null>(null),
    [quiz, setQuiz] = useState<BundleStudy | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [scope, setScope] = useState("private"),
    [search, setSearch] = useState(""),
    [expandedCard, setExpandedCard] = useState<string | null>(null),
    [formExpanded, setFormExpanded] = useState(false),
    [loading, setLoading] = useState(true);
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
    void refresh().catch((e) => setNotice(e.message)).finally(()=>setLoading(false));
  }, [token]);
  const clear = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setSelected([]);
    setFileQuery("");
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
      if (!title.trim()) throw new Error("Informe o título antes de enviar os arquivos.");
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
    setFileQuery("");
    setFiles([]);
    setUploaded([]);
    setFormExpanded(true);
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
      <h2>Acervo de Materiais Didáticos Importados</h2>
      <p>
        Aulas e materiais preparados fora da CEB, com apresentações, documentos e questionários reunidos em um único cartão. Os arquivos originais são preservados.
      </p>
      <details className="original-acervo-form-expand" open={formExpanded}>
      <summary onClick={e => { e.preventDefault(); setFormExpanded(v => !v); }}><strong>📁 Importar, cadastrar ou editar materiais</strong><span>Importe arquivos, cadastre novos materiais, visualize documentos ou edite cartões existentes.</span></summary>
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
        <details className="original-existing-files">
          <summary>Reutilizar arquivos já importados{selected.length > 0 ? ` (${selected.length} selecionado${selected.length === 1 ? "" : "s"})` : ""}</summary>
          <fieldset disabled={busy}>
            <label>Pesquisar pelo nome da aula ou arquivo
              <input type="search" value={fileQuery} onChange={e => setFileQuery(e.target.value)} placeholder="Digite o nome da aula ou arquivo..." />
            </label>
            {selected.length > 0 && <p className="original-file-hint">Arquivos selecionados: {selected.length}. Desmarque na pesquisa para removê-los.</p>}
            {!fileQuery.trim() ? (
              <p className="original-file-hint">Digite um termo para localizar arquivos. A lista não aparece automaticamente.</p>
            ) : (() => {
              const query = fileQuery.trim().toLocaleLowerCase("pt-BR");
              const matchingStudyIds = new Set(items.filter(study =>
                [study.title, study.content.originalBundle.description].some(value => String(value || "").toLocaleLowerCase("pt-BR").includes(query))
              ).flatMap(study => study.content.originalBundle.files.map(file => file.id)));
              const matches = existing.filter(file =>
                file.filename.toLocaleLowerCase("pt-BR").includes(query) || matchingStudyIds.has(file.id)
              ).slice(0, 50);
              return matches.length ? <>
                <p className="original-file-hint">Exibindo até 50 arquivos encontrados. Refine a pesquisa se necessário.</p>
                {matches.map(file => (
                  <label key={file.id} className="original-file-option">
                    <input type="checkbox" checked={selected.includes(file.id)} onChange={e =>
                      setSelected(ids => e.target.checked ? [...ids, file.id] : ids.filter(id => id !== file.id))
                    } />
                    {file.filename}
                  </label>
                ))}
              </> : <p className="original-file-hint">Nenhum arquivo encontrado. Tente outro nome.</p>;
            })()}
          </fieldset>
        </details>
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
      </details>
      {notice && <p role="status">{notice}</p>}
      {quiz && (
        <TeacherQuiz
          allowOriginalImport
          token={token}
          studyId={quiz.id}
          title={quiz.title}
          onClose={() => { setQuiz(null); void refresh().catch(e => setNotice(e.message)); }}
        />
      )}
      <div className="library-search study-form" role="search" aria-label="Buscar materiais originais"><label>Buscar cartões originais<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Título, identificação ou nome do arquivo" /></label></div>
      {loading && <p role="status">Consultando cartões originais…</p>}
      {!loading && !items.length && <p>Nenhum cartão cadastrado. Reúna os arquivos aprovados no formulário acima.</p>}
      {!loading && items.length > 0 && !items.some(s=>matchesMaterial(search,[s.title,s.content.originalBundle.description,...s.content.originalBundle.files.map(f=>f.filename)])) && <p>Nenhum cartão encontrado. Tente parte do título ou do nome do arquivo.</p>}
      <style>{`
        .original-acervo-form-expand { border:1px solid #d7e3ef; border-radius:15px; background:#fff; margin:14px 0; overflow:hidden; }
        .original-acervo-form-expand > summary { cursor:pointer; list-style:none; padding:15px 18px; background:#edf4fc; color:#173e68; }
        .original-acervo-form-expand > summary::-webkit-details-marker {display:none;}
        .original-acervo-form-expand > summary strong {display:block; font-size:1rem;}
        .original-acervo-form-expand > summary span {display:block; font-size:.83rem; color:#516c87; margin-top:4px;}
        .original-acervo-form-expand > summary::after {content:"⌄"; float:right; margin-top:-36px; font-size:1.3rem;}
        .original-acervo-form-expand[open] > summary::after {content:"⌃";}
        .original-acervo-form-expand > .study-form {margin:0;}
        .original-existing-files {border:1px solid #d7e3ef; border-radius:10px; margin:10px 0; overflow:hidden;}
        .original-existing-files > summary {cursor:pointer; padding:12px 14px; background:#f4f8fc; color:#173e68; font-weight:600;}
        .original-existing-files > fieldset {padding:12px; border:0; margin:0;}
        .original-file-option {display:block; margin:8px 0; overflow-wrap:anywhere;}
        .original-file-hint {font-size:.85rem; color:#526b82; margin:9px 0;}
        .original-acervo-card { border:1px solid #d7e3ef; border-radius:15px; padding:0; margin:10px 0; background:#fff; box-shadow:0 3px 12px rgba(21,65,108,.05); overflow:hidden; }
        .original-acervo-card.library-item-applied { background:#f1faf5; border-color:#b5dfc9; }
        .original-acervo-expand { width:100%; }
        .original-acervo-expand > summary { list-style:none; cursor:pointer; padding:12px 16px; }
        .original-acervo-expand > summary::-webkit-details-marker { display:none; }
        .original-acervo-expand > summary:focus-visible { outline:3px solid #2563a6; outline-offset:-3px; }
        .original-acervo-expand > summary::after { content:"⌄"; float:right; font-size:1.3rem; color:#2563a6; margin-top:-36px; }
        .original-acervo-expand[open] > summary::after { content:"⌃"; }
        .original-acervo-body { padding:12px 16px 18px; border-top:1px solid #e6edf5; }
        .original-acervo-heading { display:flex; align-items:center; gap:12px; padding-bottom:0; margin-bottom:0; padding-right:28px; }
        .original-acervo-heading > span { display:grid; place-items:center; width:44px; height:44px; border-radius:12px; background:#eaf2fc; font-size:23px; flex-shrink:0; }
        .original-acervo-heading h3 { margin:0 0 5px; color:#173e68; font-size:1.15rem; }
        .original-acervo-heading small { color:#59718a; }
        .original-acervo-heading .library-quiz-status { margin:4px 0 0; font-size:.78rem; line-height:1.3; color:#2e658d; }
        .original-acervo-heading .library-quiz-status br, .original-acervo-heading .library-quiz-status small { display:none; }
        .original-acervo-card .original-files > p { color:#516c87; }
        .original-acervo-card .original-files > .import-actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:12px; margin:9px 0; border:1px solid #e5edf5; background:#f8fbff; border-radius:12px; }
        .original-acervo-card .original-files > .import-actions strong { flex:1 1 100%; overflow-wrap:anywhere; font-size:.92rem; color:#234b70; }
        .original-acervo-card button { border-radius:9px; padding:8px 12px; font-weight:600; }
        .original-acervo-card .original-acervo-actions { display:flex; flex-wrap:wrap; align-items:center; gap:10px; padding-top:16px; margin-top:16px; border-top:1px solid #e6edf5; }
        .original-acervo-card .original-acervo-actions > button { background:#eaf2fc; color:#174e83; border:1px solid #cbdff3; }
        .original-acervo-card .original-acervo-actions > button:hover { background:#d8eafa; }
        .original-acervo-card .original-acervo-actions > label { display:inline-flex; align-items:center; gap:7px; font-size:.9rem; }
        .original-acervo-warning { flex:1 1 100%; order:10; border-radius:10px; background:#fff7e6; padding:9px 12px; font-size:.83rem; color:#79541c; }
        .original-acervo-warning summary { cursor:pointer; font-weight:600; }
        .original-acervo-warning .quiz-notice { margin:9px 0 0; padding:0; background:transparent; }
        @media(max-width:600px) { .original-acervo-expand > summary {padding:10px;} .original-acervo-body {padding:10px;} .original-acervo-card .original-files button { flex:1 1 auto; } }
      `}</style>
      {items.filter(s=>matchesMaterial(search,[s.title,s.content.originalBundle.description,...s.content.originalBundle.files.map(f=>f.filename)])).map((s) => (
        <article
          className={`library-item original-acervo-card${s.content.applied ? " library-item-applied" : ""}`}
          key={s.id}
          aria-label={s.title}
        >
          <details className="original-acervo-expand" open={expandedCard === s.id} onToggle={(event) => { if (event.currentTarget.open && expandedCard !== s.id) setExpandedCard(s.id); }}>
            <summary onClick={(event) => { event.preventDefault(); setExpandedCard(current => current === s.id ? null : s.id); }}><div className="original-acervo-heading"><span aria-hidden="true">📘</span><div><h3>{s.title}</h3><small>{s.content.originalBundle.files.length} arquivo(s) · {s.visibility === "private" ? "Particular" : "Compartilhado"}{s.content.applied ? " · Material aplicado" : ""}</small><QuizStatus study={s} /></div></div></summary>
            <div className="original-acervo-body">
            <OriginalFiles
              token={token}
              studyId={s.id}
              bundle={s.content.originalBundle}
            />
            <div className="import-actions original-acervo-actions">
              <button disabled={busy} onClick={() => edit(s)}>
                Editar informações / anexos
              </button>
              <button onClick={() => setQuiz(s)}>
                Questionário, correção e resultados
              </button>
              <details className="original-acervo-warning"><summary>⚠️ Atenção ao compartilhar questionários com alunos</summary><p className="quiz-notice" role="note">Antes de compartilhar: confira se os PDFs anexados contêm gabarito. Mesmo um arquivo chamado “sem gabarito” pode incluir respostas na última página. Para os alunos, disponibilize o questionário interativo, não o PDF com respostas.</p></details>
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
          </details>
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

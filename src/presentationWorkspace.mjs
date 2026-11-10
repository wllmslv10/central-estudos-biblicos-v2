import { workspaceStyle, workspaceMarkup } from './presentationWorkspaceTemplate.mjs';

const inline = value => JSON.stringify(value).replace(/</g, '\\u003c');
const escaped = value => String(value).replace(/[&<>]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[char]);

// The input is the CEB renderer's reviewed student projection. Imported originals
// must pass through the renderer before entering this same-origin workspace.
export function createPresentationWorkspace(html, title, identity) {
  let fingerprint = 2166136261;
  for (let i = 0; i < html.length; i++) fingerprint = Math.imul(fingerprint ^ html.charCodeAt(i), 16777619);
  const key = 'ceb-presentation-notes:' + (identity || title) + ':' + (fingerprint >>> 0).toString(36);
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaped(title)}</title><style>${workspaceStyle}</style><body>${workspaceMarkup}<script>(${workspaceRuntime.toString()})(${inline(html)},${inline(title)},${inline(key)});</script></body></html>`;
}

function workspaceRuntime(html, title, storageKey) {
  const byId = id => document.getElementById(id);
  const frame = byId('presentation');
  frame.allowFullscreen = true;
  const stage = frame.parentElement;
  const editor = byId('notesEditor');
  let student, index = 0, observer, studentObserver;
  let noteMode = 'slide';
  let notes = {};
  try { notes = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
  const noteKey = () => noteMode === 'general' ? 'general' : String(index);
  function saveNotes() {
    notes[noteKey()] = editor.value;
    try {
      localStorage.setItem(storageKey, JSON.stringify(notes));
      byId('noteSaveStatus').textContent = 'Salvas neste navegador.';
    } catch {
      byId('noteSaveStatus').textContent = 'Não foi possível salvar. Exporte uma cópia.';
    }
  }
  function loadNote() {
    editor.value = notes[noteKey()] || '';
    byId('slideNotesTab').setAttribute('aria-pressed', String(noteMode === 'slide'));
    byId('generalNotesTab').setAttribute('aria-pressed', String(noteMode === 'general'));
  }
  function fit() {
    const factor = Math.min(stage.clientWidth / 1600, stage.clientHeight / 900);
    frame.style.transform = 'scale(' + factor + ')';
    frame.style.left = (stage.clientWidth - 1600 * factor) / 2 + 'px';
    frame.style.top = (stage.clientHeight - 900 * factor) / 2 + 'px';
  }
  new ResizeObserver(fit).observe(stage);
  const slides = doc => [...(doc?.querySelectorAll('.slide') || [])];
  const active = list => list.findIndex(slide => slide.classList.contains('active'));
  function go(doc, target) {
    const list = slides(doc);
    const start = active(list);
    if (start < 0 || target >= list.length || target === start) return;
    const control = doc.getElementById(target > start ? 'next' : 'previous');
    for (let i = 0; i < Math.abs(target - start); i++) control?.click();
  }
  const description = slide => (slide?.querySelector('.body') || slide)?.innerText?.trim() || '';
  function render() {
    const list = slides(frame.contentDocument);
    const current = active(list);
    if (current < 0) return;
    if (index !== current) { saveNotes(); index = current; loadNote(); }
    const next = list[index + 1];
    byId('counter').textContent = (index + 1) + ' / ' + list.length;
    byId('status').textContent = student && !student.closed ? 'Datashow conectado' : 'Abra a janela do aluno para sincronizar';
    byId('summary').textContent = description(list[index]) || title;
    byId('nextTitle').textContent = next?.querySelector('h1,h2,h3')?.textContent || (next ? 'Próximo slide' : 'Fim da apresentação');
    byId('nextBody').textContent = description(next);
    byId('nextRefs').textContent = [...(next?.querySelectorAll('.bible-ref') || [])].map(link => link.textContent).join(' · ');
    byId('previous').disabled = index === 0;
    byId('next').disabled = !next;
    const references = [...list[index].querySelectorAll('.bible-ref')];
    byId('refs').replaceChildren(...references.map(link => {
      const button = document.createElement('button');
      button.textContent = link.dataset.reference || link.textContent;
      button.onclick = () => link.click();
      return button;
    }));
    if (!references.length) byId('refs').textContent = 'Nenhuma referência identificada neste slide.';
    if (student && !student.closed) go(student.document, index);
  }
  function watch(doc, callback) {
    const listener = new MutationObserver(callback);
    listener.observe(doc.body, {attributes:true, attributeFilter:['aria-hidden'], subtree:true});
    return listener;
  }
  frame.addEventListener('load', () => {
    if (!slides(frame.contentDocument).length) return;
    observer?.disconnect();
    observer = watch(frame.contentDocument, render);
    fit();
    render();
  });
  frame.srcdoc = html;
  byId('openStudent').onclick = () => {
    if (student && !student.closed) { student.focus(); return; }
    studentObserver?.disconnect();
    student = window.open('', '_blank', 'popup,width=1200,height=760');
    if (!student) { byId('status').textContent = 'Permita janelas pop-up para abrir o datashow.'; return; }
    student.document.open();
    student.document.write(html);
    student.addEventListener('load', () => {
      go(student.document, index);
      studentObserver = watch(student.document, () => {
        const current = active(slides(student.document));
        if (current >= 0) go(frame.contentDocument, current);
      });
      render();
    }, {once:true});
    student.document.close();
  };
  byId('previous').onclick = () => go(frame.contentDocument, index - 1);
  byId('next').onclick = () => go(frame.contentDocument, index + 1);
  byId('teacherFullscreen').onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { byId('status').textContent = 'Tela cheia indisponível neste navegador.'; }
  };
  byId('fullscreen').onclick = () => frame.contentDocument?.getElementById('fullscreen')?.click();
  byId('print').onclick = () => frame.contentWindow?.print();
  byId('slideNotesTab').onclick = () => { saveNotes(); noteMode = 'slide'; loadNote(); };
  byId('generalNotesTab').onclick = () => { saveNotes(); noteMode = 'general'; loadNote(); };
  byId('saveNotes').onclick = saveNotes;
  byId('exportNotes').onclick = () => {
    saveNotes();
    const url = URL.createObjectURL(new Blob([JSON.stringify({title, notes}, null, 2)], {type:'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'anotacoes-professor.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  loadNote();
}

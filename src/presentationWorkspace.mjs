import {withTeacherBridge} from './teacherBridge.mjs';
import {withPresentationBible} from './presentationBible.mjs';
import {unwrapOfflinePresentation} from './offlinePresentation.mjs';
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

// Imported scripts run only inside opaque-origin frames. The surrounding panel
// is trusted and receives only public slide state from those frames.
export function createImportedPresentationWorkspace(html, title, identity) {
  const channel = crypto.randomUUID();
  let source = unwrapOfflinePresentation(html);
  // A CEB export already contains its own instructor shell. Keep only its
  // public projection; the imported code still runs in the sandbox below.
  if (source === html) {
    const payload = /<script>\(function workspaceRuntime\([\s\S]*?\n\}\)\(([^\n]+)\);<\/script><\/body><\/html>$/u.exec(html);
    if (payload) {
      try {
        const [inner] = JSON.parse('['+payload[1]+']');
        if (typeof inner === 'string') source = inner;
      } catch { /* A regular imported HTML can retain its original structure. */ }
    }
  }
  if (source !== html) {
    const verses = /^const AR_VERSES\s*=\s*(\{[^\n]+\});/m.exec(html);
    if (verses) {
      try {
        const nested = JSON.parse(verses[1]);
        const lookup = {};
        for (const [book, chapters] of Object.entries(nested))
          for (const [chapter, entries] of Object.entries(chapters))
            for (const [verse, value] of Object.entries(entries))
              if (typeof value === 'string') lookup[book+'.'+chapter+'.'+verse] = value;
        source = source.replace(/<\/body\s*>/i, () => '<script>window.__CEB_AR_VERSES='+inline(lookup)+'</script></body>');
      } catch { /* A malformed offline base never enters the projection. */ }
    }
  }
  const projection = withTeacherBridge(source.includes('cebBibleTranslation') ? source : withPresentationBible(source), channel);
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaped(title)}</title><style>${workspaceStyle}</style><body>${workspaceMarkup}<script>(${importedRuntime.toString()})(${inline(projection)},${inline(channel)},${inline('ceb-imported-notes:'+identity)});</script></body></html>`;
}

// Enhance the instructor shell of previously exported Generator packages.
export function clarifyImportedSlideNavigation(html) {
  if (!html.includes('id="privateSlideBanner"') || !html.includes('id="skipNext"') ||
      !html.includes("function render()") || !html.includes("current!==projected")) return html;
  return html.replace(/<\/body\s*>/i, () => `<script>
    if (typeof render === 'function' && typeof META !== 'undefined' &&
        typeof current === 'number' && typeof projected === 'number') {
      const originalRender = render;
      render = function () {
        originalRender();
        const consulting = current !== projected;
        const hasNext = current + 1 < META.length;
        document.getElementById('privateSlideBanner').textContent =
          'Datashow: slide ' + (projected + 1) + ' · Só no professor: slide ' + (current + 1);
        document.getElementById('next').textContent =
          consulting && hasNext ? 'Projetar slide ' + (current + 2) + ' →' : 'Avançar →';
        const label = document.getElementById('nextTitle').previousElementSibling;
        if (label) label.textContent = consulting && hasNext
          ? 'PRÓXIMO A PROJETAR · SLIDE ' + (current + 2)
          : 'PRÓXIMO SLIDE · SOMENTE PROFESSOR';
      };
      render();
    }
  </script></body>`);
}

function importedRuntime(projection, channel, key) {
  const byId = id => document.getElementById(id);
  const frame = byId('presentation');
  const editor = byId('notesEditor');
  let student, studentFrame, state, initialProjectionIndex, pendingProjectionIndex, general = false;
  let projectedIndex = 0, consultation = false;
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = 'Pular próximo slide no Datashow';
  skip.disabled = true;
  byId('print').after(skip);
  const status = byId('status');
  status.setAttribute('aria-live', 'polite');
  const nextLabel = byId('nextTitle').previousElementSibling;
  const consultationBanner = document.createElement('div');
  consultationBanner.hidden = true;
  consultationBanner.setAttribute('role', 'status');
  consultationBanner.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);max-width:calc(100% - 20px);width:max-content;z-index:1;background:#ffd477;color:#382400;border:2px solid #815000;border-radius:8px;padding:8px 14px;text-align:center;font-weight:800;pointer-events:none';
  frame.parentElement.append(consultationBanner);
  let notes = {};
  try { notes = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
  const noteKey = () => general ? 'general' : state?.key || 'slide:0';
  const load = () => {
    editor.value = notes[noteKey()] || '';
    byId('slideNotesTab').setAttribute('aria-pressed', String(!general));
    byId('generalNotesTab').setAttribute('aria-pressed', String(general));
  };
  const save = () => {
    notes[noteKey()] = editor.value;
    try { localStorage.setItem(key,JSON.stringify(notes)); byId('noteSaveStatus').textContent='Salvas neste navegador.'; }
    catch { byId('noteSaveStatus').textContent='Não foi possível salvar. Exporte uma cópia.'; }
  };
  const send = (target, type, details={}) => {
    const message={type,channel,...details};
    if(target && target===studentFrame && student&&!student.closed)student.postMessage(message,'*');
    else target?.contentWindow?.postMessage(message,'*');
  };
  const go = (target,index) => send(target,'ceb-teacher-go',{index});
  const sandbox = target => {
    target.setAttribute('sandbox','allow-scripts allow-popups allow-popups-to-escape-sandbox allow-modals');
    target.allowFullscreen = true;
    target.srcdoc = projection;
  };
  const stage = frame.parentElement;
  new ResizeObserver(() => {
    const factor=Math.min(stage.clientWidth/1600,stage.clientHeight/900);
    frame.style.transform='scale('+factor+')';
    frame.style.left=(stage.clientWidth-1600*factor)/2+'px';
    frame.style.top=(stage.clientHeight-900*factor)/2+'px';
  }).observe(stage);
  function receive(event) {
    const data=event.data;
    if(data?.type!=='ceb-teacher-public'||data.channel!==channel||
       !Number.isInteger(data.index)||!Number.isInteger(data.total)||data.index<0||data.index>=data.total||
       typeof data.key!=='string'||typeof data.text!=='string'||!Array.isArray(data.references))return;
    if(event.source===studentFrame?.contentWindow){
      if(initialProjectionIndex!==undefined){
        if(data.index===initialProjectionIndex)initialProjectionIndex=undefined;
        else go(studentFrame,initialProjectionIndex);
        return;
      }
      if(pendingProjectionIndex!==undefined){
        if(data.index===pendingProjectionIndex)pendingProjectionIndex=undefined;
        return;
      }
      if(data.index===projectedIndex)return;
      projectedIndex=data.index;
      consultation=false;
      if(state && state.index!==data.index)go(frame,data.index);
      else updateNavigation();
      return;
    }
    if(event.source!==frame.contentWindow)return;
    const changed=state?.key!==data.key;
    if(state&&changed)save();
    state=data;
    if(changed)load();
    byId('counter').textContent=(data.index+1)+' / '+data.total;
    if(!consultation && projectedIndex!==data.index){
      projectedIndex=data.index;
      if(student&&!student.closed){
        pendingProjectionIndex=data.index;
        go(studentFrame,data.index);
      }
    }
    updateNavigation();
    byId('summary').textContent=data.text||data.title;
    byId('nextTitle').textContent=data.nextTitle||(data.index+1<data.total?'Próximo slide':'Fim da apresentação');
    byId('nextBody').textContent=data.nextText||'';
    byId('previous').disabled=data.index===0;
    byId('next').disabled=data.index+1>=data.total;
    const refs=data.references.filter(value=>typeof value==='string').slice(0,50);
    byId('refs').replaceChildren(...refs.map(reference=>{
      const button=document.createElement('button');button.textContent=reference;
      button.onclick=()=>send(frame,'ceb-teacher-reference',{reference});return button;
    }));
    if(!refs.length)byId('refs').textContent='Nenhuma referência identificada neste slide.';
  }
  function updateNavigation(){
    const connected=student&&!student.closed;
    const consulting=state && consultation && state.index!==projectedIndex;
    const hasNext=state && state.index+1<state.total;
    status.textContent=connected?'Datashow conectado':'Abra a janela do aluno para sincronizar';
    consultationBanner.hidden = !consulting;
    consultationBanner.textContent = consulting
      ? 'Datashow: slide '+(projectedIndex+1)+' · Só no professor: slide '+(state.index+1)
      : '';
    byId('next').textContent=consulting&&hasNext?'Projetar slide '+(state.index+2)+' →':'Avançar →';
    nextLabel.textContent=consulting&&hasNext?'PRÓXIMO A PROJETAR · SLIDE '+(state.index+2):'PRÓXIMO SLIDE · SOMENTE PROFESSOR';
    skip.disabled=!hasNext || state.sync!=='slides';
  }
  window.addEventListener('message',receive);
  sandbox(frame);
  byId('openStudent').onclick=()=>{
    if(student&&!student.closed){student.focus();return;}
    student=window.open('','_blank','popup,width=1200,height=760');
    if(!student){byId('status').textContent='Permita janelas pop-up para abrir o datashow.';return;}
    const relay=student.document.createElement('script');
    relay.textContent=`(() => {
      const teacher=window.opener;
      window.addEventListener('message', event => {
        if(event.source!==teacher || event.data?.channel!==${JSON.stringify(channel)})return;
        document.querySelector('iframe')?.contentWindow?.postMessage(event.data,'*');
      });
      window.opener=null;
    })();`;
    student.document.head.append(relay);
    student.document.title='Área do Aluno';
    student.document.body.style.cssText='margin:0;background:#000';
    initialProjectionIndex=projectedIndex;
    pendingProjectionIndex=undefined;
    studentFrame=student.document.createElement('iframe');
    studentFrame.title='Apresentação do aluno';
    studentFrame.style.cssText='display:block;width:100vw;height:100vh;border:0';
    student.addEventListener('message',receive);
    studentFrame.addEventListener('load',()=>{go(studentFrame,projectedIndex);send(studentFrame,'ceb-teacher-poll');studentFrame.focus();});
    sandbox(studentFrame);
    student.document.body.append(studentFrame);
    updateNavigation();
  };
  byId('previous').onclick=()=>{if(state)go(frame,state.index-1);};
  byId('next').onclick=()=>{
    if(!state || state.index+1>=state.total)return;
    consultation=false;
    go(frame,state.index+1);
  };
  skip.onclick=()=>{
    if(skip.disabled)return;
    consultation=true;
    go(frame,state.index+1);
  };
  byId('teacherFullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
  byId('fullscreen').onclick=()=>frame.requestFullscreen();
  byId('print').onclick=()=>send(frame,'ceb-teacher-print');
  byId('saveNotes').onclick=save;
  byId('slideNotesTab').onclick=()=>{save();general=false;load();};
  byId('generalNotesTab').onclick=()=>{save();general=true;load();};
  byId('exportNotes').onclick=()=>{
    save();const url=URL.createObjectURL(new Blob([JSON.stringify(notes,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='anotacoes-professor.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  load();
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

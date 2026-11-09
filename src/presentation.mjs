import {specialPresentationCss,specialPresentationTemplates,showtimeAnimation} from './specialPresentationModel.mjs';
import {presentationBibleScript} from './presentationBible.mjs';
import { audienceContent } from './contentAccess.mjs';
import { explanatorySentences, explanatorySlides, abbreviatedPresentationTitle, paginateExplanatory } from './explanatory.mjs';
// Presentation-only projections: never persist or mutate the supplied study.
// Legacy documents retain their existing display model. New presentations opt in below.
export const defaultNewPresentationMode = () => 'explicativo';
export const presentationUsesExpandedIdentity = (study, mode) => mode === 'ampliado' || (mode === 'explicativo' && study.collection === 'ebd');
export const defaultPresentationMode = study => study.presentationLayoutVersion === 'explicativo-v1' ? 'explicativo' : study.collection === 'ebd' ? 'ampliado' : 'resumido';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Only the expanded display projection is cleaned. Stored studies and classic mode are untouched.
export function reviewPresentationInstructions(value = '') {
  const removed = [];
  const rules = [
    /(?:\*\*)?(?:Pergunte|Explique|Pergunta)\s+(?:à|a|para a)\s+turma\s*:\s*(?:\*\*)?/giu,
    /(?:\*\*)?(?:Ouça|Escute)\s+as\s+respostas(?:\s+(?:dos alunos|da turma))?(?:\s+e\s+(?:destaque|explique|comente|ressalte)\b[^.!?]*(?:[.!]|$)|(?:\s+(?:com atenção|antes de (?:continuar|prosseguir)))?\s*[.:;!—–-]?)(?:\*\*)?/giu,
    /(?:Vamos dividir|Divida)\s+a\s+turma\s+em\s+(?:três|3)\s+grupos\s*\./giu,
  ];
  let text = value;
  for (const rule of rules) text = text.replace(rule, match => { removed.push(match.trim()); return ''; });
  return {text:text.trim(), removed};
}
export const cleanPresentationInstructions = value => reviewPresentationInstructions(value).text;
// Explicit activity headings/metadata only: never infer an activity from a reflection question.
const activityHeading = /^(?:#{1,6}\s*)?(?:\*\*)?DINÂMICA(?:\s+(?:EM|DE)\s+GRUPO)?(?:\*\*)?(?:\s*[:—–-].*|\s*\([^)]*\))?\s*$/iu;
export function omitPresentationActivities(value = '') {
  const lines = value.split(/\r?\n/u), kept = []; let activity = false;
  for (const line of lines) {
    if (activityHeading.test(line.trim())) { activity = true; continue; }
    if (activity && /^(?:#{1,6}\s*)?(?:\*\*)?(?:CONCLUSÃO|CONCLUSAO|CONSIDERAÇÕES FINAIS|APLICAÇÃO FINAL|DESAFIO DA SEMANA|CRONOGRAMA|REFERÊNCIAS COMPLEMENTARES|REFERÊNCIAS|PONTO\s+\d+)(?:\*\*)?(?:\s*[:—–(]|\s*$)/iu.test(line.trim())) activity = false;
    if (!activity) kept.push(line);
  }
  return kept.join('\n').trim();
}
function expandedStudyProjection(study) {
  const clean = value => cleanPresentationInstructions(omitPresentationActivities(value || ''));
  return {...study,title:clean(study.title),theme:clean(study.theme),passage:clean(study.passage),introduction:clean(study.introduction),
    points:(study.points||[]).filter(p=>p.presentationRole!=='group-activity'&&!activityHeading.test((p.title||'').trim())).map(p=>({...p,title:clean(p.title),explanation:clean(p.explanation),application:clean(p.application)})),
    legacySections:(study.legacySections||[]).filter(s=>s.presentationRole!=='group-activity'&&!activityHeading.test((s.title||'').trim())).map(s=>({...s,title:clean(s.title),content:clean(s.content)})),conclusion:clean(study.conclusion)};
}
// Paragraph-aware soft pagination. The exported HTML also measures actual layout.
export function splitPresentationText(value = '', limit = 340) {
  const chunks = [];
  for (const paragraph of value.replace(/\r\n?/g, '\n').split(/\n\s*\n|\n/u).map(p => p.trim()).filter(Boolean)) {
    let current = '';
    for (const word of paragraph.replace(/((?:[123]\s+)?[\p{L}]+)\s+(\d{1,3}:\d{1,3}(?:\s*[-–]\s*\d{1,3})?)/gu, m => m.replace(/\s/gu, '\u00a0')).split(/[ \t]+/u)) {
      if (current && current.length + word.length + 1 > limit) { chunks.push(current); current = ''; }
      current += (current ? ' ' : '') + word;
    }
    if (current) chunks.push(current);
  }
  return chunks;
}
function heading(value, fallback) {
  const title = value.trim();
  return title || fallback;
}
export function buildSlides(study, mode = defaultNewPresentationMode(study)) {
  if(study.contentVersion===1) study=audienceContent(study,'student');
  if (['simples','media','completa'].includes(mode)) {
    study = audienceContent(study, 'student');
    if (study.contentVersion !== 1 && study.studentReviewed !== true) throw new Error('Revise e confirme o conteúdo destinado aos alunos antes de gerar novos slides.');
    // Choose pedagogical units, not an arbitrary number of sentences.
    // Each mode uses only authored material; no new explanations are invented.
    const slides = explanatorySlides(study);
    if (mode === 'completa') return slides;
    const select = (text, limit) => explanatorySentences(text || '').slice(0, limit).join(' ').trim();
    const selected = [];
    const push = (slide, body) => {
      const clean = body.filter(Boolean);
      if (clean.length) selected.push({...slide, body:clean});
    };
    for (const slide of slides) {
      const topic = slide.topic || '';
      if (topic === 'opening') {
        push(slide, slide.body.slice(0, mode === 'simples' ? 1 : 2));
      } else if (topic === 'introduction') {
        if (mode === 'media') push(slide, [select(slide.body.join(' '), 2)]);
      } else if (topic.startsWith('point:')) {
        const point = study.points?.[Number(topic.slice(6))] || {};
        const explanation = select(point.explanation, mode === 'simples' ? 1 : 3);
        const application = select(point.application, mode === 'simples' ? 1 : 2);
        push(slide, [explanation, application ? '**Aplicação à vida:** ' + application : '']);
      } else if (topic.startsWith('section:')) {
        const section = study.legacySections?.[Number(topic.slice(8))] || {};
        push(slide, [select(section.content, mode === 'simples' ? 1 : 3)]);
      } else if (topic === 'conclusion') {
        push(slide, [select(study.conclusion, mode === 'simples' ? 1 : 3)]);
      } else {
        push(slide, slide.body.map(text => select(text, mode === 'simples' ? 1 : 3)));
      }
    }
    return selected;
  }
  if (mode === 'explicativo') return explanatorySlides(study);
  if (mode === 'ampliado') study = expandedStudyProjection(study);
  const slides = [];
  const limit = mode === 'ampliado' ? 340 : 460;
  const passage = study.passage || '';
  // Very long references become regular paginated content; never clip a note.
  const note = passage.length <= 100 ? passage : '';
  function add(title, values, fallback) {
    const cleanTitle = heading(title || '', fallback);
    const titleParts = splitPresentationText(cleanTitle, 110).flatMap(p => { const chars = Array.from(p); const parts = []; while (chars.length) parts.push(chars.splice(0,110).join('')); return parts; });
    const shortTitle = titleParts.shift() || fallback;
    const paragraphs = [...titleParts, ...values.map(v => v || '')];
    const pieces = paragraphs.flatMap(v => splitPresentationText(v, limit));
    if (!pieces.length && !title?.trim()) return;
    for (const piece of pieces.length ? pieces : ['']) slides.push({ kicker: '', title: shortTitle, body: piece ? [piece] : [], note });
  }
  add(study.title || 'Estudo bíblico', [study.theme, !note ? passage : ''], 'Estudo bíblico');
  if (study.introduction?.trim()) add('Entendendo o tema', [study.introduction], 'Entendendo o tema');
  for (const point of study.points || []) {
    if (![point.title, point.explanation, point.application].some(v => v?.trim())) continue;
    if (mode === 'ampliado') {
      add(point.title, [point.explanation], 'Reflexão');
      if (point.application?.trim()) add(point.title ? `Aplicação: ${heading(point.title, 'Reflexão')}` : 'Aplicação à vida', [point.application], 'Aplicação à vida');
    } else {
      // Classic groups explanation/application on the same slide when space permits.
      const body = [point.explanation, point.application].map(v => v || '').filter(Boolean).join('\n\n');
      const pieces = splitPresentationText(body, limit);
      const title = heading(point.title || '', 'Reflexão');
      if (title.length > 110) add(point.title, [body], 'Reflexão');
      else {
        for (let i = 0; i < Math.max(1, pieces.length); i++) {
          const next = pieces[i + 1];
          const paragraphs = pieces[i] ? [pieces[i]] : [];
          if (next && paragraphs[0].length + next.length < limit) { paragraphs.push(next); i++; }
          slides.push({kicker:'', title, body:paragraphs, note});
        }
      }
    }
  }
  // Repetition can be intentional (recap, question, application). Never deduplicate content.
  for (const section of study.legacySections || []) {
    if (section.content?.trim() || section.title?.trim()) add(section.title, [section.content || ''], 'Reflexão');
  }
  if (study.conclusion?.trim()) add('Vivendo a Palavra', [study.conclusion], 'Vivendo a Palavra');
  return slides;
}

// Kept as executable JS and serialized, avoiding template-string corruption of regex escapes.
function presentationRuntime(logos, options, abbreviatedPresentationTitle, paginateExplanatory, bible) {
  // Embed each original image once, then reuse it across all slides.
  const imagesReady = Promise.all([...document.querySelectorAll('img[data-logo-key]')].map(img => {
    img.src = logos[img.dataset.logoKey];
    return img.decode().catch(() => {});
  }));
  const stage = document.querySelector('.stage');
  for (const activity of document.querySelectorAll('.dinamica-ceb')) {
    const condition = activity.querySelector('[data-action="d-condition"]');
    const reveal = activity.querySelector('[data-action="d-reveal"]');
    const next = activity.querySelector('[data-action="d-next"]');
    const reset = activity.querySelector('[data-action="d-reset"]');
    const offers = [...activity.querySelectorAll('template[data-offer]')];
    let index = 0;
    let remaining;
    const body = activity.querySelector('.body');
    const render = () => {
      const offer = offers[index].content;
      activity.querySelector('[data-action="d-gift"]').replaceChildren(offer.querySelector('div').cloneNode(true));
      condition.textContent = '“Você aceita? Tem certeza? Absoluta?”';
      remaining = offer.querySelector('p').cloneNode(true);
      reveal.disabled = false;
      next.disabled = index === offers.length-1;
      bible.linkReferences();
    };
    reveal.onclick = () => {
      condition.replaceChildren(remaining);
      const continuation = remaining.cloneNode(false);
      while (body.scrollHeight > body.clientHeight + 1) {
        const walker = document.createTreeWalker(remaining, NodeFilter.SHOW_TEXT);
        let last;
        while(walker.nextNode())if(walker.currentNode.data.trim())last=walker.currentNode;
        if(!last)break;
        const range = document.createRange();
        const suffix = last.data.match(/\s*\S+\s*$/u);
        range.setStart(last,suffix.index);
        range.setEnd(remaining,remaining.childNodes.length);
        continuation.prepend(range.extractContents());
      }
      if(!remaining.textContent.trim()&&continuation.textContent.trim()){
        remaining.append(...continuation.childNodes);
        document.getElementById('status').textContent='A condição não cabe no quadro do modelo.';
      }
      remaining = continuation;
      reveal.disabled = !remaining.textContent.trim();
      bible.linkReferences();
    };
    next.onclick = () => { index++; render(); };
    reset.onclick = () => { index = 0; render(); };
    render();
  }
  let slides = [...document.querySelectorAll('.slide')];
  let current = 0;
  let layoutBlocked = false;
  const ready = document.getElementById('status');
  const controls = document.querySelector('.controls');
  const controlsZone = document.getElementById('controls-zone');
  let controlsTimer;
  function hideControlsLater(delay = 450, ignoreHover = false) {
    clearTimeout(controlsTimer);
    controlsTimer = setTimeout(() => {
      if ((ignoreHover || !controlsZone.matches(':hover')) && !controls.querySelector(':focus-visible') && !document.getElementById('reveal-controls').matches(':focus-visible')) document.body.classList.add('controls-hidden');
    }, delay);
  }
  function revealControls(event) {
    document.body.classList.remove('controls-hidden');
    clearTimeout(controlsTimer);
    if (event?.type === 'touchstart' || event?.pointerType === 'touch') hideControlsLater(3200, true);
  }
  function fits(slide) {
    const body = slide.querySelector('.body');
    const bounds = body.getBoundingClientRect();
    const reserve = 16 * bounds.width / body.clientWidth;
    return [...body.children].every(child => { const r = child.getBoundingClientRect(); return r.top >= bounds.top + reserve && r.bottom <= bounds.bottom - reserve; });
  }
  function fitSingleLineTitles() {
    for (const title of document.querySelectorAll('.single-line-title h1')) {
      const slide = title.closest('.slide');
      slide.classList.add('measuring');
      let size = 44;
      while (title.scrollWidth > title.clientWidth + 1 && size > 36) title.style.fontSize = --size + 'px';
      // Never clip a title when a substituted font is unexpectedly wide.
      if (title.scrollWidth > title.clientWidth + 1) title.style.whiteSpace = 'normal';
      slide.classList.remove('measuring');
    }
  }
  // Split only overflowing text; never shrink fonts or use scrollbars/ellipsis.
  function paginate(slide) {
    if (slide.classList.contains('cover-slide')) return;
    slide.classList.add('measuring');
    let guard = 0;
    while (!fits(slide) && guard++ < 20000) {
      const reading = slide.querySelector('.reading');
      const block = reading.lastElementChild;
      if (!block) break;
      let next = slide.nextElementSibling;
      if (!next?.classList.contains('continuation')) {
        next = slide.cloneNode(true);
        next.classList.add('continuation');
        next.querySelector('.reading').replaceChildren();
        slide.after(next);
      }
      const destination = next.querySelector('.reading');
      const text = block.textContent;
      // Work on plain rendered text: a continuation never inherits event handlers or stored data.
      const words = text.split(/[ \t\r\n]+/u);
      if (words.length > 1) {
        const moved = words.pop();
        const first = destination.firstElementChild;
        if (first?.dataset.flow === 'yes') first.textContent = moved + ' ' + first.textContent;
        else { const p = document.createElement('p'); p.dataset.flow = 'yes'; p.textContent = moved; destination.prepend(p); }
        block.textContent = words.join(' ');
      } else if (reading.children.length > 1) destination.prepend(block);
      else {
        // An unusually long unbroken token is split by Unicode code point without loss.
        const chars = Array.from(text);
        if (chars.length < 2) break;
        const tail = chars.splice(Math.floor(chars.length / 2)).join('');
        block.textContent = chars.join('');
        const p = document.createElement('p'); p.textContent = tail; destination.prepend(p);
      }
    }
    slide.classList.remove('measuring');
    if (slide.nextElementSibling?.classList.contains('continuation')) paginate(slide.nextElementSibling);
  }
  function scale() {
    const roomHeight = Math.max(1, innerHeight);
    const factor = Math.min(innerWidth / 1600, roomHeight / 900);
    stage.style.width = 1600 * factor + 'px'; stage.style.height = 900 * factor + 'px';
    stage.style.setProperty('--scale', factor);
  }
  function show(index = current) {
    if (layoutBlocked) return;
    current = Math.max(0, Math.min(slides.length - 1, index));
    document.querySelectorAll('.bible-popover').forEach(p => p.remove());
    slides.forEach((s,i) => { s.classList.toggle('active', i === current); s.inert = i !== current; s.setAttribute('aria-hidden', String(i !== current)); s.setAttribute('aria-label', 'Slide '+(i+1)); const number=s.querySelector('.page-number'); if(number) number.textContent = `${i+1} / ${slides.length}`; });
    document.getElementById('counter').textContent = `${current+1} / ${slides.length}`;
    document.getElementById('previous').disabled = current === 0;
    document.getElementById('next').disabled = current === slides.length - 1;
    if(options.explanatory && options.review) ready.textContent=slides[current]?.dataset.layoutSparse==='true'?'Pouco texto neste slide: revise se a explicação é suficiente.':'';
  }
  async function full() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        if (!document.documentElement.requestFullscreen || document.fullscreenEnabled === false) throw new Error('Fullscreen unavailable');
        await document.documentElement.requestFullscreen();
      }
    }
    catch { ready.textContent = 'Tela cheia indisponível neste navegador. Abra o HTML em uma nova janela.'; }
  }
  document.getElementById('previous').onclick = () => show(current - 1);
  document.getElementById('next').onclick = () => show(current + 1);
  document.getElementById('fullscreen').onclick = full;
  document.getElementById('print').onclick = () => { if (!layoutBlocked) window.print(); };
  document.addEventListener('keydown', event => {
    if (layoutBlocked) return;
    if (event.target.closest('button,a') && [' ', 'Enter'].includes(event.key)) return;
    if (event.key === 'Escape') { document.querySelectorAll('.bible-popover').forEach(p=>p.remove()); return; }
    if (document.querySelector('.bible-popover')) return;
    if (['ArrowRight','PageDown',' '].includes(event.key)) { event.preventDefault(); show(current+1); }
    if (['ArrowLeft','PageUp'].includes(event.key)) { event.preventDefault(); show(current-1); }
    if (event.key === 'Home') show(0); if (event.key === 'End') show(slides.length-1);
    if (event.key.toLowerCase() === 'f') full(); if (event.key.toLowerCase() === 'p') window.print();
  });
  let touch;
  document.addEventListener('touchstart', e => { if (!e.target.closest('button,a,.bible-popover')) touch = [e.changedTouches[0].screenX,e.changedTouches[0].screenY]; }, {passive:true});
  document.addEventListener('touchend', e => { if (!touch) return; const [x,y] = touch; touch = null; const dx=e.changedTouches[0].screenX-x, dy=e.changedTouches[0].screenY-y; if (Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)) show(current+(dx<0?1:-1)); }, {passive:true});
  // Only the reserved bottom strip reveals navigation. Reading-area pointer
  // movements and slide-navigation keys must never reveal it.
  controlsZone.addEventListener('pointerenter', revealControls);
  controlsZone.addEventListener('pointermove', revealControls, {passive:true});
  controlsZone.addEventListener('pointerleave', () => hideControlsLater());
  controlsZone.addEventListener('touchstart', revealControls, {passive:true});
  controlsZone.addEventListener('focusin', revealControls);
  controlsZone.addEventListener('focusout', () => hideControlsLater());
  document.getElementById('reveal-controls').onclick = revealControls;
  window.addEventListener('resize', scale);
  document.addEventListener('fullscreenchange', () => {
    scale();
    const button=document.getElementById('fullscreen');
    button.textContent=document.fullscreenElement?'Sair da tela cheia':'Tela cheia';
    button.setAttribute('aria-pressed', String(!!document.fullscreenElement));
  });
  Promise.all([document.fonts.ready, imagesReady, ...(options.explanatory ? [...document.querySelectorAll('.cover-image')].map(img=>img.decode().catch(()=>{})) : [])]).then(() => {
    scale();
    if (options.explanatory) {
      for (const slide of slides.filter(s=>!s.classList.contains('cover-slide'))) {
        slide.classList.add('measuring');
        const title=slide.querySelector('h1');
        if (!options.official && title.clientHeight > parseFloat(getComputedStyle(title).lineHeight)*1.2) {
          const walker=document.createTreeWalker(title,NodeFilter.SHOW_TEXT);
          while(walker.nextNode())walker.currentNode.nodeValue=abbreviatedPresentationTitle(walker.currentNode.nodeValue);
        }
        slide.classList.remove('measuring');
      }
      const layout=paginateExplanatory(stage, fits);
      if (!layout.ok) {
        layoutBlocked = true; document.body.classList.add('layout-review-required');
        for (const id of ['print','previous','next']) document.getElementById(id).disabled = true;
        ready.textContent='Revisão necessária: uma frase ou título excede o espaço deste modelo. O conteúdo foi preservado; revise a fonte antes de apresentar. As fontes não foram reduzidas.';
        ready.setAttribute('role','alert');
        document.documentElement.dataset.presentationReady='review-required';
        document.documentElement.dataset.layoutReview=layout.reason;
        return;
      }
      document.documentElement.dataset.layoutSparse=layout.sparse.join(',');
    } else fitSingleLineTitles();
    bible.linkReferences();
    if (!options.explanatory && !options.preserveSource) for (const slide of slides) paginate(slide);
    slides = [...document.querySelectorAll('.slide')]; bible.linkReferences(); show(); document.body.classList.add('ready');
    ready.textContent = ''; if(options.explanatory && options.review) show(); document.documentElement.dataset.presentationReady = 'true';
    if (controlsZone.matches(':hover')) revealControls();
  });
}

export function createPresentationHtml(study, mode = defaultNewPresentationMode(study), logos = {}, options = {}) {
  return createPresentationHtmlFromSlides(buildSlides(study, mode), {title:study.title, collection:study.collection}, ['simples','media','completa'].includes(mode) ? 'explicativo' : mode, logos, options);
}

// Explicit source route: keeps approved slide order without inventing missing study text.
export function createPresentationHtmlFromSlides(slides, metadata, mode = 'ampliado', logos = {}, options = {}) {
  const study = metadata;
  if (mode === 'ampliado' && !options.preserveSource) slides = slides.filter(s=>s.presentationRole!=='group-activity'&&!activityHeading.test(s.title.trim())).map(s => ({...s,title:cleanPresentationInstructions(s.title),body:s.body.map(cleanPresentationInstructions).filter(Boolean),note:cleanPresentationInstructions(s.note)}));
  const rich = value => escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const logo = (src, alt, key) => src ? `<img data-logo-key="${key}" alt="${alt}" width="72" height="72">` : '';
  const cover = options.cover === null ? null : options.cover || (study.collection === 'ebd' && logos.cover ? {src:logos.cover,alt:'Capa da Escola Bíblica Dominical'} : null);
  if (cover && !/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=\r\n]+$/i.test(cover.src)) throw new Error('Use uma imagem PNG, JPEG ou WebP incorporada como capa.');
  const coverHtml = cover ? `<section class="slide cover-slide" aria-label="Slide 1"><img class="cover-image" src="${escapeHtml(cover.src)}" alt="${escapeHtml(cover.alt || 'Capa da apresentação')}" decoding="sync"></section>` : '';
  const official = options.official === true;
  const explanatory = (official || mode === 'explicativo') && !options.preserveSource;
  const expandedIdentity = official || presentationUsesExpandedIdentity(study, mode);
  const header = `<header>${logo(logos.ceb,'CEB','ceb')}<div class="wordmark">CENTRAL DE ESTUDOS BÍBLICOS<span>IGREJA BATISTA NOVA ESPERANÇA</span></div>${expandedIdentity && logos.church ? `<span class="church-logo-frame">${logo(logos.church,'Logomarca original da Igreja Batista Nova Esperança','church')}</span>` : logo(logos.church,'Logomarca original da Igreja Batista Nova Esperança','church')}</header>`;
  const defaultFooter = study.collection==='ebd'?'ESCOLA BÍBLICA DOMINICAL':'CENTRAL DE ESTUDOS BÍBLICOS';
  const sections = slides.flatMap((source,i) => {
    // The prefix identifies an authored layout; all remaining text belongs to the lesson.
    const marker = official && source.title.match(/^\[([a-z-]+)\]\s*/);
    const markedLayout = marker && Object.hasOwn(specialPresentationTemplates,marker[1]) ? marker[1] : '';
    const chosenLayout = official && options.sectionLayouts?.[source.topic];
    const layout = chosenLayout === 'regular' ? '' : chosenLayout && Object.hasOwn(specialPresentationTemplates,chosenLayout) ? chosenLayout : markedLayout;
    const slide = markedLayout ? {...source,title:source.title.slice(marker[0].length)} : source;
    const regular = `<div class="body"><h1>${rich(slide.title)}</h1><div class="reading">${slide.body.map((p,j)=>`<p${p.includes('?')?' class="question"':''}${explanatory?` data-paragraph="${i}:${j}"`:''}>${explanatory?explanatorySentences(p).map(unit=>`<span data-explanatory-unit>${rich(unit)}</span>`).join(''):rich(p)}</p>`).join('')}</div>${slide.note?`<aside>${rich(slide.note)}</aside>`:''}</div>`;
    const [template,footer] = layout ? specialPresentationTemplates[layout] : [regular,defaultFooter];
    function fillSpecial(items, offset) {
      const midpoint = Math.ceil(items.length/2);
      const columns = layout==='homework-slide' ? [items.slice(0,midpoint),items.slice(midpoint)].map((column,c)=>`<div class="homework-column">${column.map((item,j)=>`<div class="homework-item"><span class="homework-num">${String(offset+j+1+c*midpoint).padStart(2,'0')}</span><div>${rich(item)}</div></div>`).join('')}</div>`).join('') : '';
      const slots = {
        TITLE:rich(slide.title), FIRST:rich(items[0]), SECOND:rich(items[1]), NOTE:rich(slide.note),
        PARAGRAPHS:items.slice(1).map(text=>`<p>${rich(text)}</p>`).join(''),
        SUBTITLE:`${rich(study.title)} · ${slide.body.length} perguntas · Sem respostas`, COLUMNS:columns,
      };
      return template.replace(/@@([A-Z]+)@@/g,(_,key)=>slots[key]);
    }
    const offers = layout==='dinamica-ceb' ? Array.from({length:Math.max(1,Math.ceil(slide.body.length/2))},(_,index)=>`<template data-offer><div>${rich(slide.body[index*2])}</div><p>${rich(slide.body[index*2+1])}</p></template>`).join('') : '';
    const bodies = layout==='homework-slide' && slide.body.length>10
      ? Array.from({length:Math.ceil(slide.body.length/10)},(_,page)=>fillSpecial(slide.body.slice(page*10,page*10+10),page*10))
      : [layout ? fillSpecial(slide.body,0)+offers : regular];
    const overflowText = ['dinamica-titulo','ceb-contracapa'].includes(layout) ? slide.body.slice(layout==='dinamica-titulo'?1:2) : layout==='showtime-slide' ? slide.body : [];
    const extra = overflowText.length ? `<section class="slide" data-topic="${escapeHtml(slide.topic||'source:'+i)}">${header}<div class="body"><h1>${rich(slide.title)}</h1><div class="reading">${overflowText.map((text,j)=>`<p data-paragraph="extra:${j}">${explanatorySentences(text).map(unit=>`<span data-explanatory-unit>${rich(unit)}</span>`).join('')}</p>`).join('')}</div></div><footer><span>${defaultFooter}</span><span class="page-number"></span></footer></section>` : '';
    return bodies.map(special=>`<section class="slide${layout?' '+layout+(layout==='dinamica-titulo'?' dt-static':''):slide.titleLines===1&&!official&&mode!=='explicativo'?' single-line-title':''}" ${layout?'data-special-layout="'+layout+'"':''} data-source-slide="${i+1}" data-topic="${escapeHtml(slide.topic||'source:'+i)}" aria-label="Slide ${i+1}">${header}${special}<footer><span>${footer}</span><span class="page-number"></span></footer></section>`).join('')+extra;
  }).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(study.title)} — Apresentação CEB</title><style>${presentationCss}${official?specialPresentationCss:''}</style></head><body class="${official ? 'ampliado' : mode}${!official && mode === 'explicativo' ? (study.collection === 'ebd' ? ' expanded-identity' : ' classic-reading') : ''} controls-hidden" data-presentation-standard="2"><main class="stage">${coverHtml}${sections}</main><div id="controls-zone" class="controls-zone"><button id="reveal-controls" aria-label="Mostrar controles da apresentação" title="Mostrar controles">•••</button><nav class="controls" aria-label="Navegação da apresentação"><span id="counter" aria-live="polite"></span><button id="previous" aria-label="Slide anterior">← Voltar</button><button id="next" aria-label="Próximo slide">Avançar →</button><button id="fullscreen">Tela cheia</button><button id="print">Imprimir</button></nav></div><span id="status" role="status">Preparando apresentação…</span><script>${explanatory?`const abbreviatedPresentationTitle=${abbreviatedPresentationTitle.toString()};const paginateExplanatory=${paginateExplanatory.toString()};`: ''}(${presentationRuntime.toString()})(${JSON.stringify(logos).replace(/</g, '\\u003c')},${JSON.stringify({preserveSource:!!options.preserveSource,official,...(explanatory?{explanatory:true,review:!!options.review}:{})})}${explanatory?',abbreviatedPresentationTitle,paginateExplanatory':',undefined,undefined'},${presentationBibleScript()});${official?showtimeAnimation:''}</script></body></html>`;
}
const presentationCss = `
:root{--navy:#07182f;--navy2:#102a49;--gold:#efc875;--text:#f5f7fc;--muted:#b3c3d4}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font-family:'Segoe UI',Arial,sans-serif;background:#020b15;color:var(--text);overflow:hidden}body{display:flex;align-items:center;justify-content:center;padding:0}.stage{position:relative;flex:none;visibility:hidden}.ready .stage{visibility:visible}.slide{position:absolute;left:0;top:0;display:none;flex-direction:column;width:1600px;height:900px;transform:scale(var(--scale,1));transform-origin:top left;padding:56px 90px 40px;background:radial-gradient(ellipse at 92% 15%,#20446a 0%,transparent 38%),linear-gradient(130deg,var(--navy),var(--navy2));overflow:hidden;box-shadow:0 0 45px #0008}.slide.active,.slide.measuring{display:flex}.slide.measuring{visibility:hidden}header{display:flex;align-items:center;gap:22px;flex:none;height:92px;border-bottom:1px solid #efc87538;padding-bottom:18px}header img{object-fit:contain;flex:none}.wordmark{font-size:20px;font-weight:800;letter-spacing:.1em;flex:1}.wordmark span{display:block;color:var(--muted);font-size:15px;font-weight:500;margin-top:8px}.body{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;padding:26px 0;overflow:visible}h1{flex:none;font-size:56px;line-height:1.12;font-weight:800;letter-spacing:-.025em;color:var(--gold);margin:0 0 26px;overflow-wrap:anywhere}.reading{flex:none;display:flex;flex-direction:column;gap:14px}.reading p{font-size:34px;line-height:1.36;margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.reading strong{color:#f2cf88}.question{padding:10px 18px;border-left:4px solid var(--gold);background:#193653;border-radius:6px}aside{flex:none;align-self:flex-start;max-width:100%;margin-top:24px;padding:10px 18px;border:1px solid #efc87577;border-radius:7px;background:#061325ad;color:var(--gold);font-size:24px;line-height:1.3;overflow-wrap:anywhere}footer{flex:none;display:flex;justify-content:space-between;height:35px;border-top:1px solid #efc87538;padding-top:14px;color:var(--muted);font-size:16px;letter-spacing:.1em}.controls{position:fixed;transition:opacity .2s;z-index:5;bottom:8px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:8px;min-height:48px;padding:4px 8px;bottom:max(8px,env(safe-area-inset-bottom));background:#edf5f9ed;border-radius:12px;left:50%;right:auto;transform:translateX(-50%);width:max-content;max-width:100vw}.controls button{border:1px solid #efc87570;border-radius:7px;background:#102840;color:var(--gold);padding:9px 12px;font-size:14px;font-weight:700;cursor:pointer;min-height:44px}.controls button:disabled{opacity:.4;cursor:default}.controls button:focus-visible,.bible-ref:focus-visible{outline:3px solid white;outline-offset:3px}#counter{font-size:13px;min-width:65px;text-align:center}#status{position:fixed;top:0;left:0;right:0;text-align:center;font-size:14px}.bible-ref{font:inherit;font-weight:inherit;color:var(--gold);border:0;border-bottom:1px dotted currentColor;padding:0;background:transparent;cursor:pointer;display:inline;white-space:normal}.bible-popover{position:fixed;z-index:30;left:50%;top:50%;transform:translate(-50%,-50%);width:min(640px,92vw);max-height:85vh;overflow:auto;padding:22px;display:flex;flex-direction:column;gap:14px;background:#fffdf8;color:#24364b;border:2px solid #efc875;border-radius:10px;box-shadow:0 0 0 100vmax #0008;font-size:18px;line-height:1.5}.bible-popover p{margin:0;white-space:pre-wrap}.bible-popover button{align-self:flex-start;padding:10px;cursor:pointer}.bible-popover a{color:#285c83}.bible-popover small{font-size:13px}:is(.resumido,.ampliado){--text:#102d4b;--gold:#9a6a00;--muted:#294965;background:#dceefa}:is(.resumido,.ampliado) .slide{background:radial-gradient(ellipse at 85% 12%,#e8c2672e,transparent 38%),linear-gradient(135deg,#f4f8fc,#e6f0f8 55%,#f8f4e9)}.explicativo{background:#dceefa}.explicativo .reading,.explicativo .reading strong,.explicativo .reading .bible-ref{color:#102d4b}.explicativo .slide h1,.explicativo .slide h1 .bible-ref{color:#986800}.explicativo .wordmark,.explicativo .wordmark span,.explicativo .slide footer{color:#102d4b}.explicativo .slide{background:radial-gradient(ellipse at 85% 12%,#e8c2672e,transparent 38%),linear-gradient(135deg,#f4f8fc,#e6f0f8 55%,#f8f4e9)}.resumido .reading p,.explicativo.classic-reading .reading p{font-size:38px}:is(.resumido,.ampliado) aside{background:#fff8e1;color:#3d321b}:is(.resumido,.ampliado) .question{background:#dceefa}:is(.resumido,.ampliado) .reading strong{color:#805900}:is(.resumido,.ampliado,.explicativo) .controls button{background:#e8f4fc;color:#102d4b;border-color:#6e9bbd}:is(.ampliado,.expanded-identity) .church-logo-frame{width:72px;height:72px;flex:none;display:flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:transparent}:is(.ampliado,.expanded-identity) .church-logo-frame img{width:72px;height:72px;object-fit:contain;flex:none;border-radius:50%;filter:brightness(1.2) saturate(.72)}.ampliado header,.ampliado footer{border-color:#1e5b8b30}.ampliado .controls button:focus-visible,.ampliado .bible-ref:focus-visible{outline-color:#102d4b}.controls-zone{position:fixed;z-index:5;left:0;right:0;bottom:0;height:calc(84px + env(safe-area-inset-bottom));background:transparent}.single-line-title h1{font-size:44px;white-space:nowrap}.controls-hidden .controls{opacity:0;pointer-events:none}#reveal-controls{position:fixed;bottom:max(8px,env(safe-area-inset-bottom));right:8px;z-index:6;width:44px;height:44px;border:1px solid #6e9bbd;border-radius:50%;background:#edf5f9e8;color:#102d4b;font-size:20px;cursor:pointer;opacity:0;pointer-events:none}.controls-hidden #reveal-controls{opacity:0;pointer-events:auto}@media(hover:none){.controls-hidden #reveal-controls{opacity:.6}}body:not(.controls-hidden) #reveal-controls:focus-visible{opacity:1;outline:3px solid #102d4b}.cover-slide{padding:0!important;background:#c0d2e5!important}.cover-image{display:block;width:100%;height:100%;object-fit:contain;object-position:center}.cover-slide{box-shadow:none}@media(prefers-reduced-motion:reduce){.controls{transition:none}}@media(max-width:600px){.controls{gap:4px}.controls button{padding:8px 6px;font-size:12px}#counter{min-width:42px;font-size:11px}}@media print{@page{size:1600px 900px;margin:0}html,body{display:block;width:1600px;height:auto;overflow:visible;padding:0;background:white}.stage{width:1600px!important;height:auto!important;visibility:visible}.slide,.slide.active{display:flex;position:relative;transform:none;break-after:page;page-break-after:always;print-color-adjust:exact;-webkit-print-color-adjust:exact}.controls-zone,.controls,#status,#reveal-controls,.bible-popover{display:none}.slide:last-child{break-after:auto;page-break-after:auto}body.layout-review-required .stage{display:none!important}body.layout-review-required #status{display:block!important;position:static;color:#102d4b}}
`;

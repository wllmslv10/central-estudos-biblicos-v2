import {biblePassageUrl,bibleTranslations,preferredBibleTranslation} from './bibleTranslations.mjs';

export function presentationBibleScript() {
  return `(${presentationBibleRuntime.toString()})(${JSON.stringify(preferredBibleTranslation())},${biblePassageUrl.toString()},${JSON.stringify(bibleTranslations)})`;
}

export function withPresentationBible(html) {
  const script = `<script>${presentationBibleScript()}.linkReferences();<\/script>`;
  return /<\/body\s*>/i.test(html) ? html.replace(/<\/body\s*>/i,()=>script+'</body>') : html+script;
}

function presentationBibleRuntime(translation,biblePassageUrl,translations) {
  function applyTranslation(value) {
    translation = value;
    document.documentElement.dataset.cebBibleTranslation = value;
    window.dispatchEvent(new CustomEvent('ceb-bible-translation-changed',{detail:value}));
  }
  document.documentElement.dataset.cebBibleTranslation = translation;
  const pattern = /(?<![\p{L}\p{N}])((?:[123]\s*)?(?:Gênesis|Genesis|Gn|Êxodo|Exodo|Êx|Levítico|Levitico|Lv|Números|Numeros|Nm|Deuteronômio|Deuteronomio|Dt|Josué|Josue|Js|Juízes|Juizes|Jz|Rute|Rt|[12]\s*Samuel|[12]\s*Sm|[12]\s*Reis|[12]\s*Rs|[12]\s*Crônicas|[12]\s*Cr|Esdras|Ed|Neemias|Ne|Ester|Et|Jó|Jo|Salmos|Salmo|Sl|Provérbios|Proverbios|Pv|Eclesiastes|Ec|Cânticos|Canticos|Ct|Isaías|Isaias|Is|Jeremias|Jr|Lamentações|Lamentacoes|Lm|Ezequiel|Ez|Daniel|Dn|Oseias|Os|Joel|Jl|Amós|Amos|Am|Obadias|Ob|Jonas|Jn|Miqueias|Mq|Naum|Na|Habacuque|Hc|Sofonias|Sf|Ageu|Ag|Zacarias|Zc|Malaquias|Ml|Mateus|Mt|Marcos|Mc|Lucas|Lc|João|Joao|Jo|Atos|At|Romanos|Rm|[12]\s*Coríntios|[12]\s*Corintios|[12]\s*Co|Gálatas|Galatas|Gl|Efésios|Efesios|Ef|Filipenses|Fp|Colossenses|Cl|[12]\s*Tessalonicenses|[12]\s*Ts|[12]\s*Timóteo|[12]\s*Timoteo|[12]\s*Tm|Tito|Tt|Filemom|Fm|Hebreus|Hb|Tiago|Tg|[12]\s*Pedro|[12]\s*Pe|[123]\s*João|[123]\s*Jo|Judas|Jd|Apocalipse|Ap)\.?\s*\d{1,3}\s*[:.]\s*\d{1,3}(?:\s*[-–—]\s*(?:\d{1,3}:)?\d{1,3})?)/giu;
  function references() {
    for (const slide of document.querySelectorAll('.slide')) {
      const content = slide.querySelector('.body') || slide;
      for (const link of content.querySelectorAll('a:not(.bible-ref)')) {
        const text = link.textContent.trim();
        if ([...text.matchAll(pattern)].some(match => match[0] === text)) {
          link.classList.add('bible-ref');
        }
      }
      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) if (!walker.currentNode.parentElement.closest('button,a,script,style,nav,footer,[data-teacher-only]')) nodes.push(walker.currentNode);
      for (const node of nodes) {
        const value = node.nodeValue || ''; const fragment = document.createDocumentFragment(); let last = 0;
        for (const match of value.matchAll(pattern)) {
          fragment.append(document.createTextNode(value.slice(last,match.index)));
          const button = document.createElement('button'); button.className = 'bible-ref'; button.type = 'button'; button.textContent = match[0]; button.dataset.reference = match[0]; button.setAttribute('aria-label', 'Consultar ' + match[0]);
          fragment.append(button); last = match.index + match[0].length;
        }
        if (last) { fragment.append(document.createTextNode(value.slice(last))); node.replaceWith(fragment); }
      }
    }
  }
  document.addEventListener('click', async event => {
    const reference = event.target.closest('.bible-ref');
    if (!reference) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const passage = reference.dataset.reference || reference.textContent;
    const externalUrl = biblePassageUrl(passage, translation);
    // Almeida 1911 is public domain and can be shown inside the presentation.
    // Do not substitute a different edition for AR, ACF or NVI.
    {
      const pop = document.createElement('dialog');
      pop.className = 'bible-popover';
      pop.style.cssText='position:fixed!important;top:50%!important;left:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;margin:0!important;width:min(1100px,92vw);max-width:92vw;max-height:82vh;overflow:auto;padding:30px;border:1px solid #54799f;border-radius:12px;background:#fff;color:#142f4a;box-sizing:border-box;z-index:10000;font-size:clamp(24px,2.8vw,44px);line-height:1.55';
      pop.setAttribute('aria-label', 'Texto bíblico: ' + passage);
      const heading = document.createElement('strong');
      heading.textContent = passage + ' — ' + (translations[translation] || translation);
      const selector = document.createElement('select');
      selector.setAttribute('aria-label','Tradução bíblica');
      for (const [code,label] of Object.entries(translations)) { const option=document.createElement('option'); option.value=code; option.textContent=label; selector.append(option); }
      selector.value=translation;
      const content = document.createElement('p');
      content.textContent = 'Carregando o texto bíblico…';
      content.style.cssText = 'font-size:inherit;line-height:1.65;white-space:pre-line;overflow-wrap:anywhere;margin:18px 0';
      heading.style.cssText = 'display:block;font-size:.78em;line-height:1.3;margin-bottom:12px';
      selector.style.cssText = 'font-size:.58em;max-width:100%;padding:8px';
      const source = document.createElement('small');
      source.textContent = translation === 'alm1911' ? 'Fonte: Midvash · Almeida 1911 (domínio público)' : 'Esta tradução requer consulta à fonte autorizada.';
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = 'Fechar ×';
      const dismiss = () => { pop.remove(); reference.focus(); };
      close.onclick = dismiss;
      const external = document.createElement('a');
      external.href = externalUrl;
      external.target = '_blank';
      external.rel = 'noopener noreferrer';
      external.textContent = 'Consultar na fonte externa';
      source.style.cssText = 'display:block;font-size:.45em;line-height:1.45;margin:14px 0';
      close.style.cssText = 'font-size:.55em;padding:9px 14px;margin:8px';
      external.style.cssText = 'display:inline-block;font-size:.5em;margin:8px';
      pop.append(heading,selector,content,source,external,close);
      document.querySelectorAll('.bible-popover').forEach(p=>p.remove());
      document.body.append(pop);
      pop.showModal();
      close.focus();
      selector.addEventListener('change',()=>{applyTranslation(selector.value); dismiss(); reference.click();});
      const onOutside = event => { if (pop.isConnected && !pop.contains(event.target) && event.target !== reference) dismiss(); };
      const onEscape = event => { if (event.key === 'Escape' && pop.isConnected) dismiss(); };
      pop.addEventListener('cancel', event=>{event.preventDefault();dismiss();});
      document.addEventListener('click', onOutside, true);
      document.addEventListener('keydown', onEscape);
      const cleanup = new MutationObserver(() => { if (!pop.isConnected) { document.removeEventListener('click', onOutside, true); document.removeEventListener('keydown', onEscape); cleanup.disconnect(); } });
      cleanup.observe(document.body,{childList:true});
      if (translation === 'AR') {
        // The standalone HTML exporter can embed the exact official AR JSON in
        // window.__CEB_AR_VERSES. Never substitute another Bible edition.
        let lookup = window.__CEB_AR_VERSES;
        if (!lookup) {
          try {
            const origin = window.location.origin !== 'null' ? window.location.origin : window.parent.location.origin;
            const bibleUrl = new URL('/central-estudos-biblicos-v2/almeida-recebida.json', origin);
            const cache = typeof caches !== 'undefined' ? await caches.open('ceb-almeida-recebida-v1').catch(() => null) : null;
            let response;
            try {
              response = await fetch(bibleUrl.href);
              if (!response.ok) throw new Error('HTTP ' + response.status);
              if (cache) await cache.put(bibleUrl.href, response.clone()).catch(() => undefined);
            } catch (error) {
              response = await cache?.match(bibleUrl.href);
              if (!response) throw error;
            }
            lookup = await response.json();
          } catch {
            content.textContent = 'Não foi possível carregar a Bíblia AR offline. Confira a conexão para o primeiro acesso e tente novamente.';
            return;
          }
        }
        const aliases = 'genesis exodo levitico numeros deuteronomio josue juizes rute 1samuel 2samuel 1reis 2reis 1cronicas 2cronicas esdras neemias ester jo salmos proverbios eclesiastes cantares isaias jeremias lamentacoes ezequiel daniel oseias joel amos obadias jonas miqueias naum habacuque sofonias ageu zacarias malaquias mateus marcos lucas joao atos romanos 1corintios 2corintios galatas efesios filipenses colossenses 1tessalonicenses 2tessalonicenses 1timoteo 2timoteo tito filemom hebreus tiago 1pedro 2pedro 1joao 2joao 3joao judas apocalipse'.split(' ');
        const match = passage.match(/^(.+?)\.?\s*(\d+)\s*[:.]\s*(\d+)(?:\s*[-–—]\s*(?:(\d+)\s*[:.]\s*)?(\d+))?$/u);
        const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f\s]/g,'').toLowerCase();
        const shortNames = 'gn ex lv nm dt js jz rt 1sm 2sm 1rs 2rs 1cr 2cr ed ne et jo sl pv ec ct is jr lm ez dn os jl am ob jn mq na hc sf ag zc ml mt mc lc jo at rm 1co 2co gl ef fp cl 1ts 2ts 1tm 2tm tt fm hb tg 1pe 2pe 1jo 2jo 3jo jd ap'.split(' ');
        const rawKey = normalize(match?.[1] || '');
        const key = {salmo:'sl',canticos:'ct'}[rawKey] || rawKey;
        const book = key === 'jo' ? (match[1].trim().toLowerCase()==='jó'?18:43) : (aliases.indexOf(key)>=0 ? aliases.indexOf(key)+1 : shortNames.indexOf(key)+1);
        const chapter = match && Number(match[2]);
        const first = match && Number(match[3]);
        const lastChapter = match && Number(match[4] || match[2]);
        const last = match && Number(match[5] || match[3]);
        if (!lookup || !book || lastChapter !== chapter || last < first || last-first > 150) {
          content.textContent = 'Texto AR offline indisponível para esta referência nesta apresentação. Consulte a fonte externa.';
          return;
        }
        const verses = lookup.verses || lookup;
        const lines = [];
        for (let verse=first;verse<=last;verse++) {
          const value = verses[book+'.'+chapter+'.'+verse] ?? verses[String(book)]?.[String(chapter)]?.[String(verse)];
          if(typeof value !== 'string') {lines.length=0;break;}
          lines.push(verse+'  '+value);
        }
        content.style.whiteSpace='pre-line';
        content.textContent=lines.length?lines.join('\n\n'):'Passagem não encontrada na base AR. Consulte a fonte externa.';
        source.textContent='Bíblia Almeida Recebida (AR), versão 1.7 · Base convertida de MySQL para JSON · ';
        for (const [label,href] of [
          ['Projeto Almeida Recebida','https://www.almeidarecebida.org/download-portuguese-bible-almeida-recebida-xml/'],
          ['CC BY-NC-SA 3.0','https://creativecommons.org/licenses/by-nc-sa/3.0/'],
        ]) {
          const link = document.createElement('a');
          link.textContent=label;
          link.href=href;
          link.target='_blank';
          link.rel='noopener noreferrer';
          if (source.lastChild?.nodeType === Node.ELEMENT_NODE) source.append(' · ');
          source.append(link);
        }
        return;
      }
      if (translation !== 'alm1911') { content.textContent = 'O texto desta edição não está disponível para exibição neste slide. Se desejar, abra a fonte autorizada pelo link abaixo.'; return; }
      const controller = new AbortController();
      close.addEventListener('click', () => controller.abort(), {once:true});
      const api = 'https://api.midvash.com/v1/passages?version=alm1911&refs=' + encodeURIComponent(passage.normalize('NFKC').replace(/[–—−]/g, '-').trim());
      fetch(api,{signal:controller.signal}).then(async response=>{
        if(!response.ok)throw Error('HTTP ' + response.status);
        const json = await response.json();
        const item = Array.isArray(json.data) ? json.data[0] : null;
        const data = item?.data || item;
        if(!data || data.error || typeof data.text !== 'string' || !data.text.trim() || (data.version && data.version !== 'alm1911')) throw Error('Passagem indisponível nesta edição');
        if(!pop.isConnected)return;
        content.textContent = data.text;
        source.textContent = json.meta?.copyright || 'Almeida 1911 — domínio público · Fonte: Midvash';
      }).catch(error=>{
        if(!pop.isConnected || error.name === 'AbortError')return;
        content.textContent = 'Não foi possível carregar o texto nesta edição. Use o link externo para consultar a passagem.';
      });
      return;
    }

  }, true);
  window.addEventListener('message', event => {
    const value = event.data?.value;
    if (event.source === parent && event.data?.type === 'ceb-set-translation' && Object.hasOwn(translations,value)) {
      applyTranslation(value);
    }
  });
  return {linkReferences:references};
}

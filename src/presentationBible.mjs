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
  document.addEventListener('click', event => {
    const reference = event.target.closest('.bible-ref');
    if (!reference) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const passage = reference.dataset.reference || reference.textContent;
    const externalUrl = biblePassageUrl(passage, translation);
    // Almeida 1911 is public domain and can be shown inside the presentation.
    // Do not substitute a different edition for AR, ACF or NVI.
    if (translation === 'alm1911') {
      const pop = document.createElement('div');
      pop.className = 'bible-popover';
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-label', 'Texto bíblico: ' + passage);
      const heading = document.createElement('strong');
      heading.textContent = passage + ' — Almeida 1911';
      const content = document.createElement('p');
      content.textContent = 'Carregando o texto bíblico…';
      const source = document.createElement('small');
      source.textContent = 'Fonte: Midvash · Almeida 1911 (domínio público)';
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = 'Fechar ×';
      close.onclick = () => { pop.remove(); reference.focus(); };
      const external = document.createElement('a');
      external.href = externalUrl;
      external.target = '_blank';
      external.rel = 'noopener noreferrer';
      external.textContent = 'Consultar na fonte externa';
      pop.append(heading,content,source,external,close);
      document.querySelectorAll('.bible-popover').forEach(p=>p.remove());
      document.body.append(pop);
      close.focus();
      const controller = new AbortController();
      close.addEventListener('click', () => controller.abort(), {once:true});
      const api = 'https://api.midvash.com/v1/passages?version=alm1911&refs=' + encodeURIComponent(passage);
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
    // Editions without licensed in-app text retain a direct, clearly identified external link.
    // Do not inspect the return value: noopener may return null even when the tab opened.
    // One click must cause exactly one navigation.
    window.open(externalUrl, '_blank', 'noopener,noreferrer');
  }, true);
  window.addEventListener('message', event => {
    const value = event.data?.value;
    if (event.source === parent && event.data?.type === 'ceb-set-translation' && Object.hasOwn(translations,value)) {
      applyTranslation(value);
    }
  });
  return {linkReferences:references};
}

export const bibleTranslations = {
  alm1911: 'Almeida 1911',
  AR: 'Almeida Recebida (AR)',
  ACF: 'Almeida Corrigida Fiel (ACF)',
  NVI: 'Nova Versão Internacional (NVI)',
};

export function normalizeBibleTranslation(value) {
  return typeof value === 'string' && Object.hasOwn(bibleTranslations, value) ? value : 'ACF';
}

export function preferredBibleTranslation() {
  try {
    return normalizeBibleTranslation(localStorage.getItem('ceb-bible-translation'));
  } catch {
    return 'ACF';
  }
}

// Also serialized into sandboxed, self-contained HTML exports.
export function biblePassageUrl(reference, version) {
  const ref = encodeURIComponent(reference.replace(/[–—]/g, '-'));
  if (version === 'AR') return 'https://www.stepbible.org/?q=version=PorAR%7Creference=' + ref;
  if (version === 'alm1911') return 'https://www.stepbible.org/?q=version=PorAlmeida1911%7Creference=' + ref;
  if (version === 'ACF') {
    const match = reference.match(/^(.+?)\.?\s*(\d+)\s*[:.]\s*(\d+(?:\s*[-–—]\s*\d+)?)$/u);
    if (match) {
      const key = match[1].normalize('NFD').replace(/\p{M}|\s/gu, '').toLowerCase();
      const names = 'genesis exodo levitico numeros deuteronomio josue juizes rute 1samuel 2samuel 1reis 2reis 1cronicas 2cronicas esdras neemias ester jo salmos proverbios eclesiastes cantares isaias jeremias lamentacoes ezequiel daniel oseias joel amos obadias jonas miqueias naum habacuque sofonias ageu zacarias malaquias mateus marcos lucas joao atos romanos 1corintios 2corintios galatas efesios filipenses colossenses 1tessalonicenses 2tessalonicenses 1timoteo 2timoteo tito filemom hebreus tiago 1pedro 2pedro 1joao 2joao 3joao judas apocalipse'.split(' ');
      const codes = 'gn ex lv nm dt js jz rt 1sm 2sm 1rs 2rs 1cr 2cr ed ne et jo sl pv ec ct is jr lm ez dn os jl am ob jn mq na hc sf ag zc ml mt mc lc jo at rm 1co 2co gl ef fp cl 1ts 2ts 1tm 2tm tt fm hb tg 1pe 2pe 1jo 2jo 3jo jd ap'.split(' ');
      const book = codes[names.indexOf(key)] || (codes.includes(key) ? key : {salmo:'sl',canticos:'ct'}[key]);
      if (book) return 'https://www.bibliaonline.com.br/acf/' + book + '/' + match[2] + '/' + match[3].replace(/[–—]/g, '-').replace(/\s/g, '');
    }
    return 'https://www.bibliaonline.com.br/acf/busca?q=' + ref;
  }
  return 'https://www.biblegateway.com/passage/?search=' + ref + '&version=' + (version === 'NVI' ? 'NVI-PT' : 'ACF');
}

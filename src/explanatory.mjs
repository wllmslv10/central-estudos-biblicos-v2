// No AI, summaries or database writes. These helpers are serialized in the HTML.
export function explanatorySentences(value) {
  const original=String(value);
  if (!original.trim()) return [];
  // Mask abbreviations only for boundary detection; return slices of the original.
  const masked=original.replace(/\r|\n/g,' ').replace(/\b(?:Mt|Mc|Lc|Jo|At|Rm|Co|Gl|Ef|Fp|Cl|Ts|Tm|Hb|Tg|Pe|Ap|Gn|Ex|Êx|Lv|Nm|Dt|Js|Jz|Rt|Sm|Rs|Cr|Ed|Ne|Et|Sl|Pv|Ec|Ct|Is|Jr|Lm|Ez|Dn|Os|Jl|Am|Ob|Jn|Mq|Na|Hc|Sf|Ag|Zc|Ml|cap|caps|v|vv|Dr|Sr|Sra)\.(?=\s)/giu,m=>m.slice(0,-1)+'\ue000').replace(/\d\.(?=\d)/g,m=>m[0]+'\ue000');
  const raw=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('pt',{granularity:'sentence'}).segment(masked)].map(s=>original.slice(s.index,s.index+s.segment.length)):[original];
  const result=[];let pending='';
  for(const segment of raw){
    pending+=segment;
    // Do not strand a subtitle or split an inline bold span.
    if((pending.match(/\*\*/g)||[]).length%2 || /^\s*(?:\*\*[^*]+:\*\*|[^.!?\n]{1,100}:)\s*$/u.test(pending))continue;
    // A reference following a completed sentence belongs to that explanation.
    if(result.length && /^\s*\(?\s*(?:[123]\s*)?[\p{L}À-ú.]+\s+\d{1,3}:\d[\d\s:;,–—().-]*\)?[.!?]?\s*$/u.test(pending))result[result.length-1]+=pending;
    else result.push(pending);
    pending='';
  }
  if(pending){if(result.length)result[result.length-1]+=pending;else result.push(pending)}
  return result;
}

export function explanatorySlides(study) {
  const slides=[],note=(study.passage||'').length<=100?study.passage||'':'';
  const paragraphs=value=>{
    const result=[];
    for(const p of String(value||'').replace(/\r\n?/g,'\n').split(/\n\s*\n/u).map(s=>s.trim()).filter(Boolean)){
      if(result.length && /^\s*(?:\*\*[^*]+:\*\*|[^.!?\n]{1,100}:)\s*$/u.test(result.at(-1)))result[result.length-1]+='\n'+p;
      else result.push(p);
    }
    return result;
  };
  const add=(title,values,topic)=>{
    const body=values.flatMap(paragraphs);
    if(!title?.trim()&&!body.length)return;
    slides.push({kicker:'',title:title?.trim()||'Reflexão',body,note,topic});
  };
  add(study.title||'Estudo bíblico',[study.theme,!note?study.passage:''],'opening');
  if(study.introduction?.trim())add('Entendendo o tema',[study.introduction],'introduction');
  for(const [index,point]of(study.points||[]).entries()){
    if(![point.title,point.explanation,point.application].some(s=>s?.trim()))continue;
    const body=paragraphs(point.explanation);
    if(point.application?.trim())body.push('**Aplicação à vida:** '+point.application.trim());
    add(point.title||'Reflexão',body,'point:'+index);
  }
  for(const [index,section]of(study.legacySections||[]).entries())add(section.title,[section.content],'section:'+index);
  if(study.conclusion?.trim())add('Vivendo a Palavra',[study.conclusion],'conclusion');
  return slides;
}

export function abbreviatedPresentationTitle(value) {
  const names={'Mateus':'Mt','Marcos':'Mc','Lucas':'Lc','João':'Jo','Joao':'Jo','Atos':'At','Romanos':'Rm','Coríntios':'Co','Corintios':'Co','Gálatas':'Gl','Efésios':'Ef','Filipenses':'Fp','Colossenses':'Cl','Tessalonicenses':'Ts','Timóteo':'Tm','Hebreus':'Hb','Tiago':'Tg','Pedro':'Pe','Apocalipse':'Ap','Gênesis':'Gn','Êxodo':'Êx','Levítico':'Lv','Números':'Nm','Deuteronômio':'Dt','Josué':'Js','Juízes':'Jz','Salmos':'Sl','Salmo':'Sl','Provérbios':'Pv','Eclesiastes':'Ec','Isaías':'Is','Jeremias':'Jr','Ezequiel':'Ez','Daniel':'Dn','Oseias':'Os','Zacarias':'Zc','Malaquias':'Ml'};
  return value.replace(/(?<![\p{L}\p{N}])[\p{L}À-ú]+(?=\s+\d{1,3}(?:\s*[:;,–-]|\b))/gu,book=>names[book]||book);
}

// Move complete DOM sentence nodes, never words or characters. Measurement is supplied
// by the actual presentation body after fonts and images are ready.
export function paginateExplanatory(stage, fits) {
  const initial=[...stage.querySelectorAll('[data-explanatory-unit]')];
  const sparse=[];
  let slide=stage.firstElementChild;
  while(slide){
    if(slide.classList.contains('cover-slide')){slide=slide.nextElementSibling;continue}
    slide.classList.add('measuring');
    while(!fits(slide)){
      const reading=slide.querySelector('.reading'),p=reading.lastElementChild;
      if(!p || (reading.children.length===1&&p.children.length<=1)){
        slide.classList.remove('measuring');
        return {ok:false,reason:'sentence_or_title_too_large',source:slide.dataset.sourceSlide};
      }
      let next=slide.nextElementSibling;
      if(!next?.classList.contains('continuation')||next.dataset.topic!==slide.dataset.topic){
        next=slide.cloneNode(true);next.classList.add('continuation');
        next.querySelector('.reading').replaceChildren();slide.after(next);
      }
      const destination=next.querySelector('.reading');
      if(p.children.length>1){
        let target=destination.firstElementChild;
        if(!target || target.dataset.paragraph!==p.dataset.paragraph){target=p.cloneNode(false);destination.prepend(target)}
        target.prepend(p.lastElementChild);
      }else destination.prepend(p);
    }
    const reading=slide.querySelector('.reading'),body=slide.querySelector('.body');
    if(slide.dataset.topic!=='opening' && reading.getBoundingClientRect().height<body.getBoundingClientRect().height*.2){sparse.push(slide.dataset.sourceSlide);slide.dataset.layoutSparse='true'}
    slide.classList.remove('measuring');slide=slide.nextElementSibling;
  }
  const actual=[...stage.querySelectorAll('[data-explanatory-unit]')];
  if(initial.length!==actual.length||initial.some((node,i)=>node!==actual[i]))return {ok:false,reason:'content_integrity'};
  return {ok:true,sparse};
}

// Non-visual bridge. Original markup, style sheets, files and navigation stay intact.
export function withTeacherBridge(html, channel, namespace='') {
 let deck=[];
 const match=/\bconst slides\s*=\s*(\[[^\n]+\]);\s*let i\s*=/.exec(html);
 if(match){try{const rows=JSON.parse(match[1]);if(Array.isArray(rows)&&rows.length<=1000&&rows.every(row=>Array.isArray(row)&&row.length===4&&row.every(value=>typeof value==='string')))deck=rows;}catch{/* Only declarative JSON is accepted. */}}
 const script=`<script>(${bridgeRuntime.toString()})(${JSON.stringify(channel)},${JSON.stringify(namespace)},${JSON.stringify(deck).replace(/</g,'\\u003c')});<\/script>`;
 return /<\/body\s*>/i.test(html)?html.replace(/<\/body\s*>/i,script+'</body>'):html+script;
}
function bridgeRuntime(channel,namespace,deck){
 let last='',scheduled=false,manual=0;
 const activeDocument=()=>{for(const frame of document.querySelectorAll('iframe')){try{const nested=frame.contentDocument;if(nested?.querySelector('.slide,[data-slide-index],.slides>section'))return nested;}catch{/* Cross-origin previews remain read-only. */}}return document;};
 const slides=()=>Array.from(activeDocument().querySelectorAll('.slide,[data-slide-index],.slides>section')).filter((n,i,a)=>a.indexOf(n)===i);
 const sections=()=>Array.from(document.querySelectorAll('main>section,article>section'));
 function state(){
  const list=slides(),parts=list.length?list:sections();
  let index=0;
  if(list.length){index=list.findIndex(n=>n.classList.contains('active')||n.classList.contains('present')||n.getAttribute('aria-hidden')==='false');if(index<0)index=list.findIndex(n=>n.ownerDocument.defaultView.getComputedStyle(n).display!=='none'&&n.getBoundingClientRect().width>0);}
  else if(parts.length){index=parts.findIndex(n=>n.getBoundingClientRect().bottom>80);}
  index=Math.max(0,index<0?manual:index);
  const doc=activeDocument();
  const counter=doc.getElementById('count')?.textContent?.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
  const dynamic=list.length===1&&counter&&Number(counter[2])===deck.length&&Number(counter[1])>=1&&Number(counter[1])<=deck.length;
  if(dynamic)index=Number(counter[1])-1;
  const node=(dynamic?list[0]:parts[index])||doc.querySelector('main,article')||doc.body;
  const content=node.querySelector('.body')||node;
  const refs='[data-reference],.bible-ref';
 const bibleReferencePattern = /(?<![\p{L}\p{N}])((?:[123]\s*)?(?:Gênesis|Genesis|Gn|Êxodo|Exodo|Êx|Levítico|Levitico|Lv|Números|Numeros|Nm|Deuteronômio|Deuteronomio|Dt|Josué|Josue|Js|Juízes|Juizes|Jz|Rute|Rt|[12]\s*Samuel|[12]\s*Sm|[12]\s*Reis|[12]\s*Rs|[12]\s*Crônicas|[12]\s*Cr|Esdras|Ed|Neemias|Ne|Ester|Et|Jó|Jo|Salmos|Salmo|Sl|Provérbios|Proverbios|Pv|Eclesiastes|Ec|Cânticos|Canticos|Ct|Isaías|Isaias|Is|Jeremias|Jr|Lamentações|Lamentacoes|Lm|Ezequiel|Ez|Daniel|Dn|Oseias|Os|Joel|Jl|Amós|Amos|Am|Obadias|Ob|Jonas|Jn|Miqueias|Mq|Naum|Na|Habacuque|Hc|Sofonias|Sf|Ageu|Ag|Zacarias|Zc|Malaquias|Ml|Mateus|Mt|Marcos|Mc|Lucas|Lc|João|Joao|Jo|Atos|At|Romanos|Rm|[12]\s*Coríntios|[12]\s*Corintios|[12]\s*Co|Gálatas|Galatas|Gl|Efésios|Efesios|Ef|Filipenses|Fp|Colossenses|Cl|[12]\s*Tessalonicenses|[12]\s*Ts|[12]\s*Timóteo|[12]\s*Timoteo|[12]\s*Tm|Tito|Tt|Filemom|Fm|Hebreus|Hb|Tiago|Tg|[12]\s*Pedro|[12]\s*Pe|[123]\s*João|[123]\s*Jo|Judas|Jd|Apocalipse|Ap)\.?\s*\d{1,3}\s*[:.]\s*\d{1,3}(?:\s*[-–—]\s*(?:\d{1,3}:)?\d{1,3})?)/giu;
  const markedReferences=[...content.querySelectorAll(refs)].map(n=>(n.dataset.reference||n.textContent||'').trim()).filter(Boolean);
  // Imported HTML can contain plain references that were never wrapped in .bible-ref.
  // Scan visible slide text too, without modifying the original presentation.
  const unmarked=content.cloneNode(true);
  unmarked.querySelectorAll(refs).forEach(n=>n.replaceWith(' '));
  unmarked.querySelectorAll('script,style,nav,button,dialog,template,[data-teacher-only]').forEach(n=>n.remove());
  const plainReferences=[...(unmarked.textContent||'').matchAll(bibleReferencePattern)].map(match=>match[0]);
  const references=[...new Set([...markedReferences,...plainReferences])];
  const clone=content.cloneNode(true);
  clone.querySelectorAll(refs).forEach(n=>n.replaceWith(n.textContent||''));
  clone.querySelectorAll('script,style,nav,button,dialog,template,[data-teacher-only]').forEach(n=>n.remove());
  const text=clone.innerText||[...clone.querySelectorAll('h1,h2,h3,p,aside,li')].map(n=>n.textContent.trim()).filter(Boolean).join('\n\n')||clone.textContent;
  const title=node.querySelector('h1,h2,h3')?.textContent||document.title||'Material';
  // Generated slides can move when content is repaginated. Imported originals
  // retain their existing index keys and note contract.
  const fingerprint=part=>{
   const content=part.querySelector('.body')||part;
   const value=content.textContent.replace(/\s+/g,' ').trim();
   let hash=2166136261;
   for(const char of value)hash=Math.imul(hash^char.codePointAt(0),16777619);
   return (hash>>>0).toString(36);
  };
  let key=(namespace?namespace+':':'')+(list.length?'slide:':'section:')+index;
  if(namespace&&list.length&&node.querySelector('.body')){
   const hash=fingerprint(node);
   const occurrence=list.slice(0,index).filter(part=>fingerprint(part)===hash).length;
   key=namespace+':content:'+hash+':'+occurrence;
  }
  const next=parts[index+1], nextRow=dynamic?deck[index+1]:null;
  const nextContent=(next?.querySelector('.body')||next)?.cloneNode(true);
  nextContent?.querySelectorAll('script,style,nav,button,dialog,template,[data-teacher-only]').forEach(n=>n.remove());
  return {nextTitle:nextRow?.[1]||nextContent?.querySelector('h1,h2,h3')?.textContent||'',nextText:nextRow?.[2]||nextContent?.textContent?.trim().slice(0,20000)||'',index,total:dynamic?deck.length:parts.length||1,title,references,text:(text||'').trim().slice(0,100000),sync:list.length?'slides':parts.length?'sections':'manual',key};
 }
 function emit(force=false){scheduled=false;const data=state(),s=JSON.stringify(data);if(force||s!==last){last=s;parent.postMessage({type:'ceb-teacher-public',channel,...data},'*');}}
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(()=>emit());}}
 window.addEventListener('message',e=>{
  if(e.source!==parent||e.data?.channel!==channel)return;
  if(e.data.type==='ceb-teacher-poll'){emit(true);return;}
  if(e.data.type==='ceb-teacher-print'){window.print();return;}
  if(e.data.type==='ceb-teacher-reference'&&typeof e.data.reference==='string'){
   const ref=[...activeDocument().querySelectorAll('.slide.active .bible-ref')].find(link=>(link.dataset.reference||link.textContent).trim()===e.data.reference);
   ref?.click();return;
  }
  if(e.data.type!=='ceb-teacher-go' ||!Number.isInteger(e.data.index))return;
  const s=state(),target=Math.max(0,Math.min(s.total-1,e.data.index));
  if(target===s.index)return;
  if(s.sync==='slides'){
   // Use the presentation's native controls; never change slide styles or classes.
   const doc=activeDocument();
   const next=doc.querySelector('#next,#nextBtn,button[onclick="step(1)"],[data-action="next"],.next');
   const prev=doc.querySelector('#previous,#prev,#prevBtn,button[onclick="step(-1)"],[data-action="previous"],.previous');
   const control=target>s.index?next:prev;
   if(control){for(let i=0;i<Math.abs(target-s.index);i++)control.click();}
   else doc.dispatchEvent(new KeyboardEvent('keydown',{key:target>s.index?'ArrowRight':'ArrowLeft',bubbles:true}));
  }else if(s.sync==='sections'){sections()[target]?.scrollIntoView({behavior:'instant',block:'start'});}
  manual=target;schedule();
 });
 new MutationObserver(schedule).observe(document.documentElement,{subtree:true,attributes:true,childList:true,characterData:true});
 const observeNested=()=>{for(const frame of document.querySelectorAll('iframe')){try{const doc=frame.contentDocument;if(doc?.documentElement&&!doc.documentElement.dataset.cebTeacherObserved){doc.documentElement.dataset.cebTeacherObserved='1';new MutationObserver(schedule).observe(doc.documentElement,{subtree:true,attributes:true,childList:true,characterData:true});frame.addEventListener('load',schedule);}}catch{/* Ignore inaccessible frames. */}}};
 new MutationObserver(()=>{observeNested();schedule();}).observe(document.documentElement,{subtree:true,childList:true});
 observeNested();
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);addEventListener('load',()=>emit(true));emit(true);
}
// Read only the explicit JSON notes contract used by the approved two-window HTML.
// Never eval imported code or infer private notes from public slide text.
export function embeddedTeacherNotes(html){
 const match=html.match(/const\s+data\s*=\s*(\[[\s\S]*?\]);\s*window\.updateTeacher/);
 if(!match)return {};
 try{const rows=JSON.parse(match[1]);if(!Array.isArray(rows)||rows.length>2000)return {};return Object.fromEntries(rows.flatMap((row,i)=>typeof row?.notes==='string'&&row.notes.length<=60000?[[`slide:${i}`,row.notes]]:[]));}catch{return {}}
}

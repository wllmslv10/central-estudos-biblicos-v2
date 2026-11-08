// Non-visual bridge. Original markup, style sheets, files and navigation stay intact.
export function withTeacherBridge(html, channel) {
 const script=`<script>(${bridgeRuntime.toString()})(${JSON.stringify(channel)});<\/script>`;
 return /<\/body\s*>/i.test(html)?html.replace(/<\/body\s*>/i,script+'</body>'):html+script;
}
function bridgeRuntime(channel){
 let last='',scheduled=false,manual=0;
 const slides=()=>Array.from(document.querySelectorAll('.slide,[data-slide-index],.slides>section')).filter((n,i,a)=>a.indexOf(n)===i);
 const sections=()=>Array.from(document.querySelectorAll('main>section,article>section'));
 function state(){
  const list=slides(),parts=list.length?list:sections();
  let index=0;
  if(list.length){index=list.findIndex(n=>n.classList.contains('active')||n.classList.contains('present')||n.getAttribute('aria-hidden')==='false');if(index<0)index=list.findIndex(n=>getComputedStyle(n).display!=='none'&&n.getBoundingClientRect().width>0);}
  else if(parts.length){index=parts.findIndex(n=>n.getBoundingClientRect().bottom>80);}
  index=Math.max(0,index<0?manual:index);
  const node=parts[index]||document.querySelector('main,article')||document.body;
  const clone=node.cloneNode(true);clone.querySelectorAll('script,style,nav,button,dialog,template,[data-teacher-only]').forEach(n=>n.remove());
  const title=node.querySelector('h1,h2,h3')?.textContent||document.title||'Material';
  return {index,total:parts.length||1,title,text:(clone.textContent||'').trim().slice(0,100000),sync:list.length?'slides':parts.length?'sections':'manual',key:(list.length?'slide:':'section:')+index};
 }
 function emit(force=false){scheduled=false;const data=state(),s=JSON.stringify(data);if(force||s!==last){last=s;parent.postMessage({type:'ceb-teacher-public',channel,...data},'*');}}
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(()=>emit());}}
 window.addEventListener('message',e=>{
  if(e.source!==parent||e.data?.channel!==channel)return;
  if(e.data.type==='ceb-teacher-poll'){emit(true);return;}
  if(e.data.type!=='ceb-teacher-go'||!Number.isInteger(e.data.index))return;
  const s=state(),target=Math.max(0,Math.min(s.total-1,e.data.index));
  if(s.sync==='slides'){
   // Use the presentation's native controls; never change slide styles or classes.
   const next=document.querySelector('#next,#nextBtn,[data-action="next"],.next');
   const prev=document.querySelector('#previous,#prev,#prevBtn,[data-action="previous"],.previous');
   const control=target>s.index?next:prev;
   if(control)control.click();
   else document.dispatchEvent(new KeyboardEvent('keydown',{key:target>s.index?'ArrowRight':'ArrowLeft',bubbles:true}));
  }else if(s.sync==='sections'){sections()[target]?.scrollIntoView({behavior:'instant',block:'start'});}
  manual=target;schedule();
 });
 new MutationObserver(schedule).observe(document.documentElement,{subtree:true,attributes:true,childList:true,characterData:true});
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);addEventListener('load',()=>emit(true));emit(true);
}
// Read only the explicit JSON notes contract used by the approved two-window HTML.
// Never eval imported code or infer private notes from public slide text.
export function embeddedTeacherNotes(html){
 const match=html.match(/const\s+data\s*=\s*(\[[\s\S]*?\]);\s*window\.updateTeacher/);
 if(!match)return {};
 try{const rows=JSON.parse(match[1]);if(!Array.isArray(rows)||rows.length>2000)return {};return Object.fromEntries(rows.flatMap((row,i)=>typeof row?.notes==='string'&&row.notes.length<=60000?[[`slide:${i}`,row.notes]]:[]));}catch{return {}}
}

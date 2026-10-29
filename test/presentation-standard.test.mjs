// Targeted checks for the new standard only; no import/quiz/database tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createPresentationHtml,createPresentationHtmlFromSlides,buildSlides} from '../src/presentation.mjs';
const cover={src:'data:image/png;base64,'+readFileSync(new URL('../src/ebd-presentation-cover.png',import.meta.url)).toString('base64'),alt:'Capa original da EBD'};
const lesson={title:'Apresentação técnica',passage:'Mateus 4:1–11',theme:'A fidelidade a Deus',introduction:'Considere Mateus 4:4.',points:[{title:'Adoração',explanation:'Considere Mateus 4:10.',application:'Como priorizar a obediência a Deus?'}],conclusion:'Reflita à luz do texto.'};
const sections=html=>html.match(/<section\b[\s\S]*?<\/section>/g)||[];
for(const collection of ['estudos','pregacoes','ebd'])test(`padrão central e capa opcionais: ${collection}`,()=>{
 const study={...lesson,collection},before=JSON.stringify(study);
 const base=createPresentationHtml(study,'ampliado'),html=createPresentationHtml(study,'ampliado',{}, {cover});
 const oldSlides=sections(base),newSlides=sections(html);
 assert.equal(newSlides.length,oldSlides.length+1);assert.deepEqual(newSlides.slice(1),oldSlides);
 assert.equal(JSON.stringify(study),before);assert.match(html,/data-presentation-standard="2"/);
 assert.match(newSlides[0],/object|cover-image/);assert.match(html,/object-fit:contain/);
 assert.match(html,/revealControls/);assert.match(html,/pointermove/);assert.match(html,/touchstart/);assert.match(html,/focusin/);
 assert.match(html,/@media print/);assert.match(html,/ArrowRight/);assert.match(html,/fullscreenchange/);
 assert.doesNotMatch(html,/padding-bottom:60px|innerHeight - 60/);
 const script=html.match(/<script>([\s\S]*)<\/script>/)[1];assert.doesNotThrow(()=>new Function(script));
});
test('fonte explícita não reescreve nem descarta os 39 slides quando preservada',()=>{
 const slides=Array.from({length:39},(_,i)=>({kicker:'',title:`Slide ${i+1}`,body:['Pergunte à turma: Como aplicar o texto?',`Texto integral ${i+1}.`],note:'Mateus 4:4'}));
 const before=JSON.stringify(slides);const base=createPresentationHtmlFromSlides(slides,{title:'Roteiro'},'ampliado',{}, {preserveSource:true});
 const html=createPresentationHtmlFromSlides(slides,{title:'Roteiro'},'ampliado',{}, {cover,preserveSource:true});
 assert.equal(sections(html).length,40);assert.deepEqual(sections(html).slice(1),sections(base));assert.equal(JSON.stringify(slides),before);assert.match(html,/Pergunte à turma:/);
});
test('capa inválida é recusada; textos e atributos são escapados',()=>{
 for(const src of ['javascript:alert(1)','https://example.com/image.png','data:image/svg+xml,<svg onload=alert(1)>'])assert.throws(()=>createPresentationHtml(lesson,'resumido',{}, {cover:{src}}));
 const html=createPresentationHtml(lesson,'resumido',{}, {cover:{...cover,alt:'" onerror="alert(1)'}});
 assert.match(html,/alt="&quot; onerror=&quot;alert\(1\)"/);
 assert.equal(buildSlides(lesson).length,sections(createPresentationHtml(lesson)).length);
});
test('runtime exportado: ocultar/mostrar controles, teclado, toque, tela cheia e impressão',async()=>{
 const events={},timers=new Map();let nextTimer=0,prints=0;
 const classes=()=>{const set=new Set();return {add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x),toggle:(x,on)=>on?set.add(x):set.delete(x)}};
 const node=()=>({classList:classes(),style:{setProperty(){}},textContent:'',setAttribute(){},addEventListener(type,fn){events['controls:'+type]=fn},matches:()=>false,querySelector:()=>null});
 const nav=node(),stage=node(),body=node();const ids=Object.fromEntries(['status','counter','previous','next','fullscreen','print','reveal-controls'].map(k=>[k,node()]));
 const slides=Array.from({length:4},(_,i)=>{const n=node();if(i===0)n.classList.add('cover-slide');const number=node();n.querySelector=s=>s==='.page-number'?number:{clientWidth:1600,children:[],getBoundingClientRect:()=>({width:1600})};return n});
 const doc={body,fonts:{ready:Promise.resolve()},fullscreenElement:null,fullscreenEnabled:true,documentElement:{dataset:{},requestFullscreen:async()=>{doc.fullscreenElement={};events.fullscreenchange()}},exitFullscreen:async()=>{doc.fullscreenElement=null;events.fullscreenchange()},getElementById:id=>ids[id],querySelector:s=>s==='.stage'?stage:s==='.controls'?nav:null,querySelectorAll:s=>s==='.slide'?slides:[],addEventListener:(type,fn)=>{const previous=events[type];events[type]=event=>{previous?.(event);fn(event)}}};
 const context={document:doc,window:{addEventListener(){},print:()=>prints++},innerWidth:1600,innerHeight:900,NodeFilter:{SHOW_TEXT:4},setTimeout:fn=>{timers.set(++nextTimer,fn);return nextTimer},clearTimeout:id=>timers.delete(id)};
 const html=createPresentationHtml(lesson,'resumido');vm.runInNewContext(html.match(/<script>([\s\S]*)<\/script>/)[1],context);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(doc.documentElement.dataset.presentationReady,'true');assert.equal(stage.style.height,'900px');assert.equal(ids.counter.textContent,'1 / 4');
 [...timers.values()].at(-1)();assert.ok(body.classList.contains('controls-hidden'));events.pointermove();assert.equal(body.classList.contains('controls-hidden'),false);
 const key=k=>events.keydown({key:k,target:{closest:()=>null},preventDefault(){}});
 key('ArrowRight');assert.equal(ids.counter.textContent,'2 / 4');assert.equal(slides[0].inert,true);assert.equal(slides[1].inert,false);
 key('End');assert.equal(ids.next.disabled,true);key('Home');assert.equal(ids.previous.disabled,true);
 const target={closest:()=>null};events.touchstart({target,changedTouches:[{screenX:500,screenY:100}]});events.touchend({changedTouches:[{screenX:300,screenY:100}]});assert.equal(ids.counter.textContent,'2 / 4');
 await ids.fullscreen.onclick();assert.equal(ids.fullscreen.textContent,'Sair da tela cheia');await ids.fullscreen.onclick();assert.equal(ids.fullscreen.textContent,'Tela cheia');
 ids.print.onclick();assert.equal(prints,1);
});

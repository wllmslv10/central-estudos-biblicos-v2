import {chromium} from 'playwright';
import {createPresentationHtml} from '../src/presentation.mjs';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const assets=path=>'data:image/png;base64,'+readFileSync(path).toString('base64');
const logos={ceb:assets('public/ceb-book.png'),church:assets('identidade-visual/logo-circular-azul-2.png')};
const cover={src:assets('src/ebd-presentation-cover.png')};
const sections=[
 ['ceb-contracapa','Reflexão sobre a fidelidade','Como agir com fidelidade?\n\nQual será sua decisão?'],
 ['showtime-slide','Momento interativo',''],
 ['dinamica-titulo','PENSE E RESPONDA','O que você faria?'],
 ['dinamica-ceb','Dinâmica da escolha','Uma escolha difícil.\n\nQue conselho você buscaria?\n\nUma segunda oferta.\n\nVocê pediria ajuda?'],
 ['ponte-biblica-ceb','O valor da sabedoria','Leia a passagem.\n\nA sabedoria nos ajuda a decidir.'],
 ['homework-slide','Atividade para Casa — Questionário de Revisão','O que aprendemos?\n\nComo aplicar?']
];
const study={title:'Uma nova lição sobre a sabedoria',collection:'ebd',passage:'Tiago 1:5',studentReviewed:true,legacySections:sections.map(([id,title,content])=>({title:'['+id+'] '+title,content}))};
const html=createPresentationHtml(study,'completa',logos,{official:true,cover});
const b=await chromium.launch({executablePath:process.env.CEB_TEST_CHROMIUM,args:['--no-sandbox','--disable-gpu']});
mkdirSync('presentation-validation/special',{recursive:true});
try{
 for(const [width,height] of [[1366,768],[1024,768]]){
  const p=await b.newPage({viewport:{width,height}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setContent(html);await p.waitForFunction(()=>!!document.documentElement.dataset.presentationReady);
  assert.equal(await p.locator('html').getAttribute('data-presentation-ready'),'true',await p.locator('#status').innerText());
  assert.equal(await p.locator('[data-special-layout]').count(),6);
  assert.equal(await p.locator('.cover-slide').count(),1);
  for(const selector of ['.cover-slide',...sections.map(([id])=>'.'+id)]){
   await p.locator(selector).evaluate(el=>el.style.setProperty('display','flex','important'));
   await p.locator(selector).screenshot({path:'presentation-validation/special/'+width+'-'+selector.slice(1)+'.png'});
   const ratio=await p.locator(selector).evaluate(el=>el.getBoundingClientRect().width/el.getBoundingClientRect().height);
   assert.ok(Math.abs(ratio-16/9)<0.01);
   await p.locator(selector).evaluate(el=>el.style.removeProperty('display'));
  }
  const activity=p.locator('.dinamica-ceb');
  await activity.evaluate(el=>{el.inert=false;el.style.setProperty('display','flex','important')});
  await activity.locator('[data-action="d-reveal"]').evaluate(el=>el.click());
  assert.match(await activity.locator('.d-condition').textContent(),/Que conselho/);
  await activity.locator('[data-action="d-next"]').evaluate(el=>el.click());
  assert.match(await activity.locator('.d-gift').textContent(),/segunda oferta/);
  await activity.locator('[data-action="d-reveal"]').evaluate(el=>el.click());
  assert.match(await activity.locator('.d-condition').textContent(),/pediria ajuda/);
  await activity.locator('[data-action="d-reset"]').evaluate(el=>el.click());
  assert.match(await activity.locator('.d-gift').textContent(),/escolha difícil/);
  assert.deepEqual(errors,[]);
  await p.close();
 }
 const extended=await b.newPage({viewport:{width:1024,height:768}});
 const questions=Array.from({length:24},(_,index)=>'Como aplicar o princípio '+(index+1)+'?');
 await extended.setContent(createPresentationHtml({...study,legacySections:[{title:'Revisão',content:questions.join('\n\n')}]},'completa',logos,{official:true,sectionLayouts:{'section:0':'homework-slide'}}));
 await extended.locator('html[data-presentation-ready="true"]').waitFor();
 assert.equal(await extended.locator('.homework-slide').count(),3);
 assert.deepEqual(await extended.locator('.homework-item>div').allTextContents(),questions);
 await extended.close();
 console.log('Sete layouts, controles da dinâmica e atividade extensa validados');
}finally{await b.close()}

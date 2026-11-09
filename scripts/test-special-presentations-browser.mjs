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
const modelHtml=process.env.CEB_HTML_MODEL ? readFileSync(process.env.CEB_HTML_MODEL,'utf8') : null;
const visual=locator=>locator.evaluate(slide=>{
 const selectors=['', '.body','header','footer','.church-logo-frame img','h1','.cc-inner','.showtime','.dt-panel','.d-gift','.ponte-box','.homework-columns'];
 return selectors.flatMap(selector=>{
  const node=selector?slide.querySelector(selector):slide;
  if(!node)return [];
  const css=getComputedStyle(node);
  return [[selector,css.fontFamily,css.fontSize,css.fontWeight,css.color,css.backgroundColor,css.backgroundImage,css.padding,css.borderRadius]];
 });
});
try{
 for(const [width,height] of [[1366,768],[1024,768]]){
  const p=await b.newPage({viewport:{width,height}});
  const model=modelHtml&&await b.newPage({viewport:{width,height}});
  if(model){await model.setContent(modelHtml);await model.locator('body.ready').waitFor();}
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setContent(html);await p.waitForFunction(()=>!!document.documentElement.dataset.presentationReady);
  assert.equal(await p.locator('html').getAttribute('data-presentation-ready'),'true',await p.locator('#status').innerText());
  assert.equal(await p.locator('[data-special-layout]').count(),6);
  assert.equal(await p.locator('.cover-slide').count(),1);
  for(const selector of ['.cover-slide',...sections.map(([id])=>'.'+id)]){
   await p.locator(selector).evaluate(el=>el.style.setProperty('display','flex','important'));
   await p.locator(selector).screenshot({path:'presentation-validation/special/'+width+'-'+selector.slice(1)+'.png'});
   if(model){
    const expected=model.locator(selector);
    await expected.evaluate(el=>el.style.setProperty('display','flex','important'));
    await expected.screenshot({path:'presentation-validation/special/model-'+width+'-'+selector.slice(1)+'.png'});
    assert.deepEqual(await visual(p.locator(selector)),await visual(expected),selector+' em '+width+'×'+height);
    await expected.evaluate(el=>el.style.removeProperty('display'));
   }
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
  await model?.close();
 }
 const extended=await b.newPage({viewport:{width:1024,height:768}});
 const questions=Array.from({length:24},(_,index)=>'Como aplicar o princípio '+(index+1)+'?');
 await extended.setContent(createPresentationHtml({...study,legacySections:[{title:'Revisão',content:questions.join('\n\n')}]},'completa',logos,{official:true,sectionLayouts:{'section:0':'homework-slide'}}));
 await extended.locator('html[data-presentation-ready="true"]').waitFor();
 assert.equal(await extended.locator('.homework-slide').count(),3);
 assert.deepEqual(await extended.locator('.homework-item>div').allTextContents(),questions);
 const longQuestions=Array.from({length:10},(_,index)=>'Pergunta '+(index+1)+'. '+('Analise a situação e explique como a decisão afeta a comunidade. ').repeat(9).trim());
 await extended.goto('about:blank');
 await extended.setContent(createPresentationHtml({...study,legacySections:[{title:'Revisão detalhada',content:longQuestions.join('\n\n')}]},'completa',logos,{official:true,sectionLayouts:{'section:0':'homework-slide'}}));
 await extended.locator('html[data-presentation-ready="true"]').waitFor();
 assert.ok(await extended.locator('.homework-slide').count()>1);
 assert.deepEqual(await extended.locator('.homework-item>div').allTextContents(),longQuestions);
 const explanations=Array.from({length:18},(_,index)=>'Explicação '+(index+1)+'. '+('A sabedoria orienta decisões e ajuda a compreender as consequências de cada escolha. ').repeat(4).trim());
 await extended.goto('about:blank');
 await extended.setContent(createPresentationHtml({...study,legacySections:[{title:'Ponte',content:['Leia a passagem.',...explanations].join('\n\n')}]},'completa',logos,{official:true,sectionLayouts:{'section:0':'ponte-biblica-ceb'}}));
 await extended.locator('html[data-presentation-ready="true"]').waitFor();
 assert.ok(await extended.locator('.ponte-biblica-ceb').count()>1);
 assert.deepEqual(await extended.locator('.ponte-box>p').allTextContents(),explanations);
 const question=('O que podemos aprender com a decisão tomada e com as consequências para a comunidade? ').repeat(24).trim();
 await extended.goto('about:blank');
 await extended.setContent(createPresentationHtml({...study,legacySections:[{title:'Reflexão',content:question+'\n\nQual será sua decisão?'}]},'completa',logos,{official:true,sectionLayouts:{'section:0':'ceb-contracapa'}}));
 await extended.locator('html[data-presentation-ready="true"]').waitFor();
 assert.ok(await extended.locator('.ceb-contracapa').count()>1);
 assert.equal((await extended.locator('.cc-question').allTextContents()).join(''),question);
 const condition=('A decisão precisa considerar todas as consequências para a comunidade. ').repeat(36).trim();
 await extended.goto('about:blank');
 await extended.setContent(createPresentationHtml({...study,legacySections:[{title:'Oferta',content:'Uma oferta.\n\n'+condition}]},'completa',logos,{official:true,sectionLayouts:{'section:0':'dinamica-ceb'}}));
 await extended.locator('.ready').waitFor();
 await extended.keyboard.press('End');
 const reveal=extended.locator('[data-action="d-reveal"]');
 let recovered='';
 for(let i=0;i<12&&await reveal.isEnabled();i++){
  await reveal.click();
  const body=extended.locator('.dinamica-ceb .body');
  assert.equal(await body.evaluate(node=>node.scrollHeight<=node.clientHeight+1),true);
  recovered+=await body.locator('.d-condition').textContent();
 }
 assert.equal(recovered,condition);
 await extended.close();
 console.log('Sete layouts, controles da dinâmica e atividade extensa validados');
}finally{await b.close()}

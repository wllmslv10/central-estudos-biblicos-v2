import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createPresentationHtml} from '../src/presentation.mjs';
const out='presentation-validation';await mkdir(out,{recursive:true});
const logos={ceb:'data:image/png;base64,'+(await readFile('public/ceb-book.png')).toString('base64'),church:'data:image/png;base64,'+(await readFile('public/icon-192.png')).toString('base64')};
const normal={title:'Fidelidade nas nossas escolhas',collection:'ebd',passage:'Mateus 4:1–11',theme:'A Palavra de Deus orienta nossas decisões.',introduction:'A aula convida à reflexão sobre as escolhas do cotidiano. Uma oportunidade precisa ser avaliada pelos meios que exige, e não apenas pelo resultado que promete.',points:[{title:'PONTO 1: O que orienta nossas escolhas?',explanation:'Pergunte à turma: Como avaliar uma proposta que parece vantajosa? Ouça as respostas. A fidelidade a Deus nos chama a considerar as consequências, os meios e o cuidado com o próximo. Consulte Mateus 4:4.',application:'Explique à turma: Examine uma decisão cotidiana à luz da Palavra. Qual atitude concreta podemos tomar? Considere Êx 20:3 e 1 João 2:15–17.'},{title:'Uma reflexão para a semana',explanation:'O discernimento cresce quando ouvimos as Escrituras, buscamos conselhos responsáveis e refletimos antes de agir. Consulte Romanos 12:2.',application:'Converse sobre uma situação técnica de exemplo. Como preservar a verdade sem abandonar o respeito?'}],conclusion:'Reflita e aplique o que foi estudado. Retome Mateus 4:1–11.'};
const stress={...normal,title:'Uma reflexão com título extenso sobre o discernimento, as oportunidades, os desejos e as decisões em diferentes situações do cotidiano',theme:'Tema extenso com conteúdo preservado. '.repeat(45),introduction:'Parágrafo sem ponto final para conferir a distribuição automática das palavras e a preservação de todas as informações '.repeat(40)+'\n\n'+('W'.repeat(1200)),points:[{title:'T'.repeat(450),explanation:'Texto preservado com referência 1 João 2:15–17 e pergunta: Como agir? '.repeat(35),application:'Pergunte à turma: O que fazer? Ouça as respostas: Que princípio aplicar? '.repeat(20)}],conclusion:'Conclusão extensa, legível e completa. '.repeat(50)};
const normalize=s=>s.replace(/\*\*/g,'').replace(/\s/gu,'');
const browser=await chromium.launch({headless:true});const report=[];const skins=new Map();
try{
 for(const mode of ['ampliado','resumido'])for(const [name,study]of [['normal',normal],['stress',stress]]){
  const html=createPresentationHtml(study,mode,logos);await writeFile(`${out}/${mode}-${name}.html`,html);
  for(const [width,height]of [[1920,1080],[1366,768],[1024,768],[768,1024],[1280,800]]){
   const page=await browser.newPage({viewport:{width,height},hasTouch:width<=1280});const errors=[];page.on('pageerror',e=>errors.push(e.stack||e.message));
   // Keep fixtures fully offline. Bible replies are a marked technical fixture, not quoted scripture.
   await page.route('https://api.midvash.com/**',r=>r.fulfill({json:{data:{text:'Resposta técnica de teste da consulta bíblica.'},meta:{copyright:'Fixture técnica'}}}));
   await page.setContent(html);await page.waitForSelector('html[data-presentation-ready="true"]');
   const skin=await page.locator('.slide.active').evaluate(s=>({background:getComputedStyle(s).backgroundImage,text:getComputedStyle(s.querySelector('.reading p')||s).color,title:getComputedStyle(s.querySelector('h1')).color,font:getComputedStyle(s.querySelector('.reading p')||s).fontSize}));
   if(mode==='ampliado'){
    skins.set(`${name}-${width}`,skin);
    const badge=await page.locator('.slide.active .church-logo-frame').evaluate(s=>{const r=s.getBoundingClientRect(),img=s.querySelector('img'),i=img.getBoundingClientRect(),radius=r.width/2-2*r.width/72;const center=[r.left+r.width/2,r.top+r.height/2];return{circle:Math.abs(r.width-r.height)<.1&&getComputedStyle(s).borderRadius==='50%',contained:[[i.left,i.top],[i.right,i.top],[i.left,i.bottom],[i.right,i.bottom]].every(([x,y])=>Math.hypot(x-center[0],y-center[1])<=radius+.1),fit:getComputedStyle(img).objectFit}});
    assert.deepEqual(badge,{circle:true,contained:true,fit:'contain'});
   }else{const expanded=skins.get(`${name}-${width}`);assert.equal(skin.background,expanded.background);assert.equal(skin.text,expanded.text);assert.equal(skin.title,expanded.title);assert.equal(expanded.font,'34px');assert.equal(skin.font,'38px');}
   const count=await page.locator('.slide').count();
   for(let i=0;i<count;i++){
    if(i)await page.keyboard.press('ArrowRight');
    const metrics=await page.locator('.slide.active').evaluate(s=>{const r=s.getBoundingClientRect(),body=s.querySelector('.body').getBoundingClientRect();return{ratio:r.width/r.height,clip:[...s.querySelectorAll('.body h1,.body .reading,.body aside')].some(el=>{const b=el.getBoundingClientRect();return b.top<body.top-1||b.bottom>body.bottom+1||b.left<r.left-1||b.right>r.right+1}),scroll:s.scrollHeight>s.clientHeight+1,detail:[...s.querySelectorAll('.body h1,.body .reading,.body aside')].map(el=>({tag:el.tagName,height:el.getBoundingClientRect().height,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom})),body:{top:body.top,bottom:body.bottom},header:s.querySelector('header').textContent}});
    assert.ok(Math.abs(metrics.ratio-16/9)<.01,`${mode} ${name} ${width} aspect`);assert.equal(metrics.clip,false,`${mode} ${name} ${width} slide ${i+1} clipped: ${JSON.stringify(metrics)}`);assert.equal(metrics.scroll,false,`${mode} ${name} ${width} slide ${i+1} scroll`);assert.doesNotMatch(metrics.header,/PONTO|DESENVOLVIMENTO|PERGUNTA/);
   }
   const text=await page.locator('.reading').allTextContents();
   const {cleanPresentationInstructions}=await import('../src/presentation.mjs');
   for(const value of [study.theme,study.introduction,...study.points.flatMap(p=>[p.explanation,p.application]),study.conclusion])assert.ok(normalize(text.join('')).includes(normalize(cleanPresentationInstructions(value))),`${mode} ${name} text lost`);
   assert.equal(errors.length,0,errors.join('\n'));
   assert.equal(await page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.keyboard.press('Home');assert.equal(await page.locator('.slide.active').getAttribute('aria-label'),'Slide 1');
   await page.getByRole('button',{name:'Próximo slide',exact:true}).click();assert.match(await page.locator('#counter').textContent(),/^2 \/ /);
   if(name==='normal'){
    // References in later slides are interactive too.
    await page.keyboard.press('End');const ref=page.locator('.slide.active .bible-ref').first();await ref.click();await page.getByRole('dialog').getByText('Resposta técnica de teste da consulta bíblica.').waitFor();await page.getByRole('button',{name:'Fechar ×'}).click();
    assert.equal(await page.locator('.bible-popover').count(),0);
    await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
    if(width===1920){
      await page.getByRole('button',{name:'Tela cheia',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.getByRole('button',{name:'Tela cheia',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
      await page.emulateMedia({media:'print'});assert.equal(await page.locator('.slide').evaluateAll(slides=>slides.every(s=>getComputedStyle(s).display==='flex'&&getComputedStyle(s).transform==='none')),true);await page.emulateMedia({media:'screen'});
    }
    if(width===1024){await page.keyboard.press('Home');await page.evaluate(()=>{const target=document.body;for(const [type,x] of [['touchstart',600],['touchend',400]])target.dispatchEvent(new TouchEvent(type,{bubbles:true,changedTouches:[new Touch({identifier:0,target,screenX:x,screenY:300})]}));});assert.match(await page.locator('#counter').textContent(),/^2 \/ /);}
    await page.screenshot({path:`${out}/${mode}-${width}x${height}.png`});
   }
   report.push({mode,sample:name,width,height,slides:count,clipping:false,text_preserved:true});
   await page.close();
  }
 }
 // Exercise the actual minified React bundle, with ALL backend traffic mocked.
 const server=createServer(async(req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/central-estudos-biblicos-v2\//,'');
  const root=resolve('dist'),file=resolve(root,path||'index.html');
  if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
  try{const content=await readFile(file);res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(content);}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const page=await browser.newPage({viewport:{width:1366,height:900}}),writes=[],errors=[];page.on('pageerror',e=>errors.push(e.stack||e.message));
  await page.route('https://ceb-biblioteca-api.wllmslv10.workers.dev/**',route=>{
   const request=route.request(),path=new URL(request.url()).pathname;
   if(request.method()!=='GET'&&path!=='/auth/login')writes.push(path);
   const user={id:'technical',username:'technical',display_name:'Conta técnica local',role:'admin',must_change_password:false};
   const payload=path==='/auth/login'?{user,access_token:'technical-mock-only',expires_at:'2099-01-01T00:00:00Z'}:path==='/library/capabilities'?{uploads:false}:path==='/library/folders'?{folders:[]}:path==='/library/materials'?{materials:[]}:{studies:[]};
   return route.fulfill({json:payload});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/central-estudos-biblicos-v2/`);
  await page.getByLabel('Usuário',{exact:true}).fill('technical');await page.getByLabel('Senha',{exact:true}).fill('abc123');await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByText('Conta técnica local',{exact:true}).waitFor();await page.getByRole('button',{name:/Escola Bíblica Dominical.*Reúna lições/s}).click();await page.getByRole('button',{name:/Preparação manual.*Escolher modo manual/s}).click();
  assert.equal(await page.getByLabel('Modelo de apresentação',{exact:true}).inputValue(),'ampliado');
  await page.getByLabel('Título do estudo',{exact:true}).fill('Prévia técnica da EBD');await page.getByLabel('Introdução',{exact:true}).fill('Pergunte à turma: Como agir? Referência Mateus 4:4.');
  await page.getByRole('button',{name:'Ver apresentação',exact:true}).click();
  const frame=page.frameLocator('iframe[title="Prévia da apresentação HTML"]');await frame.locator('html[data-presentation-ready="true"]').waitFor();assert.equal(await frame.locator('body').getAttribute('class'),'ampliado ready');
  const draft=await page.evaluate(()=>localStorage.getItem('ceb-study-draft'));
  await page.getByLabel('Modelo de apresentação',{exact:true}).selectOption('resumido');await frame.locator('body.resumido.ready').waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('ceb-study-draft')),draft);assert.equal(writes.length,0,'Changing/rendering models must not save or duplicate studies');assert.equal(errors.length,0,errors.join('\n'));
  report.push({test:'built_ui',ebd_default:'ampliado',mode_switch:true,backend_writes:0,iframe_ready:true});await page.close();
 }finally{await new Promise(r=>server.close(r));}
 await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({layouts:report.length,all_passed:true,report},null,2));
}finally{await browser.close();}

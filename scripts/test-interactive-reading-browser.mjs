import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {createReadingHtml} from '../src/interactiveReading.mjs';
import {createPresentationHtml} from '../src/presentation.mjs';
import {experimentalStudy as study} from '../test/fixtures/ebd-experimental.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CEB_TEST_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];let vite;
await mkdir('interactive-reading-validation',{recursive:true});
await writeFile('interactive-reading-validation/estudo-aluno.html',createReadingHtml(study));
await writeFile('interactive-reading-validation/estudo-professor.html',createReadingHtml(study,{audience:'teacher'}));
for(const mode of ['simples','media','completa'])await writeFile(`interactive-reading-validation/slides-${mode}.html`,createPresentationHtml(study,mode));
try{
 for(const [width,height] of [[1366,768],[768,1024],[390,844]]){
  const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://api.midvash.com/**',r=>r.fulfill({json:{data:{text:'Texto técnico de teste, não é citação bíblica.'}}}));
  await page.setContent(createReadingHtml(study));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('body').innerText().then(t=>t.includes('SEGREDO-TESTE')),false);
  await page.getByRole('button',{name:'Aumentar fonte'}).click();assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).fontSize),'22px');
  await page.getByRole('button',{name:'Claro / escuro'}).click();assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('dark')),true);
  await page.getByRole('button',{name:'Espaçamento',exact:true}).click();
  await page.getByRole('button',{name:'Leitura limpa',exact:true}).click();assert.equal(await page.locator('main').innerText().then(t=>t.includes(study.conclusion)),true);
  await page.locator('.ref').first().click();await page.getByRole('dialog').waitFor();assert.match(await page.locator('#verse-title').innerText(),/ACF/);assert.doesNotMatch(await page.locator('#verse').innerText(),/Texto técnico/);await page.getByRole('button',{name:'Fechar',exact:true}).click();
  assert.deepEqual(await page.locator('#translation option').evaluateAll(options=>options.map(option=>option.value)),['alm1911','AR','ACF','NVI']);
  for(const [translation,edition] of Object.entries({alm1911:/PorAlmeida1911/,AR:/PorAR/,ACF:/\/acf\//,NVI:/NVI-PT/})){
   await page.locator('#translation').selectOption(translation);
   await page.locator('.ref').first().click();
   assert.match(await page.locator('#external').getAttribute('href'),edition);
   await page.getByRole('button',{name:'Fechar',exact:true}).click();
  }
  await page.locator('.ref').first().click();
  await page.getByRole('button',{name:'Ler aqui na Bíblia Livre (Almeida 1819)',exact:true}).click();
  await page.getByText('Texto técnico de teste, não é citação bíblica.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Fechar',exact:true}).click();
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('nav').evaluate(e=>getComputedStyle(e).display),'none');await page.pdf({path:`interactive-reading-validation/leitura-${width}.pdf`,format:'A4',printBackground:true});await page.emulateMedia({media:'screen'});
  for(const mode of ['simples','media','completa']){
   await page.goto('about:blank');await page.setContent(createPresentationHtml(study,mode));await page.waitForFunction(()=>!!document.documentElement.dataset.presentationReady);assert.equal(await page.locator('html').getAttribute('data-presentation-ready'),'true',`${mode} ${width}: ${await page.locator('#status').innerText()} ${errors.join(';')}`);
   const count=await page.locator('.slide').count();for(let i=0;i<count;i++){
    if(i)await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.slide.active').evaluate(s=>{const body=s.querySelector('.body').getBoundingClientRect();return [...s.querySelectorAll('.body h1,.body .reading,.body aside')].every(e=>{const b=e.getBoundingClientRect();return b.bottom<=body.bottom+1&&b.top>=body.top-1})}),true,`${mode} ${width} slide ${i+1}`);
   }
   assert.doesNotMatch((await page.locator('.reading').allTextContents()).join(''),/SEGREDO-TESTE/);
   await page.keyboard.press('Home');if(count>1)await page.keyboard.press('ArrowRight');await page.screenshot({path:`interactive-reading-validation/slides-${mode}-${width}.png`});
  }
  await page.setContent(createReadingHtml(study));await page.screenshot({path:`interactive-reading-validation/leitura-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);results.push({width,height,reading:true,three_modes:true,references:true,print_css:true});await page.close();
 }
 vite=await createServer({server:{host:'127.0.0.1',port:0}});await vite.listen();
 const page=await browser.newPage();const writes=[];
 await page.route('https://ceb-biblioteca-api.wllmslv10.workers.dev/**',route=>{
  const path=new URL(route.request().url()).pathname;if(route.request().method()!=='GET'&&path!=='/auth/login')writes.push(path);
  return route.fulfill({json:path==='/auth/login'?{user:{id:'technical',username:'technical',display_name:'Conta técnica local',role:'admin',must_change_password:false},access_token:'technical-only'}:path==='/library/capabilities'?{uploads:false}:path==='/library/folders'?{folders:[]}:path==='/library/materials'?{materials:[]}:{studies:[]}});
 });
 await page.goto(vite.resolvedUrls.local[0]);await page.getByLabel('Usuário',{exact:true}).fill('technical');await page.getByLabel('Senha',{exact:true}).fill('abc123');await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('button',{name:/Escola Bíblica Dominical.*Reúna lições/s}).click();await page.getByRole('button',{name:/Preparação manual.*Escolher modo manual/s}).click();
 await page.getByLabel('Título do estudo',{exact:true}).fill(study.title);await page.getByLabel('Introdução',{exact:true}).fill(study.introduction);await page.getByLabel('Orientações reservadas ao professor').fill(study.teacherNotes);
 await page.getByRole('button',{name:'📖 Leitura Interativa',exact:true}).click();const reading=page.frameLocator('iframe[title="Leitura Interativa do estudo completo"]');await reading.getByText(study.teacherNotes,{exact:true}).waitFor();
 await page.getByRole('button',{name:'Baixar leitura HTML ↓'}).waitFor();await page.getByRole('button',{name:'Fechar ×',exact:true}).click();
 await page.getByRole('button',{name:'Slides Simples / Média / Completa',exact:true}).click();const slides=page.frameLocator('iframe[title="Apresentação HTML do material salvo"]');await slides.locator('html[data-presentation-ready="true"]').waitFor();assert.doesNotMatch(await slides.locator('body').innerText(),/SEGREDO-TESTE/);
 for(const mode of ['simples','media','completa']){await page.getByRole('dialog').getByLabel('Modelo de apresentação').selectOption(mode);await slides.locator('html[data-presentation-ready="true"]').waitFor()}
 assert.deepEqual(writes,[]);results.push({editor:true,teacher_notes_separate:true,no_backend_writes:true});
 await writeFile('interactive-reading-validation/results.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
}finally{await browser.close();await vite?.close()}

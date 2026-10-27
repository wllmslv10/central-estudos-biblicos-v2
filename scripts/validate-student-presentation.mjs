// Offline review of the approved source; only removed instructions are recorded in this script.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createPresentationHtmlFromSlides,escapeHtml} from '../src/presentation.mjs';
const [sourcePath,outputPath]=process.argv.slice(2);if(!sourcePath||!outputPath)throw new Error('Provide approved slides JSON and output directory');
const slides=JSON.parse(await readFile(sourcePath,'utf8'));assert.equal(slides.length,30);const original=JSON.stringify(slides),out=resolve(outputPath);await mkdir(out,{recursive:true});
// Explicit human-reviewed deletion manifest. No didactic replacement text is introduced.
const removals=[
 {slide:3,phrase:'**Pergunta à turma:**'},
 {slide:10,phrase:'**Pergunte à turma:**'},
 {slide:10,phrase:'Ouça as respostas e destaque a responsabilidade da igreja de unir verdade, misericórdia e auxílio prático.'},
 {slide:14,phrase:'**Pergunte à turma:**'},
 {slide:18,phrase:'**Pergunte à turma:**'},
 {slide:24,phrase:'Vamos dividir a turma em três grupos.'},
 {slide:28,phrase:'**Explique à turma:**'},
];
const expected=structuredClone(slides);
for(const {slide,phrase}of removals){const item=expected[slide-1];const at=item.body.findIndex(p=>p.includes(phrase));assert.ok(at>=0,`Missing approved phrase ${slide}`);assert.equal(item.body.filter(p=>p.includes(phrase)).length,1);item.body[at]=item.body[at].replace(phrase,'').trim();}
const logos={ceb:'data:image/png;base64,'+(await readFile('public/ceb-book.png')).toString('base64'),church:'data:image/png;base64,'+(await readFile('identidade-visual/logo-circular-azul-2.png')).toString('base64')};
const projected=slides.map((s,i)=>({...s,...(i>=23&&i<=27?{presentationRole:'group-activity'}:{})}));
const html=createPresentationHtmlFromSlides(projected,{title:'A Postura do Cristão Diante das Ofertas do Mundo',collection:'ebd'},'ampliado',logos);
assert.equal(JSON.stringify(slides),original);await writeFile(resolve(out,'CEB_ampliado_alunos_25_slides.html'),html);
const normalize=s=>s.replace(/\*\*/gu,'').replace(/\s+/gu,' ').trim();
const browser=await chromium.launch({headless:true,...(process.env.CEB_TEST_CHROMIUM?{executablePath:process.env.CEB_TEST_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})});const layouts=[];
try{for(const [width,height]of [[1920,1080],[1366,768],[1024,768],[768,1024]]){
 const page=await browser.newPage({viewport:{width,height}});await page.route('https://**',r=>r.abort());await page.setContent(html);await page.waitForSelector('html[data-presentation-ready="true"]');
 const actual=await page.locator('.slide').evaluateAll(all=>all.map(s=>({source:Number(s.dataset.sourceSlide),title:s.querySelector('h1').textContent,body:[...s.querySelectorAll('.reading p')].map(p=>p.textContent),note:s.querySelector('aside')?.textContent||''})));
 assert.equal(actual.length,25);
 for(let i=0;i<30;i++){
  if(i>=23&&i<=27)continue;
  const parts=actual.filter(s=>s.source===(i>=28?i-4:i+1));assert.ok(parts.length);
  assert.equal(normalize(parts.flatMap(s=>s.body).join(' ')),normalize(expected[i].body.join(' ')),`Unexpected content change: slide ${i+1}`);
  for(const part of parts){assert.equal(normalize(part.title),normalize(expected[i].title));assert.equal(normalize(part.note),normalize(expected[i].note));}
 }
 assert.doesNotMatch(actual.flatMap(s=>s.body).join(' '),/Pergunt[ae] à turma|Explique à turma|Ouça as respostas|Escute as respostas|Vamos dividir a turma|Divida a turma/iu);
 assert.equal(await page.locator('.church-logo-frame img').first().evaluate(s=>getComputedStyle(s).filter),'brightness(1.2) saturate(0.72)');
 for(let i=0;i<actual.length;i++){
  if(i)await page.keyboard.press('ArrowRight');const fit=await page.locator('.slide.active').evaluate(s=>{const r=s.getBoundingClientRect(),b=s.querySelector('.body').getBoundingClientRect();return Math.abs(r.width/r.height-16/9)<.01&&s.scrollHeight<=s.clientHeight+1&&[...s.querySelectorAll('.body h1,.body .reading,.body aside')].every(el=>{const x=el.getBoundingClientRect();return x.top>=b.top-1&&x.bottom<=b.bottom+1&&x.left>=r.left-1&&x.right<=r.right+1;});});assert.ok(fit,`Clipping ${width} slide ${i+1}`);
 }
 await page.keyboard.press('End');assert.equal(await page.locator('#counter').textContent(),'25 / 25');assert.equal(await page.locator('#next').isDisabled(),true);await page.getByRole('button',{name:'Slide anterior',exact:true}).click();assert.equal(await page.locator('#counter').textContent(),'24 / 25');await page.keyboard.press('Home');assert.equal(await page.locator('#counter').textContent(),'1 / 25');await page.screenshot({path:resolve(out,`ampliado-${width}x${height}.png`)});layouts.push({width,height,slides:actual.length,text_preserved_except_manifest:true,no_clipping:true});await page.close();
}}finally{await browser.close();}
await writeFile(resolve(out,'CEB_relatorio_dinamica.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Dinâmica e síntese final — PR #5</title><style>body{font:18px/1.6 system-ui;max-width:1000px;margin:30px auto;padding:20px;color:#102d4b;background:#f4f8fc}</style><h1>Apresentação dos alunos: 25 slides</h1><p>Retirados somente da projeção os slides originais 24–28: orientação da dinâmica, três casos e discussão dos casos. O slide original 29 foi preservado: ele é uma síntese bíblica das três tentações de Jesus e traz a pergunta de aplicação “isso honra a Deus, respeita sua Palavra e preserva a verdade?”. Não trata exclusivamente da dinâmica. O original 30 também foi preservado como conclusão.</p><p>Mapeamento: originais 1–23 continuam 1–23; original 29 passa a 24; original 30 passa a 25. Numeração e navegação automáticas, com 25 slides em todas as quatro resoluções verificadas.</p><p>Comparados todos os títulos, parágrafos, perguntas e referências dos slides mantidos com a fonte menos as exclusões de instruções ao professor já aprovadas. Nenhuma diferença adicional. Mantidos o fundo claro, a logomarca circular azul suave, tela cheia e formato 16:9; sem cortes ou rolagem interna em computador e tablet emulados.</p><p>O material original e o Manual do Professor não foram editados; a dinâmica permanece integralmente na fonte e nos materiais salvos. Nenhuma gravação ou consulta ao Neon, Worker ou CEB oficial. Modelo resumido inalterado. PR #5 sem publicação.</p><p>Futuras projeções ampliadas excluem seções explicitamente intituladas “DINÂMICA EM GRUPO” e conteúdos marcados como group-activity, somente na projeção. Blocos em campos mistos são omitidos até o próximo cabeçalho reconhecido de conclusão, aplicação final, cronograma, referências ou ponto. Não se adivinha que uma pergunta de reflexão é dinâmica: conteúdo sem identificação clara precisa de classificação prévia, para evitar omissão de ensino bíblico.</p></html>`);
await writeFile(resolve(out,'validation.json'),JSON.stringify({removals,layouts,all_passed:true},null,2));console.log(JSON.stringify({removals:removals.length,slides:25,layouts,all_passed:true}));

// Local/offline verification. The source lesson and database export are never committed.
// Usage: node scripts/validate-approved-presentation.mjs ORIGINAL.html SAVED-STUDY.json OUTPUT-DIR
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createPresentationHtmlFromSlides,escapeHtml} from '../src/presentation.mjs';
const [sourcePath,savedPath,outputPath]=process.argv.slice(2);
if(!sourcePath||!savedPath||!outputPath)throw new Error('Provide original HTML, saved study JSON and output directory.');
const original=await readFile(sourcePath,'utf8'),saved=JSON.parse(await readFile(savedPath,'utf8')),out=resolve(outputPath);await mkdir(out,{recursive:true});
const hash=s=>createHash('sha256').update(s).digest('hex');
const normalize=s=>s.replace(/\*\*/gu,'').replace(/\s+/gu,' ').trim();
const browser=await chromium.launch({headless:true,...(process.env.CEB_TEST_CHROMIUM?{executablePath:process.env.CEB_TEST_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})});
try{
 const parser=await browser.newPage();await parser.route('**/*',route=>route.abort());
 const slides=await parser.evaluate(html=>{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const rich=el=>{const copy=el.cloneNode(true);for(const strong of copy.querySelectorAll('strong'))strong.replaceWith('**'+strong.textContent+'**');return copy.textContent;};
  return [...doc.querySelectorAll('section.slide')].map(slide=>{
   const body=slide.querySelector('.body'),h=body.querySelector('h1'),reading=body.querySelector('.reading'),note=body.querySelector('.bib');
   if(!h||!reading||!note||[...body.children].some(el=>![h,reading,note].includes(el))||[...reading.children].some(el=>el.tagName!=='P'))throw new Error('Unsupported source content: stop instead of omitting it.');
   return {kicker:'',title:rich(h),body:[...reading.children].map(rich),note:rich(note)};
  });
 },original);await parser.close();assert.equal(slides.length,30,'Expected approved 30-slide source');
 const logos={ceb:'data:image/png;base64,'+(await readFile('public/ceb-book.png')).toString('base64'),church:'data:image/png;base64,'+(await readFile('identidade-visual/logo-circular-azul-2.png')).toString('base64')};
 const base=createPresentationHtmlFromSlides(slides,{title:saved.title,collection:'ebd'},'ampliado',logos);
 const cases=[],files=[],checks=[];
 const savedText=normalize([saved.title,saved.passage,saved.theme,saved.introduction,...saved.points.flatMap(p=>[p.title,p.explanation,p.application]),...(saved.legacySections||[]).flatMap(s=>[s.title,s.content]),saved.conclusion].join(' '));
 for(const [variant,filter]of [['original','none'],['levemente_claro','brightness(1.12)'],['suave','brightness(1.2) saturate(.72)']]){
  const html=base.replace('</style>',`.ampliado .church-logo-frame img{filter:${filter}}</style>`);
  const filename=`CEB_licao_integral_azul_${variant}.html`;files.push(filename);await writeFile(resolve(out,filename),html);
  for(const [width,height]of [[1920,1080],[1366,768],[1024,768],[768,1024]]){
   const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith('data:')?r.continue():r.abort());
   await page.setContent(html);await page.waitForSelector('html[data-presentation-ready="true"]');
   const actual=await page.locator('.slide').evaluateAll(elements=>elements.map(s=>({source:Number(s.dataset.sourceSlide),title:s.querySelector('h1').textContent,body:[...s.querySelectorAll('.reading p')].map(p=>p.textContent),note:s.querySelector('aside')?.textContent||''})));
   for(let i=0;i<slides.length;i++){
    const chunks=actual.filter(s=>s.source===i+1);assert.ok(chunks.length>0);assert.ok(chunks.every(c=>normalize(c.title)===normalize(slides[i].title)&&normalize(c.note)===normalize(slides[i].note)));
    const before=normalize(slides[i].body.join(' ')),after=normalize(chunks.flatMap(c=>c.body).join(' '));assert.equal(after,before,`Content mismatch at source ${i+1}`);
    if(variant==='original'&&width===1366)checks.push({slide:i+1,title:normalize(slides[i].title),paragraphs:slides[i].body.length,before_sha256:hash(before),after_sha256:hash(after),output_slides:chunks.length,identical:true,paragraphs_absent_verbatim_from_saved:slides[i].body.filter(p=>!savedText.includes(normalize(p)))});
   }
   for(let i=0;i<actual.length;i++){
    if(i)await page.keyboard.press('ArrowRight');
    const good=await page.locator('.slide.active').evaluate(s=>{const b=s.querySelector('.body').getBoundingClientRect(),r=s.getBoundingClientRect();return Math.abs(r.width/r.height-16/9)<.01&&s.scrollHeight<=s.clientHeight+1&&[...s.querySelectorAll('.body h1,.body .reading,.body aside')].every(el=>{const x=el.getBoundingClientRect();return x.top>=b.top-1&&x.bottom<=b.bottom+1&&x.left>=r.left-1&&x.right<=r.right+1;});});assert.equal(good,true,`${variant} ${width} slide ${i+1} clips`);
   }
   assert.deepEqual(errors,[]);assert.equal(await page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)),true);
   await page.keyboard.press('Home');await page.screenshot({path:resolve(out,`${variant}-${width}x${height}.png`)});
   cases.push({variant,width,height,slides:actual.length,source_slides:30,text_identical:true,no_clipping:true});await page.close();
  }
 }
 await writeFile(resolve(out,'integrity.json'),JSON.stringify({source_sha256:hash(original),source_slides:30,paragraphs:slides.reduce((n,s)=>n+s.body.length,0),checks,cases},null,2));
 const rows=checks.map(s=>`<tr><td>${s.slide}</td><td>${escapeHtml(s.title)}</td><td>Idêntico</td><td>${s.output_slides}</td><td><details><summary>Textos ausentes literalmente do estudo salvo (${s.paragraphs_absent_verbatim_from_saved.length})</summary>${s.paragraphs_absent_verbatim_from_saved.map(p=>`<p>${escapeHtml(p)}</p>`).join('')}</details></td></tr>`).join('');
 await writeFile(resolve(out,'CEB_conferencia_integridade.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conferência de integridade — PR #5</title><style>body{max-width:1200px;margin:30px auto;padding:16px;font:18px/1.5 system-ui;color:#102d4b;background:#f4f8fc}table{border-collapse:collapse;width:100%;font-size:15px}td,th{border:1px solid #aac2d5;padding:10px;text-align:left;vertical-align:top}summary{cursor:pointer}code{overflow-wrap:anywhere}</style><h1>Conferência da apresentação integral</h1><p>Fonte: EBD_Postura_do_Cristao_Slides_Roteiro_Ampliado.html. SHA-256: <code>${hash(original)}</code>.</p><p><strong>30 slides originais e ${checks.reduce((n,s)=>n+s.paragraphs,0)} parágrafos conferidos: títulos, textos, sequência e referências preservados integralmente.</strong> As três opções têm conteúdo idêntico; muda somente o filtro de azul da logomarca circular original da igreja. Fundo exatamente igual ao modelo resumido.</p><h2>Diferenças identificadas</h2><p>A amostra anterior era uma demonstração técnica de sete slides sobre “Fidelidade nas nossas escolhas”; não era a lição integral. Foi substituída nestas amostras pela fonte aprovada de 30 slides.</p><p>O HTML aprovado e o estudo salvo no Neon não são cópias literais. A tabela identifica todos os parágrafos que não aparecem integralmente com a mesma redação no estudo salvo. Isso é uma comparação literal, não uma afirmação de ausência de todo o ensinamento: vários assuntos são comuns, mas possuem explicações e formulações diferentes.</p><p>Exemplos de desenvolvimentos adicionais no HTML: o batismo e a declaração do Pai (slide 4), a distinção entre provação e tentação com Tiago 1:13 (6), o auxílio concreto da igreja aos necessitados (8 e 10), Massá (12), os diferentes sentidos de “mundo” (19), as fragilidades pessoais (21), e Cristo como Salvador e sumo sacerdote misericordioso (23). Os casos da dinâmica e as perguntas também têm redações diferentes. O estudo salvo contém seu próprio cronograma e referências complementares, que não são inseridos artificialmente nos 30 slides aprovados.</p><p>Não houve fusão ou gravação no estudo salvo. Não é possível obter o roteiro aprovado integralmente a partir do estudo salvo sozinho, porque há textos diferentes. Estas amostras usam explicitamente o HTML aprovado como fonte.</p><p>A prioridade atual de fidelidade literal preserva inclusive “Pergunte à turma”, “Ouça as respostas” e “Explique à turma”, pois fazem parte do original. Os rótulos de cabeçalho (ABERTURA, PONTO, PERGUNTA etc.), o rodapé antigo com data e a numeração fixa foram substituídos pela identidade e numeração atuais; nenhum texto de título, explicação, aplicação, pergunta, referência ou conclusão foi removido. Não foram inventadas citações bíblicas.</p><h2>Conferência slide a slide</h2><table><thead><tr><th>Original</th><th>Título</th><th>Texto e referências</th><th>Slides de saída</th><th>Comparação com o estudo salvo</th></tr></thead><tbody>${rows}</tbody></table><h2>Testes de leitura</h2><p>${cases.length} verificações de layout: três opções × computador 1920×1080 e 1366×768, tablet 1024×768 e 768×1024. Emulação Chromium: formato 16:9, imagens carregadas, conteúdo integral e ausência de cortes e rolagem interna. Não equivale a teste físico em iPad ou projetor.</p><h2>Limites do gerador</h2><p>O gerador deixou de remover automaticamente instruções e repetições dos campos textuais suportados. Pagina sem resumir nem reescrever. Campos estruturais como pastas, permissões e identificadores não fazem parte da apresentação. Conteúdo não existente na fonte não pode ser recuperado automaticamente. A rota de fonte explícita conserva a sequência do roteiro e rejeita estruturas HTML não reconhecidas em vez de omiti-las.</p><p>PR #5 permanece sem publicação. Neon foi consultado somente por SELECT; Worker, CEB oficial, leitura, documentos e arquivos originais da identidade visual não foram alterados. Importações continuam bloqueadas.</p></html>`);
 console.log(JSON.stringify({all_passed:true,source_slides:30,paragraphs:checks.reduce((n,s)=>n+s.paragraphs,0),cases,files},null,2));
}finally{await browser.close();}

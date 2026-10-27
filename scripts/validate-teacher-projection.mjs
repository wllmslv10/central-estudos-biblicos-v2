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
const html=createPresentationHtmlFromSlides(slides,{title:'A Postura do Cristão Diante das Ofertas do Mundo',collection:'ebd'},'ampliado',logos);
assert.equal(JSON.stringify(slides),original);await writeFile(resolve(out,'CEB_ampliado_azul_suave_sem_instrucoes.html'),html);
const normalize=s=>s.replace(/\*\*/gu,'').replace(/\s+/gu,' ').trim();
const browser=await chromium.launch({headless:true,...(process.env.CEB_TEST_CHROMIUM?{executablePath:process.env.CEB_TEST_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})});const layouts=[];
try{for(const [width,height]of [[1920,1080],[1366,768],[1024,768],[768,1024]]){
 const page=await browser.newPage({viewport:{width,height}});await page.route('https://**',r=>r.abort());await page.setContent(html);await page.waitForSelector('html[data-presentation-ready="true"]');
 const actual=await page.locator('.slide').evaluateAll(all=>all.map(s=>({source:Number(s.dataset.sourceSlide),title:s.querySelector('h1').textContent,body:[...s.querySelectorAll('.reading p')].map(p=>p.textContent),note:s.querySelector('aside')?.textContent||''})));
 for(let i=0;i<30;i++){
  const parts=actual.filter(s=>s.source===i+1);assert.ok(parts.length);
  assert.equal(normalize(parts.flatMap(s=>s.body).join(' ')),normalize(expected[i].body.join(' ')),`Unexpected content change: slide ${i+1}`);
  for(const part of parts){assert.equal(normalize(part.title),normalize(expected[i].title));assert.equal(normalize(part.note),normalize(expected[i].note));}
 }
 assert.doesNotMatch(actual.flatMap(s=>s.body).join(' '),/Pergunt[ae] à turma|Explique à turma|Ouça as respostas|Escute as respostas|Vamos dividir a turma|Divida a turma/iu);
 assert.equal(await page.locator('.church-logo-frame img').first().evaluate(s=>getComputedStyle(s).filter),'brightness(1.2) saturate(0.72)');
 for(let i=0;i<actual.length;i++){
  if(i)await page.keyboard.press('ArrowRight');const fit=await page.locator('.slide.active').evaluate(s=>{const r=s.getBoundingClientRect(),b=s.querySelector('.body').getBoundingClientRect();return Math.abs(r.width/r.height-16/9)<.01&&s.scrollHeight<=s.clientHeight+1&&[...s.querySelectorAll('.body h1,.body .reading,.body aside')].every(el=>{const x=el.getBoundingClientRect();return x.top>=b.top-1&&x.bottom<=b.bottom+1&&x.left>=r.left-1&&x.right<=r.right+1;});});assert.ok(fit,`Clipping ${width} slide ${i+1}`);
 }
 await page.keyboard.press('Home');await page.screenshot({path:resolve(out,`ampliado-${width}x${height}.png`)});layouts.push({width,height,slides:actual.length,text_preserved_except_manifest:true,no_clipping:true});await page.close();
}}finally{await browser.close();}
const rows=removals.map(r=>`<tr><td>${r.slide}</td><td>${escapeHtml(r.phrase.replace(/\*\*/g,''))}</td></tr>`).join('');
await writeFile(resolve(out,'CEB_relatorio_instrucoes_removidas.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revisão de instruções — CEB PR #5</title><style>body{max-width:1000px;margin:30px auto;padding:20px;background:#f4f8fc;color:#102d4b;font:18px/1.5 system-ui}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aac2d5;padding:12px;text-align:left}</style><h1>Revisão dos 30 slides ampliados</h1><p>Revisados os 30 slides, os 60 parágrafos, todos os títulos e referências do HTML aprovado. Foram retiradas somente as sete ocorrências listadas abaixo, em seis slides. Nenhum texto didático foi resumido ou reescrito. A sequência permanece igual, com 30 slides.</p><table><tr><th>Slide original</th><th>Frase ou rótulo removido</th></tr>${rows}</table><p>Nos slides 3, 10, 14 e 18, as perguntas seguintes permanecem integrais. No slide 28, toda a explicação bíblica depois do rótulo foi preservada. No slide 24, foi retirada somente a orientação de dividir a turma; a situação proposta, os tempos da dinâmica e as perguntas dirigidas aos participantes foram mantidos. “Conversem”, “Pense” e o convite voluntário a compartilhar exemplos são orientações aos participantes e aplicações da atividade, não comandos ao professor.</p><p>Os outros 24 slides não tiveram nenhuma remoção. No slide 10, foi excluída integralmente a frase “Ouça as respostas e destaque a responsabilidade da igreja de unir verdade, misericórdia e auxílio prático.”, conforme solicitado.</p><p>Comparação automática independente: cada título, referência e texto exibido foi comparado com o original menos estas sete exclusões explícitas. Resultado: nenhuma diferença adicional. Nenhuma instrução ao professor foi identificada na revisão integral restante.</p><p>Azul mais suave aplicado por estilo de exibição à imagem circular original, preservando os arquivos de identidade visual. Fundo claro aprovado mantido. Quatro resoluções Chromium verificadas: 1920×1080, 1366×768, 1024×768 e 768×1024, sem cortes ou rolagem interna. Tablets emulados, sem ensaio físico.</p><p>As alterações são apenas na projeção ampliada. O modelo resumido mantém o comportamento anterior. Nenhum acesso ou alteração no Neon, Worker, CEB oficial ou materiais salvos nesta revisão. O HTML aprovado é uma fonte diferente do estudo salvo, conforme relatório anterior; nenhum conteúdo adicional foi incorporado ao banco. PR #5 sem publicação.</p></html>`);
await writeFile(resolve(out,'validation.json'),JSON.stringify({removals,layouts,all_passed:true},null,2));console.log(JSON.stringify({removals:removals.length,slides:30,layouts,all_passed:true}));

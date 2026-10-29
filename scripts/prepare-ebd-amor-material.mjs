// Offline preparation only: no database or authenticated API writes.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {example} from './prepare-explanatory-preview.mjs';
import {createPresentationHtml,escapeHtml} from '../src/presentation.mjs';

export const lesson={...structuredClone(example),title:'O amor conhecido precisa ser vivido',kind:'estudo',collection:'ebd',ebdType:'licao',ebdCourse:'Lições avulsas',libraryScope:'private'};
export function studyHtml(){
 const rich=s=>escapeHtml(s).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
 const paragraphs=s=>String(s||'').split(/\n\s*\n/u).filter(Boolean).map(p=>`<p>${rich(p)}</p>`).join('');
 const [intro,...context]=lesson.introduction.split(/\n\s*\n/u);
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(lesson.title)} — Estudo completo</title><style>body{max-width:960px;margin:32px auto;padding:24px;font:20px/1.65 'Segoe UI',Arial,sans-serif;color:#102d4b;background:#f4f8fc}header{border-bottom:2px solid #9a6a00}h1,h2{color:#9a6a00;line-height:1.25}h2{margin-top:32px}h3{font-size:1.1em}p{white-space:pre-wrap}small{display:block;color:#294965}.note{padding:16px;background:#e6f0f8}a{color:inherit}@media print{body{background:white;margin:0;max-width:none;font-size:13pt}h2,h3{break-after:avoid}p{orphans:3;widows:3}}</style></head><body><header><small>IGREJA BATISTA NOVA ESPERANÇA · ESCOLA BÍBLICA DOMINICAL</small><h1>${escapeHtml(lesson.title)}</h1><p><strong>Texto-base:</strong> ${escapeHtml(lesson.passage)}<br><strong>Organização:</strong> Cursos e Lições → ${escapeHtml(lesson.ebdCourse)}</p></header><h2>Tema central</h2>${paragraphs(lesson.theme)}<h2>Introdução</h2>${paragraphs(intro)}${context.length?`<h2>Contexto bíblico</h2>${paragraphs(context.join('\n\n'))}`:''}${lesson.points.map((point,i)=>`<section><h2>${i+1}. ${rich(point.title)}</h2>${paragraphs(point.explanation)}<h3>Aplicação prática</h3>${paragraphs(point.application)}</section>`).join('')}<h2>Conclusão</h2>${paragraphs(lesson.conclusion)}<aside class="note"><strong>Nota sobre a fonte:</strong> este estudo conserva o texto estruturado que originou a apresentação, incluindo suas explicações e aplicações. As exposições bíblicas são paráfrases acompanhadas das referências; não se apresentam como transcrição literal de uma tradução. Não foram acrescentados versículos, explicações históricas ou novas partes para completar artificialmente o material. Para a leitura bíblica integral, consulte Lucas 10:25–37 em sua Bíblia.</aside></body></html>`;
}
export async function prepare(directory){
 await mkdir(directory,{recursive:true});
 const logos={ceb:'data:image/png;base64,'+(await readFile('public/ceb-book.png')).toString('base64'),church:'data:image/png;base64,'+(await readFile('identidade-visual/logo-circular-azul-2.png')).toString('base64')};
 const cover={src:'data:image/png;base64,'+(await readFile('src/ebd-presentation-cover.png')).toString('base64'),alt:'Escola Bíblica — Igreja Batista Nova Esperança — William Silva'};
 const study=join(directory,'O-amor-conhecido-precisa-ser-vivido-estudo.html'),slides=join(directory,'O-amor-conhecido-precisa-ser-vivido-apresentacao.html');
 await writeFile(study,studyHtml());await writeFile(slides,createPresentationHtml(lesson,'explicativo',logos,{cover,review:true}));
 return {study,slides};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
 const directory=process.argv[2];if(!directory)throw Error('Provide an offline output directory.');
 console.log(JSON.stringify(await prepare(directory)));
}

// Importacao conservadora de questionarios em PDF com texto selecionavel.
// Nunca publica nem salva automaticamente: a revisao do professor e obrigatoria.
type PdfJs = { getDocument: (args: {data: Uint8Array}) => {promise: Promise<{numPages:number;getPage:(n:number)=>Promise<{getTextContent:()=>Promise<{items:Array<{str?:string;hasEOL?:boolean}>}>}>}>} };
declare global { interface Window { pdfjsLib?: PdfJs & {GlobalWorkerOptions:{workerSrc:string}} } }
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
async function pdfLibrary(): Promise<PdfJs> {
 if (!window.pdfjsLib) {
  await new Promise<void>((resolve,reject)=>{
   const script=document.createElement('script');script.src=CDN+'pdf.min.js';
   script.onload=()=>resolve();script.onerror=()=>reject(new Error('Nao foi possivel carregar o leitor de PDF. Verifique a conexao.'));
   document.head.appendChild(script);
  });
 }
 if(!window.pdfjsLib) throw new Error('Leitor de PDF indisponivel.');
 window.pdfjsLib.GlobalWorkerOptions.workerSrc=CDN+'pdf.worker.min.js';
 return window.pdfjsLib;
}
export async function readQuizPdf(file:File):Promise<string> {
 if(file.type!=='application/pdf' && !/\.pdf$/i.test(file.name)) throw new Error('Selecione um PDF.');
 if(file.size>20*1024*1024) throw new Error('O PDF deve ter ate 20 MB.');
 const lib=await pdfLibrary();const doc=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 if(doc.numPages>40) throw new Error('O PDF tem paginas demais para importacao automatica.');
 const pages:string[]=[];
 for(let i=1;i<=doc.numPages;i++){
  const items=(await (await doc.getPage(i)).getTextContent()).items;
  // O PDF.js pode dividir uma linha em varios itens. Preservar quebras explicitas.
  pages.push(items.map(x=>(x.str||'')+(x.hasEOL?'\n':' ')).join(''));
 }
 return pages.join('\n');
}
type ParsedQuestion={question:string;options:string[];answer:string;explanation:string;reference:string};
export function parseQuizPdfText(text:string):ParsedQuestion[] {
 const normalized=text.replace(/\r/g,'').replace(/\s+/g,' ').trim();
 // Nao interpretar a pagina de gabarito como uma nova pergunta.
 const body=normalized.split(/GABARITO\s*[–—-]\s*PROFESSOR/i)[0];
 const starts=[...body.matchAll(/(?:^|\s)(\d{1,2})\s*[.)-]\s*(?=[A-ZÀ-Ú])/g)];
 const output:ParsedQuestion[]=[];
 for(let i=0;i<starts.length;i++){
  const chunk=body.slice((starts[i].index||0)+starts[i][0].length,i+1<starts.length?starts[i+1].index:undefined).trim();
  // Aceita tanto "A." como "( ) A." e "(X) A.".
  const opts=[...chunk.matchAll(/(?:^|\s)(?:\(\s*[xX✓]?\s*\)\s*)?([A-D])\s*[).:-]\s*/g)];
  if(opts.length!==4 || opts.map(o=>o[1]).join('')!=='ABCD') continue;
  const heading=chunk.slice(0,opts[0].index).trim();
  const ref=heading.match(/\bRefer[eê]ncia\s*:\s*(.*)$/i);
  const question=(ref?heading.slice(0,ref.index):heading).trim();
  const reference=ref?ref[1].trim():'';
  const options=opts.map((o,j)=>chunk.slice((o.index||0)+o[0].length,j+1<opts.length?opts[j+1].index:undefined).trim());
  // Remove rodapes/paginacao apos a ultima alternativa.
  if(i===starts.length-1)options[3]=options[3].replace(/\s*(?:P[aá]gina\s*\d+\s*)+$/gi,'').trim();
  if(!question||options.some(o=>!o))continue;
  output.push({question,options,answer:'',explanation:'',reference});
 }
 if(!output.length)throw new Error('Nao foi possivel identificar quatro alternativas por questao. O PDF pode ser digitalizado ou ter diagramacao diferente.');
 if(output.length>30)throw new Error('Mais de 30 questoes detectadas.');
 if(output.length!==starts.length)throw new Error('Algumas questoes nao foram reconhecidas. Confira o PDF; nada foi importado.');
 return output;
}
export function parseAnswerKeyPdfText(text:string,count:number):string[] {
 const clean=text.replace(/\r/g,'').replace(/\s+/g,' ').trim();
 const section=clean.match(/GABARITO\s*[–—-]\s*PROFESSOR([\s\S]*)/i);
 const source=section?section[1]:clean;
 // Aceita "1: A | 2: B", "1. B", "Questao 1: B", "1 - alternativa B".
 const matches=[...source.matchAll(/(?:^|[\s|;,])(?:quest[aã]o\s*)?(\d{1,2})\s*[.):\-]\s*(?:(?:resposta|alternativa|gabarito)\s*[:\-]?\s*)?([A-D])(?=\s|[.,;|)]|$)/gi)];
 const answers=Array<string>(count).fill('');
 for(const m of matches){const n=Number(m[1]);if(n>=1&&n<=count){const a=m[2].toUpperCase();if(answers[n-1]&&answers[n-1]!==a)throw new Error('Gabarito contraditorio na questao '+n+'.');answers[n-1]=a;}}
 if(answers.some(a=>!a))throw new Error('Nao foi possivel identificar todas as respostas do gabarito. Nenhuma resposta foi aplicada.');
 return answers;
}

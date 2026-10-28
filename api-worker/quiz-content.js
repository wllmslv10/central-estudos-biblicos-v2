// Select assessable Bible teaching before flattening paragraphs. Never mutate
// the saved lesson. Daily-life cases remain valid even inside group activities.
const folded=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const plain=s=>s.replace(/<[^>]*>/g,'').replace(/[*_#`]/g,'').trim();
const METHOD_HEADING=/^(?:dinamica(?:\s+(?:em|de)\s+grupos?|\s+da\s+aula)\b|dinamica\s*(?:[:—–]|$)|(?:cronograma|plano\s+de\s+aula|roteiro\s+da\s+aula|metodologia|recursos\s+didaticos|organizacao\s+(?:da turma|dos grupos)|(?:instrucoes|orientacoes)\s+(?:ao|para\s+o)\s+professor)\b)/;
const CONTENT_HEADING=/^(?:referencias?\s+(?:biblicas?|complementares)|conteudo\s+biblico|ensinamento\s+biblico)\b/;
const DIRECTIVE=/^(?:(?:pergunta\s+(?:inicial|a turma|para discussao))\s*:|divida\s+(?:a\s+)?turma|entregue\s+(?:um\s+)?caso|reserve\s+\d+\s+minutos|cada\s+grupo\s+deve|(?:duracao|tempo|etapas?)\s+(?:da\s+)?aula\s*:|objetivos?\s+(?:pedagogicos?|da aula)\s*:|desafio\s+da\s+semana\s*:)/;
export function assessableText(value){
 if(typeof value!=='string')return '';
 const lines=value.replace(/<\/(?:p|div|h[1-6]|li)>|<br\s*\/?>/gi,'\n').split(/\r?\n/),kept=[];let method=false;
 for(const line of lines){
  const text=plain(line),key=folded(text);if(!text)continue;
  if(METHOD_HEADING.test(key)){method=true;continue;}
  if(/^referencias?\s+sugeridas\s*:/.test(key)){kept.push(text.replace(/^[^:]+:\s*/,''));continue;}
  if(CONTENT_HEADING.test(key)){method=false;const rest=text.replace(/^[^:]+:\s*/, '');if(rest!==text)kept.push(rest);continue;}
  const content=text.match(/^(?:aplica[cç][aã]o|conclus[aã]o|s[ií]ntese)\s*[:—–]\s*(.*)$/i);
  if(content){method=false;if(content[1])kept.push(content[1]);continue;}
  const scenario=text.match(/^grupo\s+\d+\s*(?:[-–—]\s*[^:]+)?\s*:\s*(.+)$/i);
  if(scenario&&!DIRECTIVE.test(folded(scenario[1]))){kept.push(scenario[1]);continue;}
  if(DIRECTIVE.test(key))continue;
  if(method)continue;
  // Keep the verse itself, without making memorization instructions a topic.
  kept.push(text.replace(/^vers[ií]culo\s+para\s+memorizar\s*:\s*/i,''));
 }
 return kept.join('\n');
}
export function selectedLessonText(study){
 const c=study.content||{},parts=[study.title,c.passage,c.theme,c.introduction,...(Array.isArray(c.points)?c.points.flatMap(p=>[p?.title,p?.explanation,p?.application]):[]),c.conclusion];
 for(const section of Array.isArray(c.legacySections)?c.legacySections:[]){const heading=plain(String(section?.title||''));parts.push((heading?heading+'\n':'')+(typeof section?.content==='string'?section.content:''));}
 return parts.map(assessableText).filter(Boolean).join('\n\n');
}
export function questionBlueprint(count){const goals=['knowledge','understanding','application'];return Array.from({length:count},(_,i)=>({number:i+1,focus:goals[i%3]}));}
export function qualityIssue(question){
 const stem=folded(typeof question.question==='string'?question.question:''),body=folded([question.question,...(Array.isArray(question.options)?question.options:[]),question.explanation].filter(x=>typeof x==='string').join(' '));
 const lessonContext=/\b(?:aula|turma|professor|pedagogic\w*|dinamica)\b/;
 if(lessonContext.test(body)&&/\b(?:quantos|quantas|quanto|duracao|tempo previsto|minutos|horas|etapas)\b/.test(stem))return 'teacher_content';
 if(/\bcronograma\b/.test(body)&&lessonContext.test(body)||/\bdinamica\s+(?:em|de)\s+grupos?\b/.test(body)||/\b(?:instrucoes|orientacoes)\s+(?:ao|para o)\s+professor\b/.test(body)||/\b(?:duracao|etapas?|tempo)\s+(?:previst[oa]\s+)?(?:da|de|para a)\s+aula\b/.test(body)||/\b(?:divid\w*|organiz\w*|quant\w*)\b.*\b(?:grupos?|participantes)\b/.test(stem)&&lessonContext.test(body)||/\bprofessor\s+(?:deve|devera|precisa)\s+(?:entregar|dividir|organizar|preparar|distribuir|conduzir|reservar)\b/.test(stem))return 'teacher_content';
 if(/\b(?:qual|quais|quantas)\b.*\breferencias?\s+(?:sugeridas|complementares)\b/.test(stem))return 'trivial_question';
 if(/\b(?:qual|quais)\b.*\bversiculo\b.*\b(?:memorizar|memorizacao)\b/.test(stem)||/\b(?:quantas|quantidade de)\s+questoes\b/.test(stem))return 'trivial_question';
 return null;
}

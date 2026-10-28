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
export function questionBlueprint(count,study){
 const goals=['knowledge','understanding','application'];
 const points=(Array.isArray(study?.content?.points)?study.content.points:[]).map(p=>({teaching:assessableText([p?.title,p?.explanation].filter(x=>typeof x==='string').join('\n')),application:assessableText(p?.application)})).filter(p=>p.teaching.length>=80);
 return Array.from({length:count},(_,i)=>{const focus=goals[i%3],point=points[i%points.length];return {number:i+1,focus,...(point?{teaching:point.teaching,...(focus==='application'&&point.application?{application:point.application}:{})}:{})};});
}
export function qualityIssue(question,previous=[]){
 const stem=folded(typeof question.question==='string'?question.question:''),body=folded([question.question,...(Array.isArray(question.options)?question.options:[]),question.explanation].filter(x=>typeof x==='string').join(' '));
 const correct=folded(Array.isArray(question.options)&&Number.isInteger(question.answer)?String(question.options[question.answer]||''):'');
 const evidence=folded(typeof question.evidence==='string'?question.evidence:'');
 // A confirmed model error inverted the lesson's non-exclusive statement.
 if(/\bnao\b[^.!?]{0,120}\b(?:apenas|somente|so)\b[^.!?]{0,120}\bmas\b/.test(evidence)&&/\b(?:apenas|somente|so)\b/.test(correct)&&!(/\b(?:nao|nem)\b/.test(correct)))return 'meaning_qualifier';
 if(Array.isArray(question.options)&&question.options.some(o=>typeof o==='string'&&/^(?:todas?|nenhuma)\s+(?:as?\s+)?(?:opcoes|alternativas|respostas)\s+(?:anteriores|acima)\b/.test(folded(o))))return 'ambiguous_alternatives';
 // Negotiating to remove dishonesty can also be ethical: do not mark it
 // wrong alongside refusal when the scenario leaves that possibility open.
 if(/\brecus\w*\b/.test(correct)&&Array.isArray(question.options)&&question.options.some((o,i)=>i!==question.answer&&typeof o==='string'&&/\bnegoci\w*\b[^.!?]{0,80}\bpara\b[^.!?]{0,30}\b(?:nao|remover|eliminar|evitar)\b/.test(folded(o))))return 'ambiguous_alternatives';
 if(/\bcaracteristica\b/.test(stem)&&/\b(?:fidelidade|obediencia)\b/.test(stem)&&Array.isArray(question.options)){const meanings=question.options.map(o=>typeof o==='string'?folded(o).replace(/\bincondicional\b/g,'absoluta'):'');if(new Set(meanings).size!==meanings.length)return 'ambiguous_alternatives';}
 const lessonContext=/\b(?:aula|turma|professor|pedagogic\w*|dinamica)\b/;
 if(lessonContext.test(body)&&/\b(?:quantos|quantas|quanto|duracao|tempo previsto|minutos|horas|etapas)\b/.test(stem))return 'teacher_content';
 if(/\bcronograma\b/.test(body)&&lessonContext.test(body)||/\bdinamica\s+(?:em|de)\s+grupos?\b/.test(body)||/\b(?:instrucoes|orientacoes)\s+(?:ao|para o)\s+professor\b/.test(body)||/\b(?:duracao|etapas?|tempo)\s+(?:previst[oa]\s+)?(?:da|de|para a)\s+aula\b/.test(body)||/\b(?:divid\w*|organiz\w*|quant\w*)\b.*\b(?:grupos?|participantes)\b/.test(stem)&&lessonContext.test(body)||/\bprofessor\s+(?:deve|devera|precisa)\s+(?:entregar|dividir|organizar|preparar|distribuir|conduzir|reservar)\b/.test(stem))return 'teacher_content';
 if(/\b(?:qual|quais|quantas)\b.*\breferencias?\s+(?:sugeridas|complementares)\b/.test(stem))return 'trivial_question';
 if(/\b(?:qual|quais)\b.*\bversiculo\b.*\b(?:memorizar|memorizacao)\b/.test(stem)||/\b(?:quantas|quantidade de)\s+questoes\b/.test(stem))return 'trivial_question';
 const tokens=s=>new Set((folded(s).match(/[\p{L}\p{N}]+/gu)||[]));const current=tokens(typeof question.question==='string'?question.question:'');
 for(const q of previous){const other=tokens(q.question||''),union=new Set([...current,...other]);if(union.size>=6&&[...current].filter(w=>other.has(w)).length/union.size>=0.9)return 'question_repetition';}
 return null;
}

export function isConcreteApplication(question){
 const stem=folded(typeof question.question==='string'?question.question:'');
 // A practical decision need not use a fixed scenario opener. In particular,
 // "Como agir/avaliar oportunidades..." is valid; abstract label questions are not.
 if(/\bqual\b.*\baplicacao\s+(?:inferida|pratica)\b/.test(stem))return false;
 return /[?？]/.test(stem);
}

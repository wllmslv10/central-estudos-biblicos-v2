// Read-only delivery projection. Never persist over the teacher's original.
const fold = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const plain = s => s.replace(/<[^>]*>/g, '').replace(/[*_#`]/g, '').trim();
const schedule = /^(?:cronograma|distribuicao\s+(?:do\s+)?tempo|duracao|tempo\s+(?:previsto|da aula)|etapas\s+da\s+aula)\b/;
const teacher = /^(?:(?:instrucoes|orientacoes|notas?)\s+(?:ao|para\s+o|do)\s+professor|metodologia|recursos\s+didaticos|organizacao\s+(?:da\s+turma|dos\s+grupos)|objetivos?(?:\s+(?:pedagogicos?|da\s+aula)|$))\b/;
const activity = /^dinamica(?:\s+(?:em|de)\s+grupos?)?\b/;
const contentHeading = /^(?:conclusao|introducao|ponto\s+\d+|explicacao|aplicacao|sintese|reflexao|referencias?|texto\s+biblico|tema|desafio\s+da\s+semana|versiculo\s+para\s+memorizar)\b/;
const directive = /^(?:divida\s+(?:a\s+)?turma|(?:organize|forme)\s+(?:a\s+turma|os\s+alunos|\d+\s+grupos)|entregue\s+(?:um\s+)?caso|reserve\s+\d+\s+minutos|(?:cada|os?)\s+grupos?\s+deve|(?:o\s+)?professor\s+(?:deve|devera)|(?:peca|solicite|oriente|instrua)\s+(?:aos?\s+alunos|a\s+turma|aos?\s+grupos)|(?:ouca|escute)\s+as\s+respostas)/;
const timeRow = /^(?:[-•]\s*)?\d+\s*[-–—]\s*\d+\s*(?:min(?:utos)?|h(?:oras)?)\b/;
export function studentLessonText(value) {
 if (typeof value !== 'string') return value;
 const lines=value.replace(/<\/(?:p|div|h[1-6]|li)>|<br\s*\/?>/gi,'\n').split(/\r?\n/), kept=[];let hidden=false;
 for (const line of lines) {
  const text=plain(line),key=fold(text);
  if(activity.test(key)){hidden=false;kept.push('Reflexão individual');continue;}
  if(schedule.test(key)||teacher.test(key)){hidden=true;continue;}
  if(contentHeading.test(key)||/^#{1,6}\s+/.test(line)&&!timeRow.test(key))hidden=false;
  if(hidden||timeRow.test(key))continue;
  if(/^cada\s+grupo\s+deve\s+responder\s*:/.test(key)){kept.push('Para refletir:');continue;}
  const scenario=text.match(/^grupo\s+(\d+)\s*(?:[-–—]\s*([^:]+))?\s*:\s*(.+)$/iu);
  if(scenario){kept.push(`Reflexão ${scenario[1]}${scenario[2]?' — '+scenario[2].trim():''}: ${scenario[3]}`);continue;}
  if(directive.test(key))continue;
  if(/^pergunta\s+(?:inicial|a\s+turma|para\s+discussao)\s*:/.test(key)){kept.push(text.replace(/^[^:]+:\s*/,''));continue;}
  kept.push(line.replace(/\(\s*\d+(?:\s*[-–—]\s*\d+)?\s*(?:minutos?|min|horas?)\s*\)/giu,''));
 }
 return kept.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
export function studentStudy(study) {
 const original=study.content;if(!original||typeof original!=='object'||Array.isArray(original))return study;
 const content={...original};
 for(const key of ['title','passage','theme','introduction','conclusion'])if(typeof content[key]==='string')content[key]=studentLessonText(content[key]);
 if(Array.isArray(content.points))content.points=content.points.flatMap(point=>{
  if(!point||typeof point!=='object')return [point];
  const heading=fold(plain(String(point.title||'')));if(schedule.test(heading)||teacher.test(heading))return [];
  return [{...point,...Object.fromEntries(['title','explanation','application'].filter(k=>typeof point[k]==='string').map(k=>[k,studentLessonText(point[k])]))}];
 });
 if(Array.isArray(content.legacySections))content.legacySections=content.legacySections.flatMap(section=>{
  const heading=fold(plain(String(section?.title||'')));if(schedule.test(heading)||teacher.test(heading))return [];
  return [{...section,title:activity.test(heading)?'Reflexão individual':studentLessonText(section.title),content:studentLessonText(section.content)}];
 });
 return {...study,content};
}

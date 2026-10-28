// Internal editorial metadata is never returned to students or persisted in quizzes.
export const REVIEW_INSTRUCTIONS="Revise um questionário bíblico completo. A lição é a única fonte factual; o rascunho pode conter erros. Devolva o conjunto final corrigido, não um parecer. Antes de escrever, compare os objetivos de todas as perguntas: mesma resposta ética em empregos/dinheiro/amigos não é diversidade; paráfrases da mesma resposta bíblica também não. Substitua as repetições por outros ensinamentos realmente presentes. Preserve questões distintas que usam o mesmo versículo para examinar habilidades diferentes, sem exigir temas artificiais quando o texto for limitado. Nas aplicações, evite repetir a mesma recusa de uma proposta desonesta; examine também outros princípios aplicáveis realmente ensinados na lição. Cada pergunta precisa de quatro opções independentes, com uma única resposta defensável e três erros plausíveis e claros. Uma alternativa que recomenda outra solução honesta não pode ser marcada errada só por não ser a preferida. Se necessário, torne o enunciado mais preciso. Não apresente perguntas sobre cronograma, professor ou dinâmica. Mantenha o equilíbrio aproximado entre conhecimento, compreensão e aplicação, podendo reordenar. Em objective, descreva a habilidade específica examinada, sem apenas parafrasear o enunciado. Em optionChecks explique brevemente por que cada opção está correta ou incorreta com base na lição: exatamente uma correct=true, no índice answer. Em explanation explique o ensino, sem só listar referência. evidence deve ser trecho contíguo exato de 12–400 caracteres da lição; use referenceIndex da lista ou null. Não invente referências nem citas. Preserve ressalvas e negações do texto bíblico. Retorne somente JSON conforme o esquema.";
export function reviewSchema(questionSchema,count){
 const item={...questionSchema,properties:{...questionSchema.properties,objective:{type:'string'},optionChecks:{type:'array',minItems:4,maxItems:4,items:{type:'object',additionalProperties:false,properties:{correct:{type:'boolean'},reason:{type:'string'}},required:['correct','reason']}}},required:[...questionSchema.required,'objective','optionChecks']};
 return {type:'object',additionalProperties:false,properties:{questions:{type:'array',minItems:count,maxItems:count,items:item}},required:['questions']};
}
const key=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function reviewIssue(questions){
 const objectives=new Set();
 for(const q of questions){
  if(!q||typeof q.objective!=='string'||!q.objective.trim()||!Array.isArray(q.optionChecks)||q.optionChecks.length!==4)return 'review_format';
  const objective=key(q.objective);if(!objective)return 'review_format';
  if(objectives.has(objective))return 'question_repetition';objectives.add(objective);
  if(q.optionChecks.some(c=>!c||typeof c.correct!=='boolean'||typeof c.reason!=='string'||!c.reason.trim()))return 'review_format';
  const supported=q.optionChecks.flatMap((c,i)=>c.correct?[i]:[]);
  if(supported.length!==1||supported[0]!==q.answer)return 'ambiguous_alternatives';
 }
 return null;
}
export function combinedUsage(...reports){
 const sum=key=>reports.every(u=>Number.isSafeInteger(u?.[key])&&u[key]>=0)?reports.reduce((n,u)=>n+u[key],0):null;
 return {prompt_tokens:sum('prompt_tokens'),completion_tokens:sum('completion_tokens')};
}

import { aiEnabled, generateForStudy } from './quiz-ai.js';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class QuizError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const fail = (message, status) => { throw new QuizError(message, status); };
const text = (v, max, required = true) => {
 if (typeof v !== 'string' || v.length > max || (required && !v.trim())) fail('Texto inválido ou muito longo.');
 return v.trim();
};
export function validateQuiz(body) {
 if (!body || !['single','multiple','authorized'].includes(body.policy) || !['manual','automatic','mixed'].includes(body.mode) || typeof body.showAnswers !== 'boolean' || typeof body.reviewed !== 'boolean') fail('Configurações inválidas.');
 if (!Array.isArray(body.questions) || body.questions.length < 1 || body.questions.length > 30) fail('Use entre 1 e 30 questões.');
 const ids = new Set();
 const questions = body.questions.map(q => {
  if (!q || !UUID.test(q.id) || ids.has(q.id)) fail('Identificadores de questões inválidos.'); ids.add(q.id);
  if (!Array.isArray(q.options) || q.options.length !== 4 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) fail('Cada questão precisa de quatro alternativas e uma resposta correta.');
  const options = q.options.map(o => text(o, 600));
  if (new Set(options.map(o => o.toLocaleLowerCase('pt-BR'))).size !== 4) fail('As quatro alternativas devem ser diferentes.');
  if (typeof q.points !== 'number' || !Number.isFinite(q.points) || q.points <= 0 || q.points > 100 || Math.abs(Math.round(q.points * 100) - q.points * 100) > 1e-8) fail('Pontuação inválida (0,01 a 100).');
  return {id:q.id, question:text(q.question,1500), options, answer:q.answer, points:q.points, explanation:text(q.explanation ?? '',2000,false), reference:text(q.reference ?? '',200,false), ...(q.evidence?{evidence:text(q.evidence,400)}:{})};
 });
 return {policy:body.policy,mode:body.mode,showAnswers:body.showAnswers,questions};
}
export function validateAnswers(answers, questions, complete = false) {
 if (!Array.isArray(answers) || answers.length !== questions.length || answers.some(a => a !== null && (!Number.isInteger(a) || a < 0 || a > 3)) || (complete && answers.some(a => a === null))) fail('Selecione uma alternativa por questão antes de entregar.');
 return answers;
}
export function grade(questions, answers) {
 validateAnswers(answers,questions,true);
 const correct = questions.filter((q,i) => q.answer === answers[i]).length;
 const maximum = Math.round(questions.reduce((s,q) => s + q.points,0)*100)/100;
 const score = Math.round(questions.reduce((s,q,i) => s + (q.answer === answers[i] ? q.points : 0),0)*100)/100;
 return {correct,score,maximum,percent:Math.round(score / maximum * 10000)/100};
}
export function studentDefinition(definition, reveal = false) {
 return {policy:definition.policy,showAnswers:definition.showAnswers,questions:definition.questions.map(q => ({id:q.id,question:q.question,options:q.options,points:q.points,reference:q.reference,...(reveal?{answer:q.answer,explanation:q.explanation}:{})}))};
}
export function canStudy(study, user) {
 const s = study.content?.sharing;
 return study.deleted_at == null && study.visibility === 'shared' && study.status === 'published' && s?.enabled === true && s?.quizEnabled === true && (s.audience === 'all' || (s.audience === 'selected' && Array.isArray(s.userIds) && s.userIds.includes(user.id)));
}
export async function quizRoute(request, env, url, client, user, json, origin) {
 const match = url.pathname.match(/^\/studies\/([^/]+)\/quiz(?:\/(start|attempt|results|grant|generate))?$/);
 if (!match || !UUID.test(match[1])) return json({error:'Rota inválida.'},404,origin);
 const [,studyId,action = 'definition'] = match;
 const admin = user.app_role === 'admin';
 if(action==='generate') return await generateForStudy(request,url,client,user,env,json,origin,studyId,validateQuiz);
 const body = async () => { const raw = await request.text(); if(new TextEncoder().encode(raw).length > 150000) fail('Questionário muito grande.',413);try{return JSON.parse(raw);}catch{fail('JSON inválido.');} };
 const attemptView = (a, def, show) => ({id:a.id,version_id:a.version_id,answers:a.answers,draft_revision:a.draft_revision,started_at:a.started_at,submitted_at:a.submitted_at,correct:a.correct,score:a.score==null?null:Number(a.score),maximum:a.maximum==null?null:Number(a.maximum),percent:a.percent==null?null:Number(a.percent),definition:studentDefinition(def,!!a.submitted_at && show)});
 await client.query('BEGIN');
 try {
  // Shared lock revalidates access and prevents a concurrent revocation during submission.
  const study = (await client.query('SELECT id, owner_user_id, content, visibility, status, deleted_at FROM public.ceb_studies WHERE id=$1 FOR SHARE',[studyId])).rows[0];
  if (!study || study.deleted_at || (admin ? study.owner_user_id !== user.id && ['private','particular'].includes(study.content?.libraryScope) : !canStudy(study,user))) fail('Questionário indisponível ou acesso revogado.',404);
  let quiz = (await client.query('SELECT * FROM public.ceb_quizzes WHERE study_id=$1 FOR UPDATE',[studyId])).rows[0];
  const teacherOnly = () => { if(!admin) fail('Ação restrita ao professor autorizado.',403); };
  let result;
  if (action === 'definition' && request.method === 'PUT') {
   teacherOnly(); const b = await body(); const def = validateQuiz(b);
   if (!Number.isInteger(b.revision) || b.revision !== (quiz?.revision ?? 0)) fail('O questionário foi alterado em outra janela. Reabra antes de salvar.',409);
   if (!quiz) quiz = (await client.query('INSERT INTO public.ceb_quizzes(study_id) VALUES($1) ON CONFLICT(study_id) DO NOTHING RETURNING *',[studyId])).rows[0];
   if (!quiz) fail('Outra janela criou o questionário. Reabra antes de salvar.',409);
   quiz = (await client.query('UPDATE public.ceb_quizzes SET definition=$1::jsonb, reviewed=$2, revision=revision+1, updated_at=now() WHERE id=$3 RETURNING *',[JSON.stringify(def),b.reviewed,quiz.id])).rows[0];
   await client.query('INSERT INTO public.ceb_quiz_versions(quiz_id,revision,definition) VALUES($1,$2,$3::jsonb)',[quiz.id,quiz.revision,JSON.stringify(def)]);
   result = {quiz,aiAvailable:aiEnabled(env)};
  } else if (action === 'definition' && request.method === 'GET') {
   if(admin) result={quiz:quiz ?? null,aiAvailable:aiEnabled(env)};
   else {
    if(!quiz?.reviewed) fail('Questionário ainda não revisado pelo professor.',404);
    const attempts = (await client.query('SELECT a.*,v.definition AS snapshot FROM public.ceb_quiz_attempts a JOIN public.ceb_quiz_versions v ON v.id=a.version_id WHERE a.quiz_id=$1 AND a.user_id=$2 ORDER BY a.started_at',[quiz.id,user.id])).rows;
    const availableGrant = (await client.query('SELECT id FROM public.ceb_quiz_grants WHERE quiz_id=$1 AND user_id=$2 AND attempt_id IS NULL',[quiz.id,user.id])).rows.length>0;
    result={quiz:{id:quiz.id,revision:quiz.revision,definition:studentDefinition(quiz.definition)},attempts:attempts.map(a=>attemptView(a,a.snapshot,quiz.definition.showAnswers)),canStart:attempts.some(a=>!a.submitted_at)||!attempts.length||quiz.definition.policy==='multiple'||(quiz.definition.policy==='authorized'&&availableGrant),bestPercent:Math.max(0,...attempts.filter(a=>a.submitted_at).map(a=>Number(a.percent)))};
   }
  } else if (action === 'results' && request.method === 'GET') {
   teacherOnly(); if(!quiz) fail('Salve o questionário primeiro.',404);
   const users = (await client.query("SELECT id,display_name,username,is_active FROM public.ceb_users WHERE app_role='user' ORDER BY display_name")).rows;
   const attempts = (await client.query('SELECT a.*,v.definition AS snapshot FROM public.ceb_quiz_attempts a JOIN public.ceb_quiz_versions v ON v.id=a.version_id WHERE a.quiz_id=$1 ORDER BY a.started_at',[quiz.id])).rows;
   const students=users.filter(u=>canStudy(study,u)||attempts.some(a=>a.user_id===u.id)).map(u=>{
    const history=attempts.filter(a=>a.user_id===u.id).map(a=>attemptView(a,a.snapshot,true));
    const completed=history.filter(a=>a.submitted_at), best=completed.reduce((best,a)=>!best||Number(a.percent)>Number(best.percent)?a:best,null);
    return {id:u.id,name:u.display_name||u.username,authorized:u.is_active&&canStudy(study,u),status:history.some(a=>!a.submitted_at)?'iniciado':completed.length?'concluído':'pendente',attemptCount:history.length,best,history};
   });
   const authorized=students.filter(s=>s.authorized),answered=authorized.filter(s=>s.best);
   result={students,summary:{authorized:authorized.length,answered:answered.length,pending:authorized.length-answered.length,average:answered.length?Math.round(answered.reduce((s,a)=>s+Number(a.best.percent),0)/answered.length*100)/100:0}};
  } else if (action === 'grant' && request.method === 'POST') {
   teacherOnly(); const b=await body(); if(!quiz||quiz.definition.policy!=='authorized'||!UUID.test(b.userId)) fail('Use o modo de nova tentativa mediante autorização.');
   const u=(await client.query("SELECT id FROM public.ceb_users WHERE id=$1 AND app_role='user' AND is_active=TRUE",[b.userId])).rows[0];
   if(!u||!canStudy(study,u)) fail('Aluno sem acesso ao questionário.',403);
   const done=await client.query('SELECT id FROM public.ceb_quiz_attempts WHERE quiz_id=$1 AND user_id=$2 AND submitted_at IS NOT NULL',[quiz.id,u.id]);
   if(!done.rows.length) fail('O aluno ainda tem a primeira tentativa.');
   await client.query('INSERT INTO public.ceb_quiz_grants(quiz_id,user_id,granted_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[quiz.id,u.id,user.id]);result={ok:true};
  } else if (action === 'start' && request.method === 'POST') {
   if(admin) fail('Use uma conta de aluno para responder.',403);
   if(!quiz?.reviewed) fail('Questionário ainda não revisado.',404);
   let a=(await client.query('SELECT a.*,v.definition AS snapshot FROM public.ceb_quiz_attempts a JOIN public.ceb_quiz_versions v ON v.id=a.version_id WHERE a.quiz_id=$1 AND a.user_id=$2 AND a.submitted_at IS NULL',[quiz.id,user.id])).rows[0];
   if(!a) {
    const submitted=(await client.query('SELECT id FROM public.ceb_quiz_attempts WHERE quiz_id=$1 AND user_id=$2 AND submitted_at IS NOT NULL',[quiz.id,user.id])).rows.length;
    let grant;
    if(submitted&&quiz.definition.policy!=='multiple') {
     if(quiz.definition.policy==='authorized') grant=(await client.query('SELECT id FROM public.ceb_quiz_grants WHERE quiz_id=$1 AND user_id=$2 AND attempt_id IS NULL FOR UPDATE',[quiz.id,user.id])).rows[0];
     if(!grant) fail('Nova tentativa não autorizada.',409);
    }
    const v=(await client.query('SELECT id,definition FROM public.ceb_quiz_versions WHERE quiz_id=$1 AND revision=$2',[quiz.id,quiz.revision])).rows[0];
    a=(await client.query('INSERT INTO public.ceb_quiz_attempts(quiz_id,version_id,user_id,answers) VALUES($1,$2,$3,$4::jsonb) RETURNING *',[quiz.id,v.id,user.id,JSON.stringify(v.definition.questions.map(()=>null))])).rows[0];a.snapshot=v.definition;
    if(grant) await client.query('UPDATE public.ceb_quiz_grants SET attempt_id=$1 WHERE id=$2',[a.id,grant.id]);
   }
   result={attempt:attemptView(a,a.snapshot,false)};
  } else if (action === 'attempt' && request.method === 'POST') {
   if(admin) fail('Ação de aluno.',403); if(!quiz?.reviewed) fail('Questionário indisponível.',404);
   const b=await body();if(!UUID.test(b.id)||typeof b.submit!=='boolean') fail('Tentativa inválida.');
   const a=(await client.query('SELECT a.*,v.definition AS snapshot FROM public.ceb_quiz_attempts a JOIN public.ceb_quiz_versions v ON v.id=a.version_id WHERE a.id=$1 AND a.quiz_id=$2 AND a.user_id=$3 FOR UPDATE OF a',[b.id,quiz.id,user.id])).rows[0];
   if(!a) fail('Tentativa não encontrada.',404);
   if(a.submitted_at) {if(!b.submit) fail('Tentativa já entregue.',409);result={attempt:attemptView(a,a.snapshot,quiz.definition.showAnswers)};}
   else {
    if(b.draftRevision!==a.draft_revision) fail('Respostas alteradas em outra janela. Reabra para recuperar o rascunho.',409);
    const answers=validateAnswers(b.answers,a.snapshot.questions,b.submit);
    let updated;
    if(b.submit) {const g=grade(a.snapshot.questions,answers);updated=(await client.query('UPDATE public.ceb_quiz_attempts SET answers=$1::jsonb,submitted_at=now(),updated_at=now(),draft_revision=draft_revision+1,correct=$2,score=$3,maximum=$4,percent=$5 WHERE id=$6 RETURNING *',[JSON.stringify(answers),g.correct,g.score,g.maximum,g.percent,a.id])).rows[0];}
    else updated=(await client.query('UPDATE public.ceb_quiz_attempts SET answers=$1::jsonb,updated_at=now(),draft_revision=draft_revision+1 WHERE id=$2 RETURNING *',[JSON.stringify(answers),a.id])).rows[0];
    result={attempt:attemptView(updated,a.snapshot,quiz.definition.showAnswers)};
   }
  } else fail('Método não permitido.',405);
  await client.query('COMMIT');return json(result,200,origin);
 } catch(error) {await client.query('ROLLBACK');if(error instanceof QuizError)return json({error:error.message},error.status,origin);throw error;}
}

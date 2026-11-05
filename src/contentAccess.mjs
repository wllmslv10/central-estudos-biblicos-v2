// A delivery projection, never a mutation of stored material. New content keeps
// teacher notes in a separate field; student delivery uses an explicit allowlist.
export function audienceContent(study, audience = 'student') {
  const teacher=audience==='teacher';
  const result={title:study.title||'',passage:study.passage||'',theme:study.theme||'',collection:study.collection,
    ...(study.contentVersion===1?{contentVersion:1}:{}),studentReviewed:study.studentReviewed,
    introduction:study.introduction||'',conclusion:study.conclusion||'',
    points:(study.points||[]).filter(p=>teacher||p.audience!=='teacher').map(p=>({title:p.title,explanation:p.explanation,application:p.application})),
    legacySections:(study.legacySections||[]).filter(s=>teacher||s.audience!=='teacher').map(s=>({title:s.title,content:s.content}))};
  if(study.contentVersion===1 && Array.isArray(study.blocks)) {
    result.introduction='';result.conclusion='';result.points=[];
    result.legacySections=study.blocks.filter(b=>b&&(b.audience==='student'||teacher)).map(b=>({title:String(b.title||''),content:String(b.text||'')}));
  }
  if(teacher && study.teacherNotes)result.legacySections.push({title:'Orientações reservadas ao professor',content:study.teacherNotes});
  return result;
}

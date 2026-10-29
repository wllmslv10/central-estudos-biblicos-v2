// Local preparation only. Recovery of the official API with terminal-trash guards.
// No deployment, migrations, credential access or production requests.
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,readFile,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
const base='796d89fbd79bcba5cb856b17a528c67b98e5d428';
const destination=await mkdtemp(join(tmpdir(),'ceb-library-safe-recovery-'));
const names=execFileSync('git',['ls-tree','--name-only',base+':api-worker'],{encoding:'utf8'}).trim().split('\n');
for(const name of names.filter(n=>/\.(js|json|toml)$/.test(n)))await writeFile(join(destination,name),execFileSync('git',['show',base+':api-worker/'+name]));
let worker=await readFile('api-worker/worker.js','utf8');
const importLine="import { trashRoute } from './trash.js';\n",hook="      if (url.pathname === '/library/trash') return await trashRoute(request,env,url,client,user,json,origin);\n";
if(!worker.startsWith(importLine)||worker.split(hook).length!==2)throw Error('Unexpected trash integration');
worker=worker.replace(importLine,'').replace(hook,'');
await writeFile(join(destination,'worker.js'),worker);
await writeFile(join(destination,'quizzes.js'),await readFile('api-worker/quizzes.js'));
let materials=execFileSync('git',['show',base+':api-worker/materials.js'],{encoding:'utf8'});
materials=materials.replace("    const trash = url.searchParams.get('trash') === '1';","    const trash = url.searchParams.get('trash') === '1';\n    if (trash && !isAdmin) return reply({error:'Lixeira restrita ao administrador.'},403);")
 .replace("m.deleted_at IS ${trash ? 'NOT ' : ''}NULL ORDER BY","m.deleted_at IS ${trash ? 'NOT ' : ''}NULL AND m.deleted_at IS DISTINCT FROM 'infinity'::timestamptz ORDER BY")
 .replace('SELECT * FROM public.ceb_materials WHERE id=$1 FOR UPDATE','SELECT *,deleted_at::text AS trash_stamp FROM public.ceb_materials WHERE id=$1 FOR UPDATE')
 .replace("    if (action === 'download'","    if (['infinity','-infinity'].includes(row.trash_stamp)) { await client.query('ROLLBACK'); return reply({error:'Material excluído definitivamente ou em exclusão. Restauração bloqueada.'},409); }\n    if (action === 'download'");
await writeFile(join(destination,'materials.js'),materials);
await symlink(resolve('api-worker/node_modules'),join(destination,'node_modules'),'dir');
console.log(JSON.stringify({destination,base,uploadsEnabled:false,unifiedTrashRoute:false,deploy:false}));

// Local staging only. Pins official Worker code and applies only the probe overlay.
// No cloud environment, deployment, database or HTTP operations.
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,copyFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const base='796d89fbd79bcba5cb856b17a528c67b98e5d428';
const changes=execFileSync('git',['diff','--name-only',base,'origin/main'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
if(changes.some(p=>p!=='.github/workflows/deploy.yml')) throw new Error('Official application changed; review before staging.');
const destination=await mkdtemp(join(tmpdir(),'ceb-restricted-worker-'));
const names=execFileSync('git',['ls-tree','--name-only',base+':api-worker'],{encoding:'utf8'}).trim().split('\n');
for(const name of names.filter(n=>/\.(js|json|toml)$/.test(n))) await writeFile(join(destination,name),execFileSync('git',['show',base+':api-worker/'+name]));
const original=execFileSync('git',['show',base+':api-worker/worker.js'],{encoding:'utf8'});
const anchor='      return await materialRoute(request, env, url, client, user, json, origin);';
if(original.split(anchor).length!==2) throw new Error('Unexpected official Worker hook.');
await writeFile(join(destination,'worker.js'),"import { uploadProbe } from './upload-probe.js';\n"+original.replace(anchor,"      if (url.pathname.startsWith('/library/_upload-probe')) return await uploadProbe(request, env, url, user, json, origin);\n"+anchor));
for(const name of ['upload-probe.js','upload-probe-manifest.json','neon-storage.js']) await copyFile('api-worker/'+name,join(destination,name));
console.log(JSON.stringify({destination,officialBase:base,deploy:false,probeEnabled:false}));

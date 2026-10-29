// Local staging only: official interface plus the temporary administration panel.
import {execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,copyFile,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
const base='796d89fbd79bcba5cb856b17a528c67b98e5d428';
if(execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim()!==base) throw new Error('Official main changed; review before staging.');
const destination=await mkdtemp(join(tmpdir(),'ceb-restricted-interface-'));
const paths=execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n').filter(p=>/^(src\/|public\/|identidade-visual\/|index.html$|package.json$|tsconfig.*\.json$|vite.config.*)/.test(p));
for(const path of paths){await mkdir(dirname(join(destination,path)),{recursive:true});await writeFile(join(destination,path),execFileSync('git',['show',base+':'+path],{maxBuffer:20*1024*1024}));}
const original=execFileSync('git',['show',base+':src/CebAdmin.tsx'],{encoding:'utf8'});
const anchor='    <h1>⚙️ Administração do Sistema</h1>';
if(original.split(anchor).length!==2) throw new Error('Unexpected administration hook.');
await writeFile(join(destination,'src/CebAdmin.tsx'),"import UploadProbePanel from './UploadProbePanel'\n"+original.replace(anchor,anchor+'\n    <UploadProbePanel token={token} />'));
for(const file of ['UploadProbePanel.tsx','uploadProbeRunner.ts','uploadProbeFixtures.json']) await copyFile('src/'+file,join(destination,'src',file));
await symlink(resolve('node_modules'),join(destination,'node_modules'),'dir');
console.log(JSON.stringify({destination,officialBase:base,deploy:false,newImportInterface:false}));

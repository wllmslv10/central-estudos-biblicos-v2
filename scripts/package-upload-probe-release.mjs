// Local packaging/verification only. No deploy, cloud APIs, SQL or credential access.
import {readFile,writeFile,mkdir,cp,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
const BASE='796d89fbd79bcba5cb856b17a528c67b98e5d428',SOURCE='2b6cda1e0735e5295a1786f8254a763be9ccc30c';
const archive='ops/recovery/pages-official-796d89f.zip',archiveHash='9151673de1e2a9dea3aa0edc679f909a7467b4971e9279a4df2f24cea9f347a6';
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const root=resolve('.ceb-upload-probe-packages'),mode=process.argv[2]||'prepare';
async function inventory(directory,prefix='') {const files={};for(const entry of await readdir(join(directory,prefix),{withFileTypes:true})){const name=prefix+entry.name;if(entry.isSymbolicLink())throw Error('Symlinks denied');if(entry.isDirectory())Object.assign(files,await inventory(directory,name+'/'));else files[name]=sha(await readFile(join(directory,name)));}return files;}
if(mode==='verify') {
 const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
 if(process.env.EXPECTED_PACKAGING_SHA && manifest.packagingCommit!==process.env.EXPECTED_PACKAGING_SHA) throw Error('Packaging commit mismatch');
 if(manifest.officialSha!==BASE||manifest.probeSource!==SOURCE)throw Error('Unexpected release baseline');
 for(const target of ['official','restricted']) { const actual=await inventory(join(root,target));if(JSON.stringify(actual)!==JSON.stringify(manifest.files[target]))throw Error('Package content mismatch'); }
 console.log('Verified exact official recovery package and restricted interface hashes. No deployment.');
} else if(mode==='prepare') {
 git('merge-base','--is-ancestor',SOURCE,'HEAD');
 const mainChanges=git('diff','--name-only',BASE,'origin/main').split('\n').filter(Boolean);
 if(mainChanges.some(p=>p!=='.github/workflows/deploy.yml'))throw Error('Official application changed; stop before packaging');
 const protectedPaths=['src/UploadProbePanel.tsx','src/uploadProbeRunner.ts','src/uploadProbeFixtures.json','api-worker/upload-probe.js','api-worker/upload-probe-manifest.json','api-worker/neon-storage.js'];
 if(git('diff','--name-only',SOURCE,'HEAD','--',...protectedPaths))throw Error('Reviewed probe source changed');
 if(sha(await readFile(archive))!==archiveHash)throw Error('Official recovery ZIP hash mismatch');
 await mkdir(root); // Refuse to overwrite an existing package.
 execFileSync('python3',['-c',`import zipfile,tarfile,io,pathlib,sys
z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;assert z.namelist()==['artifact.tar']
t=tarfile.open(fileobj=io.BytesIO(z.read('artifact.tar')))
assert sum(m.size for m in t.getmembers())<50000000
for m in t.getmembers():
 p=pathlib.PurePosixPath(m.name);assert not p.is_absolute() and '..' not in p.parts and (m.isfile() or m.isdir())
t.extractall(sys.argv[2],filter='data')`,archive,join(root,'official')]);
 const expectedIndex=await readFile(join(root,'official/index.html'),'utf8');
 if(!expectedIndex.includes('index-BIwpaLdR.js'))throw Error('Unexpected official index');
 const staging=JSON.parse(execFileSync('node',['scripts/prepare-restricted-upload-interface.mjs'],{encoding:'utf8'})).destination;
 // This is packaging only, not a repetition of previously approved feature tests.
 execFileSync('npm',['run','build'],{cwd:staging,stdio:'inherit'});
 await cp(join(root,'official'),join(root,'restricted'),{recursive:true});
 await cp(join(staging,'dist/index.html'),join(root,'restricted/index.html'));
 await cp(join(staging,'dist/assets'),join(root,'restricted/assets'),{recursive:true});
 // Everything outside the new entrypoint and JS/CSS assets must remain byte-identical.
 const official=await inventory(join(root,'official')),restricted=await inventory(join(root,'restricted'));
 for(const [path,hash] of Object.entries(official)) if(path!=='index.html' && restricted[path]!==hash)throw Error('Official file changed: '+path);
 for(const path of Object.keys(restricted))if(!(path in official)&&!path.startsWith('assets/'))throw Error('Unexpected new public file');
 const manifest={officialSha:BASE,probeSource:SOURCE,packagingCommit:git('rev-parse','HEAD'),officialArtifactId:12847875501,officialArchiveSha256:archiveHash,workerRollback:'6837e3db-ac5f-40ba-8b20-d09e9806aaca',files:{official,restricted}};
 await writeFile(join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('Prepared restricted interface and exact official recovery package. No deployment.');
} else throw Error('Only prepare or verify allowed');

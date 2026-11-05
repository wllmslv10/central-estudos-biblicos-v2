// Read-only UI verification against the existing isolated laboratory.
// Credential input is environment/file only; never log passwords or session tokens.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='https://ceb-biblioteca-api-validacao.wllmslv10.workers.dev';
const password=process.env.CEB_LAB_PASSWORD||JSON.parse(await readFile(process.env.CEB_LAB_CREDENTIALS_FILE,'utf8')).password;
const username=process.env.CEB_LAB_USER||'williamlab',out='visual-validation/live';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CEB_TEST_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
const results=[];
try{for(const [width,height] of [[1366,768],[768,1024],[390,844]]){
 const page=await browser.newPage({viewport:{width,height},ignoreHTTPSErrors:process.env.CEB_TEST_PROXY_CA==='true'}),errors=[],forbidden=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const request=route.request(),url=new URL(request.url());if(url.hostname==='ceb-biblioteca-api.wllmslv10.workers.dev'){forbidden.push(request.url());return route.abort()}if(url.origin===base&&!['GET','HEAD','OPTIONS'].includes(request.method())&&!['/auth/login','/auth/logout'].includes(url.pathname)){writes.push(url.pathname);return route.abort()}return route.continue()});
 await page.goto(base+'/central-estudos-biblicos-v2/visual/');await page.getByLabel('Usuário',{exact:true}).fill(username);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.locator('.modern-workspace').waitFor();await page.getByRole('heading',{name:'Materiais recentes',exact:true}).waitFor();await page.locator('.dashboard-recent [role="status"]').waitFor({state:'detached',timeout:60000});await page.screenshot({path:`${out}/inicio-${width}.png`});
 if(width<=1024){await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await page.screenshot({path:`${out}/menu-${width}.png`});await page.keyboard.press('Escape')}
 const nav=async(name)=>{if(width<=1024)await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await page.getByRole('navigation',{name:'Navegação principal',exact:true}).getByRole('button',{name,exact:true}).click()};
 await nav('Biblioteca');await page.getByLabel('Buscar materiais',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`${out}/biblioteca-${width}.png`});
 await nav('⚙️ Administração do Sistema');await page.getByRole('heading',{name:'⚙️ Administração do Sistema'}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`${out}/administracao-${width}.png`});
 await page.getByRole('button',{name:'Sair',exact:true}).click();await page.getByLabel('Usuário',{exact:true}).waitFor();assert.deepEqual(errors,[]);assert.deepEqual(forbidden,[]);assert.deepEqual(writes,[]);results.push({width,height,authenticated:true,library:true,administration:true,noHorizontalOverflow:true,noDataWrites:true,noProductionCalls:true});await page.close();
}
 // The former interface remains accessible and is still the validated layout.
 const old=await browser.newPage({ignoreHTTPSErrors:process.env.CEB_TEST_PROXY_CA==='true'});await old.goto(base+'/central-estudos-biblicos-v2/');await old.getByLabel('Usuário',{exact:true}).fill(username);await old.getByLabel('Senha',{exact:true}).fill(password);await old.getByRole('button',{name:'Entrar',exact:true}).click();await old.locator('.workspace-nav').waitFor();assert.equal(await old.locator('.workspace-sidebar').count(),0);await old.getByRole('button',{name:'Sair',exact:true}).click();await old.close();
 await writeFile(out+'/results.json',JSON.stringify({checkedAt:new Date().toISOString(),preview:base+'/central-estudos-biblicos-v2/visual/',validatedInterfacePreserved:true,results},null,2));console.log(JSON.stringify({validatedInterfacePreserved:true,results},null,2));
}finally{await browser.close()}

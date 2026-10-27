import test from 'node:test';
import assert from 'node:assert/strict';
import { githubTestIdentity, TEST_AUDIENCE, validationFixtures } from '../validation-fixtures.js';
import { materialRoute } from '../materials.js';
const pair = await crypto.subtle.generateKey({ name:'RSASSA-PKCS1-v1_5', modulusLength:2048, publicExponent:new Uint8Array([1,0,1]), hash:'SHA-256' }, true, ['sign','verify']);
const jwk = { ...await crypto.subtle.exportKey('jwk', pair.publicKey), kid:'test-key', alg:'RS256', use:'sig' };
const claims = { iss:'https://token.actions.githubusercontent.com', aud:TEST_AUDIENCE,
  repository:'wllmslv10/central-estudos-biblicos-v2',repository_id:'1431661344',ref:'refs/heads/work/biblioteca-nuvem-20261026',
  workflow_ref:'wllmslv10/central-estudos-biblicos-v2/.github/workflows/functional-library.yml@refs/heads/work/biblioteca-nuvem-20261026',
  event_name:'push',runner_environment:'github-hosted',exp:2000000000,nbf:1700000000,run_id:'1234',run_attempt:'1' };
const enc = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
async function token(override={}) {
  const data = enc({ alg:'RS256',kid:'test-key' })+'.'+enc({ ...claims,...override });
  return data+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data))).toString('base64url');
}
const keys = async url => { assert.equal(url,'https://token.actions.githubusercontent.com/.well-known/jwks'); return Response.json({keys:[jwk]}); };
test('only the signed test workflow/branch/repository identity is accepted', async () => {
  assert.deepEqual(await githubTestIdentity(await token(),keys,1800000000000),{run:'1234',attempt:'1'});
  for (const override of [{aud:'other'},{ref:'refs/heads/main'},{repository_id:'other'}, {workflow_ref:'other'},
    {event_name:'pull_request'}, {runner_environment:'self-hosted'}, {exp:1700000000}]) {
    await assert.rejects(githubTestIdentity(await token(override),()=>{throw new Error('no network');},1800000000000));
  }
});
test('forged signatures and anonymous fixture requests cannot provision accounts', async () => {
  const signed=await token(); const parts=signed.split('.'); parts[2]=Buffer.alloc(256).toString('base64url');
  await assert.rejects(githubTestIdentity(parts.join('.'),keys,1800000000000));
  const denied=await validationFixtures(new Request(TEST_AUDIENCE+'/validation/fixtures',{method:'POST',body:'{}'}),{});
  assert.equal(denied.status,401);
});
test('validation upload excludes copied/nontechnical accounts before touching SQL or files', async () => {
  const request=new Request(TEST_AUDIENCE+'/library/materials',{method:'POST',body:'not a file'});
  const client={query(){throw new Error('must not query');}};
  const reply=(body,status=200)=>Response.json(body,{status});
  const result=await materialRoute(request,{CEB_RUNTIME:'validation',CEB_UPLOADS_ENABLED:'true'},new URL(request.url),client,{id:crypto.randomUUID(),username:'existing_copied_admin',app_role:'admin'},reply,'');
  assert.equal(result.status,403);
});

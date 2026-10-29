// Actual frontend selection/confirmation/batching helpers, without browser or network.
import assert from 'node:assert/strict';
import{readFile}from'node:fs/promises';import{stripTypeScriptTypes}from'node:module';
let calls=[];
globalThis.__trashTestApi=async(path,options)=>{calls.push({path,...options});return {results:options.body.items.map(i=>({...i,ok:true}))}};
let source=await readFile('src/trashApi.ts','utf8');source=source.replace("import { cebApi } from './cebApi'",'const cebApi = globalThis.__trashTestApi');
const {trashKey,trashSelection,confirmTrashAction,changeTrash}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
const items=Array.from({length:64},(_,i)=>({type:i%3===0?'study':i%3===1?'material':'quiz',id:String(i),title:'Technical '+i,category:'test'}));
const selected=new Set([trashKey(items[0]),trashKey(items[2])]);
assert.deepEqual(trashSelection(items,selected).map(x=>x.id),['0','2']);assert.equal(trashSelection(items,selected,true).length,64);
const snapshot=trashSelection(items,selected,true);items.push({type:'material',id:'new',title:'Arrived after confirmation',category:'test'});assert.equal(snapshot.length,64);
let prompt='';assert.equal(confirmTrashAction('purge',64,true,m=>{prompt=m;return false}),false);assert.match(prompt,/64 material/);assert.match(prompt,/históricos/);assert.equal(calls.length,0);
assert.equal(confirmTrashAction('restore',2,false,()=>{throw Error('No prompt for non-destructive selected restore')}),true);
assert.equal(confirmTrashAction('restore',0,true,()=>true),false);
assert.equal(confirmTrashAction('restore',64,true,m=>{assert.match(m,/64 material/);return true}),true);
assert.equal(confirmTrashAction('purge',2,false,m=>{assert.match(m,/2 material/);return true}),true);
const results=await changeTrash('SYNTHETIC_TOKEN','purge',snapshot,true);assert.equal(results.length,64);assert.equal(calls.length,3);
for(const call of calls){assert.equal(call.path,'/library/trash');assert.equal(call.body.confirmed,true);assert.equal(call.body.confirmCount,call.body.items.length);assert.ok(call.body.items.length<=25);assert.ok(!('all' in call.body));assert.ok(!call.body.items.some(x=>x.id==='new'))}
const order=calls.flatMap(c=>c.body.items.map(x=>x.type));assert.ok(order.indexOf('study')>order.lastIndexOf('quiz'));
calls=[];await changeTrash('SYNTHETIC_TOKEN','restore',snapshot);const restored=calls.flatMap(c=>c.body.items.map(x=>x.type));assert.ok(restored.indexOf('quiz')>restored.lastIndexOf('study'));
calls=[];await changeTrash('SYNTHETIC_TOKEN','restore',[snapshot[0],snapshot[0]]);assert.equal(calls[0].body.items.length,1);
delete globalThis.__trashTestApi;
console.log('PASS UI helpers: one/multiple/all, frozen snapshot, cancel/confirm count, deduplication, bounded batches and dependency order.');

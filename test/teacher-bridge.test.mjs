import {test}from'node:test';import assert from'node:assert/strict';import{withTeacherBridge,embeddedTeacherNotes}from'../src/teacherBridge.mjs';
test('bridge preserves original markup/styles and contains no private annotations',()=>{const source='<html><style>.slide{color:red;font-size:27px}</style><body><h1>Original</h1></body></html>';const result=withTeacherBridge(source,'session');assert.equal(result.replace(/<script>[\s\S]*<\/script>/,''),source);assert.doesNotMatch(result,/Anotações particulares/)});
test('approved HTML notes contract is imported without executing source scripts',()=>{assert.deepEqual(embeddedTeacherNotes('const data=[{"notes":"Explicação 1"},{"notes":"Explicação 2"}];window.updateTeacher=function(){}'),{'slide:0':'Explicação 1','slide:1':'Explicação 2'});assert.deepEqual(embeddedTeacherNotes('const data=[alert(1)];window.updateTeacher'),{})});

test('bridge can inspect nested same-origin presentation without changing the original HTML',()=>{
 const source='<html><body><iframe srcdoc="<section class=slide>Slide</section>"></iframe></body></html>';
 const result=withTeacherBridge(source,'nested-session');
 assert.ok(result.includes("activeDocument=()=>"));
 assert.ok(result.includes("frame.contentDocument"));
 assert.ok(result.includes("observeNested()"));
 assert.ok(result.includes("const doc=activeDocument()"));
 assert.equal(result.split('<script>')[0],source.split('</body>')[0]);
});

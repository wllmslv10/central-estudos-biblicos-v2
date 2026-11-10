import test from 'node:test';
import assert from 'node:assert/strict';
import {lookupOfflineVerses} from '../offline-bible.js';
const books={'1':{'1':{'1':'No princípio','2':'E a terra'}}};
test('consulta versículo único e intervalo local',()=>{
 assert.deepEqual(lookupOfflineVerses('Gn 1:1',books).map(x=>x.text),['No princípio']);
 assert.deepEqual(lookupOfflineVerses('Gênesis 1:1-2',books).map(x=>x.text),['No princípio','E a terra']);
});
test('não inventa versículos ausentes nem abre intervalos entre capítulos',()=>{
 assert.deepEqual(lookupOfflineVerses('Gn 1:1-3',books),[]);
 assert.deepEqual(lookupOfflineVerses('Gn 1:1-2:1',books),[]);
 assert.deepEqual(lookupOfflineVerses('Gn 1:0',books),[]);
});

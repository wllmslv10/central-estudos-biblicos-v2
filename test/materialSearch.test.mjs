import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesMaterial } from '../src/materialSearch.mjs';

test('finds a saved topic or passage across fields, independent of accents and case', () => {
  const fields = ['Lição da EBD', 'Decisões e tentação', 'Mateus 4:1–11', 'curso adulto', 'aula.html'];
  assert.equal(matchesMaterial('LICAO mateus 4', fields), true);
  assert.equal(matchesMaterial('decisoes adulto', fields), true);
  assert.equal(matchesMaterial('aula.html', fields), true);
  assert.equal(matchesMaterial('Romanos', fields), false);
  assert.equal(matchesMaterial(' ', fields), true);
  assert.equal(matchesMaterial('não existe', []), false);
});

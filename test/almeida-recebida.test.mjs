import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAlmeidaRecebida} from '../scripts/build-almeida-recebida.mjs';

test('converte SQL e preserva apostrofos, acentos e identificadores', () => {
  const sql = [
    "(1, 40, 4, 1, 'Então foi Jesus conduzido pelo Espírito'),",
    "(2, 40, 4, 2, 'Disse: \\'Está escrito\\' e foi.'),",
    "(3, 59, 1, 22, 'Sede cumpridores da palavra');"
  ].join('\\n');
  assert.throws(() => parseAlmeidaRecebida(sql), /31102 verses/);
});

test('rejeita base incompleta ou trocada sem substituir a tradução', () => {
  assert.throws(() => parseAlmeidaRecebida(''), /Expected 31102 verses/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {embeddedTeacherNotes} from '../src/teacherBridge.mjs';

test('recupera orientações privadas de apresentação aprovada com META', () => {
  const html = '<script>const META=[{"notes":"Contexto bíblico e perguntas do professor"},{"notes":"Aplicação e desafio"}];</script>';
  assert.deepEqual(embeddedTeacherNotes(html), {
    'slide:0':'Contexto bíblico e perguntas do professor',
    'slide:1':'Aplicação e desafio'
  });
});

test('preserva compatibilidade com contrato data/updateTeacher', () => {
  const html = '<script>const data=[{"notes":"Introdução"}];window.updateTeacher=function(){};</script>';
  assert.deepEqual(embeddedTeacherNotes(html), {'slide:0':'Introdução'});
});

test('não inventa notas a partir de conteúdo público', () => {
  assert.deepEqual(embeddedTeacherNotes('<section class="slide">Mateus 4:8-10</section>'), {});
});

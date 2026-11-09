import test from 'node:test';
import assert from 'node:assert/strict';
import {biblePassageUrl,bibleTranslations,normalizeBibleTranslation} from '../src/bibleTranslations.mjs';

test('the four selectable versions open distinct editions for the same passage',()=>{
  assert.deepEqual(Object.keys(bibleTranslations),['alm1911','AR','ACF','NVI']);
  const passage='Mateus 4:1–11';
  assert.match(biblePassageUrl(passage,'alm1911'),/version=PorAlmeida1911%7Creference=Matt\.4\.1-Matt\.4\.11$/);
  assert.match(biblePassageUrl(passage,'AR'),/version=PorAR%7Creference=Matt\.4\.1-Matt\.4\.11$/);
  assert.equal(biblePassageUrl(passage,'ACF'),'https://www.bibliaonline.com.br/acf/mt/4/1-11');
  assert.equal(biblePassageUrl('2Co 5:17','ACF'),'https://www.bibliaonline.com.br/acf/2co/5/17');
  assert.match(biblePassageUrl(passage,'NVI'),/search=Mateus%204%3A1-11&version=NVI-PT$/);
  assert.equal(normalizeBibleTranslation('ARA'),'ACF');
});

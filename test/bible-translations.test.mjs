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

test('STEP resolves Portuguese abbreviations and ranges without confusing João and Jó',()=>{
  for(const [edition,code] of [['AR','PorAR'],['alm1911','PorAlmeida1911']]){
    for(const [input,osis] of [
      ['Jo. 3:16','John.3.16'], ['Jó 1:1','Job.1.1'], ['Êx 20:1–3','Exod.20.1-Exod.20.3'],
      ['2 Co 5:17','2Cor.5.17'], ['1 Jo 2:1–3:2','1John.2.1-1John.3.2'],
      ['Salmo 23:1','Ps.23.1'], ['Mt 4:1—11','Matt.4.1-Matt.4.11'],
    ]){
      const url=new URL(biblePassageUrl(input,edition));
      assert.equal(url.searchParams.get('q'),'version='+code+'|reference='+osis,input);
    }
  }
});

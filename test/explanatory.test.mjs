import test from 'node:test';
import assert from 'node:assert/strict';
import {explanatorySentences,explanatorySlides,abbreviatedPresentationTitle,paginateExplanatory} from '../src/explanatory.mjs';
import {buildSlides,createPresentationHtml,defaultPresentationMode,defaultNewPresentationMode} from '../src/presentation.mjs';
const source={title:'Amar o próximo',passage:'Lucas 10:25–37',theme:'A misericórdia se traduz em cuidado.',introduction:'O diálogo começa com uma pergunta. Jesus apresenta uma parábola para desenvolver a resposta.',points:[{title:'O cuidado que se aproxima (Lucas 10:33–35)',explanation:'**O ensino:** O samaritano vê a necessidade e se aproxima. Ele oferece cuidado concreto e assume os custos desse cuidado.',application:'Reconheça quem precisa de auxílio. Aplique a misericórdia de maneira responsável.'}],conclusion:'Considere como praticar o ensino nesta semana.'};
test('novo padrão completo e opt-in persistente sem migrar fontes antigas',()=>{
 const before=JSON.stringify(source);assert.equal(defaultNewPresentationMode(),'explicativo');
 assert.equal(defaultPresentationMode({...source,collection:'ebd'}),'ampliado');assert.equal(defaultPresentationMode(source),'resumido');
 assert.equal(defaultPresentationMode({...source,presentationLayoutVersion:'explicativo-v1'}),'explicativo');
 const slides=buildSlides(source);assert.equal(slides.length,4);assert.equal(JSON.stringify(source),before);
 const text=slides.flatMap(s=>s.body).join(' ');for(const s of [source.theme,source.introduction,source.points[0].explanation,source.points[0].application,source.conclusion])assert.ok(text.includes(s));
 assert.match(text,/\*\*Aplicação à vida:\*\*/);assert.equal(slides.filter(s=>s.topic==='point:0').length,1);
 const html=createPresentationHtml(source);assert.match(html,/class="explicativo classic-reading controls-hidden"/);assert.match(html,/data-explanatory-unit/);assert.match(html,/"explanatory":true/);
 assert.doesNotThrow(()=>new Function(html.match(/<script>([\s\S]*)<\/script>/)[1]));
});
test('frases, abreviações, subtítulos, referências e negrito permanecem inteiros',()=>{
 for(const value of ['Leia Mt. 6:33 e considere a prioridade do Reino. A aplicação exige reflexão.','A misericórdia se torna prática. (Lucas 10:33–35). A resposta deve ser responsável.','**Fundamento:** Uma frase completa. Outra frase completa.','**Duas frases em negrito. Ambas permanecem completas.** Continuação normal.']){
  const units=explanatorySentences(value);assert.equal(units.join(''),value);assert.ok(units.length>=1);
  assert.ok(units.every(s=>(s.match(/\*\*/g)||[]).length%2===0));
 }
 assert.match(explanatorySentences('A misericórdia se torna prática. (Lucas 10:33–35). Aplique o ensino.')[0],/prática\. \(Lucas 10:33–35\)/);
 const s=explanatorySlides({...source,introduction:'**Contexto:**\n\nO diálogo ajuda a compreender a parábola.'});
 assert.equal(s[1].body.length,1);assert.match(s[1].body[0],/^\*\*Contexto:\*\*\nO diálogo/);
 assert.equal(abbreviatedPresentationTitle('A misericórdia (Lucas 10:33–35)'),'A misericórdia (Lc 10:33–35)');
});

// Minimal DOM contract for testing node movement. Capacity is deliberately supplied;
// this validates the algorithm, not browser typography or physical fullscreen.
class Node {
 constructor(kind,text='',dataset={}){this.kind=kind;this.text=text;this.dataset={...dataset};this.children=[];this.parent=null;this.classes=new Set();this.classList={contains:x=>this.classes.has(x),add:x=>this.classes.add(x),remove:x=>this.classes.delete(x)}}
 get firstElementChild(){return this.children[0]||null}get lastElementChild(){return this.children.at(-1)||null}
 get nextElementSibling(){return this.parent?.children[this.parent.children.indexOf(this)+1]||null}
 detach(n){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);n.parent=null}
 append(n){this.detach(n);n.parent=this;this.children.push(n)}
 prepend(n){this.detach(n);n.parent=this;this.children.unshift(n)}
 after(n){const p=this.parent;this.detach(n);n.parent=p;p.children.splice(p.children.indexOf(this)+1,0,n)}
 replaceChildren(){for(const c of this.children)c.parent=null;this.children=[]}
 cloneNode(deep){const n=new Node(this.kind,this.text,this.dataset);n.classes=new Set(this.classes);if(deep)for(const c of this.children)n.append(c.cloneNode(true));return n}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null}
 querySelectorAll(selector){const matches=n=>selector==='[data-explanatory-unit]'?n.kind==='unit':selector==='.reading'?n.kind==='reading':selector==='.body'?n.kind==='body':false;const out=[];for(const n of this.children){if(matches(n))out.push(n);out.push(...n.querySelectorAll(selector))}return out}
 getBoundingClientRect(){return {height:this.kind==='body'?200:this.querySelectorAll('[data-explanatory-unit]').length*20}}
}
function deck(topics){const stage=new Node('stage');for(const [i,paragraphs]of topics.entries()){
 const s=new Node('slide','',{topic:'topic:'+i,sourceSlide:String(i+1)});s.classList.add('slide');const b=new Node('body'),r=new Node('reading');s.append(b);b.append(r);stage.append(s);
 for(const [j,text]of paragraphs.entries()){const p=new Node('p','',{paragraph:i+':'+j});for(const sentence of explanatorySentences(text))p.append(new Node('unit',sentence));r.append(p)}
 }return stage}
const units=stage=>stage.querySelectorAll('[data-explanatory-unit]');
test('medição pode acrescentar slides ilimitados preservando cada frase e sua ordem',()=>{
 const text=Array.from({length:121},(_,i)=>`Esta é a explicação completa número ${i+1}. `).join(''),stage=deck([[text]]),before=units(stage);
 const result=paginateExplanatory(stage,s=>units(s).length<=2);assert.equal(result.ok,true);assert.equal(stage.children.length,61);assert.ok(result.sparse.includes('1'));assert.deepEqual(units(stage),before);
 assert.equal(units(stage).map(u=>u.text).join(''),text);assert.doesNotMatch(paginateExplanatory.toString(),/fontSize|\.slice\(|substring/);
});
test('conteúdo relacionado é aproveitado; assuntos distintos e subtítulos não são descartados',()=>{
 const stage=deck([['**Explicação:** A frase é completa.','**Aplicação:** Pratique o ensino.'],['Outro assunto permanece separado.']]);const before=units(stage);
 assert.equal(paginateExplanatory(stage,s=>units(s).length<=4).ok,true);assert.equal(stage.children.length,2);assert.deepEqual(units(stage),before);
});
test('frase individual impossível de acomodar exige revisão e não é cortada',()=>{
 const value='Uma única frase muito extensa '+('sem ser interrompida '.repeat(200))+'.',stage=deck([[value]]),before=units(stage);
 const result=paginateExplanatory(stage,s=>units(s).every(n=>n.text.length<300));assert.equal(result.ok,false);assert.equal(result.reason,'sentence_or_title_too_large');assert.deepEqual(units(stage),before);assert.equal(units(stage)[0].text,value);
});

test('novo HTML escapa conteúdo ativo e limita avisos à prévia de revisão',()=>{
 const value={...source,title:'</script><script>alert(1)</script>',introduction:'<img src=x onerror=alert(1)>'};
 const html=createPresentationHtml(value);assert.equal((html.match(/<script>/g)||[]).length,1);assert.ok(!html.includes('<img src=x'));assert.match(html,/&lt;img/);assert.match(html,/"review":false/);
 const preview=createPresentationHtml(source,undefined,{}, {review:true});assert.match(preview,/"review":true/);
 assert.ok(!preview.includes('class="slide single-line-title"'));
});

// Informational, local-only hints. No model calls, persistence, score or gating.
type ReviewQuestion = { question: string; options: string[]; answer?: number; explanation?: string; evidence?: string }
export type SimilarityNotice = { questionNumber: number; reason: string }
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const stop = new Set('a ao aos as o os um uma uns umas de da das do dos e em no nos na nas que se com por para pelo pela qual quais como porque quando segundo conforme sobre foi foram era ser deve devemos jesus cristo cristao crista deus licão licao texto biblia biblico resposta'.split(' '))
const tokens = (s: string) => new Set((fold(s).match(/[\p{L}]+/gu) || []).filter(w => w.length > 3 && !stop.has(w)))
const overlap = (a: Set<string>, b: Set<string>) => {
 const shared = [...a].filter(t => b.has(t)).length
 return { shared, ratio: shared / Math.max(1, new Set([...a, ...b]).size) }
}
// Concepts use the enunciado and marked answer, not the mere presence of a
// common Bible reference or the lesson's broad theme. These are hints, not verdicts.
const teachings: { id: string; pattern: RegExp; reason: string }[] = [
 { id: 'integrity', pattern: /fraud|falsific|mentir|mentira|corrup|desonest|omitir|omiss|engan|suborn|exploracao|contraria.{0,35}consciencia|abandon.{0,30}princip|comprometer.{0,30}(?:consciencia|fidelidade)/, reason: 'Ambas avaliam a integridade diante de vantagens ou pressão para abandonar princípios.' },
 { id: 'prudence', pattern: /(?:colocar|por|pondo) deus a prova|tentar (?:a )?deus|temerari|impruden|arrisca|risco.{0,60}protec|protec.{0,60}risco/, reason: 'Ambas tratam da diferença entre confiar em Deus e colocá-lo à prova.' },
 { id: 'scripture-context', pattern: /formulas? magicas?|fora de contexto|sentido.{0,35}(?:palavra|escritura)|interpret.{0,35}(?:palavra|escritura)/, reason: 'Ambas avaliam o uso das Escrituras com fidelidade ao seu sentido.' },
 { id: 'needs', pattern: /pedras?.{0,40}pao|pao.{0,60}palavra|fome|necessidades?.{0,60}atalho/, reason: 'Ambas abordam a submissão das necessidades à vontade de Deus, na tentação do pão.' },
 { id: 'worship', pattern: /adoracao|adorar|adorou|idolatri|reinos.{0,60}mundo|gloria.{0,35}dominio/, reason: 'Ambas abordam a adoração devida a Deus diante da oferta de poder ou vantagens.' },
 { id: 'word-resistance', pattern: /(?:resist|respost|respond|recorr).{0,65}(?:escritura|palavra)|(?:escritura|palavra).{0,65}resist/, reason: 'Ambas avaliam a resposta às tentações fundamentada nas Escrituras.' },
 { id: 'sinless', pattern: /tentad.{0,50}(?:sem pecado|nao pecou)/, reason: 'Ambas avaliam a fidelidade de Cristo, tentado sem pecar.' },
]
export function findSimilarQuestions(questions: readonly ReviewQuestion[]): (SimilarityNotice | null)[] {
 const features = questions.map(q => {
  const answer = Number.isInteger(q.answer) ? q.options[q.answer!] || '' : ''
  const focus = `${q.question} ${answer}`
  return { valid: !!q.question.trim() && !!answer.trim(), focus: tokens(focus), answer: tokens(answer), support: tokens(`${q.explanation || ''} ${q.evidence || ''}`), teaching: teachings.find(t => t.pattern.test(fold(focus))) }
 })
 return features.map((f, i) => {
  if (!f.valid) return null
  for (let j = 0; j < i; j++) {
   const other = features[j]; if (!other.valid) continue
   if (f.teaching && f.teaching.id === other.teaching?.id) return { questionNumber: j + 1, reason: f.teaching.reason }
   const focus = overlap(f.focus, other.focus), answer = overlap(f.answer, other.answer), support = overlap(f.support, other.support)
   if (focus.shared >= 3 && focus.ratio >= 0.65) return { questionNumber: j + 1, reason: 'O enunciado e a resposta marcada abordam conteúdos muito próximos.' }
   if (answer.shared >= 3 && answer.ratio >= 0.75 && support.shared >= 4 && support.ratio >= 0.65 && focus.shared >= 2) return { questionNumber: j + 1, reason: 'As respostas marcadas e os trechos de apoio apontam para o mesmo ensinamento.' }
  }
  return null
 })
}

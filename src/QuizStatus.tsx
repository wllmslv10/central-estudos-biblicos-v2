import type { CloudStudy } from './cebApi'

// Only persisted quiz metadata and current sharing permissions determine this badge.
export function QuizStatus({ study }: { study: CloudStudy }) {
 const quiz = study.quiz_summary
 if (quiz === undefined) return <p>Situação do questionário indisponível.</p>
 if (quiz === null) return <p className="library-quiz-status">📝 Sem questionário.</p>
 const sharing = study.content.sharing as { enabled?: boolean; quizEnabled?: boolean; audience?: string; userIds?: string[] } | undefined
 const available = quiz.reviewed && study.visibility === 'shared' && study.status === 'published' && sharing?.enabled === true && sharing?.quizEnabled === true && (sharing.audience === 'all' || sharing.audience === 'selected' && Array.isArray(sharing.userIds) && sharing.userIds.length > 0)
 const status = available ? 'Questionário disponibilizado aos alunos.' : quiz.reviewed ? 'Questionário revisado, pronto para compartilhar.' : 'Questionário em rascunho.'
 return <p className="library-quiz-status"><strong>📝 {status}</strong><br /><small>Questionário salvo — {quiz.questionCount} {quiz.questionCount === 1 ? 'questão' : 'questões'}.{!available && ' Salvar não disponibiliza o questionário aos alunos.'}</small></p>
}

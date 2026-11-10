'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '../../../supabase'
import Link from 'next/link'

export default function StudentAssignmentPage() {
  const router = useRouter()
  const params = useParams()
  const assignmentId = params.id as string
  
  const supabase = useMemo(() => createClient(), [])
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [assignment, setAssignment] = useState<any>(null)
  const [linkData, setLinkData] = useState<any>(null) // Данные о попытках и дедлайне
  
  const [tasks, setTasks] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [results, setResults] = useState<Record<number, boolean>>({})
  
  // Состояние: сейчас смотрим результаты или редактируем?
  const [isEditing, setIsEditing] = useState(false)
  const [currentAttempt, setCurrentAttempt] = useState(1)

  useEffect(() => {
    const fetchAssignment = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Загружаем ДЗ и данные о назначении (попытки, дедлайн)
      const { data: assignData } = await supabase
        .from('hw_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single()
      if (assignData) setAssignment(assignData)

      const { data: link } = await supabase
        .from('hw_assignment_students')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .single()
      if (link) setLinkData(link)

      // 2. Загружаем задачи
      const { data: taskLinks } = await supabase
        .from('hw_assignment_tasks')
        .select('task_id, position, hw_tasks(*)')
        .eq('assignment_id', assignmentId)
        .order('position')

      if (taskLinks) {
        const formattedTasks = taskLinks.map((link: any) => link.hw_tasks).filter(Boolean)
        setTasks(formattedTasks)
      }

      // 3. Загружаем прошлые ответы
      const { data: subs } = await supabase
        .from('hw_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)

      if (subs && subs.length > 0) {
        const savedAnswers: Record<number, string> = {}
        const savedResults: Record<number, boolean> = {}
        let maxAttempt = 1

        subs.forEach(sub => {
          savedAnswers[sub.task_id] = sub.answer_text || ''
          if (sub.is_correct !== null) {
            savedResults[sub.task_id] = sub.is_correct
          }
          if (sub.attempt_no && sub.attempt_no > maxAttempt) {
            maxAttempt = sub.attempt_no
          }
        })

        setAnswers(savedAnswers)
        setResults(savedResults)
        setCurrentAttempt(maxAttempt)
        setIsEditing(false) // По умолчанию показываем результаты
      } else {
        setIsEditing(true) // Если ответов нет, сразу даем решать
      }

      setLoading(false)
    }

    fetchAssignment()
  }, [assignmentId, supabase])

  const handleAnswerChange = (taskId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [taskId]: value }))
  }

  const checkAnswer = (studentAnswer: string, correctAnswer: string | null, type: string) => {
    if (!correctAnswer || type === 'manual') return null
    if (!studentAnswer.trim()) return false

    const student = studentAnswer.trim().replace(',', '.')
    const correct = correctAnswer.trim().replace(',', '.')

    if (type === 'numeric') {
      return parseFloat(student) === parseFloat(correct)
    } else {
      return student.toLowerCase() === correct.toLowerCase()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Не авторизован')

      const newResults: Record<number, boolean> = {}
      const newAttemptNo = currentAttempt + (Object.keys(results).length > 0 ? 1 : 0)

      const submissionsToSave = tasks.map(task => {
        const isCorrect = checkAnswer(answers[task.id] || '', task.answer_text, task.answer_type)
        if (isCorrect !== null) {
          newResults[task.id] = isCorrect
        }

        return {
          assignment_id: parseInt(assignmentId),
          task_id: task.id,
          student_id: user.id,
          answer_text: answers[task.id] || '',
          is_correct: isCorrect,
          attempt_no: newAttemptNo, // Сохраняем номер попытки
          submitted_at: new Date().toISOString()
        }
      })

      const { error: upsertError } = await supabase
        .from('hw_submissions')
        .upsert(submissionsToSave, { onConflict: 'assignment_id, task_id, student_id' })

      if (upsertError) throw upsertError

      setResults(newResults)
      setCurrentAttempt(newAttemptNo)
      setIsEditing(false) // После отправки переключаемся в режим просмотра
    } catch (err: any) {
      setError(err.message || 'Ошибка при отправке')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Загрузка задания...</div>

  // Проверки на дедлайн и попытки
  const isOverdue = linkData?.deadline && new Date(linkData.deadline) < new Date()
  const attemptsAllowed = linkData?.attempts_allowed || 1
  const canRetry = currentAttempt < attemptsAllowed && !isOverdue
  const hasPreviousResults = Object.keys(results).length > 0

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-white shadow-sm mb-8">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">&larr; Назад к списку</Link>
            <h1 className="text-xl font-bold text-gray-900">{assignment?.title}</h1>
          </div>
          <div className="text-sm text-gray-500">
            Попытка: {currentAttempt} из {attemptsAllowed}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4">
        {isOverdue && (
          <div className="mb-4 rounded bg-red-50 p-3 text-red-600 border border-red-200">
            Дедлайн истек. Отправка новых ответов невозможна.
          </div>
        )}
        
        {error && <div className="mb-4 rounded bg-red-50 p-3 text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {tasks.map((task, index) => {
            const result = results[task.id]
            const hasResult = result !== undefined && !isEditing

            return (
              <div key={task.id} className={`rounded-lg bg-white p-6 shadow border ${hasResult ? (result ? 'border-green-500' : 'border-red-500') : 'border-gray-200'}`}>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Задание {index + 1}</h2>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                    {task.answer_type === 'exact' ? 'Текст' : task.answer_type === 'numeric' ? 'Число' : 'Развернутый ответ'}
                  </span>
                </div>

                <div className="text-gray-700 mb-4 whitespace-pre-wrap">{task.content_html}</div>

                {task.images && task.images.length > 0 && (
                  <div className="flex flex-wrap gap-4 mb-4">
                    {task.images.map((url: string, i: number) => (
                      <img key={i} src={url} alt="Task" className="max-h-60 rounded border" />
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ваш ответ:</label>
                  <textarea
                    rows={task.answer_type === 'manual' ? 4 : 1}
                    value={answers[task.id] || ''}
                    onChange={(e) => handleAnswerChange(task.id, e.target.value)}
                    disabled={!isEditing}
                    placeholder="Введите ответ..."
                    className={`w-full rounded-md border px-3 py-2 focus:outline-none ${
                      hasResult ? (result ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50') : 'border-gray-300 focus:border-blue-500'
                    } ${!isEditing ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
                  />
                </div>

                {hasResult && (
                  <div className={`mt-3 p-3 rounded-md text-sm font-medium ${result ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {result ? (
                      <span>✅ Верно!</span>
                    ) : (
                      <span>❌ Неверно. Правильный ответ: <strong>{task.answer_text || 'см. у учителя'}</strong></span>
                    )}
                  </div>
                )}

                {hasResult && task.answer_type === 'manual' && result === undefined && (
                  <div className="mt-3 p-3 rounded-md text-sm bg-blue-50 text-blue-700">
                    ⏳ Ответ отправлен на проверку репетитору.
                  </div>
                )}
              </div>
            )
          })}

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-center gap-4 shadow-lg">
            {!isEditing && hasPreviousResults ? (
              <button 
                type="button"
                onClick={() => setIsEditing(true)}
                disabled={!canRetry}
                className={`w-full max-w-4xl rounded-md px-4 py-3 text-white text-lg font-medium ${
                  canRetry ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {canRetry ? 'Попробовать еще раз' : (isOverdue ? 'Дедлайн истек' : 'Попытки закончились')}
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={submitting || isOverdue} 
                className={`w-full max-w-4xl rounded-md px-4 py-3 text-white text-lg font-medium ${
                  isOverdue ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-500'
                } disabled:opacity-50`}
              >
                {submitting ? 'Отправка...' : 'Отправить ответы'}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}

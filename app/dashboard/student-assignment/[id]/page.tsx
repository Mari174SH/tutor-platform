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
  const [tasks, setTasks] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [existingSubmissions, setExistingSubmissions] = useState<any[]>([])

  useEffect(() => {
    const fetchAssignment = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Загружаем само ДЗ
      const { data: assignData } = await supabase
        .from('hw_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single()
      
      if (assignData) setAssignment(assignData)

      // 2. Загружаем задачи этого ДЗ
      const { data: taskLinks } = await supabase
        .from('hw_assignment_tasks')
        .select('task_id, position, hw_tasks(*)')
        .eq('assignment_id', assignmentId)
        .order('position')

      if (taskLinks) {
        const formattedTasks = taskLinks.map((link: any) => link.hw_tasks).filter(Boolean)
        setTasks(formattedTasks)
      }

      // 3. Загружаем уже отправленные ответы (если ученик зашел повторно)
      const { data: subs } = await supabase
        .from('hw_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)

      if (subs) {
        setExistingSubmissions(subs)
        const savedAnswers: Record<number, string> = {}
        subs.forEach(sub => {
          savedAnswers[sub.task_id] = sub.answer_text || ''
        })
        setAnswers(savedAnswers)
      }

      setLoading(false)
    }

    fetchAssignment()
  }, [assignmentId, supabase])

  const handleAnswerChange = (taskId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [taskId]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Не авторизован')

      // Формируем массив ответов для сохранения
      const submissionsToSave = tasks.map(task => ({
        assignment_id: parseInt(assignmentId),
        task_id: task.id,
        student_id: user.id,
        answer_text: answers[task.id] || '',
        submitted_at: new Date().toISOString()
      }))

      // Сохраняем (или обновляем) ответы
      const { error: upsertError } = await supabase
        .from('hw_submissions')
        .upsert(submissionsToSave, { 
          onConflict: 'assignment_id, task_id, student_id' 
        })

      if (upsertError) throw upsertError

      alert('Ответы успешно отправлены!')
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Ошибка при отправке')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Загрузка задания...</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-white shadow-sm mb-8">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
            &larr; Назад к списку
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{assignment?.title}</h1>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4">
        {error && <div className="mb-4 rounded bg-red-50 p-3 text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {tasks.map((task, index) => (
            <div key={task.id} className="rounded-lg bg-white p-6 shadow border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold text-gray-800">Задание {index + 1}</h2>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                  {task.answer_type === 'exact' ? 'Текст' : task.answer_type === 'numeric' ? 'Число' : 'Развернутый ответ'}
                </span>
              </div>

              {/* Текст задания */}
              <div className="text-gray-700 mb-4 whitespace-pre-wrap">{task.content_html}</div>

              {/* Картинки задания, если есть */}
              {task.images && task.images.length > 0 && (
                <div className="flex flex-wrap gap-4 mb-4">
                  {task.images.map((url: string, i: number) => (
                    <img key={i} src={url} alt="Task" className="max-h-60 rounded border" />
                  ))}
                </div>
              )}

              {/* Поле для ответа */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ваш ответ:</label>
                <textarea
                  rows={task.answer_type === 'manual' ? 4 : 1}
                  value={answers[task.id] || ''}
                  onChange={(e) => handleAnswerChange(task.id, e.target.value)}
                  placeholder="Введите ответ..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          ))}

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-center shadow-lg">
            <button 
              type="submit" 
              disabled={submitting} 
              className="w-full max-w-4xl rounded-md bg-blue-600 px-4 py-3 text-white hover:bg-blue-500 disabled:opacity-50 text-lg font-medium"
            >
              {submitting ? 'Отправка...' : 'Отправить ответы'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

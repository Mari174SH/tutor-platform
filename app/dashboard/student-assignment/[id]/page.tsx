'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '../../../supabase'
import Link from 'next/link'
import MathText from '../../../components/MathText'

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
  const [files, setFiles] = useState<Record<number, File[]>>({})
  const [results, setResults] = useState<Record<number, boolean>>({})
  const [submitted, setSubmitted] = useState(false)

  // Загрузка данных
  useEffect(() => {
    const fetchAssignment = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: assignData } = await supabase
        .from('hw_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single()
      
      if (assignData) setAssignment(assignData)

      const { data: taskLinks } = await supabase
        .from('hw_assignment_tasks')
        .select('task_id, position, hw_tasks(*)')
        .eq('assignment_id', assignmentId)
        .order('position')

      if (taskLinks) {
        const formattedTasks = taskLinks.map((link: any) => link.hw_tasks).filter(Boolean)
        setTasks(formattedTasks)
      }

      // Загружаем сохраненные ответы (черновик)
      const { data: subs } = await supabase
        .from('hw_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)

      if (subs && subs.length > 0) {
        const savedAnswers: Record<number, string> = {}
        const savedResults: Record<number, boolean> = {}
        let isSubmitted = false
        
        subs.forEach(sub => {
          savedAnswers[sub.task_id] = sub.answer_text || ''
          if (sub.is_correct !== null) {
            savedResults[sub.task_id] = sub.is_correct
            isSubmitted = true // Если есть оценка, значит, уже отправлено
          }
        })
        
        setAnswers(savedAnswers)
        setResults(savedResults)
        setSubmitted(isSubmitted)
      }

      setLoading(false)
    }

    fetchAssignment()
  }, [assignmentId, supabase])

  // АВТОСОХРАНЕНИЕ ЧЕРНОВИКА
  const saveDraft = useCallback(async (taskId: number, text: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Сохраняем только текст, без оценки (is_correct: null)
    await supabase.from('hw_submissions').upsert({
      assignment_id: parseInt(assignmentId),
      task_id: taskId,
      student_id: user.id,
      answer_text: text,
      is_correct: null, // Черновик
      submitted_at: new Date().toISOString()
    }, { onConflict: 'assignment_id, task_id, student_id' })
  }, [assignmentId, supabase])

  const handleAnswerChange = (taskId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [taskId]: value }))
    saveDraft(taskId, value) // Сохраняем при вводе
  }

  const handleFileChange = (taskId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => ({ ...prev, [taskId]: [...(prev[taskId] || []), ...Array.from(e.target.files!)] }))
    }
  }

  const handlePaste = (taskId: number, e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    const newFiles: File[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile()
        if (blob) {
          newFiles.push(new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type }))
        }
      }
    }
    if (newFiles.length > 0) {
      setFiles(prev => ({ ...prev, [taskId]: [...(prev[taskId] || []), ...newFiles] }))
    }
  }

  const removeFile = (taskId: number, index: number) => {
    setFiles(prev => ({
      ...prev,
      [taskId]: (prev[taskId] || []).filter((_, i) => i !== index)
    }))
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

      const submissionsToSave = await Promise.all(tasks.map(async (task) => {
        const isCorrect = checkAnswer(answers[task.id] || '', task.answer_text, task.answer_type)
        if (isCorrect !== null) {
          newResults[task.id] = isCorrect
        }

        // Загружаем файлы, если они есть
        const taskFiles = files[task.id] || []
        const imageUrls: string[] = []
        for (const file of taskFiles) {
          const fileExt = file.name.split('.').pop() || 'png'
          const fileName = `${Math.random()}.${fileExt}`
          const { error: uploadError } = await supabase.storage.from('task-images').upload(fileName, file)
          if (uploadError) throw uploadError
          const { data: { publicUrl } } = supabase.storage.from('task-images').getPublicUrl(fileName)
          imageUrls.push(publicUrl)
        }

        return {
          assignment_id: parseInt(assignmentId),
          task_id: task.id,
          student_id: user.id,
          answer_text: answers[task.id] || '',
          is_correct: isCorrect,
          images: imageUrls,
          submitted_at: new Date().toISOString()
        }
      }))

      const { error: upsertError } = await supabase
        .from('hw_submissions')
        .upsert(submissionsToSave, { onConflict: 'assignment_id, task_id, student_id' })

      if (upsertError) throw upsertError

      setResults(newResults)
      setSubmitted(true)
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
          {tasks.map((task, index) => {
            const result = results[task.id]
            const hasResult = result !== undefined

            return (
              <div key={task.id} className={`rounded-lg bg-white p-6 shadow border ${hasResult ? (result ? 'border-green-500' : 'border-red-500') : 'border-gray-200'}`}>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Задание {index + 1}</h2>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                    {task.answer_type === 'exact' ? 'Текст' : task.answer_type === 'numeric' ? 'Число' : 'Развернутый ответ'}
                  </span>
                </div>

                <div className="text-gray-700 mb-4 whitespace-pre-wrap">
                  <MathText text={task.content_html} />
                </div>

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
                    disabled={submitted}
                    placeholder="Введите ответ..."
                    className={`w-full rounded-md border px-3 py-2 focus:outline-none ${
                      hasResult ? (result ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50') : 'border-gray-300 focus:border-blue-500'
                    } ${submitted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                </div>

                {task.answer_type === 'manual' && !submitted && (
                  <div 
                    onPaste={(e) => handlePaste(task.id, e)}
                    tabIndex={0}
                    className="mt-3 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50"
                  >
                    <p className="text-sm text-gray-600 mb-2">Прикрепите фото решения (Ctrl+V или выберите файл)</p>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(task.id, e)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100" 
                    />
                  </div>
                )}

                {files[task.id]?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files[task.id].map((file, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                        <span>{file.name}</span>
                        {!submitted && (
                          <button type="button" onClick={() => removeFile(task.id, i)} className="text-red-500 font-bold">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {hasResult && (
                  <div className={`mt-3 p-3 rounded-md text-sm font-medium ${result ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {result ? (
                      <span>✅ Верно!</span>
                    ) : (
                      <span>❌ Неверно. Правильный ответ: <strong>{task.answer_text || 'см. у учителя'}</strong></span>
                    )}
                  </div>
                )}

                {submitted && task.answer_type === 'manual' && !hasResult && (
                  <div className="mt-3 p-3 rounded-md text-sm bg-blue-50 text-blue-700">
                    ⏳ Ответ отправлен на проверку репетитору.
                  </div>
                )}
              </div>
            )
          })}

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-center shadow-lg">
            <button 
              type="submit" 
              disabled={submitting || submitted} 
              className={`w-full max-w-4xl rounded-md px-4 py-3 text-white text-lg font-medium ${
                submitted ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-500'
              } disabled:opacity-50`}
            >
              {submitting ? 'Отправка...' : submitted ? 'Ответы отправлены' : 'Отправить ответы'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

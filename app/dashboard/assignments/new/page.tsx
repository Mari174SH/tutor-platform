'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../supabase'
import Link from 'next/link'

export default function NewAssignmentPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Данные
  const [topics, setTopics] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  
  // Настройки ДЗ
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  
  // Выбранное количество задач по подтемам: { [subtopicId]: count }
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({})
  
  // Ученики и дедлайн
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [attempts, setAttempts] = useState(1)
  const [deadline, setDeadline] = useState('')

  // Загружаем темы со всеми подтемами и учеников
  useEffect(() => {
    const fetchData = async () => {
      // 1. Загружаем темы и вложенные подтемы
      const { data: topicsData, error: topicsError } = await supabase
        .from('hw_topics')
        .select('*, hw_subtopics(*)')
        .order('topic_number')
      
      if (topicsError) {
        console.error("Ошибка загрузки тем:", topicsError)
        setError('Ошибка загрузки тем: ' + topicsError.message)
      } else if (topicsData) {
        setTopics(topicsData)
      }

      // 2. Загружаем учеников
      const { data: studentsData } = await supabase
        .from('hw_profiles')
        .select('id, full_name, email')
        .eq('role', 'student')
      if (studentsData) setStudents(studentsData)
    }
    fetchData()
  }, [supabase])

  // Обработка ввода количества
  const handleCountChange = (subtopicId: number, value: string) => {
    const num = parseInt(value) || 0
    setSelectedCounts(prev => {
      const newCounts = { ...prev }
      if (num > 0) {
        newCounts[subtopicId] = num
      } else {
        delete newCounts[subtopicId]
      }
      return newCounts
    })
  }

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const totalSelected = Object.values(selectedCounts).reduce((a, b) => a + b, 0)
    if (totalSelected === 0) {
      setError('Выберите хотя бы одну задачу (добавьте количество к любой подтеме)')
      return
    }
    if (selectedStudents.length === 0) {
      setError('Выберите хотя бы одного ученика')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Не авторизован')

      // 1. Собираем ID всех выбранных задач
      const taskIdsToAssign: number[] = []

      for (const [subtopicId, count] of Object.entries(selectedCounts)) {
        // Получаем все задачи для этой подтемы
        const { data: availableTasks } = await supabase
          .from('hw_tasks')
          .select('id')
          .eq('subtopic_id', subtopicId)

        if (!availableTasks || availableTasks.length === 0) continue

        // Перемешиваем и берем нужное количество
        const shuffled = availableTasks.sort(() => 0.5 - Math.random())
        const selected = shuffled.slice(0, count)
        
        selected.forEach(t => taskIdsToAssign.push(t.id))
      }

      if (taskIdsToAssign.length === 0) {
        throw new Error('В выбранных подтемах нет заданий в библиотеке. Сначала добавьте задания.')
      }

      // 2. Создаем ДЗ
      const { data: assignment, error: assignError } = await supabase
        .from('hw_assignments')
        .insert({ tutor_id: user.id, title, description })
        .select()
        .single()

      if (assignError) throw assignError

      // 3. Привязываем задания
      const taskLinks = taskIdsToAssign.map((taskId, index) => ({
        assignment_id: assignment.id,
        task_id: taskId,
        position: index,
      }))
      const { error: tasksError } = await supabase.from('hw_assignment_tasks').insert(taskLinks)
      if (tasksError) throw tasksError

      // 4. Привязываем учеников
      const studentLinks = selectedStudents.map(studentId => ({
        assignment_id: assignment.id,
        student_id: studentId,
        attempts_allowed: attempts,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      }))
      const { error: studentsError } = await supabase.from('hw_assignment_students').insert(studentLinks)
      if (studentsError) throw studentsError

      router.push('/dashboard/assignments')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-32">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/dashboard/assignments" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            &larr; Назад к списку ДЗ
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Создать Домашнее Задание</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="rounded bg-red-50 p-3 text-red-600 border border-red-200">{error}</div>}

          {/* Основная информация */}
          <div className="rounded-lg bg-white p-6 shadow space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Название ДЗ</label>
              <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: ДЗ на 20 мая" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>

          {/* Выбор тем и количества задач */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">1. Выберите темы и количество задач</h2>
              <span className="text-sm text-gray-500">Всего выбрано: <strong>{Object.values(selectedCounts).reduce((a, b) => a + b, 0)}</strong> задач</span>
            </div>
            
            <div className="space-y-4">
              {topics.map(topic => (
                <div key={topic.id} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                    <div className="font-bold text-gray-800">
                      {topic.topic_number ? `№${topic.topic_number} ` : ''}{topic.title}
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      {topic.exam_type === 'ege' ? 'ЕГЭ' : 'ОГЭ'}
                    </span>
                  </div>
                  
                  <div className="divide-y">
                    {topic.hw_subtopics?.map((sub: any) => (
                      <div key={sub.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                        <span className="text-sm text-gray-700">{sub.title}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={selectedCounts[sub.id] || ''}
                            onChange={(e) => handleCountChange(sub.id, e.target.value)}
                            placeholder="0"
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                          />
                          <span className="text-xs text-gray-400">шт.</span>
                        </div>
                      </div>
                    ))}
                    {(!topic.hw_subtopics || topic.hw_subtopics.length === 0) && (
                      <div className="px-4 py-3 text-sm text-gray-400 italic">Нет подтем</div>
                    )}
                  </div>
                </div>
              ))}
              {topics.length === 0 && <p className="text-sm text-gray-500">Сначала создайте темы в разделе «Темы и разделы».</p>}
            </div>
          </div>

          {/* Настройки учеников */}
          <div className="rounded-lg bg-white p-6 shadow space-y-4">
            <h2 className="text-lg font-medium text-gray-900 mb-2">2. Кому назначить ({selectedStudents.length} выбрано)</h2>
            
            <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2 bg-gray-50 mb-4">
              {students.map(student => (
                <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer">
                  <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => handleStudentToggle(student.id)} className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-700">{student.full_name || student.email}</span>
                </label>
              ))}
              {students.length === 0 && <p className="text-sm text-gray-500 p-2">У вас пока нет учеников.</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700">Количество попыток</label>
                <input type="number" min="1" value={attempts} onChange={(e) => setAttempts(parseInt(e.target.value))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Дедлайн (необязательно)</label>
                <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-center shadow-lg">
            <button type="submit" disabled={loading} className="w-full max-w-4xl rounded-md bg-blue-600 px-4 py-3 text-white hover:bg-blue-500 disabled:opacity-50 text-lg font-medium">
              {loading ? 'Создание...' : 'Создать ДЗ (Случайная выборка из тем)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

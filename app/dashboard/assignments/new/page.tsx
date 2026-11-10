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

  // Данные из базы
  const [allTasks, setAllTasks] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])

  // Поля формы
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTasks, setSelectedTasks] = useState<number[]>([])
  
  // Настройки для учеников
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [attempts, setAttempts] = useState(1)
  const [deadline, setDeadline] = useState('')

  // Загружаем задания и учеников
  useEffect(() => {
    const fetchData = async () => {
      const { data: tasks } = await supabase.from('hw_tasks').select('id, title, subject, task_number').order('id')
      if (tasks) setAllTasks(tasks)

      const { data: profiles } = await supabase.from('hw_profiles').select('id, full_name, email').eq('role', 'student')
      if (profiles) setStudents(profiles)
    }
    fetchData()
  }, [supabase])

  const handleTaskToggle = (taskId: number) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    )
  }

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedTasks.length === 0) {
      setError('Выберите хотя бы одно задание')
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

      // 1. Создаем само ДЗ
      const { data: assignment, error: assignError } = await supabase
        .from('hw_assignments')
        .insert({
          tutor_id: user.id,
          title,
          description,
        })
        .select()
        .single()

      if (assignError) throw assignError

      // 2. Привязываем задания к ДЗ
      const taskLinks = selectedTasks.map((taskId, index) => ({
        assignment_id: assignment.id,
        task_id: taskId,
        position: index,
      }))
      const { error: tasksError } = await supabase.from('hw_assignment_tasks').insert(taskLinks)
      if (tasksError) throw tasksError

      // 3. Привязываем учеников к ДЗ (с дедлайном и попытками)
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/dashboard/assignments" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            &larr; Назад к списку ДЗ
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Создать Домашнее Задание</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="rounded bg-red-50 p-3 text-red-600">{error}</div>}

          {/* Основная информация */}
          <div className="rounded-lg bg-white p-6 shadow space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Название ДЗ</label>
              <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: ДЗ на 20 мая" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Описание (необязательно)</label>
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>

          {/* Выбор заданий */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">1. Выберите задания ({selectedTasks.length} выбрано)</h2>
            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2 bg-gray-50">
              {allTasks.map(task => (
                <label key={task.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer border border-transparent hover:border-gray-200">
                  <input type="checkbox" checked={selectedTasks.includes(task.id)} onChange={() => handleTaskToggle(task.id)} className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-700">
                    <span className="font-bold text-gray-400 mr-2">ID: {task.id}</span>
                    {task.title || 'Без названия'} ({task.subject} {task.task_number ? `№${task.task_number}` : ''})
                  </span>
                </label>
              ))}
              {allTasks.length === 0 && <p className="text-sm text-gray-500 p-2">В библиотеке пока нет заданий.</p>}
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
              {students.length === 0 && <p className="text-sm text-gray-500 p-2">У вас пока нет учеников. (Их нужно добавить в базу данных).</p>}
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

          <button type="submit" disabled={loading} className="w-full rounded-md bg-blue-600 px-4 py-3 text-white hover:bg-blue-500 disabled:opacity-50 text-lg font-medium shadow">
            {loading ? 'Создание...' : 'Создать ДЗ и назначить ученикам'}
          </button>
        </form>
      </div>
    </div>
  )
}

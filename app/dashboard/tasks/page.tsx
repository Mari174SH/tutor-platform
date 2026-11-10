'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../supabase'
import Link from 'next/link'

export default function TasksPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTasks = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Загружаем задания из нашей таблицы hw_tasks
      const { data, error } = await supabase
        .from('hw_tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) setTasks(data)
      setLoading(false)
    }

    fetchTasks()
  }, [supabase, router])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
              &larr; Назад в кабинет
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Библиотека заданий</h1>
          </div>
          <Link href="/dashboard/tasks/new" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">
            + Добавить задание
          </Link>
        </div>

        {loading ? (
          <p>Загрузка заданий...</p>
        ) : tasks.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-500">У вас пока нет добавленных заданий.</p>
            <p className="mt-2 text-sm text-gray-400">Нажмите «Добавить задание», чтобы создать первое.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-lg bg-white p-4 shadow border border-gray-100">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{task.title || 'Без названия'}</h3>
                    
                    {/* Блок с тегами (ЕГЭ/ОГЭ, Предмет, Номер) */}
                    <div className="flex flex-wrap gap-2 mt-1 mb-2 text-xs">
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
                        {task.exam_type === 'ege' ? 'ЕГЭ' : 'ОГЭ'}
                      </span>
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                        {task.subject || 'Без предмета'}
                      </span>
                      {task.task_number && (
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                          Задание №{task.task_number}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-sm text-gray-600 line-clamp-3" dangerouslySetInnerHTML={{ __html: task.content_html }} />
                  </div>
                  <span className="ml-4 inline-flex shrink-0 items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    {task.answer_type === 'exact' ? 'Точный ответ' : task.answer_type === 'numeric' ? 'Число' : 'Ручная проверка'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

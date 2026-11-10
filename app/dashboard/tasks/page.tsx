'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../supabase'
import Link from 'next/link'
import MathText from '../../components/MathText'

export default function TasksPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('hw_tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setTasks(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [supabase, router])

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить это задание?')) return

    const { error } = await supabase
      .from('hw_tasks')
      .delete()
      .eq('id', id)

    if (!error) {
      setTasks(tasks.filter(t => t.id !== id))
    } else {
      alert('Ошибка при удалении: ' + error.message)
    }
  }

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
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-lg bg-white p-4 shadow border border-gray-100 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">ID: {task.id}</span>
                    <h3 className="font-medium text-gray-900">{task.title || 'Без названия'}</h3>
                  </div>
                  
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

                  <div className="mt-2 text-sm text-gray-600 line-clamp-3">
                    <MathText text={task.content_html} />
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4 shrink-0">
                  <Link 
                    href={`/dashboard/tasks/edit/${task.id}`}
                    className="text-xs text-center rounded bg-blue-50 px-3 py-1.5 text-blue-600 hover:bg-blue-100 font-medium"
                  >
                    Редактировать
                  </Link>
                  <button 
                    onClick={() => handleDelete(task.id)}
                    className="text-xs rounded bg-red-50 px-3 py-1.5 text-red-600 hover:bg-red-100 font-medium"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

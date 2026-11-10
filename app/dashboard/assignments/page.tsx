'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../supabase'
import Link from 'next/link'

export default function AssignmentsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAssignments = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data } = await supabase
      .from('hw_assignments')
      .select('*, hw_assignment_tasks(count), hw_assignment_students(count)')
      .order('created_at', { ascending: false })

    if (data) setAssignments(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchAssignments()
  }, [supabase])

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить это ДЗ? Все ответы учеников тоже удалятся.')) return

    const { error } = await supabase
      .from('hw_assignments')
      .delete()
      .eq('id', id)

    if (!error) {
      setAssignments(assignments.filter(a => a.id !== id))
    } else {
      alert('Ошибка при удалении: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline mb-2 inline-block">&larr; Назад в кабинет</Link>
            <h1 className="text-2xl font-bold text-gray-900">Домашние задания</h1>
          </div>
          <Link href="/dashboard/assignments/new" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">+ Создать ДЗ</Link>
        </div>

        {loading ? (
          <p>Загрузка...</p>
        ) : assignments.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-500">У вас пока нет созданных ДЗ.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((a) => (
              <div key={a.id} className="rounded-lg bg-white p-4 shadow border border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-900">{a.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{a.description || 'Без описания'}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>Заданий: <strong>{a.hw_assignment_tasks?.[0]?.count || 0}</strong></span>
                    <span>Учеников: <strong>{a.hw_assignment_students?.[0]?.count || 0}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/dashboard/assignments/${a.id}`} className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium">Проверить</Link>
                  <Link href={`/dashboard/assignments/edit/${a.id}`} className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-600 hover:bg-blue-100 font-medium">Редактировать</Link>
                  <button onClick={() => handleDelete(a.id)} className="rounded bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100 font-medium">Удалить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

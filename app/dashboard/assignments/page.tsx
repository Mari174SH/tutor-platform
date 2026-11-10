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

  useEffect(() => {
    const fetchAssignments = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('hw_assignments')
        .select('*, hw_assignment_tasks(count), hw_assignment_students(count)')
        .order('created_at', { ascending: false })

      if (data) setAssignments(data)
      setLoading(false)
    }

    fetchAssignments()
  }, [supabase, router])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
              &larr; Назад в кабинет
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Домашние задания</h1>
          </div>
          <Link href="/dashboard/assignments/new" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">
            + Создать ДЗ
          </Link>
        </div>

        {loading ? (
          <p>Загрузка...</p>
        ) : assignments.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-500">У вас пока нет созданных домашних заданий.</p>
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
                <Link 
                  href={`/dashboard/assignments/${a.id}`}
                  className="rounded bg-gray-50 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium"
                >
                  Открыть
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '../../../../supabase'
import Link from 'next/link'

export default function EditAssignmentPage() {
  const router = useRouter()
  const params = useParams()
  const assignmentId = params.id as string
  const supabase = useMemo(() => createClient(), [])
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')

  useEffect(() => {
    const fetchAssignment = async () => {
      const { data, error } = await supabase
        .from('hw_assignments')
        .select('*, hw_assignment_students(deadline)')
        .eq('id', assignmentId)
        .single()
      
      if (error || !data) {
        setError('ДЗ не найдено')
        setLoading(false)
        return
      }

      setTitle(data.title)
      setDescription(data.description || '')
      
      // Берем дедлайн у первого ученика (так как мы назначаем один дедлайн на всех)
      if (data.hw_assignment_students?.[0]?.deadline) {
        const dl = new Date(data.hw_assignment_students[0].deadline)
        // Форматируем для input datetime-local
        const iso = new Date(dl.getTime() - dl.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        setDeadline(iso)
      }

      setLoading(false)
    }

    fetchAssignment()
  }, [assignmentId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // 1. Обновляем название и описание
      const { error: updateError } = await supabase
        .from('hw_assignments')
        .update({ title, description })
        .eq('id', assignmentId)
      
      if (updateError) throw updateError

      // 2. Обновляем дедлайн для всех учеников этого ДЗ
      const deadlineValue = deadline ? new Date(deadline).toISOString() : null
      const { error: deadlineError } = await supabase
        .from('hw_assignment_students')
        .update({ deadline: deadlineValue })
        .eq('assignment_id', assignmentId)
      
      if (deadlineError) throw deadlineError

      router.push('/dashboard/assignments')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Загрузка...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link href="/dashboard/assignments" className="text-sm text-blue-600 hover:underline mb-2 inline-block">&larr; Назад к списку</Link>
          <h1 className="text-2xl font-bold text-gray-900">Редактировать ДЗ</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
          {error && <div className="rounded bg-red-50 p-3 text-red-600">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700">Название ДЗ</label>
            <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Описание</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Дедлайн (необязательно)</label>
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
            <p className="text-xs text-gray-500 mt-1">При изменении дедлайн применится ко всем ученикам этого ДЗ.</p>
          </div>

          <button type="submit" disabled={saving} className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50">
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </form>
      </div>
    </div>
  )
}

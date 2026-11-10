'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../supabase'
import Link from 'next/link'

export default function StudentsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Состояния для формы добавления
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLogin, setNewLogin] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdData, setCreatedData] = useState<{login: string, password: string} | null>(null)

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('hw_profiles')
      .select('*')
      .eq('role', 'student')
      .order('full_name')
    
    if (data) setStudents(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchStudents()
  }, [supabase])

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setCreatedData(null)

    try {
      const res = await fetch('/api/create-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: newName, login: newLogin })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Показываем созданный логин и пароль
      setCreatedData({ login: data.login, password: data.password })
      setNewName('')
      setNewLogin('')
      fetchStudents() // Обновляем список
    } catch (err: any) {
      alert('Ошибка: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline mb-2 inline-block">&larr; Назад в кабинет</Link>
            <h1 className="text-2xl font-bold text-gray-900">Мои ученики</h1>
          </div>
          <button onClick={() => { setIsModalOpen(true); setCreatedData(null); }} className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">
            + Добавить ученика
          </button>
        </div>

        {loading ? (
          <p>Загрузка...</p>
        ) : students.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-500">У вас пока нет учеников.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Имя</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Логин (Email)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.full_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модальное окно добавления */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Новый ученик</h2>
            
            {createdData ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 p-4 rounded-md text-green-800">
                  <p className="font-bold mb-2">Ученик успешно создан!</p>
                  <p>Передайте эти данные ученику для входа:</p>
                  <div className="mt-3 bg-white p-3 rounded border border-green-300 font-mono text-sm">
                    <p><strong>Логин:</strong> {createdData.login}</p>
                    <p><strong>Пароль:</strong> {createdData.password}</p>
                  </div>
                  <p className="text-xs mt-2 text-green-600">Для входа нужно ввести полный email: {createdData.login.toLowerCase()}@tutor.local</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-full rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300">Закрыть</button>
              </div>
            ) : (
              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Имя ученика</label>
                  <input required type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Мария Иванова" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Логин (латиницей)</label>
                  <input required type="text" value={newLogin} onChange={(e) => setNewLogin(e.target.value)} placeholder="masha_math" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
                  <p className="text-xs text-gray-500 mt-1">Будет создан email: {newLogin ? newLogin.toLowerCase().replace(/[^a-z0-9]/g, '') : '...'}@tutor.local</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-md bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200">Отмена</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50">
                    {isSubmitting ? 'Создание...' : 'Создать'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

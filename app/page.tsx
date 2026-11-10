'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../supabase'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ full_name: string, role: string } | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Получаем профиль из нашей таблицы hw_profiles
      const { data } = await supabase
        .from('hw_profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

      setProfile(data)
      setLoading(false)
    }

    fetchProfile()
  }, [supabase, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Загрузка...</div>
  }

  // Если это ученик — пока заглушку (сделаем позже)
  if (profile?.role === 'student') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Привет, ученик! Здесь скоро появится твоя домашка.</h1>
        <button onClick={handleLogout} className="mt-4 text-red-500">Выйти</button>
      </div>
    )
  }

  // Интерфейс репетитора
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Кабинет репетитора</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Привет, {profile?.full_name || 'Репетитор'}!</span>
              <button
                onClick={handleLogout}
                className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Карточка 1 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Библиотека заданий</h2>
            <p className="mt-2 text-sm text-gray-500">Управляйте заданиями для ЕГЭ и ОГЭ.</p>
            <Link href="/dashboard/tasks" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500">
              Перейти
            </Link>
          </div>

          {/* Карточка 2 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Домашние задания</h2>
            <p className="mt-2 text-sm text-gray-500">Создавайте ДЗ и проверяйте ответы учеников.</p>
            <Link href="/dashboard/assignments" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500">
              Перейти
            </Link>
          </div>

          {/* Карточка 3 */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Мои ученики</h2>
            <p className="mt-2 text-sm text-gray-500">Список учеников и их прогресс.</p>
            <Link href="/dashboard/students" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500">
              Перейти
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

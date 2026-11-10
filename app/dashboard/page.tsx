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
  const [studentAssignments, setStudentAssignments] = useState<any[]>([])

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profileData } = await supabase
        .from('hw_profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      if (profileData?.role === 'student') {
        // 1. Получаем связи ученика с ДЗ
        const { data: links } = await supabase
          .from('hw_assignment_students')
          .select('*')
          .eq('student_id', user.id)
        
        if (links && links.length > 0) {
          const assignmentIds = links.map(l => l.assignment_id)
          
          // 2. Получаем сами ДЗ
          const { data: assignmentsData } = await supabase
            .from('hw_assignments')
            .select('*')
            .in('id', assignmentIds)

          // 3. Получаем количество задач в каждом ДЗ
          const { data: tasksData } = await supabase
            .from('hw_assignment_tasks')
            .select('assignment_id')
            .in('assignment_id', assignmentIds)

          // 4. Получаем ответы ученика (для подсчета процентов)
          const { data: submissionsData } = await supabase
            .from('hw_submissions')
            .select('assignment_id, is_correct')
            .eq('student_id', user.id)

          const combined = links.map(link => {
            const assignment = assignmentsData?.find(a => a.id === link.assignment_id)
            const totalTasks = tasksData?.filter(t => t.assignment_id === link.assignment_id).length || 0
            
            // Считаем правильные и проверенные ответы
            const mySubmissions = submissionsData?.filter(s => s.assignment_id === link.assignment_id) || []
            const checkedSubmissions = mySubmissions.filter(s => s.is_correct !== null)
            const correctSubmissions = checkedSubmissions.filter(s => s.is_correct === true)

            // Процент правильности (только если есть проверенные ответы)
            const percent = checkedSubmissions.length > 0 
              ? Math.round((correctSubmissions.length / checkedSubmissions.length) * 100) 
              : null

            return {
              ...link,
              title: assignment?.title || 'Без названия',
              description: assignment?.description || '',
              totalTasks: totalTasks,
              checkedCount: checkedSubmissions.length,
              correctCount: correctSubmissions.length,
              percent: percent
            }
          })

          setStudentAssignments(combined)
        }
      }
      setLoading(false)
    }

    fetchProfile()
  }, [supabase, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center">Загрузка...</div>

  // ИНТЕРФЕЙС УЧЕНИКА
  if (profile?.role === 'student') {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <h1 className="text-xl font-bold text-gray-900">Мои домашние задания</h1>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Привет, {profile.full_name}!</span>
                <button onClick={handleLogout} className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100">Выйти</button>
              </div>
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {studentAssignments.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center shadow">
                <p className="text-gray-500">У вас пока нет назначенных домашних заданий.</p>
              </div>
            ) : (
              studentAssignments.map((item) => {
                const isOverdue = item.deadline && new Date(item.deadline) < new Date()
                const isCompleted = item.checkedCount > 0

                return (
                  <div key={item.id} className="rounded-lg bg-white p-6 shadow border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">{item.title}</h2>
                        <p className="text-sm text-gray-500 mt-1">{item.description || 'Без описания'}</p>
                      </div>
                      <Link 
                        href={`/dashboard/student-assignment/${item.assignment_id}`}
                        className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                          isOverdue ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-500'
                        }`}
                      >
                        {isOverdue ? 'Посмотреть' : isCompleted ? 'Результаты' : 'Решить'}
                      </Link>
                    </div>
                    
                    <div className="flex gap-4 text-sm text-gray-600 mb-4">
                      <span>Задач: <strong>{item.totalTasks}</strong></span>
                      {item.deadline && (
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          Дедлайн: {new Date(item.deadline).toLocaleString('ru-RU')}
                        </span>
                      )}
                    </div>

                    {/* Прогресс-бар правильности */}
                    {isCompleted && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">Правильность</span>
                          <span className={`text-sm font-bold ${item.percent >= 80 ? 'text-green-600' : item.percent >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {item.percent}% ({item.correctCount} из {item.checkedCount})
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${item.percent >= 80 ? 'bg-green-500' : item.percent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                            style={{ width: `${item.percent}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </main>
      </div>
    )
  }

  // ИНТЕРФЕЙС РЕПЕТИТОРА
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
              <button onClick={handleLogout} className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100">Выйти</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Библиотека заданий</h2>
            <p className="mt-2 text-sm text-gray-500">Управляйте заданиями для ЕГЭ и ОГЭ.</p>
            <Link href="/dashboard/tasks" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500">Перейти</Link>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Домашние задания</h2>
            <p className="mt-2 text-sm text-gray-500">Создавайте ДЗ и проверяйте ответы учеников.</p>
            <Link href="/dashboard/assignments" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500">Перейти</Link>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Мои ученики</h2>
            <p className="mt-2 text-sm text-gray-500">Список учеников и их прогресс.</p>
            <Link href="/dashboard/students" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500">Перейти</Link>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Темы и разделы</h2>
            <p className="mt-2 text-sm text-gray-500">Создавайте структуру для ЕГЭ и ОГЭ.</p>
            <Link href="/dashboard/topics" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500">Перейти</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

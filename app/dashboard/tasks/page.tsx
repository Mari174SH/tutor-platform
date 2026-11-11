'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../supabase'
import Link from 'next/link'
import MathText from '../../components/MathText'

export default function TasksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  
  const [tasks, setTasks] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [subtopics, setSubtopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Фильтры берем из URL (если они там есть)
  const [selectedTopic, setSelectedTopic] = useState(searchParams.get('topic') || '')
  const [selectedSubtopic, setSelectedSubtopic] = useState(searchParams.get('subtopic') || '')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: topicsData } = await supabase.from('hw_topics').select('*').order('topic_number')
    if (topicsData) setTopics(topicsData)

    const { data: tasksData } = await supabase
      .from('hw_tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (tasksData) setTasks(tasksData)

    setLoading(false)
  }

  // Обновляем URL при смене фильтров
  const updateUrl = (topic: string, subtopic: string) => {
    const params = new URLSearchParams()
    if (topic) params.set('topic', topic)
    if (subtopic) params.set('subtopic', subtopic)
    router.replace(`/dashboard/tasks?${params.toString()}`)
  }

  useEffect(() => {
    updateUrl(selectedTopic, selectedSubtopic)
    
    if (!selectedTopic) {
      setSubtopics([])
      setSelectedSubtopic('')
      return
    }
    const fetchSubtopics = async () => {
      const { data } = await supabase.from('hw_subtopics').select('*').eq('topic_id', selectedTopic)
      if (data) setSubtopics(data)
    }
    fetchSubtopics()
  }, [selectedTopic, supabase])

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (selectedTopic && task.topic_id !== parseInt(selectedTopic)) return false
      if (selectedSubtopic && task.subtopic_id !== parseInt(selectedSubtopic)) return false
      return true
    })
  }, [tasks, selectedTopic, selectedSubtopic])

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить задание?')) return
    const { error } = await supabase.from('hw_tasks').delete().eq('id', id)
    if (!error) setTasks(tasks.filter(t => t.id !== id))
  }

  if (loading) return <div className="p-8 text-center">Загрузка...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-blue-600 hover:underline mb-2 inline-block">&larr; Назад в кабинет</Link>
            <h1 className="text-2xl font-bold text-gray-900">Библиотека заданий</h1>
          </div>
          <Link href="/dashboard/tasks/new" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">
            + Добавить задание
          </Link>
        </div>

        <div className="mb-6 bg-white p-4 rounded-lg shadow flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Тема</label>
            <select 
              value={selectedTopic} 
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Все темы</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>
                  {t.exam_type === 'ege' ? 'ЕГЭ' : 'ОГЭ'} | {t.subject} | {t.topic_number ? `№${t.topic_number}` : ''} {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Подтема</label>
            <select 
              value={selectedSubtopic} 
              onChange={(e) => setSelectedSubtopic(e.target.value)}
              disabled={!selectedTopic}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
            >
              <option value="">Все подтемы</option>
              {subtopics.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={() => { setSelectedTopic(''); setSelectedSubtopic(''); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline pb-2"
          >
            Сбросить
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">Найдено заданий: {filteredTasks.length}</p>
          
          {filteredTasks.map((task) => (
            <div key={task.id} id={`task-${task.id}`} className="rounded-lg bg-white p-4 shadow border border-gray-100 flex justify-between items-start">
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
                {/* Передаем фильтры в ссылку, чтобы вернуться обратно */}
                <Link 
                  href={`/dashboard/tasks/edit/${task.id}?returnTopic=${selectedTopic}&returnSubtopic=${selectedSubtopic}`}
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
          
          {filteredTasks.length === 0 && (
            <div className="text-center p-8 text-gray-500 bg-white rounded-lg shadow">
              Заданий по выбранным фильтрам не найдено.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../supabase'
import Link from 'next/link'

export default function TopicsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Состояния для новой темы
  const [newTitle, setNewTitle] = useState('')
  const [newExam, setNewExam] = useState('ege')
  const [newSubject, setNewSubject] = useState('Математика')
  const [newNumber, setNewNumber] = useState('')

  useEffect(() => {
    fetchTopics()
  }, [])

  const fetchTopics = async () => {
    const { data } = await supabase
      .from('hw_topics')
      .select('*, hw_subtopics(*)')
      .order('created_at', { ascending: false })
    
    if (data) setTopics(data)
    setLoading(false)
  }

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle) return

    const { error } = await supabase
      .from('hw_topics')
      .insert({
        title: newTitle,
        exam_type: newExam,
        subject: newSubject,
        topic_number: newNumber,
      })

    if (!error) {
      setNewTitle('')
      setNewNumber('')
      fetchTopics()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            &larr; Назад в кабинет
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Управление темами</h1>
          <p className="text-sm text-gray-500 mt-1">Создавайте разделы (например, «№12 Графики функций») и добавляйте в них подтемы.</p>
        </div>

        {/* Форма создания темы */}
        <form onSubmit={handleCreateTopic} className="mb-8 rounded-lg bg-white p-4 shadow flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700">Экзамен</label>
            <select value={newExam} onChange={(e) => setNewExam(e.target.value)} className="mt-1 w-full rounded border px-2 py-1.5 text-sm">
              <option value="ege">ЕГЭ</option>
              <option value="oge">ОГЭ</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700">Предмет</label>
            <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
          </div>
          <div className="w-24">
            <label className="block text-xs font-medium text-gray-700">Номер</label>
            <input type="text" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} placeholder="12" className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
          </div>
          <div className="flex-[2] min-w-[250px]">
            <label className="block text-xs font-medium text-gray-700">Название темы</label>
            <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Графики функций" className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
          </div>
          <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500">
            Создать тему
          </button>
        </form>

        {/* Список тем */}
        {loading ? (
          <p>Загрузка...</p>
        ) : (
          <div className="space-y-4">
            {topics.map((topic) => (
              <div key={topic.id} className="rounded-lg bg-white border shadow-sm">
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">
                      {topic.topic_number ? `№${topic.topic_number} ` : ''}{topic.title}
                    </span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      {topic.exam_type === 'ege' ? 'ЕГЭ' : 'ОГЭ'}
                    </span>
                    <span className="text-xs text-gray-500">{topic.subject}</span>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {topic.hw_subtopics?.length > 0 ? (
                    topic.hw_subtopics.map((sub: any) => (
                      <div key={sub.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <span className="text-sm text-gray-700">{sub.title}</span>
                        <span className="text-xs text-gray-400">0 шт</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 italic">Нет подтем. (Мы добавим форму для их создания на следующем шаге)</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

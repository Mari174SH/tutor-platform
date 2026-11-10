'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../supabase'
import Link from 'next/link'

export default function NewTaskPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [answerText, setAnswerText] = useState('')
  const [answerType, setAnswerType] = useState('exact') // exact, numeric, manual
  const [files, setFiles] = useState<File[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Не авторизован')

      // 1. Загружаем картинки в Supabase Storage (если они есть)
      const imageUrls: string[] = []
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('task-images')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('task-images')
          .getPublicUrl(fileName)
        
        imageUrls.push(publicUrl)
      }

      // 2. Сохраняем само задание в базу
      const { error: insertError } = await supabase
        .from('hw_tasks')
        .insert({
          title,
          content_html: content,
          answer_text: answerText,
          answer_type: answerType,
          images: imageUrls,
          // topic_id пока оставим null, так как мы еще не создали темы
        })

      if (insertError) throw insertError

      router.push('/dashboard/tasks')
      router.refresh()
      
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/dashboard/tasks" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            &larr; Назад к библиотеке
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Новое задание</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
          {error && <div className="rounded bg-red-50 p-3 text-red-600">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700">Название (для себя)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Задача 1. Кинематика"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Текст задания</label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Введите условие задачи..."
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Фотографии (если есть)</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Тип ответа</label>
              <select
                value={answerType}
                onChange={(e) => setAnswerType(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="exact">Точный текст</option>
                <option value="numeric">Число</option>
                <option value="manual">Ручная проверка (развернутый)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Правильный ответ</label>
              <input
                type="text"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Для автопроверки"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить задание'}
          </button>
        </form>
      </div>
    </div>
  )
}

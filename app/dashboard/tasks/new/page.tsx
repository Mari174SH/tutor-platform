'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../supabase'
import Link from 'next/link'

export default function NewTaskPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [topics, setTopics] = useState<any[]>([])
  const [subtopics, setSubtopics] = useState<any[]>([])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [answerText, setAnswerText] = useState('')
  const [answerType, setAnswerType] = useState('numeric')
  const [files, setFiles] = useState<File[]>([])
  
  const [selectedTopicId, setSelectedTopicId] = useState('')
  const [selectedSubtopicId, setSelectedSubtopicId] = useState('')

  useEffect(() => {
    const fetchTopics = async () => {
      const { data } = await supabase.from('hw_topics').select('*').order('topic_number')
      if (data) setTopics(data)
    }
    fetchTopics()
  }, [supabase])

  useEffect(() => {
    if (!selectedTopicId) {
      setSubtopics([])
      setSelectedSubtopicId('')
      return
    }
    const fetchSubtopics = async () => {
      const { data } = await supabase.from('hw_subtopics').select('*').eq('topic_id', selectedTopicId)
      if (data) setSubtopics(data)
    }
    fetchSubtopics()
  }, [selectedTopicId, supabase])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)])
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    const newFiles: File[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile()
        if (blob) {
          newFiles.push(new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type }))
        }
      }
    }
    if (newFiles.length > 0) setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleAnswerChange = (value: string) => {
    setAnswerText(value)
    if (/^-?\d+([.,]\d+)?$/.test(value.trim())) {
      setAnswerType('numeric')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Не авторизован')

      // Берем балл из выбранной темы
      const topic = topics.find(t => t.id === parseInt(selectedTopicId))
      const maxScore = topic?.max_score || 1

      const imageUrls: string[] = []
      for (const file of files) {
        const fileExt = file.name.split('.').pop() || 'png'
        const fileName = `${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('task-images').upload(fileName, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('task-images').getPublicUrl(fileName)
        imageUrls.push(publicUrl)
      }

      const { error: insertError } = await supabase.from('hw_tasks').insert({
        title,
        content_html: content,
        answer_text: answerText,
        answer_type: answerType,
        max_score: maxScore, // Берем из темы
        images: imageUrls,
        topic_id: selectedTopicId ? parseInt(selectedTopicId) : null,
        subtopic_id: selectedSubtopicId ? parseInt(selectedSubtopicId) : null,
      })

      if (insertError) throw insertError

      router.push('/dashboard/tasks')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/dashboard/tasks" className="text-sm text-blue-600 hover:underline mb-2 inline-block">&larr; Назад к библиотеке</Link>
          <h1 className="text-2xl font-bold text-gray-900">Новое задание</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
          {error && <div className="rounded bg-red-50 p-3 text-red-600">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Тема (Раздел)</label>
              <select required value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
                <option value="">-- Выберите тему --</option>
                {topics.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.exam_type === 'ege' ? 'ЕГЭ' : 'ОГЭ'} | {t.subject} | {t.topic_number ? `№${t.topic_number}` : ''} {t.title} ({t.max_score} б.)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Подтема</label>
              <select value={selectedSubtopicId} onChange={(e) => setSelectedSubtopicId(e.target.value)} disabled={!selectedTopicId || subtopics.length === 0} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100">
                <option value="">-- Выберите подтему --</option>
                {subtopics.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Название (для себя)</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Задача на скорость" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Текст задания</label>
            <textarea required rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Введите условие задачи..." className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>

          <div onPaste={handlePaste} tabIndex={0} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
            <p className="text-sm text-gray-600 mb-2"><strong>Вставьте картинку (Ctrl+V)</strong> или выберите файл:</p>
            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100" />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Прикрепленные файлы:</p>
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between rounded bg-gray-50 p-2 text-sm">
                  <span className="truncate">{file.name} ({(file.size / 1024).toFixed(1)} КБ)</span>
                  <button type="button" onClick={() => removeFile(index)} className="text-red-500 font-bold ml-2">✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Тип ответа</label>
              <select value={answerType} onChange={(e) => setAnswerType(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
                <option value="numeric">Число</option>
                <option value="exact">Точный текст</option>
                <option value="manual">Ручная проверка</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Правильный ответ</label>
              <input 
                type="text" 
                value={answerText} 
                onChange={(e) => handleAnswerChange(e.target.value)} 
                placeholder="Например: 74 или 1,5" 
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" 
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50">
            {loading ? 'Сохранение...' : 'Сохранить задание'}
          </button>
        </form>
      </div>
    </div>
  )
}

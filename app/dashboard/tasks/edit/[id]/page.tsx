'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '../../../../supabase'
import Link from 'next/link'

export default function EditTaskPage() {
  const router = useRouter()
  const params = useParams()
  const taskId = params.id as string
  
  const supabase = useMemo(() => createClient(), [])
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [topics, setTopics] = useState<any[]>([])
  const [subtopics, setSubtopics] = useState<any[]>([])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [answerText, setAnswerText] = useState('')
  const [answerType, setAnswerType] = useState('exact')
  const [selectedTopicId, setSelectedTopicId] = useState('')
  const [selectedSubtopicId, setSelectedSubtopicId] = useState('')
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])

  // Загружаем темы
  useEffect(() => {
    const fetchTopics = async () => {
      const { data } = await supabase.from('hw_topics').select('*').order('topic_number')
      if (data) setTopics(data)
    }
    fetchTopics()
  }, [supabase])

  // Загружаем подтемы, когда выбрана тема
  useEffect(() => {
    if (!selectedTopicId) {
      setSubtopics([])
      return
    }
    const fetchSubtopics = async () => {
      const { data } = await supabase.from('hw_subtopics').select('*').eq('topic_id', selectedTopicId)
      if (data) setSubtopics(data)
    }
    fetchSubtopics()
  }, [selectedTopicId, supabase])

  // Загружаем само задание
  useEffect(() => {
    if (!taskId) return

    const fetchTask = async () => {
      const { data, error } = await supabase.from('hw_tasks').select('*').eq('id', taskId).single()
      
      if (error || !data) {
        setError('Задание не найдено')
        setLoading(false)
        return
      }

      setTitle(data.title || '')
      setContent(data.content_html || '')
      setAnswerText(data.answer_text || '')
      setAnswerType(data.answer_type || 'exact')
      setSelectedTopicId(data.topic_id ? String(data.topic_id) : '')
      setSelectedSubtopicId(data.subtopic_id ? String(data.subtopic_id) : '')
      setExistingImages(data.images || [])
      setLoading(false)
    }

    fetchTask()
  }, [taskId, supabase])

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

  const removeExistingImage = (url: string) => {
    setExistingImages(prev => prev.filter(img => img !== url))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Загружаем новые картинки (если есть)
      const newImageUrls: string[] = []
      for (const file of files) {
        const fileExt = file.name.split('.').pop() || 'png'
        const fileName = `${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('task-images').upload(fileName, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('task-images').getPublicUrl(fileName)
        newImageUrls.push(publicUrl)
      }

      const allImages = [...existingImages, ...newImageUrls]

      const { error: updateError } = await supabase.from('hw_tasks').update({
        title,
        content_html: content,
        answer_text: answerText,
        answer_type: answerType,
        images: allImages,
        topic_id: selectedTopicId ? parseInt(selectedTopicId) : null,
        subtopic_id: selectedSubtopicId ? parseInt(selectedSubtopicId) : null,
      }).eq('id', taskId)

      if (updateError) throw updateError

      router.push('/dashboard/tasks')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Загрузка задания...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/dashboard/tasks" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            &larr; Назад к библиотеке
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Редактировать задание (ID: {taskId})</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
          {error && <div className="rounded bg-red-50 p-3 text-red-600">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Тема (Раздел)</label>
              <select value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
                <option value="">-- Выберите тему --</option>
                {topics.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.exam_type === 'ege' ? 'ЕГЭ' : 'ОГЭ'} | {t.subject} | {t.topic_number ? `№${t.topic_number}` : ''} {t.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Подтема</label>
              <select value={selectedSubtopicId} onChange={(e) => setSelectedSubtopicId(e.target.value)} disabled={!selectedTopicId} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100">
                <option value="">-- Выберите подтему --</option>
                {subtopics.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Название (для себя)</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Текст задания</label>
            <textarea required rows={5} value={content} onChange={(e) => setContent(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>

          {/* Существующие картинки */}
          {existingImages.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Текущие картинки:</p>
              <div className="flex flex-wrap gap-4">
                {existingImages.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="Task image" className="h-24 w-auto object-cover rounded border" />
                    <button 
                      type="button"
                      onClick={() => removeExistingImage(url)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div onPaste={handlePaste} tabIndex={0} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
            <p className="text-sm text-gray-600 mb-2"><strong>Добавить новые картинки (Ctrl+V)</strong></p>
            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100" />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Новые файлы:</p>
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between rounded bg-gray-50 p-2 text-sm">
                  <span className="truncate">{file.name}</span>
                  <button type="button" onClick={() => removeFile(index)} className="text-red-500 font-bold ml-2">✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Тип ответа</label>
              <select value={answerType} onChange={(e) => setAnswerType(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
                <option value="exact">Точный текст</option>
                <option value="numeric">Число</option>
                <option value="manual">Ручная проверка (развернутый)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Правильный ответ</label>
              <input type="text" value={answerText} onChange={(e) => setAnswerText(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50">
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </form>
      </div>
    </div>
  )
}

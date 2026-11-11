'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '../../../supabase'
import Link from 'next/link'
import MathText from '../../../components/MathText'

export default function AssignmentDetailsPage() {
  const params = useParams()
  const assignmentId = params.id as string
  const supabase = useMemo(() => createClient(), [])
  
  const [loading, setLoading] = useState(true)
  const [assignment, setAssignment] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentTasks, setStudentTasks] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const { data: assignData } = await supabase
        .from('hw_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single()
      if (assignData) setAssignment(assignData)

      const { data: studentLinks } = await supabase
        .from('hw_assignment_students')
        .select('*, hw_profiles(full_name)')
        .eq('assignment_id', assignmentId)

      if (studentLinks) {
        setStudents(studentLinks)
        if (studentLinks.length > 0) setSelectedStudentId(studentLinks[0].student_id)
      }
      setLoading(false)
    }

    fetchData()
  }, [assignmentId, supabase])

  useEffect(() => {
    if (!selectedStudentId) return

    const fetchStudentAnswers = async () => {
      const { data: taskLinks } = await supabase
        .from('hw_assignment_tasks')
        .select('task_id, position, hw_tasks(id, title, content_html, answer_text, answer_type, images, max_score)')
        .eq('assignment_id', assignmentId)
        .order('position')

      const { data: submissions } = await supabase
        .from('hw_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', selectedStudentId)

      if (taskLinks) {
        const combined = taskLinks.map((link: any) => {
          const task = link.hw_tasks
          const submission = submissions?.find(s => s.task_id === task.id)
          return { ...task, submission: submission || null }
        })
        setStudentTasks(combined)
      }
    }

    fetchStudentAnswers()
  }, [selectedStudentId, assignmentId, supabase])

  const handleMarkCorrect = async (submissionId: number, isCorrect: boolean) => {
    const { error } = await supabase
      .from('hw_submissions')
      .update({ is_correct: isCorrect })
      .eq('id', submissionId)

    if (!error) {
      setStudentTasks(prev => prev.map(t => {
        if (t.submission && t.submission.id === submissionId) {
          return { ...t, submission: { ...t.submission, is_correct: isCorrect } }
        }
        return t
      }))
    }
  }

  const handleSaveScore = async (submissionId: number, score: number) => {
    const { error } = await supabase
      .from('hw_submissions')
      .update({ score: score })
      .eq('id', submissionId)

    if (!error) {
      setStudentTasks(prev => prev.map(t => {
        if (t.submission && t.submission.id === submissionId) {
          return { ...t, submission: { ...t.submission, score: score } }
        }
        return t
      }))
    } else {
      alert('Ошибка при сохранении балла: ' + error.message)
    }
  }

  const stats = useMemo(() => {
    let totalMaxScore = 0
    let totalScore = 0
    studentTasks.forEach(t => {
      if (t.submission && t.submission.score !== null) {
        totalScore += t.submission.score
      }
      totalMaxScore += t.max_score || 1
    })

    return {
      totalScore,
      totalMaxScore,
      percent: totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0
    }
  }, [studentTasks])

  if (loading) return <div className="p-8 text-center">Загрузка...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link href="/dashboard/assignments" className="text-sm text-blue-600 hover:underline mb-2 inline-block">&larr; Назад к списку ДЗ</Link>
          <h1 className="text-2xl font-bold text-gray-900">Проверка: {assignment?.title}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 bg-white rounded-lg shadow p-4 h-fit">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Ученики</h2>
            <div className="space-y-1">
              {students.map((student) => (
                <button
                  key={student.student_id}
                  onClick={() => setSelectedStudentId(student.student_id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedStudentId === student.student_id 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {student.hw_profiles?.full_name || 'Без имени'}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 space-y-4">
            {selectedStudentId && (
              <div className="bg-white rounded-lg shadow p-4 border border-gray-200 flex items-center gap-6">
                <div>
                  <p className="text-sm text-gray-500">Баллы</p>
                  <p className={`text-2xl font-bold ${stats.percent >= 80 ? 'text-green-600' : stats.percent >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {stats.totalScore} / {stats.totalMaxScore}
                  </p>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Процент: {stats.percent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${stats.percent >= 80 ? 'bg-green-500' : stats.percent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                      style={{ width: `${stats.percent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {selectedStudentId ? (
              studentTasks.map((task, index) => (
                <div key={task.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-gray-800">Задание {index + 1}</h3>
                    <div className="text-sm text-right">
                      <span className="text-gray-500 block mb-1">Макс. балл: {task.max_score || 1}</span>
                      {task.answer_text && (
                        <span className="font-mono bg-green-50 px-2 py-1 rounded text-green-700 font-bold">
                          {task.answer_text}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Текст задания и картинки задания */}
                  <div className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded border border-gray-100 whitespace-pre-wrap">
                    <MathText text={task.content_html} />
                    
                    {/* ВОТ ЗДЕСЬ ВЫВОДИМ КАРТИНКИ ЗАДАНИЯ */}
                    {task.images && task.images.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-4">
                        {task.images.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block border rounded overflow-hidden hover:opacity-80">
                            <img src={url} alt={`Task image ${i + 1}`} className="max-h-48 w-auto object-contain" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Ответ ученика:</p>
                    {task.submission ? (
                      <div className="flex flex-col gap-3">
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-md text-gray-800 min-h-[3rem]">
                          {task.submission.answer_text || <span className="text-gray-400 italic">Пустой ответ</span>}
                        </div>

                        {/* Прикрепленные учеником файлы */}
                        {task.submission.images && task.submission.images.length > 0 && (
                          <div className="flex flex-wrap gap-4 mt-2">
                            {task.submission.images.map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block border-2 border-blue-200 rounded overflow-hidden hover:opacity-80">
                                <img src={url} alt={`Student answer ${i + 1}`} className="max-h-48 w-auto object-contain" />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Оценка для тестовых заданий */}
                        {task.answer_type !== 'manual' && (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => handleMarkCorrect(task.submission.id, true)}
                              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                                task.submission.is_correct === true 
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              Верно
                            </button>
                            <button
                              onClick={() => handleMarkCorrect(task.submission.id, false)}
                              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                                task.submission.is_correct === false 
                                  ? 'bg-red-600 text-white' 
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              Неверно
                            </button>
                          </div>
                        )}

                        {/* Оценка для развернутых заданий (баллы) */}
                        {task.answer_type === 'manual' && (
                          <div className="flex items-center gap-2 mt-2">
                            <label className="text-sm text-gray-700">Баллы:</label>
                            <input
                              type="number"
                              min="0"
                              max={task.max_score || 1}
                              value={task.submission.score || 0}
                              onChange={(e) => handleSaveScore(task.submission.id, parseInt(e.target.value) || 0)}
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                            />
                            <span className="text-sm text-gray-500">из {task.max_score || 1}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-500 italic text-sm">
                        Ученик еще не ответил на это задание.
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Выберите ученика слева.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

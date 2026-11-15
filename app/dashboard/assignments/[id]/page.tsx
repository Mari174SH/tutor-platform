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
        .select('task_id, position, hw_tasks(id, title, content_html, answer_text, answer_type, images, max_score, sub_questions)')
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
          
          // Парсим sub_questions, если пришла строка
          let parsedSubQuestions = [];
          if (task.sub_questions) {
            if (typeof task.sub_questions === 'string') {
              try { parsedSubQuestions = JSON.parse(task.sub_questions); } catch (e) { parsedSubQuestions = []; }
            } else if (Array.isArray(task.sub_questions)) {
              parsedSubQuestions = task.sub_questions;
            }
          }
          
          return { ...task, sub_questions: parsedSubQuestions, submission: submission || null }
        })
        setStudentTasks(combined)
      }
    }

    fetchStudentAnswers()
  }, [selectedStudentId, assignmentId, supabase])

  const handleMarkCorrect = async (submissionId: number, isCorrect: boolean, maxScore: number) => {
    const newScore = isCorrect ? maxScore : 0;
    const { error } = await supabase
      .from('hw_submissions')
      .update({ is_correct: isCorrect, score: newScore })
      .eq('id', submissionId)

    if (!error) {
      setStudentTasks(prev => prev.map(t => {
        if (t.submission && t.submission.id === submissionId) {
          return { ...t, submission: { ...t.submission, is_correct: isCorrect, score: newScore } }
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
    let testTasks = 0;
    let testCorrect = 0;
    let manualTasks = 0;
    let manualScore = 0;
    let manualMaxScore = 0;

    studentTasks.forEach(t => {
      const hasSubs = t.sub_questions && t.sub_questions.length > 0;
      
      // Если есть подвопросы ИЛИ это тестовое — считаем тестовым
      if (hasSubs || t.answer_type !== 'manual') {
        testTasks++;
        if (hasSubs) {
          const allSubsCorrect = t.submission?.sub_results && Object.values(t.submission.sub_results).every(v => v === true);
          if (allSubsCorrect) testCorrect++;
        } else {
          if (t.submission && t.submission.is_correct === true) testCorrect++;
        }
      } else {
        manualTasks++;
        manualMaxScore += t.max_score || 1;
        if (t.submission && t.submission.score !== null) {
          manualScore += t.submission.score;
        }
      }
    });

    return {
      testTasks,
      testCorrect,
      testPercent: testTasks > 0 ? Math.round((testCorrect / testTasks) * 100) : 0,
      manualTasks,
      manualScore,
      manualMaxScore,
      manualPercent: manualMaxScore > 0 ? Math.round((manualScore / manualMaxScore) * 100) : 0
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Тестовая часть</p>
                  <div className="flex items-end gap-3">
                    <p className={`text-2xl font-bold ${stats.testPercent >= 80 ? 'text-green-600' : stats.testPercent >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {stats.testPercent}%
                    </p>
                    <p className="text-sm text-gray-500 mb-1">
                      ({stats.testCorrect} из {stats.testTasks})
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full ${stats.testPercent >= 80 ? 'bg-green-500' : stats.testPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                      style={{ width: `${stats.testPercent}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Развернутая часть</p>
                  <div className="flex items-end gap-3">
                    <p className={`text-2xl font-bold ${stats.manualPercent >= 80 ? 'text-green-600' : stats.manualPercent >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {stats.manualScore} / {stats.manualMaxScore}
                    </p>
                    <p className="text-sm text-gray-500 mb-1">
                      баллов
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full ${stats.manualPercent >= 80 ? 'bg-green-500' : stats.manualPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                      style={{ width: `${stats.manualPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {selectedStudentId ? (
              studentTasks.map((task, index) => {
                const hasSubQuestions = task.sub_questions && task.sub_questions.length > 0;
                const subResults = task.submission?.sub_results || {};

                return (
                  <div key={task.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-gray-800">Задание {index + 1}</h3>
                      <div className="text-sm text-right">
                        <span className="text-gray-500 block mb-1">Макс. балл: {task.max_score || 1}</span>
                        {!hasSubQuestions && task.answer_text && (
                          <span className="font-mono bg-green-50 px-2 py-1 rounded text-green-700 font-bold">
                            {task.answer_text}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded border border-gray-100 whitespace-pre-wrap">
                      <MathText text={task.content_html} />
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
                          {hasSubQuestions ? (
                            <div className="space-y-2">
                              {task.sub_questions.map((q: any, subIndex: number) => {
                                const isCorrect = subResults[subIndex];
                                let studentAns = '';
                                try {
                                  const parsed = JSON.parse(task.submission.answer_text || '{}');
                                  studentAns = parsed[subIndex] || '';
                                } catch(e) {}

                                return (
                                  <div key={subIndex} className={`p-2 rounded border text-sm ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <p className="font-medium">{subIndex + 1}. {q.text}</p>
                                    <div className="flex justify-between mt-1">
                                      <span>Ответ: {studentAns || '—'}</span>
                                      <span className={isCorrect ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                        {isCorrect ? '✅ Верно' : `❌ Неверно (эталон: ${q.answer})`}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <>
                              <div className="p-3 bg-blue-50 border border-blue-100 rounded-md text-gray-800 min-h-[3rem]">
                                {task.submission.answer_text || <span className="text-gray-400 italic">Пустой ответ</span>}
                              </div>
                              
                              {task.submission.images && task.submission.images.length > 0 && (
                                <div className="flex flex-wrap gap-4 mt-2">
                                  {task.submission.images.map((url: string, i: number) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block border-2 border-blue-200 rounded overflow-hidden hover:opacity-80">
                                      <img src={url} alt={`Student answer ${i + 1}`} className="max-h-48 w-auto object-contain" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </>
                          )}

                          {task.answer_type !== 'manual' && !hasSubQuestions && (
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => handleMarkCorrect(task.submission.id, true, task.max_score || 1)}
                                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                                  task.submission.is_correct === true 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                Верно
                              </button>
                              <button
                                onClick={() => handleMarkCorrect(task.submission.id, false, task.max_score || 1)}
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

                          {task.answer_type === 'manual' && !hasSubQuestions && (
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

                          {hasSubQuestions && (
                            <div className="mt-2 text-sm font-medium">
                              Итоговый балл: {task.submission.score || 0} из {task.max_score || 1}
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
                );
              })
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

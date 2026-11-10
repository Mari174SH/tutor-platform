'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '../supabase'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-3xl font-bold">Вы вошли в систему!</h1>
      <p className="mt-4 text-gray-600">Здесь скоро будет ваш личный кабинет.</p>
      <button
        onClick={handleLogout}
        className="mt-8 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-500"
      >
        Выйти
      </button>
    </div>
  )
}

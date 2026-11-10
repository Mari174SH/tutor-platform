import { redirect } from 'next/navigation'

export default function Home() {
  // Перенаправляем всех на страницу входа
  redirect('/login')
}

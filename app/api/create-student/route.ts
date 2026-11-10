import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { fullName, login } = await request.json()

    if (!fullName || !login) {
      return NextResponse.json({ error: 'Имя и логин обязательны' }, { status: 400 })
    }

    // Создаем технический email для Supabase на основе логина
    const email = `${login.toLowerCase().replace(/[^a-z0-9]/g, '')}@tutor.local`
    // Генерируем простой пароль
    const password = Math.random().toString(36).slice(-6)

    // Подключаемся к Supabase с правами администратора (service_role)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Создаем пользователя в Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Сразу подтверждаем почту
    })

    if (authError) throw authError

    // 2. Создаем профиль ученика в базе
    const { error: profileError } = await supabaseAdmin
      .from('hw_profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role: 'student'
      })

    if (profileError) throw profileError

    return NextResponse.json({ 
      success: true, 
      login: login,
      password: password 
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { fullName, login, action } = await request.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Если это сброс пароля
    if (action === 'reset-password') {
      const newPassword = Math.random().toString(36).slice(-6)
      
      // Находим пользователя по email
      const { data: users, error: findError } = await supabaseAdmin.auth.admin.listUsers()
      const user = users.users.find(u => u.email === login)

      if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

      // Обновляем пароль
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      )

      if (updateError) throw updateError
      return NextResponse.json({ success: true, password: newPassword })
    }

    // Если это создание нового ученика
    if (!fullName || !login) {
      return NextResponse.json({ error: 'Имя и логин обязательны' }, { status: 400 })
    }

    const email = `${login.toLowerCase().replace(/[^a-z0-9]/g, '')}@tutor.local`
    const password = Math.random().toString(36).slice(-6)

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) throw authError

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

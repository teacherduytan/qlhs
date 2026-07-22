import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient } from '../lib/supabaseClient'

export type TeacherAuthSession = {
  email: string | null
  session: Session
}

export async function getTeacherAuthSession(): Promise<TeacherAuthSession | null> {
  const {
    data: { session },
    error,
  } = await getSupabaseClient().auth.getSession()

  if (error) {
    throw new Error(error.message || 'Không kiểm tra được phiên đăng nhập.')
  }

  return session ? { email: session.user.email || null, session } : null
}

export async function loginTeacherWithSupabase(
  email: string,
  password: string,
): Promise<TeacherAuthSession> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.session) {
    throw new Error(error?.message || 'Không đăng nhập được bằng Supabase Auth.')
  }

  return {
    email: data.session.user.email || null,
    session: data.session,
  }
}

export async function logoutTeacher(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut()

  if (error) {
    throw new Error(error.message || 'Không đăng xuất được.')
  }
}

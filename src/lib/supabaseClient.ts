import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let client: SupabaseClient | null = null

export function hasSupabaseConfig(): boolean {
  return Boolean(SUPABASE_URL?.trim() && SUPABASE_ANON_KEY?.trim())
}

export function getSupabaseClient(): SupabaseClient {
  if (!hasSupabaseConfig()) {
    throw new Error(
      'Thiếu cấu hình Supabase. Hãy đặt VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env hoặc GitHub Secrets.',
    )
  }

  if (!client) {
    client = createClient(SUPABASE_URL!.trim(), SUPABASE_ANON_KEY!.trim(), {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storageKey: 'qlhs_supabase_auth',
      },
    })
  }

  return client
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!hasSupabaseConfig()) {
    return null
  }

  const {
    data: { session },
    error,
  } = await getSupabaseClient().auth.getSession()

  if (error) {
    throw new Error(error.message || 'Không đọc được phiên đăng nhập Supabase.')
  }

  return session?.access_token || null
}

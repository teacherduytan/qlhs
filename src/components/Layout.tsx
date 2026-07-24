import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  getTeacherAuthSession,
  loginTeacherWithSupabase,
  logoutTeacher,
} from '../data/teacherAuth'
import { downloadPrintableForm } from '../features/forms/downloadPrintableForm'
import { getSupabaseClient } from '../lib/supabaseClient'

const navItems = [
  { to: '/', label: 'Tổng quan' },
  { to: '/hoc-sinh', label: 'Học sinh' },
  { to: '/ghi-nhan', label: 'Ghi nhận' },
  { to: '/diem-danh', label: 'Điểm danh' },
  { to: '/bao-cao-si-so', label: 'Sĩ số' },
  { to: '/danh-muc', label: 'Danh mục' },
  { to: '/import', label: 'Import' },
]

export function Layout() {
  const { pathname } = useLocation()
  const [authState, setAuthState] = useState<{
    email: string | null
    message?: string
    status: 'checking' | 'authenticated' | 'unauthenticated'
  }>({ email: null, status: 'checking' })

  useEffect(() => {
    let active = true

    getTeacherAuthSession()
      .then((session) => {
        if (!active) return
        setAuthState(
          session
            ? { email: session.email, status: 'authenticated' }
            : { email: null, status: 'unauthenticated' },
        )
      })
      .catch((error: unknown) => {
        if (!active) return
        setAuthState({
          email: null,
          message: error instanceof Error ? error.message : 'Không kiểm tra được phiên đăng nhập.',
          status: 'unauthenticated',
        })
      })

    let subscription: { unsubscribe: () => void } | null = null
    try {
      const {
        data: { subscription: authSubscription },
      } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
        setAuthState(
          session
            ? { email: session.user.email || null, status: 'authenticated' }
            : { email: null, status: 'unauthenticated' },
        )
      })
      subscription = authSubscription
    } catch {
      // getTeacherAuthSession already reports missing config in the login view.
    }

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  if (authState.status === 'checking') {
    return <TeacherAuthShell message="Đang kiểm tra phiên đăng nhập..." />
  }

  if (authState.status === 'unauthenticated') {
    return (
      <TeacherLoginPage
        initialError={authState.message}
        onSuccess={(email) => setAuthState({ email, status: 'authenticated' })}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">QLHS</p>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Lớp 11C5</h1>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
            <nav
              className="flex max-w-full gap-1 overflow-x-auto pb-1 sm:gap-2"
              aria-label="Điều hướng chính"
            >
              {navItems.map(({ to, label }) => {
                const active = pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </nav>
            <button
              type="button"
              onClick={downloadPrintableForm}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 md:w-auto"
            >
              Tải mẫu phiếu
            </button>
            <button
              type="button"
              onClick={() => {
                void logoutTeacher().finally(() =>
                  setAuthState({ email: null, status: 'unauthenticated' }),
                )
              }}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 md:w-auto"
            >
              Đăng xuất
            </button>
            {authState.email ? (
              <p className="text-xs font-medium text-slate-500">{authState.email}</p>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Trường THCS &amp; THPT Lạc Hồng · Năm học 2025–2026
      </footer>
    </div>
  )
}

function TeacherLoginPage({
  initialError,
  onSuccess,
}: {
  initialError?: string
  onSuccess: (email: string | null) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(initialError || null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const session = await loginTeacherWithSupabase(email.trim(), password)
      setEmail('')
      setPassword('')
      onSuccess(session.email)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Không đăng nhập được.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TeacherAuthShell>
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-600">QLHS 11C5</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Đăng nhập giáo viên</h1>
        </div>

        <label className="mt-5 flex flex-col gap-1 text-sm font-medium text-slate-700">
          Email
          <input
            autoComplete="username"
            autoFocus
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-slate-700">
          Mật khẩu
          <input
            autoComplete="current-password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 h-11 w-full rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </TeacherAuthShell>
  )
}

function TeacherAuthShell({
  children,
  message,
}: {
  children?: ReactNode
  message?: string
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      {children || (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-600 shadow-sm">
          {message}
        </div>
      )}
    </main>
  )
}

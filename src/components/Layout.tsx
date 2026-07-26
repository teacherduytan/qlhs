import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { dataSource } from '../data/client'
import {
  getTeacherAuthSession,
  loginTeacherWithSupabase,
  logoutTeacher,
} from '../data/teacherAuth'
import { downloadPrintableForm } from '../features/forms/downloadPrintableForm'
import { getSupabaseClient } from '../lib/supabaseClient'
import type { DanhMucDiem, DeXuatGhiNhan, HocSinh } from '../data/types'

const navItems = [
  { to: '/', label: 'Tổng quan' },
  { to: '/hoc-sinh', label: 'Học sinh' },
  { to: '/ghi-nhan', label: 'Ghi nhận' },
  { to: '/diem-danh', label: 'Điểm danh' },
  { to: '/lien-lac-phu-huynh', label: 'Liên lạc PH' },
  { to: '/bao-cao-si-so', label: 'Sĩ số' },
  { to: '/danh-muc', label: 'Danh mục' },
  { to: '/import', label: 'Import' },
]

function NavLinkList({
  onNavigate,
  orientation,
  pathname,
}: {
  onNavigate?: () => void
  orientation: 'row' | 'col'
  pathname: string
}) {
  return (
    <>
      {navItems.map(({ to, label }) => {
        const active = pathname === to
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              orientation === 'col' ? 'block w-full' : ''
            } ${active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            {label}
          </Link>
        )
      })}
    </>
  )
}

export function Layout() {
  const { pathname } = useLocation()
  const [authState, setAuthState] = useState<{
    email: string | null
    message?: string
    status: 'checking' | 'authenticated' | 'unauthenticated'
  }>({ email: null, status: 'checking' })
  const [pendingProposals, setPendingProposals] = useState<DeXuatGhiNhan[]>([])
  const [notifStudents, setNotifStudents] = useState<HocSinh[]>([])
  const [notifCatalog, setNotifCatalog] = useState<DanhMucDiem[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifActionId, setNotifActionId] = useState<string | null>(null)
  const [notifError, setNotifError] = useState<string | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const currentNavLabel = navItems.find((item) => item.to === pathname)?.label || 'Menu'

  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  useEffect(() => {
    if (authState.status !== 'authenticated') return
    let active = true

    Promise.all([dataSource.getDeXuatGhiNhan(), dataSource.getStudents(), dataSource.getPointCatalog()])
      .then(([proposals, students, catalog]) => {
        if (!active) return
        setPendingProposals(proposals.filter((item) => item.trang_thai === 'cho_duyet'))
        setNotifStudents(students)
        setNotifCatalog(catalog)
      })
      .catch(() => {
        // im lang neu loi, khong chan giao dien chinh vi day chi la badge thong bao
      })

    return () => {
      active = false
    }
  }, [authState.status, pathname])

  async function quickApproveProposal(item: DeXuatGhiNhan) {
    setNotifActionId(item.id)
    setNotifError(null)
    try {
      await dataSource.approveDeXuatGhiNhan(item.id)
      setPendingProposals((current) => current.filter((row) => row.id !== item.id))
    } catch (error) {
      setNotifError(error instanceof Error ? error.message : 'Không duyệt được đề xuất.')
    } finally {
      setNotifActionId(null)
    }
  }

  async function quickRejectProposal(item: DeXuatGhiNhan) {
    const ghiChu = window.prompt('Lý do từ chối (có thể để trống):', '') || ''
    setNotifActionId(item.id)
    setNotifError(null)
    try {
      await dataSource.rejectDeXuatGhiNhan(item.id, ghiChu)
      setPendingProposals((current) => current.filter((row) => row.id !== item.id))
    } catch (error) {
      setNotifError(error instanceof Error ? error.message : 'Không từ chối được đề xuất.')
    } finally {
      setNotifActionId(null)
    }
  }

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
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">QLHS</p>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Lớp 11C5</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((value) => !value)}
                className="relative inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                aria-label={
                  pendingProposals.length > 0
                    ? `${pendingProposals.length} đề xuất ghi nhận chờ duyệt`
                    : 'Không có đề xuất chờ duyệt'
                }
              >
                <span aria-hidden="true">🔔</span>
                <span className="ml-1.5 hidden sm:inline">Thông báo</span>
                {pendingProposals.length > 0 ? (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                    {pendingProposals.length}
                  </span>
                ) : null}
              </button>

              {notifOpen ? (
                <div className="fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg md:absolute md:inset-x-auto md:right-0 md:top-12 md:max-h-96 md:w-80">
                  <div className="flex items-center justify-between px-2 py-1">
                    <p className="text-xs font-semibold uppercase text-slate-500">Đề xuất chờ duyệt</p>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-lg font-bold leading-none text-slate-400 hover:text-slate-600"
                      aria-label="Đóng"
                    >
                      ×
                    </button>
                  </div>

                  {notifError ? (
                    <p className="px-2 pb-1 text-xs font-semibold text-red-700">{notifError}</p>
                  ) : null}

                  {pendingProposals.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-slate-500">Không có đề xuất nào.</p>
                  ) : (
                    <div className="space-y-1">
                      {pendingProposals.map((item) => {
                        const target = notifStudents.find((student) => student.ma_hs === item.ma_hs)
                        const catalogItem = item.ma_danh_muc
                          ? notifCatalog.find((entry) => entry.ma_danh_muc === item.ma_danh_muc)
                          : undefined
                        const busy = notifActionId === item.id

                        return (
                          <div key={item.id} className="rounded-md border border-slate-100 p-2 hover:bg-slate-50">
                            <Link
                              to={target ? `/quan-ly/hoc-sinh/${target.ma_hs}` : '/ghi-nhan'}
                              onClick={() => setNotifOpen(false)}
                              className="block"
                            >
                              <p className="text-sm font-semibold text-slate-900">
                                {target ? `${target.ho} ${target.ten}` : item.ma_hs}
                              </p>
                              <p className="text-xs text-slate-500">
                                {item.ma_danh_muc
                                  ? `${item.ma_danh_muc} · ${catalogItem?.ten_muc || 'Không rõ tên mục'}`
                                  : `Đề xuất danh mục mới (${item.de_xuat_nhom || '?'})`}
                              </p>
                            </Link>
                            {item.ma_danh_muc ? (
                              <div className="mt-1 flex justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void quickApproveProposal(item)}
                                  className="rounded-md bg-teal-700 px-2 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                >
                                  {busy ? 'Đang xử lý...' : 'Duyệt'}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void quickRejectProposal(item)}
                                  className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
                                >
                                  Từ chối
                                </button>
                              </div>
                            ) : (
                              <div className="mt-1 flex justify-end">
                                <Link
                                  to="/ghi-nhan"
                                  onClick={() => setNotifOpen(false)}
                                  className="text-xs font-semibold text-blue-700 hover:underline"
                                >
                                  Xử lý ở trang Ghi nhận →
                                </Link>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <nav className="hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
              <NavLinkList orientation="row" pathname={pathname} />
            </nav>
            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                onClick={downloadPrintableForm}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
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
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Đăng xuất
              </button>
              {authState.email ? (
                <p className="text-xs font-medium text-slate-500">{authState.email}</p>
              ) : null}
            </div>

            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setNavOpen((value) => !value)}
                className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                aria-expanded={navOpen}
                aria-label="Menu điều hướng"
              >
                <span aria-hidden="true">⋯</span>
                <span className="max-w-24 truncate">{currentNavLabel}</span>
              </button>

              {navOpen ? (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                  <nav className="flex flex-col gap-1" aria-label="Điều hướng chính (di động)">
                    <NavLinkList onNavigate={() => setNavOpen(false)} orientation="col" pathname={pathname} />
                  </nav>
                  <div className="my-2 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setNavOpen(false)
                      downloadPrintableForm()
                    }}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Tải mẫu phiếu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNavOpen(false)
                      void logoutTeacher().finally(() =>
                        setAuthState({ email: null, status: 'unauthenticated' }),
                      )
                    }}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Đăng xuất
                  </button>
                  {authState.email ? (
                    <p className="px-3 pt-1 text-xs font-medium text-slate-400">{authState.email}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
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

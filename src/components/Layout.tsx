import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { dataSource } from '../data/client'
import {
  getTeacherAuthSession,
  loginTeacherWithSupabase,
  logoutTeacher,
} from '../data/teacherAuth'
import { downloadPrintableForm } from '../features/forms/downloadPrintableForm'
import { getSupabaseClient } from '../lib/supabaseClient'
import type { DanhMucDiem, DeXuatGhiNhan, HocSinh } from '../data/types'
import { loginStorageKey } from '../features/students/StudentProfilePage'
import { Pagination, usePagination } from './Pagination'
import { PullToRefresh } from './PullToRefresh'

const PHONE_PATTERN = /^0\d{9}$/

const navItems = [
  { to: '/', label: 'Tổng quan', icon: '🏠' },
  { to: '/hoc-sinh', label: 'Học sinh', icon: '🧑‍🎓' },
  { to: '/ghi-nhan', label: 'Ghi nhận', icon: '📝' },
  { to: '/diem-danh', label: 'Điểm danh', icon: '✅' },
  { to: '/lien-lac-phu-huynh', label: 'Liên lạc PH', icon: '📞' },
  { to: '/bao-cao-si-so', label: 'Sĩ số', icon: '📊' },
  { to: '/bao-cao', label: 'Báo cáo', icon: '🧾' },
  { to: '/danh-muc', label: 'Danh mục', icon: '📚' },
  { to: '/import', label: 'Import', icon: '📥' },
  { to: '/dong-hanh', label: 'Đồng hành', icon: '🤝' },
]

function NavLinkList({
  onNavigate,
  pathname,
}: {
  onNavigate?: () => void
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
            className={`block w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
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
  const notifRef = useRef<HTMLDivElement | null>(null)
  const navRef = useRef<HTMLDivElement | null>(null)
  const notifPage = usePagination(pendingProposals)
  const [bottomBarVisible, setBottomBarVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    lastScrollY.current = window.scrollY

    function handleScroll() {
      const currentY = window.scrollY
      const delta = currentY - lastScrollY.current

      if (currentY < 24) {
        setBottomBarVisible(true)
      } else if (delta > 8) {
        setBottomBarVisible(false)
      } else if (delta < -8) {
        setBottomBarVisible(true)
      }

      lastScrollY.current = currentY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!notifOpen && !navOpen) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (notifOpen && notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false)
      }
      if (navOpen && navRef.current && !navRef.current.contains(target)) {
        setNavOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [notifOpen, navOpen])

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
      <UnifiedLoginPage
        initialError={authState.message}
        onTeacherSuccess={(email) => setAuthState({ email, status: 'authenticated' })}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-200">
      <header className="sticky top-0 z-40 border-b border-slate-300 bg-slate-100 pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">QLHS</p>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Lớp 11C5</h1>
          </div>

          <div className="relative flex items-center gap-2">
            <div ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((value) => !value)}
                title="Thông báo"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg hover:bg-slate-100"
                aria-label={
                  pendingProposals.length > 0
                    ? `${pendingProposals.length} đề xuất ghi nhận chờ duyệt`
                    : 'Không có đề xuất chờ duyệt'
                }
              >
                <span aria-hidden="true">🔔</span>
                {pendingProposals.length > 0 ? (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                    {pendingProposals.length}
                  </span>
                ) : null}
              </button>

              {notifOpen ? (
                <div className="absolute right-0 top-12 z-50 max-h-96 w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
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
                      {notifPage.pageItems.map((item) => {
                        const target = notifStudents.find((student) => student.ma_hs === item.ma_hs)
                        const catalogItem = item.ma_danh_muc
                          ? notifCatalog.find((entry) => entry.ma_danh_muc === item.ma_danh_muc)
                          : undefined
                        const busy = notifActionId === item.id

                        return (
                          <div key={item.id} className="rounded-md border border-slate-100 p-2 hover:bg-slate-100">
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
                                  className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:text-slate-400"
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
                  <Pagination onChange={notifPage.setPage} page={notifPage.page} totalPages={notifPage.totalPages} />
                </div>
              ) : null}
            </div>
            <div className="relative" ref={navRef}>
              <button
                type="button"
                onClick={() => setNavOpen((value) => !value)}
                title={currentNavLabel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg hover:bg-slate-100"
                aria-expanded={navOpen}
                aria-label="Menu điều hướng"
              >
                <span aria-hidden="true">☰</span>
              </button>

              {navOpen ? (
                <div className="absolute right-0 top-12 z-50 w-64 max-w-[calc(100vw-1.5rem)] rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                  <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase text-slate-400">Điều hướng</p>
                  <nav className="flex flex-col gap-1" aria-label="Điều hướng chính">
                    <NavLinkList onNavigate={() => setNavOpen(false)} pathname={pathname} />
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-6">
        <PullToRefresh>
          <Outlet />
        </PullToRefresh>
      </main>

      <footer className="border-t border-slate-300 bg-slate-100 py-4 text-center text-xs text-slate-500">
        Thầy Nguyễn Duy Tân chuyên dạy lập trình ứng dụng cho học sinh học tư duy logic và người cần bổ sung kinh nghiệm cấp tốc đi làm
      </footer>

      <nav
        aria-label="Điều hướng nhanh"
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-slate-300 bg-slate-100 shadow-[0_-2px_6px_rgba(0,0,0,0.08)] transition-transform duration-200 md:hidden ${
          bottomBarVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex gap-1 overflow-x-auto px-1 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {navItems.map(({ to, label, icon }) => {
            const active = pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex min-w-16 shrink-0 flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-center ${
                  active ? 'text-blue-700' : 'text-slate-500'
                }`}
              >
                <span className="text-lg leading-none" aria-hidden="true">
                  {icon}
                </span>
                <span className={`text-[11px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

type LoginMode = 'teacher' | 'student'

// Man hinh dang nhap goc (/) dung chung cho ca giao vien va hoc sinh, vi PWA
// "Them vao man hinh chinh" luon mo dung start_url khai bao trong manifest
// (khong the mo thang /hs/:token), nen day phai la noi hoc sinh dang nhap
// duoc tu icon ngoai man hinh chinh thay vi bi ket o form giao vien nhu truoc.
// Co 2 nut chuyen doi ro rang "Giao vien"/"Hoc sinh" (khong tu doan dinh dang
// o 1 o nhap chung) - hoc sinh dang nhap bang SDT tra ve token qua RPC
// lay_ho_so_cong_khai_theo_sdt, luu session dung dinh dang loginStorageKey()
// roi dieu huong sang /hs/:token de StudentProfilePage tu nap tiep khong can
// dang nhap lai; giao vien van dang nhap Supabase email/mat khau nhu cu.
function UnifiedLoginPage({
  initialError,
  onTeacherSuccess,
}: {
  initialError?: string
  onTeacherSuccess: (email: string | null) => void
}) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<LoginMode>('teacher')
  const [email, setEmail] = useState('')
  const [teacherPassword, setTeacherPassword] = useState('')
  const [sdt, setSdt] = useState('')
  const [studentPassword, setStudentPassword] = useState('')
  const [error, setError] = useState<string | null>(initialError || null)
  const [submitting, setSubmitting] = useState(false)

  function switchMode(nextMode: LoginMode) {
    setMode(nextMode)
    setError(null)
  }

  async function handleTeacherSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const session = await loginTeacherWithSupabase(email.trim(), teacherPassword)
      setEmail('')
      setTeacherPassword('')
      onTeacherSuccess(session.email)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Không đăng nhập được.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStudentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const sdtTrimmed = sdt.trim()
    const passwordTrimmed = studentPassword.trim()

    if (!PHONE_PATTERN.test(sdtTrimmed)) {
      setError('Số điện thoại phải gồm đúng 10 chữ số, bắt đầu bằng số 0.')
      return
    }
    if (!/^\d{3}$/.test(passwordTrimmed)) {
      setError('Mật khẩu phải gồm đúng 3 chữ số.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const profile = await dataSource.getPublicStudentProfileByPhone(sdtTrimmed, passwordTrimmed)
      if (!profile) {
        setError('Số điện thoại hoặc mật khẩu không đúng.')
        return
      }

      const token = profile.student.token_ho_so
      window.sessionStorage.setItem(
        loginStorageKey(token),
        JSON.stringify({ sdt: sdtTrimmed, matKhau: passwordTrimmed }),
      )
      setSdt('')
      setStudentPassword('')
      navigate(`/hs/${token}`)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Không đăng nhập được.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TeacherAuthShell>
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-600">QLHS 11C5</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Đăng nhập</h1>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => switchMode('teacher')}
            className={`h-10 rounded-md text-sm font-semibold transition ${
              mode === 'teacher' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            👩‍🏫 Giáo viên
          </button>
          <button
            type="button"
            onClick={() => switchMode('student')}
            className={`h-10 rounded-md text-sm font-semibold transition ${
              mode === 'student' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🎓 Học sinh
          </button>
        </div>

        {mode === 'teacher' ? (
          <form key="teacher" onSubmit={handleTeacherSubmit} className="mt-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
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
                value={teacherPassword}
                onChange={(event) => setTeacherPassword(event.target.value)}
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
        ) : (
          <form key="student" onSubmit={handleStudentSubmit} className="mt-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Số điện thoại
              <input
                autoFocus
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={sdt}
                onChange={(event) => setSdt(event.target.value.replace(/\D/g, ''))}
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-slate-700">
              Mật khẩu (3 số cuối SĐT)
              <input
                type="password"
                inputMode="numeric"
                maxLength={3}
                value={studentPassword}
                onChange={(event) => setStudentPassword(event.target.value.replace(/\D/g, ''))}
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}

            <button
              type="submit"
              disabled={submitting || !sdt.trim() || !studentPassword.trim()}
              className="mt-5 h-11 w-full rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        )}
      </div>
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
    <main className="flex min-h-screen items-center justify-center bg-slate-200 px-4 py-8">
      {children || (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-600 shadow-sm">
          {message}
        </div>
      )}
    </main>
  )
}

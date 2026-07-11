import { Link, Outlet, useLocation } from 'react-router-dom'
import { downloadPrintableForm } from '../features/forms/downloadPrintableForm'

const navItems = [
  { to: '/', label: 'Tổng quan' },
  { to: '/hoc-sinh', label: 'Học sinh' },
  { to: '/import', label: 'Import' },
]

export function Layout() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">QLHS</p>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Lớp 11C5</h1>
          </div>
          <div className="flex flex-wrap justify-end gap-1 sm:gap-2">
            <nav className="flex gap-1 sm:gap-2" aria-label="Điều hướng chính">
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
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Tải mẫu phiếu
            </button>
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

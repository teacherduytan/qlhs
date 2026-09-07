import { useEffect, useMemo, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabaseClient'
import { getTeacherAuthSession, loginTeacherWithSupabase, logoutTeacher } from '../../data/teacherAuth'
import {
  autoCapitalizeName,
  CO_SO_OPTIONS,
  CS2_ADMIN_EMAIL,
  CS2_ADMIN_LOGIN,
  hasDigitOrSpecialChar,
  maskCccd,
} from './cs2Shared'

interface Cs2Row {
  ma_hs: string
  ho: string
  ten: string
  lop: string | null
  email: string | null
  dia_chi_hien_tai: string | null
  cccd: string | null
  so_lan_sua_lienlac: number
  ngay_cap_nhat_lienlac: string | null
}

interface LichSuRow {
  id: string
  gia_tri_cu: { email?: string | null; dia_chi_hien_tai?: string | null; cccd?: string | null } | null
  gia_tri_moi: { email?: string | null; dia_chi_hien_tai?: string | null; cccd?: string | null }
  nguon: string
  thoi_gian: string
}

type AdminTab = 'danh-sach' | 'them-nhanh'

function isDaDien(row: Cs2Row): boolean {
  return Boolean(row.email && row.dia_chi_hien_tai && row.cccd)
}

export function Cs2AdminPage() {
  const [checkingSession, setCheckingSession] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    let active = true
    getTeacherAuthSession()
      .then((session) => {
        if (active) setLoggedIn(Boolean(session))
      })
      .finally(() => {
        if (active) setCheckingSession(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function handleLogin() {
    setLoginError(null)
    const email = loginValue.trim() === CS2_ADMIN_LOGIN ? CS2_ADMIN_EMAIL : loginValue.trim()
    setLoggingIn(true)
    try {
      await loginTeacherWithSupabase(email, password)
      setLoggedIn(true)
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Đăng nhập thất bại.')
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleLogout() {
    await logoutTeacher()
    setLoggedIn(false)
  }

  if (checkingSession) {
    return <div className="p-6 text-sm text-slate-600">Đang kiểm tra phiên đăng nhập...</div>
  }

  if (!loggedIn) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-4">
        <h1 className="text-lg font-bold text-slate-900">Quản trị thu thập thông tin CS2</h1>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Tài khoản
          <input
            type="text"
            value={loginValue}
            onChange={(event) => setLoginValue(event.target.value)}
            placeholder={CS2_ADMIN_LOGIN}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Mật khẩu
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void handleLogin()}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        {loginError ? <p className="text-sm font-semibold text-red-700">{loginError}</p> : null}
        <button
          type="button"
          onClick={() => void handleLogin()}
          disabled={loggingIn}
          className="h-10 rounded-md bg-indigo-700 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </div>
    )
  }

  return <Cs2AdminDashboard onLogout={() => void handleLogout()} />
}

function Cs2AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<AdminTab>('danh-sach')

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Quản trị thu thập thông tin CS2</h1>
        <button type="button" onClick={onLogout} className="text-sm font-semibold text-slate-600 hover:underline">
          Đăng xuất
        </button>
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-300 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab('danh-sach')}
          className={`h-10 flex-1 rounded-md text-sm font-semibold ${
            tab === 'danh-sach' ? 'bg-indigo-700 text-white' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Danh sách theo lớp
        </button>
        <button
          type="button"
          onClick={() => setTab('them-nhanh')}
          className={`h-10 flex-1 rounded-md text-sm font-semibold ${
            tab === 'them-nhanh' ? 'bg-indigo-700 text-white' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Thêm nhanh HS mới
        </button>
      </div>

      {tab === 'danh-sach' ? <Cs2StudentListTab /> : <Cs2QuickAddTab />}
    </div>
  )
}

function Cs2StudentListTab() {
  const [coSo, setCoSo] = useState(CO_SO_OPTIONS[0])
  const [lopOptions, setLopOptions] = useState<string[]>([])
  const [lop, setLop] = useState('')
  const [rows, setRows] = useState<Cs2Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revealedCccd, setRevealedCccd] = useState<Record<string, boolean>>({})
  const [historyMaHs, setHistoryMaHs] = useState<string | null>(null)
  const [checkResult, setCheckResult] = useState<{
    tongSo: number
    daDien: number
    chuaDienTheoLop: { lop: string; students: { ma_hs: string; ten: string }[] }[]
  } | null>(null)

  useEffect(() => {
    let active = true
    getSupabaseClient()
      .from('hoc_sinh')
      .select('lop')
      .eq('co_so', coSo)
      .is('ngay_roi_lop', null)
      .then(({ data }) => {
        if (!active) return
        const distinct = Array.from(new Set((data || []).map((row) => row.lop as string).filter(Boolean))).sort()
        setLopOptions(distinct)
      })
    return () => {
      active = false
    }
  }, [coSo])

  useEffect(() => {
    let active = true
    setError(null)
    let query = getSupabaseClient()
      .from('hoc_sinh')
      .select('ma_hs, ho, ten, lop, email, dia_chi_hien_tai, cccd, so_lan_sua_lienlac, ngay_cap_nhat_lienlac')
      .eq('co_so', coSo)
      .is('ngay_roi_lop', null)
      .order('lop')
      .order('tt')
    if (lop) query = query.eq('lop', lop)
    query.then(({ data, error: err }) => {
      if (!active) return
      if (err) setError(err.message)
      else setRows((data || []) as Cs2Row[])
    })
    return () => {
      active = false
    }
  }, [coSo, lop])

  function handleCheck() {
    if (!rows) return
    const tongSo = rows.length
    const daDien = rows.filter(isDaDien).length
    const byLop = new Map<string, { ma_hs: string; ten: string }[]>()
    for (const row of rows) {
      if (isDaDien(row)) continue
      const key = row.lop || '—'
      const list = byLop.get(key) || []
      list.push({ ma_hs: row.ma_hs, ten: `${row.ho} ${row.ten}` })
      byLop.set(key, list)
    }
    const chuaDienTheoLop = Array.from(byLop.entries())
      .map(([lopKey, students]) => ({ lop: lopKey, students }))
      .sort((left, right) => left.lop.localeCompare(right.lop))
    setCheckResult({ tongSo, daDien, chuaDienTheoLop })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Cơ sở
          <select
            value={coSo}
            onChange={(event) => {
              setCoSo(event.target.value)
              setLop('')
            }}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
          >
            {CO_SO_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Lớp
          <select value={lop} onChange={(event) => setLop(event.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900">
            <option value="">Tất cả</option>
            {lopOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleCheck}
          disabled={!rows}
          className="h-9 rounded-md bg-indigo-700 px-3 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Tính toán kiểm tra
        </button>
      </div>

      {checkResult ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <p className="font-semibold text-slate-900">
            Tổng: {checkResult.tongSo} học sinh — Đã điền đủ: {checkResult.daDien} — Chưa điền: {checkResult.tongSo - checkResult.daDien}
          </p>
          {checkResult.chuaDienTheoLop.length > 0 ? (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-slate-200">
              {checkResult.chuaDienTheoLop.map((group) => (
                <div key={group.lop} className="border-b border-slate-100 p-2 last:border-b-0">
                  <p className="text-xs font-semibold text-slate-700">
                    Lớp {group.lop} ({group.students.length} chưa điền)
                  </p>
                  <p className="text-xs text-slate-600">
                    {group.students.map((student) => `${student.ma_hs} - ${student.ten}`).join('; ')}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

      {!rows ? (
        <p className="text-sm text-slate-500">Đang tải...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">Mã HS</th>
                <th className="px-3 py-2">Tên</th>
                <th className="px-3 py-2">Lớp</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Địa chỉ</th>
                <th className="px-3 py-2">CCCD</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Số lần sửa</th>
                <th className="px-3 py-2">Cập nhật gần nhất</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.ma_hs}>
                  <td className="px-3 py-2 text-slate-700">{row.ma_hs}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {row.ho} {row.ten}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.lop}</td>
                  <td className="px-3 py-2 text-slate-700">{row.email || '—'}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-slate-700" title={row.dia_chi_hien_tai || ''}>
                    {row.dia_chi_hien_tai || '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    <div className="flex items-center gap-1">
                      <span>{revealedCccd[row.ma_hs] ? row.cccd || '—' : maskCccd(row.cccd)}</span>
                      {row.cccd ? (
                        <button
                          type="button"
                          onClick={() => setRevealedCccd((current) => ({ ...current, [row.ma_hs]: !current[row.ma_hs] }))}
                          className="text-xs font-semibold text-blue-700 hover:underline"
                        >
                          {revealedCccd[row.ma_hs] ? 'Ẩn' : 'Hiện đầy đủ'}
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {isDaDien(row) ? (
                      <span className="font-semibold text-emerald-700">Đã điền</span>
                    ) : (
                      <span className="font-semibold text-rose-700">Chưa điền</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.so_lan_sua_lienlac}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {row.ngay_cap_nhat_lienlac ? new Date(row.ngay_cap_nhat_lienlac).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setHistoryMaHs(row.ma_hs)}
                      className="text-xs font-semibold text-blue-700 hover:underline"
                    >
                      Xem lịch sử
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historyMaHs ? <Cs2HistoryModal maHs={historyMaHs} onClose={() => setHistoryMaHs(null)} /> : null}
    </div>
  )
}

function Cs2HistoryModal({ maHs, onClose }: { maHs: string; onClose: () => void }) {
  const [rows, setRows] = useState<LichSuRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getSupabaseClient()
      .from('hoc_sinh_lienlac_lichsu')
      .select('id, gia_tri_cu, gia_tri_moi, nguon, thoi_gian')
      .eq('ma_hs', maHs)
      .order('thoi_gian', { ascending: false })
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) setError(err.message)
        else setRows((data || []) as LichSuRow[])
      })
    return () => {
      active = false
    }
  }, [maHs])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Lịch sử sửa — {maHs}</h2>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-600 hover:underline">
            Đóng
          </button>
        </div>
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        {!rows ? (
          <p className="text-sm text-slate-500">Đang tải...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có lịch sử sửa nào.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <div key={row.id} className="rounded-md border border-slate-200 p-2 text-xs">
                <p className="font-semibold text-slate-700">
                  {new Date(row.thoi_gian).toLocaleString('vi-VN')} · {row.nguon === 'hs_tu_dien' ? 'HS tự điền' : 'GVCN sửa'}
                </p>
                <p className="mt-1 text-slate-600">
                  Email: {row.gia_tri_cu?.email || '(chưa có)'} → {row.gia_tri_moi.email}
                </p>
                <p className="text-slate-600">
                  Địa chỉ: {row.gia_tri_cu?.dia_chi_hien_tai || '(chưa có)'} → {row.gia_tri_moi.dia_chi_hien_tai}
                </p>
                <p className="text-slate-600">
                  CCCD: {maskCccd(row.gia_tri_cu?.cccd || null)} → {maskCccd(row.gia_tri_moi.cccd || null)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Cs2QuickAddTab() {
  const [coSo, setCoSo] = useState(CO_SO_OPTIONS[0])
  const [lop, setLop] = useState('')
  const [maHs, setMaHs] = useState('')
  const [tenHs, setTenHs] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const validationError = useMemo(() => {
    if (tenHs && hasDigitOrSpecialChar(tenHs)) return 'Tên học sinh không được chứa số hoặc ký tự đặc biệt.'
    return null
  }, [tenHs])

  async function handleSubmit() {
    setError(null)
    setMessage(null)
    if (!maHs.trim()) return setError('Chưa nhập mã học sinh.')
    if (!tenHs.trim()) return setError('Chưa nhập tên học sinh.')
    if (!lop.trim()) return setError('Chưa nhập lớp.')
    if (validationError) return setError(validationError)

    setSubmitting(true)
    try {
      const { error: rpcError } = await getSupabaseClient().rpc('them_nhanh_hoc_sinh', {
        p_ma_hs: maHs.trim(),
        p_ten_hs: tenHs.trim(),
        p_lop: lop.trim(),
        p_co_so: coSo,
      })
      if (rpcError) throw rpcError
      setMessage(`Đã thêm học sinh ${tenHs.trim()} (${maHs.trim()}) vào lớp ${lop.trim()}.`)
      setMaHs('')
      setTenHs('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thêm được học sinh.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Cơ sở
        <select value={coSo} onChange={(event) => setCoSo(event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900">
          {CO_SO_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Lớp
        <input
          type="text"
          value={lop}
          onChange={(event) => setLop(event.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Mã học sinh
        <input
          type="text"
          value={maHs}
          onChange={(event) => setMaHs(event.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Tên học sinh
        <input
          type="text"
          value={tenHs}
          onChange={(event) => setTenHs(event.target.value)}
          onBlur={() => setTenHs((current) => autoCapitalizeName(current))}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={submitting}
        className="h-10 rounded-md bg-indigo-700 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {submitting ? 'Đang thêm...' : 'Thêm nhanh học sinh'}
      </button>
    </div>
  )
}

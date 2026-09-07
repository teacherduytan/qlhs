import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabaseClient'
import { Cs2CheckResultCard, type Cs2CheckResult } from './Cs2CheckResultCard'
import { autoCapitalizeName, hasDigitOrSpecialChar, maskCccd } from './cs2Shared'

// Tab "Giao vien theo doi tien do" trong trang tra cuu cong khai
// (Cs2LookupPage.tsx) - GVCN dang nhap bang chinh ten lop (viet hoa) + mat
// khau chung "cs2" (khong dung Supabase Auth, xem migration
// 20260907000700_giao_vien_theo_doi_tien_do.sql - moi RPC deu tu xac thuc
// lai p_lop/p_mat_khau, khong tin state phia client). Pham vi CO Y GIOI HAN
// theo yeu cau: chi co "Danh sach theo lop" (khong co lop khac de chon, khong
// co nut xuat file/chon cot) va "Them nhanh HS moi" (lop co dinh = lop dang
// nhap) - AN tab Import va cac nut xuat Excel so voi trang quan tri day du.

interface TeacherRow {
  ma_hs: string
  ho: string
  ten: string
  email: string | null
  dia_chi_hien_tai: string | null
  cccd: string | null
  so_lan_sua_lienlac: number
  ngay_cap_nhat_lienlac: string | null
}

interface TeacherSession {
  lop: string
  matKhau: string
}

function isDaDien(row: TeacherRow): boolean {
  return Boolean(row.email && row.dia_chi_hien_tai && row.cccd)
}

type TeacherTab = 'danh-sach' | 'them-nhanh'

export function Cs2TeacherProgressTab() {
  const [lopInput, setLopInput] = useState('')
  const [matKhau, setMatKhau] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [session, setSession] = useState<TeacherSession | null>(null)

  async function handleLogin() {
    setLoginError(null)
    const lop = lopInput.trim().toUpperCase()
    if (!lop) return setLoginError('Vui lòng nhập tên lớp.')
    if (!matKhau) return setLoginError('Vui lòng nhập mật khẩu.')

    setLoggingIn(true)
    try {
      const { data, error } = await getSupabaseClient().rpc('giao_vien_dang_nhap', { p_lop: lop, p_mat_khau: matKhau })
      if (error) throw error
      if (!data) {
        setLoginError('Sai lớp hoặc mật khẩu.')
        return
      }
      setSession({ lop, matKhau })
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Đăng nhập thất bại.')
    } finally {
      setLoggingIn(false)
    }
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center gap-3 p-4">
        <h1 className="text-lg font-bold text-slate-900">Giáo viên theo dõi tiến độ</h1>
        <p className="text-sm text-slate-600">Đăng nhập bằng tên lớp (viết hoa) và mật khẩu do nhà trường cung cấp.</p>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Lớp
          <input
            type="text"
            value={lopInput}
            onChange={(event) => setLopInput(event.target.value.toUpperCase())}
            onKeyDown={(event) => event.key === 'Enter' && void handleLogin()}
            placeholder="VD: 11C5"
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold uppercase text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Mật khẩu
          <input
            type="password"
            value={matKhau}
            onChange={(event) => setMatKhau(event.target.value)}
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

  return <Cs2TeacherDashboard session={session} onLogout={() => setSession(null)} />
}

function Cs2TeacherDashboard({ session, onLogout }: { session: TeacherSession; onLogout: () => void }) {
  const [tab, setTab] = useState<TeacherTab>('danh-sach')

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-indigo-700">Giáo viên theo dõi tiến độ</p>
          <h1 className="text-lg font-bold text-slate-900">Lớp {session.lop}</h1>
        </div>
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
          Danh sách lớp
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

      {tab === 'danh-sach' ? <Cs2TeacherListTab session={session} /> : <Cs2TeacherQuickAddTab session={session} />}
    </div>
  )
}

function Cs2TeacherListTab({ session }: { session: TeacherSession }) {
  const [rows, setRows] = useState<TeacherRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revealedCccd, setRevealedCccd] = useState<Record<string, boolean>>({})
  const [checkResult, setCheckResult] = useState<Cs2CheckResult | null>(null)

  useEffect(() => {
    let active = true
    setError(null)
    getSupabaseClient()
      .rpc('giao_vien_danh_sach_lop', { p_lop: session.lop, p_mat_khau: session.matKhau })
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) setError(err.message)
        else setRows((data as TeacherRow[]) || [])
      })
    return () => {
      active = false
    }
  }, [session])

  function handleCheck() {
    if (!rows) return
    const tongSo = rows.length
    const daDien = rows.filter(isDaDien).length
    const chuaDien = rows.filter((row) => !isDaDien(row)).map((row) => ({ ma_hs: row.ma_hs, ten: `${row.ho} ${row.ten}` }))
    setCheckResult({
      tongSo,
      daDien,
      chuaDienTheoLop: chuaDien.length > 0 ? [{ lop: session.lop, students: chuaDien }] : [],
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-sm text-slate-600">
          Lớp <span className="font-semibold text-slate-900">{session.lop}</span> —{' '}
          {rows ? `${rows.length} học sinh` : 'Đang tải...'}
        </p>
        <button
          type="button"
          onClick={handleCheck}
          disabled={!rows}
          className="h-9 rounded-md bg-indigo-700 px-3 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Tính toán kiểm tra
        </button>
      </div>

      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
      {checkResult ? <Cs2CheckResultCard result={checkResult} /> : null}

      {!rows ? (
        <p className="text-sm text-slate-500">Đang tải...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">STT</th>
                <th className="px-3 py-2">Mã HS</th>
                <th className="px-3 py-2">Tên</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Địa chỉ</th>
                <th className="px-3 py-2">CCCD</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Cập nhật gần nhất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={row.ma_hs}>
                  <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                  <td className="px-3 py-2 text-slate-700">{row.ma_hs}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {row.ho} {row.ten}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.email || '—'}</td>
                  <td className="max-w-50 truncate px-3 py-2 text-slate-700" title={row.dia_chi_hien_tai || ''}>
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
                  <td className="px-3 py-2 text-slate-700">
                    {row.ngay_cap_nhat_lienlac ? new Date(row.ngay_cap_nhat_lienlac).toLocaleString('vi-VN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Cs2TeacherQuickAddTab({ session }: { session: TeacherSession }) {
  const [tenHs, setTenHs] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Danh sach vua them trong phien lam viec nay (khong luu CSDL rieng) - de
  // GVCN tien tra lai ma HS vua cap ma khong can nho/chep lai tung lan.
  const [recentlyAdded, setRecentlyAdded] = useState<{ maHs: string; hoTen: string }[]>([])

  async function handleSubmit() {
    setError(null)
    setMessage(null)
    if (!tenHs.trim()) return setError('Chưa nhập tên học sinh.')
    if (hasDigitOrSpecialChar(tenHs)) return setError('Tên học sinh không được chứa số hoặc ký tự đặc biệt.')

    // Luon chuan hoa viet hoa chu cai dau moi tu truoc khi gui - khong chi
    // dua vao onBlur (vd go xong bam Enter ngay, chua kip roi khoi o nhap).
    const tenChuanHoa = autoCapitalizeName(tenHs)
    setTenHs(tenChuanHoa)

    setSubmitting(true)
    try {
      const { data, error: rpcError } = await getSupabaseClient().rpc('giao_vien_them_nhanh_hoc_sinh', {
        p_lop: session.lop,
        p_mat_khau: session.matKhau,
        p_ten_hs: tenChuanHoa,
      })
      if (rpcError) throw rpcError
      const maHsMoi = data as string
      setMessage(`Đã thêm học sinh ${tenChuanHoa} vào lớp ${session.lop}. Mã HS được cấp: ${maHsMoi}`)
      setRecentlyAdded((current) => [{ maHs: maHsMoi, hoTen: tenChuanHoa }, ...current])
      setTenHs('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thêm được học sinh.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">
        Học sinh sẽ được thêm vào lớp <span className="font-semibold text-slate-700">{session.lop}</span>, mã học sinh do hệ
        thống tự động cấp.
      </p>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Tên học sinh
        <input
          type="text"
          value={tenHs}
          onChange={(event) => setTenHs(event.target.value)}
          onBlur={() => setTenHs((current) => autoCapitalizeName(current))}
          onKeyDown={(event) => event.key === 'Enter' && void handleSubmit()}
          placeholder="VD: Nguyễn Văn A"
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

      {recentlyAdded.length > 0 ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Vừa thêm trong phiên này</p>
          <ul className="flex flex-col gap-1 text-sm">
            {recentlyAdded.map((item) => (
              <li key={item.maHs} className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1.5">
                <span className="text-slate-700">{item.hoTen}</span>
                <span className="font-mono font-semibold text-indigo-700">{item.maHs}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

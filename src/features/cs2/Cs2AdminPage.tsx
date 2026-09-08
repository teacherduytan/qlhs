import { useEffect, useMemo, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabaseClient'
import { getTeacherAuthSession, loginTeacherWithSupabase, logoutTeacher } from '../../data/teacherAuth'
import { Cs2CheckResultCard, type Cs2CheckResult } from './Cs2CheckResultCard'
import { CS2_EXPORT_COLUMNS, DEFAULT_CS2_EXPORT_COLUMNS, type Cs2ExportColumnKey } from './cs2ExportColumns'
import {
  autoCapitalizeName,
  CO_SO_OPTIONS,
  CS2_ADMIN_EMAIL,
  CS2_ADMIN_LOGIN,
  fetchAllRows,
  fixMojibake,
  hasDigitOrSpecialChar,
  isValidCccd,
  isValidEmail,
  maskCccd,
  splitHoTen,
} from './cs2Shared'
import { loadVnAddressData, wardLabel, wardsByProvince, type VnProvince, type VnWard } from './vnAddressData'

interface Cs2Row {
  ma_hs: string
  ho: string
  ten: string
  lop: string | null
  email: string | null
  dia_chi_hien_tai: string | null
  dia_chi_so_nha: string | null
  dia_chi_tinh_thanh: string | null
  dia_chi_phuong_xa: string | null
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

type AdminTab = 'danh-sach' | 'them-nhanh' | 'import'

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
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
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
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
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
        <button
          type="button"
          onClick={() => setTab('import')}
          className={`h-10 flex-1 rounded-md text-sm font-semibold ${
            tab === 'import' ? 'bg-indigo-700 text-white' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Import DS
        </button>
      </div>

      {tab === 'danh-sach' ? <Cs2StudentListTab /> : tab === 'them-nhanh' ? <Cs2QuickAddTab /> : <Cs2ImportTab />}
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
  const [editingRow, setEditingRow] = useState<Cs2Row | null>(null)
  const [deletingMaHs, setDeletingMaHs] = useState<string | null>(null)
  const [deletingClass, setDeletingClass] = useState(false)
  const [classActionMessage, setClassActionMessage] = useState<string | null>(null)
  const [checkResult, setCheckResult] = useState<Cs2CheckResult | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportingPerClass, setExportingPerClass] = useState(false)
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(null)
  const [exportingMultiSheet, setExportingMultiSheet] = useState(false)
  const [exportColumns, setExportColumns] = useState<Cs2ExportColumnKey[]>(DEFAULT_CS2_EXPORT_COLUMNS)

  function toggleExportColumn(key: Cs2ExportColumnKey) {
    setExportColumns((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))
  }

  useEffect(() => {
    let active = true
    // Dung RPC (tinh server-side qua array_agg) thay vi tu SELECT lop roi loc
    // trung o client - tranh bi gioi han 1000 dong mac dinh cua PostgREST cat
    // mat cac lop chi xuat hien o cac dong sau dong thu 1000.
    getSupabaseClient()
      .rpc('danh_sach_lop_theo_co_so', { p_co_so: coSo })
      .then(({ data, error: err }) => {
        if (!active) return
        if (!err) setLopOptions(((data as string[]) || []).slice().sort())
      })
    return () => {
      active = false
    }
  }, [coSo])

  useEffect(() => {
    let active = true
    setError(null)
    fetchAllRows<Cs2Row>((from, to) => {
      let query = getSupabaseClient()
        .from('cs2_hoc_sinh')
        .select(
          'ma_hs, ho, ten, lop, email, dia_chi_hien_tai, dia_chi_so_nha, dia_chi_tinh_thanh, dia_chi_phuong_xa, cccd, so_lan_sua_lienlac, ngay_cap_nhat_lienlac',
        )
        .eq('co_so', coSo)
        .is('ngay_roi_lop', null)
        .order('lop')
        .order('ho')
        .order('ten')
        .order('ma_hs')
        .range(from, to)
      if (lop) query = query.eq('lop', lop)
      return query as unknown as PromiseLike<{ data: Cs2Row[] | null; error: { message: string } | null }>
    })
      .then((data) => {
        if (active) setRows(data)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được danh sách học sinh.')
      })
    return () => {
      active = false
    }
  }, [coSo, lop])

  // Xoa toan bo hoc sinh cua 1 lop dang chon (vd lop can thay doi ca danh
  // sach - xoa het roi sang tab "Import DS" nhap lai file JSON moi cho dung
  // lop do). Bat go lai chinh xac ten lop de xac nhan (thay vi 1 nut Huy/
  // Dong y don gian) vi day la thao tac xoa hang loat, kho hoi neu bam nham.
  async function handleDeleteClass() {
    if (!lop) return
    const typed = window.prompt(
      `Thao tác này sẽ XOÁ VĨNH VIỄN toàn bộ học sinh thuộc lớp "${lop}" (kể cả lịch sử đã sửa). Để xác nhận, hãy gõ lại chính xác tên lớp:`,
    )
    if (typed === null) return
    if (typed.trim() !== lop) {
      setError('Tên lớp gõ lại không khớp — đã huỷ thao tác xoá.')
      return
    }

    setDeletingClass(true)
    setError(null)
    setClassActionMessage(null)
    try {
      const { data, error: rpcError } = await getSupabaseClient().rpc('xoa_ca_lop_cs2', { p_lop: lop, p_co_so: coSo })
      if (rpcError) throw rpcError
      const soLuong = data as number
      setClassActionMessage(`Đã xoá ${soLuong} học sinh thuộc lớp "${lop}". Vào tab "Import DS" để nhập lại danh sách mới.`)
      setLopOptions((current) => current.filter((item) => item !== lop))
      setLop('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xoá được lớp.')
    } finally {
      setDeletingClass(false)
    }
  }

  async function handleDelete(maHs: string, hoTen: string) {
    if (!window.confirm(`Xoá học sinh "${hoTen}" (${maHs}) khỏi danh sách? Không thể khôi phục, kể cả lịch sử đã sửa.`)) return
    setDeletingMaHs(maHs)
    setError(null)
    try {
      const { error: rpcError } = await getSupabaseClient().rpc('xoa_hoc_sinh_cs2', { p_ma_hs: maHs })
      if (rpcError) throw rpcError
      setRows((current) => (current || []).filter((row) => row.ma_hs !== maHs))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xoá được học sinh.')
    } finally {
      setDeletingMaHs(null)
    }
  }

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

  async function handleExportExcel() {
    if (!rows) return
    setExporting(true)
    setExportError(null)
    try {
      const { exportCs2StudentsToExcel } = await import('./exportCs2StudentsExcel')
      const fileBaseName = lop ? `DanhSachHS-${coSo}-${lop}` : `DanhSachHS-${coSo}-ToanTruong`
      await exportCs2StudentsToExcel(rows, { coSo, lop }, exportColumns, fileBaseName)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Không xuất được file Excel.')
    } finally {
      setExporting(false)
    }
  }

  function groupRowsByLop(list: Cs2Row[]): { lop: string; rows: Cs2Row[] }[] {
    const byLop = new Map<string, Cs2Row[]>()
    for (const row of list) {
      const key = row.lop || '(Chưa rõ lớp)'
      const group = byLop.get(key) || []
      group.push(row)
      byLop.set(key, group)
    }
    return Array.from(byLop.entries())
      .map(([lopName, lopRows]) => ({ lop: lopName, rows: lopRows }))
      .sort((a, b) => a.lop.localeCompare(b.lop))
  }

  // Xuat rieng moi lop 1 file (thay vi gop chung 1 file toan truong) - danh
  // cho luc dang xem "Tat ca" va muon co san N file rieng de gui/in cho
  // tung lop. Lan luot tao va tai/chia se tung file 1 (khong dong thoi) de
  // tranh trinh duyet chan bot cua so tai khi bung nhieu file cung luc, dong
  // thoi bao tien do "Dang xuat X/N" cho danh sach nhieu lop.
  async function handleExportExcelPerClass() {
    if (!rows) return
    setExportingPerClass(true)
    setExportError(null)
    try {
      const { exportCs2StudentsToExcel } = await import('./exportCs2StudentsExcel')
      const groups = groupRowsByLop(rows)
      setExportProgress({ done: 0, total: groups.length })
      for (let i = 0; i < groups.length; i += 1) {
        const group = groups[i]
        await exportCs2StudentsToExcel(group.rows, { coSo, lop: group.lop }, exportColumns, `DanhSachHS-${coSo}-${group.lop}`)
        setExportProgress({ done: i + 1, total: groups.length })
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Không xuất được toàn bộ file Excel theo lớp.')
    } finally {
      setExportingPerClass(false)
      setExportProgress(null)
    }
  }

  // Xuat toan truong nhung goi chung vao 1 file duy nhat, moi lop 1 sheet
  // rieng (khac voi handleExportExcelPerClass - o do xuat rieng N file).
  async function handleExportExcelMultiSheet() {
    if (!rows) return
    setExportingMultiSheet(true)
    setExportError(null)
    try {
      const { exportCs2StudentsMultiSheetToExcel } = await import('./exportCs2StudentsExcel')
      const groups = groupRowsByLop(rows)
      await exportCs2StudentsMultiSheetToExcel(groups, coSo, exportColumns, `DanhSachHS-${coSo}-ToanTruong-TheoLop`)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Không xuất được file Excel nhiều sheet.')
    } finally {
      setExportingMultiSheet(false)
    }
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
        <button
          type="button"
          onClick={() => void handleExportExcel()}
          disabled={!rows || exporting || exportingPerClass}
          className="h-9 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {exporting ? 'Đang xuất...' : lop ? `📊 Xuất Excel lớp ${lop}` : '📊 Xuất Excel toàn trường (1 file)'}
        </button>
        {!lop ? (
          <button
            type="button"
            onClick={() => void handleExportExcelPerClass()}
            disabled={!rows || exporting || exportingPerClass || exportingMultiSheet}
            className="h-9 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {exportingPerClass
              ? `Đang xuất... (${exportProgress?.done ?? 0}/${exportProgress?.total ?? 0})`
              : '📁 Xuất mỗi lớp 1 file'}
          </button>
        ) : null}
        {!lop ? (
          <button
            type="button"
            onClick={() => void handleExportExcelMultiSheet()}
            disabled={!rows || exporting || exportingPerClass || exportingMultiSheet}
            className="h-9 rounded-md bg-cyan-700 px-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {exportingMultiSheet ? 'Đang xuất...' : '📑 Xuất 1 file, mỗi lớp 1 sheet'}
          </button>
        ) : null}
        {lop ? (
          <button
            type="button"
            onClick={() => void handleDeleteClass()}
            disabled={deletingClass}
            title="Xoá toàn bộ học sinh thuộc lớp này - dùng khi cần thay hẳn danh sách lớp rồi import lại"
            className="h-9 rounded-md bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {deletingClass ? 'Đang xoá...' : `🗑️ Xoá cả lớp ${lop}`}
          </button>
        ) : null}
      </div>

      {classActionMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-100 p-3 text-sm font-semibold text-emerald-800">
          {classActionMessage}
        </p>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-sm font-semibold text-slate-900">Tuỳ chọn cột xuất Excel</p>
        <p className="mt-1 text-xs text-slate-500">STT, Mã HS và Họ tên luôn được xuất mặc định.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {CS2_EXPORT_COLUMNS.map((column) => (
            <label key={column.key} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={exportColumns.includes(column.key)}
                onChange={() => toggleExportColumn(column.key)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              {column.label}
            </label>
          ))}
        </div>
      </div>

      {exportError ? <p className="text-sm font-semibold text-red-700">{exportError}</p> : null}
      {exportingPerClass ? (
        <p className="text-xs text-slate-500">
          Trình duyệt có thể hỏi xin phép tải nhiều file — chọn "Cho phép" để nhận đủ {exportProgress?.total ?? 0} file.
        </p>
      ) : null}

      {checkResult ? <Cs2CheckResultCard result={checkResult} /> : null}

      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

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
              {rows.map((row, index) => (
                <tr key={row.ma_hs}>
                  <td className="px-3 py-2 text-slate-500">{index + 1}</td>
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
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingRow(row)}
                        className="text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryMaHs(row.ma_hs)}
                        className="text-xs font-semibold text-blue-700 hover:underline"
                      >
                        Xem lịch sử
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(row.ma_hs, `${row.ho} ${row.ten}`)}
                        disabled={deletingMaHs === row.ma_hs}
                        className="text-xs font-semibold text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingMaHs === row.ma_hs ? 'Đang xoá...' : 'Xoá'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historyMaHs ? <Cs2HistoryModal maHs={historyMaHs} onClose={() => setHistoryMaHs(null)} /> : null}
      {editingRow ? (
        <Cs2EditStudentModal
          row={editingRow}
          lopOptions={lopOptions}
          onClose={() => setEditingRow(null)}
          onSaved={(updated) => {
            setRows((current) => (current || []).map((item) => (item.ma_hs === updated.ma_hs ? updated : item)))
            setEditingRow(null)
          }}
        />
      ) : null}
    </div>
  )
}

function Cs2HistoryModal({ maHs, onClose }: { maHs: string; onClose: () => void }) {
  const [rows, setRows] = useState<LichSuRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getSupabaseClient()
      .from('cs2_hoc_sinh_lienlac_lichsu')
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

// Cho GVCN sua lai thong tin 1 hoc sinh CS2 tu trang quan tri - khac voi
// Cs2LookupPage.tsx (hoc sinh tu sua thong tin lien lac cua chinh minh),
// modal nay con cho sua ca Ho/Ten/Lop (hoc sinh khong tu sua duoc 3 truong
// nay o trang cong khai). Goi RPC cap_nhat_thongtin_hs_admin - ghi lich su
// voi nguon = 'gvcn_sua' de phan biet voi lan hoc sinh tu dien (hs_tu_dien).
function Cs2EditStudentModal({
  row,
  lopOptions,
  onClose,
  onSaved,
}: {
  row: Cs2Row
  lopOptions: string[]
  onClose: () => void
  onSaved: (updated: Cs2Row) => void
}) {
  const [ho, setHo] = useState(row.ho)
  const [ten, setTen] = useState(row.ten)
  const [lop, setLop] = useState(row.lop || '')
  const [email, setEmail] = useState(row.email || '')
  const [cccd, setCccd] = useState(row.cccd || '')
  const [soNha, setSoNha] = useState(row.dia_chi_so_nha || '')
  const [provinceCode, setProvinceCode] = useState('')
  const [wardCode, setWardCode] = useState('')
  const [addressData, setAddressData] = useState<{ provinces: VnProvince[]; wards: VnWard[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    loadVnAddressData().then((address) => {
      if (!active) return
      setAddressData(address)
      const matchedProvince = row.dia_chi_tinh_thanh
        ? address.provinces.find((province) => province.fullName === row.dia_chi_tinh_thanh)
        : undefined
      setProvinceCode(matchedProvince?.code || '')
      const matchedWard =
        matchedProvince && row.dia_chi_phuong_xa
          ? wardsByProvince(address.wards, matchedProvince.code).find((ward) => wardLabel(ward) === row.dia_chi_phuong_xa)
          : undefined
      setWardCode(matchedWard?.code || '')
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const wardOptions = addressData ? wardsByProvince(addressData.wards, provinceCode) : []
  const selectedProvince = addressData?.provinces.find((province) => province.code === provinceCode) || null
  const selectedWard = wardOptions.find((ward) => ward.code === wardCode) || null

  async function handleSave() {
    setError(null)
    if (!ten.trim()) return setError('Chưa nhập tên học sinh.')
    if (hasDigitOrSpecialChar(ten) || hasDigitOrSpecialChar(ho)) return setError('Họ/tên không được chứa số hoặc ký tự đặc biệt.')
    if (!lop.trim()) return setError('Chưa chọn lớp.')
    if (email.trim() && !isValidEmail(email)) return setError('Email không đúng định dạng.')
    if (cccd.trim() && !isValidCccd(cccd)) return setError('Số CCCD/mã định danh phải gồm đúng 12 chữ số.')
    // Neu co dien 1 phan dia chi thi bat dien du ca 3 phan, tranh luu dia chi
    // nua vo nua co (vd co so nha nhung thieu tinh/xa).
    const addressPartsFilled = [soNha.trim(), selectedProvince, selectedWard].filter(Boolean).length
    if (addressPartsFilled > 0 && addressPartsFilled < 3) {
      return setError('Đã điền 1 phần địa chỉ thì cần điền đủ Số nhà + Tỉnh/Thành + Phường/Xã.')
    }

    setSaving(true)
    try {
      const { error: rpcError } = await getSupabaseClient().rpc('cap_nhat_thongtin_hs_admin', {
        p_ma_hs: row.ma_hs,
        p_ho: ho.trim(),
        p_ten: ten.trim(),
        p_lop: lop.trim(),
        p_email: email.trim(),
        p_dia_chi_so_nha: soNha.trim(),
        p_dia_chi_tinh_thanh: selectedProvince?.fullName || '',
        p_dia_chi_phuong_xa: selectedWard ? wardLabel(selectedWard) : '',
        p_cccd: cccd.trim(),
      })
      if (rpcError) throw rpcError
      const diaChiHienTai = addressPartsFilled === 3 ? `${soNha.trim()}, ${wardLabel(selectedWard!)}, ${selectedProvince!.fullName}` : null
      onSaved({
        ...row,
        ho: ho.trim(),
        ten: ten.trim(),
        lop: lop.trim(),
        email: email.trim() || null,
        cccd: cccd.trim() || null,
        dia_chi_so_nha: soNha.trim() || null,
        dia_chi_tinh_thanh: selectedProvince?.fullName || null,
        dia_chi_phuong_xa: selectedWard ? wardLabel(selectedWard) : null,
        dia_chi_hien_tai: diaChiHienTai,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được thay đổi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Sửa thông tin — {row.ma_hs}</h2>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-600 hover:underline">
            Đóng
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              Họ
              <input
                type="text"
                value={ho}
                onChange={(event) => setHo(event.target.value)}
                onBlur={() => setHo((current) => autoCapitalizeName(current))}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              Tên
              <input
                type="text"
                value={ten}
                onChange={(event) => setTen(event.target.value)}
                onBlur={() => setTen((current) => autoCapitalizeName(current))}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Lớp
            <input
              type="text"
              list="cs2-edit-lop-options"
              value={lop}
              onChange={(event) => setLop(event.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <datalist id="cs2-edit-lop-options">
              {lopOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-700">Địa chỉ nhà đang sinh sống</p>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              Số nhà, tên đường
              <input
                type="text"
                value={soNha}
                onChange={(event) => setSoNha(event.target.value)}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              Tỉnh/Thành phố
              <select
                value={provinceCode}
                onChange={(event) => {
                  setProvinceCode(event.target.value)
                  setWardCode('')
                }}
                disabled={!addressData}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">{addressData ? '— Chọn Tỉnh/Thành phố —' : 'Đang tải danh sách...'}</option>
                {addressData?.provinces.map((province) => (
                  <option key={province.code} value={province.code}>
                    {province.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              Phường/Xã
              <select
                value={wardCode}
                onChange={(event) => setWardCode(event.target.value)}
                disabled={!provinceCode}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">{provinceCode ? '— Chọn Phường/Xã —' : 'Chọn Tỉnh/Thành phố trước'}</option>
                <optgroup label="Phường">
                  {wardOptions
                    .filter((ward) => ward.type === 'ward')
                    .map((ward) => (
                      <option key={ward.code} value={ward.code}>
                        {wardLabel(ward)}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Xã">
                  {wardOptions
                    .filter((ward) => ward.type === 'commune')
                    .map((ward) => (
                      <option key={ward.code} value={ward.code}>
                        {wardLabel(ward)}
                      </option>
                    ))}
                </optgroup>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Số CCCD (hoặc mã định danh cá nhân)
            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={cccd}
              onChange={(event) => setCccd(event.target.value.replace(/\D/g, ''))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="h-10 flex-1 rounded-md bg-indigo-700 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 flex-1 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Huỷ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const LOP_KHAC_VALUE = '__lop_khac__'

function Cs2QuickAddTab() {
  const [coSo, setCoSo] = useState(CO_SO_OPTIONS[0])
  const [lopOptions, setLopOptions] = useState<string[]>([])
  const [lopSelect, setLopSelect] = useState('')
  const [lopKhac, setLopKhac] = useState('')
  const [tenHs, setTenHs] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Danh sach vua them trong phien lam viec nay (khong luu CSDL rieng, chi
  // giu tam tren man hinh) - de GVCN tien tra lai ma HS vua cap ma khong can
  // nho/chep lai tung lan, phong khi them lien tiep nhieu em.
  const [recentlyAdded, setRecentlyAdded] = useState<{ maHs: string; hoTen: string; lop: string }[]>([])

  // Danh sach lop de chon nhanh (tranh go tay sai ten lop da co san) - van
  // co lua chon "Lop khac" cho truong hop them hoc sinh dau tien cua 1 lop
  // hoan toan moi.
  useEffect(() => {
    let active = true
    setLopSelect('')
    setLopKhac('')
    getSupabaseClient()
      .rpc('danh_sach_lop_theo_co_so', { p_co_so: coSo })
      .then(({ data, error: err }) => {
        if (!active) return
        if (!err) setLopOptions(((data as string[]) || []).slice().sort())
      })
    return () => {
      active = false
    }
  }, [coSo])

  const lop = lopSelect === LOP_KHAC_VALUE ? lopKhac.trim() : lopSelect

  const validationError = useMemo(() => {
    if (tenHs && hasDigitOrSpecialChar(tenHs)) return 'Tên học sinh không được chứa số hoặc ký tự đặc biệt.'
    return null
  }, [tenHs])

  async function handleSubmit() {
    setError(null)
    setMessage(null)
    if (!tenHs.trim()) return setError('Chưa nhập tên học sinh.')
    if (!lopSelect) return setError('Chưa chọn lớp.')
    if (lopSelect === LOP_KHAC_VALUE && !lopKhac.trim()) return setError('Chưa nhập tên lớp mới.')
    if (validationError) return setError(validationError)

    // Luon chuan hoa viet hoa chu cai dau moi tu truoc khi gui - khong chi
    // dua vao onBlur (vd nguoi dung go xong bam Enter/nut Them ngay, chua
    // kip roi khoi o nhap thi cung khong bi luu sai dinh dang).
    const tenChuanHoa = autoCapitalizeName(tenHs)
    setTenHs(tenChuanHoa)

    setSubmitting(true)
    try {
      // Khong con nhap tay ma_hs - he thong tu sinh (dai "9xxxxx", khong bao
      // gio trung voi ma_hs sinh tu sbd khi import JSON, dang "26...") va
      // tra ve ma vua cap de GVCN bao cho hoc sinh biet dung ma nao de tra
      // cuu (xem docs/thuthapthongtincs2/18-bo-sung-auto-sinh-ma-hs.md).
      const { data, error: rpcError } = await getSupabaseClient().rpc('them_nhanh_hoc_sinh', {
        p_ten_hs: tenChuanHoa,
        p_lop: lop,
        p_co_so: coSo,
      })
      if (rpcError) throw rpcError
      const maHsMoi = data as string
      setMessage(`Đã thêm học sinh ${tenChuanHoa} vào lớp ${lop}. Mã HS được cấp: ${maHsMoi}`)
      setRecentlyAdded((current) => [{ maHs: maHsMoi, hoTen: tenChuanHoa, lop }, ...current])
      setTenHs('')
      if (lopSelect === LOP_KHAC_VALUE) {
        // Lop moi vua tao gio da ton tai - lam moi danh sach de lan sau chon
        // duoc luon tu droplist thay vi lai phai go tay "Lop khac".
        setLopOptions((current) => (current.includes(lop) ? current : [...current, lop].sort()))
        setLopSelect(lop)
        setLopKhac('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thêm được học sinh.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">
        Mã học sinh sẽ được hệ thống tự động cấp (không cần nhập tay) sau khi thêm thành công.
      </p>
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
        <select
          value={lopSelect}
          onChange={(event) => setLopSelect(event.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">— Chọn lớp —</option>
          {lopOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value={LOP_KHAC_VALUE}>➕ Lớp khác (nhập tay)</option>
        </select>
      </label>
      {lopSelect === LOP_KHAC_VALUE ? (
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Tên lớp mới
          <input
            type="text"
            value={lopKhac}
            onChange={(event) => setLopKhac(event.target.value)}
            placeholder="VD: 10A210"
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Tên học sinh
        <input
          type="text"
          value={tenHs}
          onChange={(event) => setTenHs(event.target.value)}
          onBlur={() => setTenHs((current) => autoCapitalizeName(current))}
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
                <span className="text-slate-700">
                  {item.hoTen} <span className="text-slate-400">— Lớp {item.lop}</span>
                </span>
                <span className="font-mono font-semibold text-indigo-700">{item.maHs}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Import roster hoc sinh tu file JSON "danh sach phong thi" (dataset_type =
// exam_candidate_list) - xem docs/thuthapthongtincs2/17-import-roster-hs-tu-json.md.
// Khac ban dac ta goc: KHONG con co che "chan lop da co du lieu" (vi gio dung
// bang cs2_hoc_sinh rieng, khong con chung du lieu voi 11C5 de so trung nua) -
// chi con giu lai buoc "bo qua ma_hs da ton tai" cho an toan khi lo chay
// import lai cung 1 file.

function todayIso(): string {
  const now = new Date()
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}

interface ImportStudentRow {
  sbd: string
  hoTen: string
  lop: string
}

interface ImportGroup {
  id: string
  name: string
  students: ImportStudentRow[]
  errorCount: number
}

interface ParsedImport {
  datasetName: string
  groups: ImportGroup[]
}

function parseImportJson(raw: unknown): ParsedImport {
  if (!raw || typeof raw !== 'object') {
    throw new Error('File JSON không hợp lệ.')
  }
  const obj = raw as Record<string, unknown>
  if (obj.dataset_type !== 'exam_candidate_list') {
    throw new Error('File không đúng định dạng (dataset_type phải là "exam_candidate_list").')
  }
  if (!Array.isArray(obj.groups)) {
    throw new Error('File thiếu mảng "groups".')
  }

  const groups: ImportGroup[] = obj.groups.map((rawGroup, groupIndex) => {
    const group = (rawGroup || {}) as Record<string, unknown>
    const students: ImportStudentRow[] = []
    let errorCount = 0
    const rawStudents = Array.isArray(group.students) ? group.students : []
    for (const rawStudent of rawStudents) {
      const student = (rawStudent || {}) as Record<string, unknown>
      const sbd = String(student.sbd ?? '').trim()
      const hoTenRaw = String(student.ho_ten ?? '').trim()
      const lopRaw = String(student.lop ?? '').trim()
      if (!sbd || !hoTenRaw || !lopRaw) {
        errorCount += 1
        continue
      }
      students.push({ sbd, hoTen: fixMojibake(hoTenRaw), lop: fixMojibake(lopRaw) })
    }
    const rawName = String(group.name ?? group.id ?? `Đợt ${groupIndex + 1}`)
    return {
      id: String(group.id ?? groupIndex),
      name: fixMojibake(rawName),
      students,
      errorCount,
    }
  })

  return { datasetName: fixMojibake(String(obj.dataset_name ?? '')), groups }
}

function Cs2ImportTab() {
  const [parsed, setParsed] = useState<ParsedImport | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [ngayNhapHoc, setNgayNhapHoc] = useState(() => todayIso())
  const [existingByLop, setExistingByLop] = useState<Record<string, Set<string>>>({})
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  async function loadExisting(groups: ImportGroup[]) {
    const lops = Array.from(new Set(groups.flatMap((group) => group.students.map((student) => student.lop))))
    if (lops.length === 0) return
    setLoadingExisting(true)
    try {
      const data = await fetchAllRows<{ ma_hs: string; lop: string }>((from, to) =>
        getSupabaseClient()
          .from('cs2_hoc_sinh')
          .select('ma_hs, lop')
          .eq('co_so', 'CS2')
          .in('lop', lops)
          .order('ma_hs')
          .range(from, to),
      )
      const map: Record<string, Set<string>> = {}
      for (const row of data) {
        if (!map[row.lop]) map[row.lop] = new Set()
        map[row.lop].add(row.ma_hs)
      }
      setExistingByLop(map)
    } catch {
      // Chi la thong tin tham khao hien thi truoc khi import - khong chan luong neu loi.
    } finally {
      setLoadingExisting(false)
    }
  }

  async function handleFile(file: File | null) {
    if (!file) return
    setParseError(null)
    setImportError(null)
    setImportResult(null)
    setExistingByLop({})
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const result = parseImportJson(json)
      setParsed(result)
      setSelectedGroupIds(result.groups.map((group) => group.id))
      await loadExisting(result.groups)
    } catch (err) {
      setParsed(null)
      setParseError(err instanceof Error ? err.message : 'Không đọc được file JSON.')
    }
  }

  const perLopSummary = useMemo(() => {
    if (!parsed) return []
    const map = new Map<string, { lop: string; total: number; existing: number }>()
    for (const group of parsed.groups) {
      if (!selectedGroupIds.includes(group.id)) continue
      for (const student of group.students) {
        const entry = map.get(student.lop) || { lop: student.lop, total: 0, existing: 0 }
        entry.total += 1
        if (existingByLop[student.lop]?.has(student.sbd)) entry.existing += 1
        map.set(student.lop, entry)
      }
    }
    return Array.from(map.values()).sort((a, b) => a.lop.localeCompare(b.lop))
  }, [parsed, selectedGroupIds, existingByLop])

  const totalErrorRows = parsed ? parsed.groups.reduce((sum, group) => sum + group.errorCount, 0) : 0

  // Danh sach hoc sinh THUC SU se duoc tao moi (da loc bo trung/da ton tai) -
  // dung chung cho ca bang xem truoc (de ra soat ten truoc khi bam import,
  // quan trong vi file nguon co the bi loi phong chu/mojibake) va cho
  // handleImport ben duoi, tranh tinh lai 2 lan.
  const candidateRows = useMemo(() => {
    if (!parsed) return []
    const candidates = parsed.groups.filter((group) => selectedGroupIds.includes(group.id)).flatMap((group) => group.students)
    const seen = new Set<string>()
    const rows: { ma_hs: string; ho: string; ten: string; lop: string; co_so: string; ngay_nhap_hoc: string }[] = []
    for (const student of candidates) {
      if (seen.has(student.sbd) || existingByLop[student.lop]?.has(student.sbd)) continue
      seen.add(student.sbd)
      const { ho, ten } = splitHoTen(student.hoTen)
      rows.push({ ma_hs: student.sbd, ho, ten, lop: student.lop, co_so: 'CS2', ngay_nhap_hoc: ngayNhapHoc })
    }
    return rows
  }, [parsed, selectedGroupIds, existingByLop, ngayNhapHoc])

  async function handleImport() {
    if (!parsed) return
    setImporting(true)
    setImportError(null)
    setImportResult(null)
    try {
      const rows = candidateRows
      const totalCandidates = parsed.groups
        .filter((group) => selectedGroupIds.includes(group.id))
        .reduce((sum, group) => sum + group.students.length, 0)
      const skipped = totalCandidates - rows.length

      const chunkSize = 500
      let created = 0
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize)
        // upsert + ignoreDuplicates de an toan truoc rui ro trung (vd chay lai
        // import cung luc tu 2 tab) du da loc truoc o tren - khong bao loi ca
        // batch chi vi 1 dong trung ma_hs.
        const { error } = await getSupabaseClient()
          .from('cs2_hoc_sinh')
          .upsert(chunk, { onConflict: 'ma_hs', ignoreDuplicates: true })
        if (error) throw error
        created += chunk.length
      }

      setImportResult({ created, skipped })
      setParsed(null)
      setExistingByLop({})
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Không import được danh sách.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-6 text-center hover:bg-blue-100">
          <span className="text-2xl" aria-hidden="true">
            📥
          </span>
          <span className="text-sm font-semibold text-blue-700">Chọn file JSON danh sách phòng thi</span>
          <span className="text-xs text-slate-500">Định dạng dataset_type = "exam_candidate_list" (schema_version 1.0)</span>
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              void handleFile(event.target.files?.[0] || null)
              event.target.value = ''
            }}
          />
        </label>
        {parseError ? <p className="mt-2 text-sm font-semibold text-red-700">{parseError}</p> : null}
      </div>

      {importResult ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-100 p-4 text-sm font-semibold text-emerald-800">
          Đã tạo mới {importResult.created} học sinh, bỏ qua {importResult.skipped} học sinh (đã tồn tại hoặc trùng trong file).
        </div>
      ) : null}
      {importError ? <div className="rounded-lg border border-red-200 bg-red-100 p-4 text-sm font-semibold text-red-700">{importError}</div> : null}

      {parsed ? (
        <>
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              {parsed.datasetName || 'Danh sách đã chọn'} — chọn đợt (group) muốn import
            </p>
            <div className="flex flex-wrap gap-3">
              {parsed.groups.map((group) => (
                <label key={group.id} className="flex items-center gap-1.5 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(group.id)}
                    onChange={(event) => {
                      setSelectedGroupIds((current) =>
                        event.target.checked ? [...current, group.id] : current.filter((id) => id !== group.id),
                      )
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {group.name} ({group.students.length} HS{group.errorCount > 0 ? `, ${group.errorCount} dòng lỗi` : ''})
                </label>
              ))}
            </div>
            {totalErrorRows > 0 ? (
              <p className="text-xs font-semibold text-amber-700">
                {totalErrorRows} dòng thiếu sbd/ho_ten/lop trong file — đã tự động loại khỏi danh sách import.
              </p>
            ) : null}
            <label className="flex max-w-xs flex-col gap-1 text-xs font-medium text-slate-700">
              Ngày nhập học (áp dụng cho cả batch)
              <input
                type="date"
                value={ngayNhapHoc}
                onChange={(event) => setNgayNhapHoc(event.target.value)}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">
              Xem trước theo lớp {loadingExisting ? '(đang kiểm tra dữ liệu đã có...)' : ''}
            </p>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Lớp</th>
                    <th className="px-3 py-2">Số HS trong file</th>
                    <th className="px-3 py-2">Đã có trong hệ thống</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {perLopSummary.map((row) => (
                    <tr key={row.lop}>
                      <td className="px-3 py-2 font-semibold text-slate-900">{row.lop}</td>
                      <td className="px-3 py-2 text-slate-700">{row.total}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {row.existing > 0 ? <span className="font-semibold text-amber-700">{row.existing}</span> : row.existing}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">
              Xem trước tên học sinh sẽ tạo mới ({candidateRows.length} học sinh) — kiểm tra kỹ dấu tiếng Việt trước khi import,
              nhất là nếu file gốc từng bị lỗi phông chữ khi xuất từ Excel.
            </p>
            <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Mã HS</th>
                    <th className="px-3 py-2">Họ tên</th>
                    <th className="px-3 py-2">Lớp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidateRows.map((row) => (
                    <tr key={row.ma_hs}>
                      <td className="px-3 py-2 text-slate-500">{row.ma_hs}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {row.ho} {row.ten}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{row.lop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={importing || selectedGroupIds.length === 0 || candidateRows.length === 0}
              className="h-10 rounded-md bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {importing ? 'Đang import...' : `Xác nhận Import ${candidateRows.length} học sinh thuộc ${perLopSummary.length} lớp`}
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

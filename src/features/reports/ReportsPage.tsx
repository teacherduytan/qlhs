import { useEffect, useMemo, useState } from 'react'
import { dataSource } from '../../data/client'
import type { BanCanSu, CauHinhTuan, DanhMucDiem, DiemDanh, GhiNhan, HocSinh, LienLacPhuHuynh } from '../../data/types'
import { formatDate, formatDateCompact, isActiveStudent } from '../dashboard/DashboardPage'
import { findWeek, getTodayIsoDate, selectDefaultWeek, WeekSelector } from '../time/WeekSelector'
import { buildReportData, type ReportData } from './reportData'
import { BAN_CAN_SU_SIGNATURE_ROLES, type ReportPresentationMeta } from './reportConfig'

type ReportTab = 'tuan' | 'thang'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'success'
      students: HocSinh[]
      catalog: DanhMucDiem[]
      weeks: CauHinhTuan[]
      records: GhiNhan[]
      contactHistory: LienLacPhuHuynh[]
      banCanSu: BanCanSu[]
    }

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('tuan')
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  const [tuanSo, setTuanSo] = useState(1)
  const [customRange, setCustomRange] = useState(false)
  const [customTuNgay, setCustomTuNgay] = useState('')
  const [customDenNgay, setCustomDenNgay] = useState('')

  const [thang, setThang] = useState(() => getTodayIsoDate().slice(0, 7))

  const [attendanceEntries, setAttendanceEntries] = useState<DiemDanh[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceError, setAttendanceError] = useState<string | null>(null)

  const [exporting, setExporting] = useState<'word' | 'pdf' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    Promise.all([
      dataSource.getStudents(),
      dataSource.getPointCatalog(),
      dataSource.getWeekConfig(),
      dataSource.getRecords(),
      dataSource.getParentContactHistory(),
      dataSource.getBanCanSu(),
    ])
      .then(([students, catalog, weeks, records, contactHistory, banCanSu]) => {
        if (!active) return
        setState({ status: 'success', students, catalog, weeks, records, contactHistory, banCanSu })
        setTuanSo(selectDefaultWeek(weeks, records))
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Không tải được dữ liệu báo cáo.',
        })
      })

    return () => {
      active = false
    }
  }, [])

  const weeks = state.status === 'success' ? state.weeks : []

  const range = useMemo(() => {
    if (tab === 'tuan') {
      if (customRange && customTuNgay && customDenNgay) {
        return { tuNgay: customTuNgay, denNgay: customDenNgay }
      }
      const week = findWeek(weeks, tuanSo)
      return week ? { tuNgay: week.tu_ngay, denNgay: week.den_ngay } : null
    }

    const [year, month] = thang.split('-').map(Number)
    if (!year || !month) return null
    const lastDay = new Date(year, month, 0).getDate()
    return { tuNgay: `${thang}-01`, denNgay: `${thang}-${String(lastDay).padStart(2, '0')}` }
  }, [tab, customRange, customTuNgay, customDenNgay, tuanSo, weeks, thang])

  useEffect(() => {
    if (!range) return
    let active = true
    setAttendanceLoading(true)
    setAttendanceError(null)

    dataSource
      .getAttendanceEntries({ ngayFrom: range.tuNgay, ngayTo: range.denNgay })
      .then((entries) => {
        if (!active) return
        setAttendanceEntries(entries)
      })
      .catch((error: unknown) => {
        if (!active) return
        setAttendanceError(error instanceof Error ? error.message : 'Không tải được dữ liệu điểm danh.')
      })
      .finally(() => {
        if (active) setAttendanceLoading(false)
      })

    return () => {
      active = false
    }
  }, [range?.tuNgay, range?.denNgay])

  const reportData: ReportData | null = useMemo(() => {
    if (state.status !== 'success' || !range) return null
    return buildReportData({
      tuNgay: range.tuNgay,
      denNgay: range.denNgay,
      students: state.students,
      attendanceEntries,
      records: state.records,
      catalog: state.catalog,
      contactHistory: state.contactHistory,
    })
  }, [state, range, attendanceEntries])

  const title = useMemo(() => {
    if (tab === 'tuan') {
      if (customRange && range) return `Báo cáo giai đoạn ${formatDateCompact(range.tuNgay)} – ${formatDateCompact(range.denNgay)}`
      return `Báo cáo Tuần ${tuanSo}`
    }
    const [year, month] = thang.split('-')
    return `Báo cáo Tháng ${month}/${year}`
  }, [tab, customRange, range, tuanSo, thang])

  const fileBaseName = useMemo(() => {
    if (tab === 'tuan') {
      if (customRange && range) return `BaoCao-GiaiDoan-${range.tuNgay}_${range.denNgay}-11C5`
      return `BaoCao-Tuan${tuanSo}-11C5`
    }
    const [year, month] = thang.split('-')
    return `BaoCao-Thang${month}-${year}-11C5`
  }, [tab, customRange, range, tuanSo, thang])

  const meta: ReportPresentationMeta | null = useMemo(() => {
    if (!range || state.status !== 'success') return null
    const [year, month, day] = range.denNgay.split('-').map(Number)
    const soHocSinh = state.students.filter((student: HocSinh) =>
      isActiveStudent(student, new Date(year, month - 1, day)),
    ).length

    const studentByMaHs = new Map(state.students.map((student) => [student.ma_hs, student]))
    const banCanSuSignatures = BAN_CAN_SU_SIGNATURE_ROLES.map((chucVu) => {
      const entry = state.banCanSu.find((item) => item.chuc_vu === chucVu)
      if (!entry) return null
      const student = studentByMaHs.get(entry.ma_hs)
      if (!student) return null
      return { chucVu, hoTen: `${student.ho} ${student.ten}` }
    }).filter((item): item is { chucVu: string; hoTen: string } => item !== null)

    return {
      title,
      subtitle: `Từ ${formatDate(range.tuNgay)} đến ${formatDate(range.denNgay)}`,
      soHocSinh,
      banCanSuSignatures,
    }
  }, [range, state, title])

  async function handleExportWord() {
    if (!reportData || !meta) return
    setExporting('word')
    setExportError(null)
    try {
      const { exportReportToWord } = await import('./exportWord')
      await exportReportToWord(reportData, meta, fileBaseName)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Không xuất được file Word.')
    } finally {
      setExporting(null)
    }
  }

  async function handleExportPdf() {
    if (!reportData || !meta) return
    setExporting('pdf')
    setExportError(null)
    try {
      const { exportReportToPdf } = await import('./exportPdf')
      await exportReportToPdf(reportData, meta, fileBaseName)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Không xuất được file PDF.')
    } finally {
      setExporting(null)
    }
  }

  if (state.status === 'loading') {
    return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Đang tải dữ liệu báo cáo...</div>
  }

  if (state.status === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-100 p-4 text-sm font-medium text-red-700">
        {state.message}
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-indigo-200 bg-indigo-100 p-4">
        <p className="text-xs font-semibold uppercase text-indigo-700">Sinh hoạt lớp</p>
        <h2 className="text-xl font-bold text-slate-900">Báo cáo Tuần / Tháng</h2>
        <p className="mt-1 text-sm text-slate-600">
          Xem nhanh chuyên cần, vi phạm nề nếp và ghi nhận tích cực trong kỳ, xuất file Word/PDF để in hoặc gửi.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('tuan')}
            className={`h-10 rounded-md px-4 text-sm font-semibold ${
              tab === 'tuan' ? 'bg-indigo-700 text-white' : 'border border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            Báo cáo Tuần
          </button>
          <button
            type="button"
            onClick={() => setTab('thang')}
            className={`h-10 rounded-md px-4 text-sm font-semibold ${
              tab === 'thang' ? 'bg-indigo-700 text-white' : 'border border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            Báo cáo Tháng
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {tab === 'tuan' ? (
          <div className="space-y-3">
            <WeekSelector value={tuanSo} weeks={weeks} onChange={setTuanSo} />
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={customRange}
                onChange={(event) => setCustomRange(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Tuỳ chỉnh khoảng ngày (ghi đè tuần đã chọn ở trên)
            </label>
            {customRange ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
                  Từ ngày
                  <input
                    type="date"
                    value={customTuNgay}
                    onChange={(event) => setCustomTuNgay(event.target.value)}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
                  Đến ngày
                  <input
                    type="date"
                    value={customDenNgay}
                    onChange={(event) => setCustomDenNgay(event.target.value)}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : (
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:max-w-xs">
            Chọn tháng
            <input
              type="month"
              value={thang}
              onChange={(event) => setThang(event.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        )}
      </div>

      {attendanceError ? (
        <div className="rounded-lg border border-red-200 bg-red-100 p-4 text-sm font-medium text-red-700">{attendanceError}</div>
      ) : null}

      {!range ? (
        <div className="rounded-lg border border-amber-200 bg-amber-100 p-4 text-sm text-amber-900">
          Chưa chọn được khoảng ngày hợp lệ để lên báo cáo.
        </div>
      ) : attendanceLoading || !reportData ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Đang tính báo cáo...</div>
      ) : (
        <ReportPreview
          title={title}
          data={reportData}
          exporting={exporting}
          exportError={exportError}
          onExportWord={() => void handleExportWord()}
          onExportPdf={() => void handleExportPdf()}
        />
      )}
    </section>
  )
}

function ReportPreview({
  title,
  data,
  exporting,
  exportError,
  onExportWord,
  onExportPdf,
}: {
  title: string
  data: ReportData
  exporting: 'word' | 'pdf' | null
  exportError: string | null
  onExportWord: () => void
  onExportPdf: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h3 className="wrap-break-word text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600">
              {formatDate(data.tuNgay)} – {formatDate(data.denNgay)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 md:items-end">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onExportWord}
                disabled={exporting !== null}
                className="h-10 w-full rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
              >
                {exporting === 'word' ? 'Đang xuất...' : '📄 Xuất Word'}
              </button>
              <button
                type="button"
                onClick={onExportPdf}
                disabled={exporting !== null}
                className="h-10 w-full rounded-md bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
              >
                {exporting === 'pdf' ? 'Đang xuất...' : '📕 Xuất PDF'}
              </button>
            </div>
            <p className="text-xs text-slate-500 md:text-right">
              Trên điện thoại, có thể chọn gửi thẳng qua Zalo/Messenger/Telegram.
            </p>
          </div>
        </div>
      </div>

      {exportError ? (
        <div className="rounded-lg border border-red-200 bg-red-100 p-4 text-sm font-medium text-red-700">{exportError}</div>
      ) : null}

      <AttendanceSection data={data} />
      <ViolationSection data={data} />
      <PositiveSection data={data} />
    </div>
  )
}

function StatBox({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'sky' | 'rose' | 'amber' }) {
  const toneClass: Record<string, string> = {
    slate: 'border-slate-200 bg-slate-100 text-slate-900',
    sky: 'border-sky-200 bg-sky-100 text-sky-900',
    rose: 'border-rose-200 bg-rose-100 text-rose-900',
    amber: 'border-amber-200 bg-amber-100 text-amber-900',
  }
  return (
    <div className={`rounded-md border p-3 text-center ${toneClass[tone]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-semibold">{label}</p>
    </div>
  )
}

function AttendanceSection({ data }: { data: ReportData }) {
  const { attendance } = data
  return (
    <section className="rounded-lg border border-sky-200 bg-white">
      <div className="rounded-t-lg bg-sky-700 px-4 py-2.5">
        <h3 className="text-base font-bold text-white">Phần 1 — Chuyên cần</h3>
      </div>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="Học sinh nghỉ học" value={attendance.soHocSinhNghi} tone="slate" />
          <StatBox label="Lượt vắng có phép" value={attendance.soLuotVangCoPhep} tone="sky" />
          <StatBox label="Lượt vắng không phép" value={attendance.soLuotVangKhongPhep} tone="rose" />
          <StatBox label="Lượt đi trễ" value={attendance.soLuotDiTre} tone="amber" />
        </div>

        {attendance.rows.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-100 p-3 text-sm text-slate-600">
            Không có học sinh vắng/trễ trong kỳ báo cáo này.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2">STT</th>
                  <th className="px-3 py-2">Họ tên</th>
                  <th className="px-3 py-2">Ngày</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  <th className="px-3 py-2">Chi tiết buổi</th>
                  <th className="px-3 py-2">Đã liên lạc PH?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.rows.map((row, index) => (
                  <tr key={`${row.maHs}-${row.ngay}`}>
                    <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{row.hoTen}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDateCompact(row.ngay)}</td>
                    <td className="px-3 py-2 text-slate-700">{ATTENDANCE_STATUS_LABELS[row.trangThai]}</td>
                    <td className="px-3 py-2 text-slate-600">{row.chiTietBuoi || '—'}</td>
                    <td className="px-3 py-2">
                      {row.daLienLac ? (
                        <span className="font-semibold text-emerald-700">Đã liên lạc</span>
                      ) : (
                        <span className="font-semibold text-rose-700">Chưa liên lạc</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  vang_khong_phep: 'Vắng không phép',
  vang_co_phep: 'Vắng có phép',
  tre: 'Trễ',
}

function ViolationSection({ data }: { data: ReportData }) {
  const { violation } = data
  return (
    <section className="rounded-lg border border-rose-200 bg-white">
      <div className="rounded-t-lg bg-rose-700 px-4 py-2.5">
        <h3 className="text-base font-bold text-white">Phần 2 — Vi phạm nề nếp</h3>
      </div>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatBox label="Học sinh vi phạm" value={violation.soHocSinhViPham} tone="slate" />
          <StatBox label="Tổng lượt vi phạm" value={violation.tongSoLuot} tone="amber" />
          <StatBox label="Vi phạm nghiêm trọng" value={violation.soViPhamNghiemTrong} tone="rose" />
        </div>

        <p className="rounded-md border border-slate-200 bg-slate-100 p-3 text-sm text-slate-700">
          Sự kiện lớp/tổ trong kỳ: <strong>{violation.suKienTapThe.tongSo}</strong> sự kiện, đã xử lý{' '}
          <strong>{violation.suKienTapThe.daXuLy}</strong>.
        </p>

        {violation.theoNhom.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-100 p-3 text-sm text-slate-600">
            Không có vi phạm cá nhân nào trong kỳ báo cáo này.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Nhóm</th>
                    <th className="px-3 py-2">Số lượt</th>
                    <th className="px-3 py-2">Số học sinh liên quan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {violation.theoNhom.map((row) => (
                    <tr key={row.loai}>
                      <td className="px-3 py-2 font-semibold text-slate-900">{row.nhanLoai}</td>
                      <td className="px-3 py-2 text-slate-700">{row.soLuot}</td>
                      <td className="px-3 py-2 text-slate-700">{row.soHocSinh}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Nhóm</th>
                    <th className="px-3 py-2">Mã</th>
                    <th className="px-3 py-2">Tên vi phạm</th>
                    <th className="px-3 py-2">Số lượt</th>
                    <th className="px-3 py-2">Học sinh (số lần)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {violation.chiTiet.map((row, index) => (
                    <tr key={`${row.loai}-${row.maDanhMuc || 'none'}-${index}`}>
                      <td className="px-3 py-2 text-slate-700">{row.nhanLoai}</td>
                      <td className="px-3 py-2 font-mono text-slate-700">{row.maDanhMuc || '—'}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{row.tenViPham}</td>
                      <td className="px-3 py-2 text-slate-700">{row.soLuot}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.hocSinh.map((student) => `${student.hoTen} (${student.soLan})`).join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function PositiveSection({ data }: { data: ReportData }) {
  const { positive } = data
  return (
    <section className="rounded-lg border border-emerald-200 bg-white">
      <div className="rounded-t-lg bg-emerald-700 px-4 py-2.5">
        <h3 className="text-base font-bold text-white">Phần 3 — Ghi nhận tích cực</h3>
      </div>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
          <StatBox label="Học sinh được ghi nhận" value={positive.soHocSinh} tone="slate" />
          <StatBox label="Tổng lượt ghi nhận" value={positive.tongSoLuot} tone="sky" />
        </div>

        {positive.rows.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-100 p-3 text-sm text-slate-600">
            Không có ghi nhận tích cực nào trong kỳ báo cáo này.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2">Mã</th>
                  <th className="px-3 py-2">Nội dung</th>
                  <th className="px-3 py-2">Số lượt</th>
                  <th className="px-3 py-2">Học sinh (số lần)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {positive.rows.map((row, index) => (
                  <tr key={`${row.maDanhMuc || 'none'}-${index}`}>
                    <td className="px-3 py-2 font-mono text-slate-700">{row.maDanhMuc || '—'}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{row.noiDung}</td>
                    <td className="px-3 py-2 text-slate-700">{row.soLuot}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {row.hocSinh.map((student) => `${student.hoTen} (${student.soLan})`).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { dataSource } from '../../data/client'
import type {
  BanCanSu,
  CauHinhTuan,
  DanhMucDiem,
  DiemDanh,
  GhiNhan,
  HocSinh,
  LienLacPhuHuynh,
  TaiLieuChiTiet,
} from '../../data/types'
import { formatDate, formatDateCompact, isActiveStudent } from '../dashboard/DashboardPage'
import {
  findWeek,
  formatDisplayWeekLabel,
  getDisplayWeekNumber,
  getTodayIsoDate,
  selectDefaultWeek,
  WeekSelector,
} from '../time/WeekSelector'
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
  // [] = bao cao ca lop (mac dinh, giu nguyen hanh vi cu); 1 phan tu = loc
  // rieng 1 hoc sinh de gui phu huynh (nhu truoc); >= 2 phan tu = xuat hang
  // loat, moi hoc sinh 1 file rieng (xem computeBundle() + handleExportBulk*
  // ben duoi) - van dung lai buildReportData() (chi loc INPUT truoc khi
  // tinh, khong doi logic tinh toan).
  const [selectedMaHsList, setSelectedMaHsList] = useState<string[]>([])

  const [thang, setThang] = useState(() => getTodayIsoDate().slice(0, 7))

  const [attendanceEntries, setAttendanceEntries] = useState<DiemDanh[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceError, setAttendanceError] = useState<string | null>(null)

  // Tai lieu (bien ban, cam ket...) da dinh kem trong ky bao cao - moc du
  // lieu tu tinh nang "Thu vien tai lieu" (DocumentsPage.tsx) qua bao cao 1
  // hoc sinh, chi de tham chieu (tieu de/loai/ngay), khong chen anh that.
  const [documents, setDocuments] = useState<TaiLieuChiTiet[]>([])

  const [exporting, setExporting] = useState<'word' | 'pdf' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  // Tien do khi xuat hang loat (>= 2 hoc sinh) - hien "Dang xuat X/N..." thay
  // vi chi 1 trang thai "dang xuat" chung chung nhu truoc.
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)

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

  useEffect(() => {
    if (!range) return
    let active = true
    dataSource
      .getTaiLieu({ tuNgay: range.tuNgay, denNgay: range.denNgay })
      .then((rows) => {
        if (active) setDocuments(rows)
      })
      .catch(() => {
        // Khong chan luong bao cao neu loi - tai lieu chi la muc tham chieu
        // them, khong phai du lieu cot loi cua bao cao.
      })
    return () => {
      active = false
    }
  }, [range?.tuNgay, range?.denNgay])

  // Danh sach chon o "Doi tuong bao cao" - chi hoc sinh dang hoc (dung
  // isActiveStudent() da co, tranh liet ke ca hoc sinh da roi lop), sap theo
  // tt cho dung thu tu so danh sach lop.
  const studentOptions = useMemo(() => {
    if (state.status !== 'success') return []
    return [...state.students].filter((student) => isActiveStudent(student)).sort((left, right) => left.tt - right.tt)
  }, [state])

  const selectedStudents = useMemo(
    () => studentOptions.filter((student) => selectedMaHsList.includes(student.ma_hs)),
    [studentOptions, selectedMaHsList],
  )
  // 0 chon = ca lop; 1 chon = bao cao rieng 1 em (nhu truoc); >= 2 chon =
  // che do xuat hang loat (khong con "1 hoc sinh duy nhat" nao de gan vao
  // preview/bundle don le nua).
  const selectedStudent = selectedStudents.length === 1 ? selectedStudents[0] : null
  const isBulkMode = selectedStudents.length >= 2

  type ReportBundle = { title: string; fileBaseName: string; reportData: ReportData; meta: ReportPresentationMeta }

  // Tinh toan 1 bo "bao cao hoan chinh" (du lieu + tieu de + ten file + meta
  // trinh bay) cho 1 doi tuong - `student` = null nghia la ca lop. Tach
  // thanh 1 ham dung chung de vua phuc vu preview (0/1 hoc sinh) vua phuc vu
  // vong lap xuat hang loat (>= 2 hoc sinh) ma khong lap lai logic tinh
  // tieu de/ten file/meta o 2 noi.
  function computeBundle(student: HocSinh | null): ReportBundle | null {
    if (state.status !== 'success' || !range) return null

    // Loc DUNG 1 hoc sinh truoc khi dua vao buildReportData() - ham nay von
    // da tinh tu 3 mang input doc lap (khong tu fetch gi them), nen "bao cao
    // ca lop" voi "students" chi con 1 phan tu se tu nhien tro thanh "bao
    // cao rieng cho 1 em" ma khong can viet lai logic tinh toan/bang bieu
    // rieng - tai su dung dung 100% cau truc 3 phan (Chuyen can/Vi pham/
    // Tich cuc) da co. Loc theo ma_hs nen cac dong Ghi nhan phai sinh tu su
    // kien tap the (da gan ma_hs rieng cho tung em) van duoc giu dung, chi
    // dong su kien goc (ma_hs = null) bi loai - dung y muon "chi rieng em
    // do", khong lo chuyen chung ca lop vao thu gui phu huynh 1 em.
    const students = student ? [student] : state.students
    const filteredAttendance = student
      ? attendanceEntries.filter((entry) => entry.ma_hs === student.ma_hs)
      : attendanceEntries
    const filteredRecords = student ? state.records.filter((record) => record.ma_hs === student.ma_hs) : state.records
    // Tai lieu chi hien nghia khi bao cao rieng 1 hoc sinh - bao cao ca lop
    // khong loc gi (mang rong, muc "Tai lieu dinh kem" se khong hien).
    const filteredDocuments = student ? documents.filter((doc) => doc.hoc_sinh.some((hs) => hs.ma_hs === student.ma_hs)) : []

    const reportData = buildReportData({
      tuNgay: range.tuNgay,
      denNgay: range.denNgay,
      students,
      attendanceEntries: filteredAttendance,
      records: filteredRecords,
      catalog: state.catalog,
      contactHistory: state.contactHistory,
      documents: filteredDocuments,
    })

    const baseTitle = (() => {
      if (tab === 'tuan') {
        if (customRange) return `Báo cáo giai đoạn ${formatDateCompact(range.tuNgay)} – ${formatDateCompact(range.denNgay)}`
        return `Báo cáo ${formatDisplayWeekLabel(weeks, tuanSo)}`
      }
      const [year, month] = thang.split('-')
      return `Báo cáo Tháng ${month}/${year}`
    })()
    const title = student ? `${baseTitle} — ${student.ho} ${student.ten}` : baseTitle

    const baseFileName = (() => {
      if (tab === 'tuan') {
        if (customRange) return `BaoCao-GiaiDoan-${range.tuNgay}_${range.denNgay}-11C5`
        return `BaoCao-Tuan${getDisplayWeekNumber(weeks, tuanSo) ?? tuanSo}-11C5`
      }
      const [year, month] = thang.split('-')
      return `BaoCao-Thang${month}-${year}-11C5`
    })()
    const fileBaseName = student ? `${baseFileName}-${slugifyName(`${student.ho} ${student.ten}`)}` : baseFileName

    const [year, month, day] = range.denNgay.split('-').map(Number)
    const soHocSinh = state.students.filter((s: HocSinh) => isActiveStudent(s, new Date(year, month - 1, day))).length

    // Bao cao rieng gui 1 phu huynh thi bo qua ky ban can su - khong lien
    // quan, chi ky rieng GVCN/phu huynh o cuoi (buildParentFeedbackAndSignature()
    // trong exportWord/exportPdf da lo, khong doi o day).
    const studentByMaHs = new Map(state.students.map((s) => [s.ma_hs, s]))
    const banCanSuSignatures = student
      ? []
      : BAN_CAN_SU_SIGNATURE_ROLES.map((chucVu) => {
          const entry = state.banCanSu.find((item) => item.chuc_vu === chucVu)
          if (!entry) return null
          const s = studentByMaHs.get(entry.ma_hs)
          if (!s) return null
          return { chucVu, hoTen: `${s.ho} ${s.ten}` }
        }).filter((item): item is { chucVu: string; hoTen: string } => item !== null)

    const meta: ReportPresentationMeta = {
      title,
      subtitle: `Từ ${formatDate(range.tuNgay)} đến ${formatDate(range.denNgay)}`,
      soHocSinh,
      banCanSuSignatures,
      hocSinh: student ? { hoTen: `${student.ho} ${student.ten}`, maHs: student.ma_hs, to: student.to } : undefined,
    }

    return { title, fileBaseName, reportData, meta }
  }

  // Bundle cho che do xem truoc (ca lop hoac dung 1 hoc sinh) - o che do
  // hang loat (>= 2 hoc sinh) khong co 1 bundle "dai dien" nao de xem truoc,
  // xem BulkExportPanel ben duoi thay the.
  const bundle = useMemo(
    () => (isBulkMode ? null : computeBundle(selectedStudent)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, range, attendanceEntries, documents, tab, customRange, tuanSo, thang, weeks, selectedStudent, isBulkMode],
  )

  async function handleExportWord() {
    if (!bundle) return
    setExporting('word')
    setExportError(null)
    try {
      const { exportReportToWord } = await import('./exportWord')
      await exportReportToWord(bundle.reportData, bundle.meta, bundle.fileBaseName)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Không xuất được file Word.')
    } finally {
      setExporting(null)
    }
  }

  async function handleExportPdf() {
    if (!bundle) return
    setExporting('pdf')
    setExportError(null)
    try {
      const { exportReportToPdf } = await import('./exportPdf')
      await exportReportToPdf(bundle.reportData, bundle.meta, bundle.fileBaseName)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Không xuất được file PDF.')
    } finally {
      setExporting(null)
    }
  }

  // Xuat hang loat: lan luot tao va tai/chia se tung file 1 (khong goi song
  // song) de tranh trinh duyet chan bot cua so tai/chia se khi bung qua
  // nhieu file cung luc, dong thoi cap nhat tien do "Dang xuat X/N" cho
  // nguoi dung theo doi voi danh sach dai.
  async function handleExportBulk(kind: 'word' | 'pdf') {
    if (selectedStudents.length === 0) return
    setExporting(kind)
    setExportError(null)
    setBulkProgress({ done: 0, total: selectedStudents.length })
    try {
      const exportFn =
        kind === 'word' ? (await import('./exportWord')).exportReportToWord : (await import('./exportPdf')).exportReportToPdf
      for (let i = 0; i < selectedStudents.length; i += 1) {
        const student = selectedStudents[i]
        const studentBundle = computeBundle(student)
        if (studentBundle) {
          await exportFn(studentBundle.reportData, studentBundle.meta, studentBundle.fileBaseName)
        }
        setBulkProgress({ done: i + 1, total: selectedStudents.length })
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : `Không xuất được toàn bộ file ${kind === 'word' ? 'Word' : 'PDF'}.`)
    } finally {
      setExporting(null)
      setBulkProgress(null)
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

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">Đối tượng báo cáo</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedMaHsList(studentOptions.map((student) => student.ma_hs))}
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              onClick={() => setSelectedMaHsList([])}
              className="text-xs font-semibold text-slate-600 hover:underline"
            >
              Bỏ chọn (cả lớp)
            </button>
          </div>
        </div>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-slate-200">
          {studentOptions.map((student) => {
            const checked = selectedMaHsList.includes(student.ma_hs)
            return (
              <label
                key={student.ma_hs}
                className="flex items-center gap-2 border-b border-slate-100 px-3 py-1.5 text-sm text-slate-800 last:border-b-0 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    setSelectedMaHsList((current) =>
                      event.target.checked
                        ? [...current, student.ma_hs]
                        : current.filter((maHs) => maHs !== student.ma_hs),
                    )
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {student.ho} {student.ten} ({student.ma_hs})
              </label>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {isBulkMode
            ? `Đã chọn ${selectedStudents.length} học sinh — bấm "Xuất Word"/"Xuất PDF" bên dưới để tải riêng ${selectedStudents.length} file, mỗi em 1 file.`
            : selectedStudent
              ? `Chỉ tổng hợp vắng/trễ, vi phạm và ghi nhận tích cực của riêng ${selectedStudent.ho} ${selectedStudent.ten} — dùng để gửi cho phụ huynh xem.`
              : 'Không chọn học sinh nào = báo cáo tổng hợp cả lớp. Chọn 1 em để xem trước rồi xuất riêng, hoặc chọn nhiều em để xuất hàng loạt mỗi em 1 file.'}
        </p>
      </div>

      {attendanceError ? (
        <div className="rounded-lg border border-red-200 bg-red-100 p-4 text-sm font-medium text-red-700">{attendanceError}</div>
      ) : null}

      {!range ? (
        <div className="rounded-lg border border-amber-200 bg-amber-100 p-4 text-sm text-amber-900">
          Chưa chọn được khoảng ngày hợp lệ để lên báo cáo.
        </div>
      ) : attendanceLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Đang tính báo cáo...</div>
      ) : isBulkMode ? (
        <BulkExportPanel
          students={selectedStudents}
          exporting={exporting}
          exportError={exportError}
          bulkProgress={bulkProgress}
          onExportWord={() => void handleExportBulk('word')}
          onExportPdf={() => void handleExportBulk('pdf')}
        />
      ) : !bundle ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Đang tính báo cáo...</div>
      ) : (
        <ReportPreview
          title={bundle.title}
          data={bundle.reportData}
          exporting={exporting}
          exportError={exportError}
          isStudentReport={Boolean(selectedStudent)}
          onExportWord={() => void handleExportWord()}
          onExportPdf={() => void handleExportPdf()}
        />
      )}
    </section>
  )
}

function BulkExportPanel({
  students,
  exporting,
  exportError,
  bulkProgress,
  onExportWord,
  onExportPdf,
}: {
  students: HocSinh[]
  exporting: 'word' | 'pdf' | null
  exportError: string | null
  bulkProgress: { done: number; total: number } | null
  onExportWord: () => void
  onExportPdf: () => void
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-900">Xuất hàng loạt — {students.length} học sinh</h3>
          <p className="text-sm text-slate-600">Mỗi học sinh sẽ được xuất thành 1 file báo cáo riêng.</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 md:items-end">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onExportWord}
              disabled={exporting !== null}
              className="h-10 w-full rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
            >
              {exporting === 'word'
                ? `Đang xuất... (${bulkProgress?.done ?? 0}/${bulkProgress?.total ?? students.length})`
                : `📄 Xuất Word (${students.length} file)`}
            </button>
            <button
              type="button"
              onClick={onExportPdf}
              disabled={exporting !== null}
              className="h-10 w-full rounded-md bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
            >
              {exporting === 'pdf'
                ? `Đang xuất... (${bulkProgress?.done ?? 0}/${bulkProgress?.total ?? students.length})`
                : `📕 Xuất PDF (${students.length} file)`}
            </button>
          </div>
          <p className="text-xs text-slate-500 md:text-right">
            Trình duyệt có thể hỏi xin phép tải nhiều file — chọn "Cho phép" để nhận đủ {students.length} file.
          </p>
        </div>
      </div>

      {exportError ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-100 p-3 text-sm font-medium text-red-700">{exportError}</div>
      ) : null}

      <ul className="mt-3 max-h-48 overflow-y-auto rounded-md border border-slate-200 text-sm">
        {students.map((student, index) => (
          <li key={student.ma_hs} className="flex items-center gap-2 border-b border-slate-100 px-3 py-1.5 last:border-b-0">
            <span className="text-slate-400">{index + 1}.</span>
            <span className="font-medium text-slate-800">
              {student.ho} {student.ten}
            </span>
            <span className="text-slate-400">({student.ma_hs})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ReportPreview({
  title,
  data,
  exporting,
  exportError,
  isStudentReport,
  onExportWord,
  onExportPdf,
}: {
  title: string
  data: ReportData
  exporting: 'word' | 'pdf' | null
  exportError: string | null
  isStudentReport: boolean
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

      <AttendanceSection data={data} isStudentReport={isStudentReport} />
      {isStudentReport ? (
        <>
          <StudentViolationSection data={data} />
          <StudentPositiveSection data={data} />
          <StudentDocumentsSection data={data} />
        </>
      ) : (
        <>
          <ViolationSection data={data} />
          <PositiveSection data={data} />
        </>
      )}
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

function AttendanceSection({ data, isStudentReport }: { data: ReportData; isStudentReport: boolean }) {
  const { attendance } = data
  return (
    <section className="rounded-lg border border-sky-200 bg-white">
      <div className="rounded-t-lg bg-sky-700 px-4 py-2.5">
        <h3 className="text-base font-bold text-white">Phần 1 — Chuyên cần</h3>
      </div>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatBox label="Học sinh nghỉ học" value={attendance.soHocSinhNghi} tone="slate" />
          <StatBox label="Lượt vắng có phép" value={attendance.soLuotVangCoPhep} tone="sky" />
          <StatBox label="Lượt vắng không phép" value={attendance.soLuotVangKhongPhep} tone="rose" />
        </div>
        <p className="text-xs italic text-slate-500">
          Thông tin đi trễ được gộp chung vào mục "Vi phạm nề nếp" bên dưới để tránh trùng lặp.
        </p>

        {attendance.rows.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-100 p-3 text-sm text-slate-600">
            Không có học sinh vắng trong kỳ báo cáo này.
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
                  {isStudentReport ? null : <th className="px-3 py-2">Đã liên lạc PH?</th>}
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
                    {isStudentReport ? null : (
                      <td className="px-3 py-2">
                        {row.daLienLac ? (
                          <span className="font-semibold text-emerald-700">Đã liên lạc</span>
                        ) : (
                          <span className="font-semibold text-rose-700">Chưa liên lạc</span>
                        )}
                      </td>
                    )}
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

// Ban de doc cho phu huynh (C275): liet ke tung lan vi pham theo dung thoi
// gian xay ra (ngay + tiet), noi dung mo ta ro rang thay vi ma so, kem so
// lan lap lai luy ke cua DUNG loi do (dua theo ma danh muc) - giup phu
// huynh thay ngay con minh vi pham gi, luc nao, va da tai pham bao nhieu
// lan, khong can tra cuu ma vi pham nhu ban thong ke ca lop.
function StudentViolationSection({ data }: { data: ReportData }) {
  const { violation, studentTimeline } = data
  const rows = studentTimeline.violations
  return (
    <section className="rounded-lg border border-rose-200 bg-white">
      <div className="rounded-t-lg bg-rose-700 px-4 py-2.5">
        <h3 className="text-base font-bold text-white">Phần 2 — Vi phạm nề nếp</h3>
      </div>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <StatBox label="Tổng lượt vi phạm" value={violation.tongSoLuot} tone="amber" />
          <StatBox label="Vi phạm nghiêm trọng" value={violation.soViPhamNghiemTrong} tone="rose" />
        </div>

        {rows.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-100 p-3 text-sm text-slate-600">
            Không có vi phạm nào trong kỳ báo cáo này.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2">STT</th>
                  <th className="px-3 py-2">Ngày</th>
                  <th className="px-3 py-2">Tiết</th>
                  <th className="px-3 py-2">Môn</th>
                  <th className="px-3 py-2">Nội dung vi phạm</th>
                  <th className="px-3 py-2">Số lần lặp lại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => (
                  <tr key={index} className={row.nghiemTrong ? 'bg-rose-50' : undefined}>
                    <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDateCompact(row.ngay)}</td>
                    <td className="px-3 py-2 text-slate-600">{row.tiet || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{row.monHoc || '—'}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {row.noiDung}
                      {row.nghiemTrong ? <span className="ml-1 text-xs font-bold text-rose-700">(nghiêm trọng)</span> : null}
                    </td>
                    <td className="px-3 py-2 text-slate-700">Lần thứ {row.soLanLuyKe}</td>
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

function StudentPositiveSection({ data }: { data: ReportData }) {
  const { positive, studentTimeline } = data
  const rows = studentTimeline.positives
  return (
    <section className="rounded-lg border border-emerald-200 bg-white">
      <div className="rounded-t-lg bg-emerald-700 px-4 py-2.5">
        <h3 className="text-base font-bold text-white">Phần 3 — Ghi nhận tích cực</h3>
      </div>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 sm:max-w-xs">
          <StatBox label="Tổng lượt ghi nhận" value={positive.tongSoLuot} tone="sky" />
        </div>

        {rows.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-100 p-3 text-sm text-slate-600">
            Không có ghi nhận tích cực nào trong kỳ báo cáo này.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2">STT</th>
                  <th className="px-3 py-2">Ngày</th>
                  <th className="px-3 py-2">Tiết</th>
                  <th className="px-3 py-2">Môn</th>
                  <th className="px-3 py-2">Nội dung</th>
                  <th className="px-3 py-2">Số lần</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDateCompact(row.ngay)}</td>
                    <td className="px-3 py-2 text-slate-600">{row.tiet || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{row.monHoc || '—'}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{row.noiDung}</td>
                    <td className="px-3 py-2 text-slate-700">Lần thứ {row.soLanLuyKe}</td>
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

// Danh sach tham chieu tai lieu (bien ban, cam ket...) da dinh kem cho hoc
// sinh trong ky bao cao - moc du lieu tu tinh nang "Thu vien tai lieu"
// (DocumentsPage.tsx). Chi hien khi bao cao rieng 1 hoc sinh (data.documents
// luon rong voi bao cao ca lop, xem buildReportData()).
function StudentDocumentsSection({ data }: { data: ReportData }) {
  const { documents } = data
  if (documents.length === 0) return null

  return (
    <section className="rounded-lg border border-amber-200 bg-white">
      <div className="rounded-t-lg bg-amber-700 px-4 py-2.5">
        <h3 className="text-base font-bold text-white">Phần 4 — Tài liệu đính kèm</h3>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-xs text-slate-500">
          Các biên bản/tài liệu đã ghi nhận cho học sinh trong kỳ báo cáo này - liên hệ GVCN để xem bản gốc.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">STT</th>
                <th className="px-3 py-2">Ngày</th>
                <th className="px-3 py-2">Loại tài liệu</th>
                <th className="px-3 py-2">Tiêu đề</th>
                <th className="px-3 py-2">Mô tả nội dung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc, index) => (
                <tr key={index}>
                  <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                  <td className="px-3 py-2 text-slate-700">{doc.ngay ? formatDateCompact(doc.ngay) : '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{doc.loaiTaiLieu || '—'}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900">{doc.tieuDe}</td>
                  <td className="px-3 py-2 text-slate-600">{doc.ghiChu || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
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
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Theo nhóm vi phạm</p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-2">STT</th>
                      <th className="px-3 py-2">Nhóm</th>
                      <th className="px-3 py-2">Số lượt</th>
                      <th className="px-3 py-2">Số học sinh liên quan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {violation.theoNhom.map((row, index) => (
                      <tr key={row.loai}>
                        <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{row.nhanLoai}</td>
                        <td className="px-3 py-2 text-slate-700">{row.soLuot}</td>
                        <td className="px-3 py-2 text-slate-700">{row.soHocSinh}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Chi tiết theo mã vi phạm</p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-2">STT</th>
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
                        <td className="px-3 py-2 text-slate-500">{index + 1}</td>
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
                  <th className="px-3 py-2">STT</th>
                  <th className="px-3 py-2">Mã</th>
                  <th className="px-3 py-2">Nội dung</th>
                  <th className="px-3 py-2">Số lượt</th>
                  <th className="px-3 py-2">Học sinh (số lần)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {positive.rows.map((row, index) => (
                  <tr key={`${row.maDanhMuc || 'none'}-${index}`}>
                    <td className="px-3 py-2 text-slate-500">{index + 1}</td>
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

function slugifyName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '')
}

import { useEffect, useMemo, useState } from 'react'
import { dataSource } from '../../data/client'
import type { DanhMucDiem, GhiNhan, HocSinh, LoaiGhiNhan } from '../../data/types'
import { getRecordTypeLabel, isActiveStudent } from '../dashboard/DashboardPage'
import { formatTietLabel } from '../records/recordInsights'
import {
  findWeek,
  getTodayIsoDate,
  selectDefaultWeek,
  WeekSelector,
} from '../time/WeekSelector'
import { MEETING_REASON_OPTIONS, type InvitationData, type InvitationViolationRow } from './invitationTypes'

type DateTab = 'tuan' | 'thang'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; students: HocSinh[]; catalog: DanhMucDiem[]; weeks: import('../../data/types').CauHinhTuan[] }

function slugifyName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '')
}

export function MeetingInvitationPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  const [dateTab, setDateTab] = useState<DateTab>('tuan')
  const [tuanSo, setTuanSo] = useState(1)
  const [customRange, setCustomRange] = useState(false)
  const [customTuNgay, setCustomTuNgay] = useState('')
  const [customDenNgay, setCustomDenNgay] = useState('')
  const [thang, setThang] = useState(() => getTodayIsoDate().slice(0, 7))

  const [selectedLoai, setSelectedLoai] = useState<LoaiGhiNhan[]>([])
  const [selectedMaHsList, setSelectedMaHsList] = useState<string[]>([])
  const [ngayHop, setNgayHop] = useState('')
  const [gioHop, setGioHop] = useState('18:00')
  const [diaDiem, setDiaDiem] = useState('')
  const [noiDungKhac, setNoiDungKhac] = useState('')

  const [recordsByMaHs, setRecordsByMaHs] = useState<Record<string, GhiNhan[]>>({})
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [checkedByKey, setCheckedByKey] = useState<Record<string, boolean>>({})

  const [exporting, setExporting] = useState<'word' | 'pdf' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([dataSource.getStudents(), dataSource.getPointCatalog(), dataSource.getWeekConfig()])
      .then(([students, catalog, weeks]) => {
        if (!active) return
        setState({ status: 'success', students, catalog, weeks })
        dataSource.getRecords().then((allRecords) => {
          if (!active) return
          setTuanSo(selectDefaultWeek(weeks, allRecords))
        })
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({ status: 'error', message: error instanceof Error ? error.message : 'Không tải được dữ liệu.' })
      })
    return () => {
      active = false
    }
  }, [])

  const weeks = state.status === 'success' ? state.weeks : []

  const range = useMemo(() => {
    if (dateTab === 'tuan') {
      if (customRange && customTuNgay && customDenNgay) return { tuNgay: customTuNgay, denNgay: customDenNgay }
      const week = findWeek(weeks, tuanSo)
      return week ? { tuNgay: week.tu_ngay, denNgay: week.den_ngay } : null
    }
    const [year, month] = thang.split('-').map(Number)
    if (!year || !month) return null
    const lastDay = new Date(year, month, 0).getDate()
    return { tuNgay: `${thang}-01`, denNgay: `${thang}-${String(lastDay).padStart(2, '0')}` }
  }, [dateTab, customRange, customTuNgay, customDenNgay, tuanSo, weeks, thang])

  const studentOptions = useMemo(() => {
    if (state.status !== 'success') return []
    return [...state.students].filter((student) => isActiveStudent(student)).sort((left, right) => left.tt - right.tt)
  }, [state])

  const selectedStudents = useMemo(
    () => studentOptions.filter((student) => selectedMaHsList.includes(student.ma_hs)),
    [studentOptions, selectedMaHsList],
  )

  const catalogByCode = useMemo(
    () => new Map((state.status === 'success' ? state.catalog : []).map((item) => [item.ma_danh_muc, item])),
    [state],
  )

  // Xin them ghi_nhan cho cac hoc sinh moi duoc chon (cache lai, khong xin lai
  // hoc sinh da co du lieu) - giong pattern ensureRecordsLoaded o DocumentsPage.tsx.
  useEffect(() => {
    const missing = selectedMaHsList.filter((maHs) => !(maHs in recordsByMaHs))
    if (missing.length === 0) return
    let active = true
    setRecordsLoading(true)
    Promise.all(missing.map((maHs) => dataSource.getRecords(maHs)))
      .then((results) => {
        if (!active) return
        setRecordsByMaHs((current) => {
          const next = { ...current }
          missing.forEach((maHs, index) => {
            next[maHs] = results[index]
          })
          return next
        })
      })
      .finally(() => {
        if (active) setRecordsLoading(false)
      })
    return () => {
      active = false
    }
  }, [selectedMaHsList, recordsByMaHs])

  // Danh sach ghi_nhan ung vien de tich chon, theo tung hoc sinh da chon -
  // loc theo khoang ngay + ly do hop da chon (chua chon ly do nao thi chua co
  // gi de tich, tranh dua het moi loai ghi_nhan vao thu khi chua ro muc dich hop).
  const candidatesByMaHs = useMemo(() => {
    const result: Record<string, GhiNhan[]> = {}
    if (!range || selectedLoai.length === 0) return result
    for (const student of selectedStudents) {
      const records = recordsByMaHs[student.ma_hs] || []
      result[student.ma_hs] = records
        .filter((r) => r.ngay >= range.tuNgay && r.ngay <= range.denNgay && selectedLoai.includes(r.loai))
        .sort((left, right) => (left.ngay < right.ngay ? -1 : left.ngay > right.ngay ? 1 : 0))
    }
    return result
  }, [selectedStudents, recordsByMaHs, range, selectedLoai])

  function isChecked(maHs: string, maGhiNhan: string): boolean {
    const key = `${maHs}:${maGhiNhan}`
    return checkedByKey[key] ?? true
  }

  function toggleChecked(maHs: string, maGhiNhan: string) {
    const key = `${maHs}:${maGhiNhan}`
    setCheckedByKey((current) => ({ ...current, [key]: !(current[key] ?? true) }))
  }

  function lyDoHopText(): string {
    if (selectedLoai.length === 0) return 'học tập và rèn luyện'
    return MEETING_REASON_OPTIONS.filter((option) => selectedLoai.includes(option.value))
      .map((option) => option.lowerLabel)
      .join(', ')
  }

  function computeInvitation(student: HocSinh): InvitationData | null {
    if (!range) return null
    const candidates = candidatesByMaHs[student.ma_hs] || []
    const violations: InvitationViolationRow[] = candidates
      .filter((record) => isChecked(student.ma_hs, record.ma_ghi_nhan || ''))
      .map((record) => ({
        ngay: record.ngay,
        tiet: record.tiet,
        monHoc: record.mon_hoc,
        noiDung:
          (record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc)?.ten_muc : null) ||
          record.noi_dung ||
          getRecordTypeLabel(record.loai),
      }))

    return {
      hoTenHocSinh: `${student.ho} ${student.ten}`,
      maHs: student.ma_hs,
      to: student.to,
      lyDoHop: lyDoHopText(),
      tuNgay: range.tuNgay,
      denNgay: range.denNgay,
      ngayHop,
      gioHop,
      diaDiemHop: diaDiem,
      noiDungKhac,
      violations,
    }
  }

  function fileBaseNameFor(student: HocSinh): string {
    return `ThuMoiHop-${ngayHop || 'chua-chon-ngay'}-${slugifyName(`${student.ho} ${student.ten}`)}`
  }

  const validationError = useMemo(() => {
    if (!range) return 'Chưa chọn được khoảng ngày hợp lệ.'
    if (selectedStudents.length === 0) return 'Chưa chọn học sinh nào để mời họp.'
    if (!ngayHop) return 'Chưa chọn ngày họp.'
    if (!gioHop) return 'Chưa chọn giờ họp.'
    if (!diaDiem.trim()) return 'Chưa nhập địa điểm họp.'
    return null
  }, [range, selectedStudents, ngayHop, gioHop, diaDiem])

  async function handleExport(kind: 'word' | 'pdf') {
    if (validationError) {
      setExportError(validationError)
      return
    }
    setExporting(kind)
    setExportError(null)
    setBulkProgress(selectedStudents.length > 1 ? { done: 0, total: selectedStudents.length } : null)
    try {
      const exportFn =
        kind === 'word'
          ? (await import('./exportInvitationWord')).exportInvitationToWord
          : (await import('./exportInvitationPdf')).exportInvitationToPdf
      for (let i = 0; i < selectedStudents.length; i += 1) {
        const student = selectedStudents[i]
        const invitation = computeInvitation(student)
        if (invitation) await exportFn(invitation, fileBaseNameFor(student))
        if (selectedStudents.length > 1) setBulkProgress({ done: i + 1, total: selectedStudents.length })
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : `Không xuất được file ${kind === 'word' ? 'Word' : 'PDF'}.`)
    } finally {
      setExporting(null)
      setBulkProgress(null)
    }
  }

  if (state.status === 'loading') {
    return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Đang tải dữ liệu...</div>
  }
  if (state.status === 'error') {
    return <div className="rounded-lg border border-red-200 bg-red-100 p-4 text-sm font-medium text-red-700">{state.message}</div>
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-indigo-200 bg-indigo-100 p-4">
        <p className="text-xs font-semibold uppercase text-indigo-700">Liên lạc phụ huynh</p>
        <h2 className="text-xl font-bold text-slate-900">Thư mời họp phụ huynh</h2>
        <p className="mt-1 text-sm text-slate-600">
          Soạn thư mời họp trao đổi tình hình vi phạm/kỷ luật/nề nếp/chuyên cần/học tập của học sinh, kèm sẵn danh sách ghi
          nhận trong khoảng thời gian đã chọn.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">1. Nội dung họp (chọn 1 hoặc nhiều)</p>
        <div className="flex flex-wrap gap-3">
          {MEETING_REASON_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-1.5 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={selectedLoai.includes(option.value)}
                onChange={(event) => {
                  setSelectedLoai((current) =>
                    event.target.checked ? [...current, option.value] : current.filter((v) => v !== option.value),
                  )
                }}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">2. Khoảng thời gian lấy danh sách ghi nhận</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDateTab('tuan')}
            className={`h-9 rounded-md px-3 text-xs font-semibold ${
              dateTab === 'tuan' ? 'bg-indigo-700 text-white' : 'border border-indigo-300 bg-white text-indigo-700'
            }`}
          >
            Theo tuần
          </button>
          <button
            type="button"
            onClick={() => setDateTab('thang')}
            className={`h-9 rounded-md px-3 text-xs font-semibold ${
              dateTab === 'thang' ? 'bg-indigo-700 text-white' : 'border border-indigo-300 bg-white text-indigo-700'
            }`}
          >
            Theo tháng
          </button>
        </div>

        {dateTab === 'tuan' ? (
          <div className="space-y-2">
            <WeekSelector value={tuanSo} weeks={weeks} onChange={setTuanSo} />
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={customRange}
                onChange={(event) => setCustomRange(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Tuỳ chỉnh khoảng ngày (ghi đè tuần đã chọn)
            </label>
            {customRange ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-700">
                  Từ ngày
                  <input
                    type="date"
                    value={customTuNgay}
                    onChange={(event) => setCustomTuNgay(event.target.value)}
                    className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-700">
                  Đến ngày
                  <input
                    type="date"
                    value={customDenNgay}
                    onChange={(event) => setCustomDenNgay(event.target.value)}
                    className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : (
          <input
            type="month"
            value={thang}
            onChange={(event) => setThang(event.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">3. Thời gian & địa điểm họp</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Ngày họp
            <input
              type="date"
              value={ngayHop}
              onChange={(event) => setNgayHop(event.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Giờ họp
            <input
              type="time"
              value={gioHop}
              onChange={(event) => setGioHop(event.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Địa điểm
            <input
              type="text"
              value={diaDiem}
              onChange={(event) => setDiaDiem(event.target.value)}
              placeholder="VD: Phòng họp GVCN"
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Nội dung khác cần trao đổi thêm (tuỳ chọn)
          <textarea
            value={noiDungKhac}
            onChange={(event) => setNoiDungKhac(event.target.value)}
            className="min-h-16 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">4. Chọn học sinh mời họp</p>
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
              Bỏ chọn
            </button>
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200">
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
                      event.target.checked ? [...current, student.ma_hs] : current.filter((maHs) => maHs !== student.ma_hs),
                    )
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {student.ho} {student.ten} ({student.ma_hs})
              </label>
            )
          })}
        </div>
      </div>

      {selectedStudents.length > 0 && selectedLoai.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
          <p className="text-sm font-semibold text-slate-700">
            5. Nội dung ghi nhận đưa vào thư (bỏ tích để loại khỏi thư của em đó)
          </p>
          {recordsLoading ? <p className="text-xs text-slate-500">Đang tải danh sách ghi nhận...</p> : null}
          {selectedStudents.map((student) => {
            const candidates = candidatesByMaHs[student.ma_hs] || []
            return (
              <div key={student.ma_hs} className="rounded-md border border-slate-200 p-3">
                <p className="mb-2 text-sm font-semibold text-slate-900">
                  {student.ho} {student.ten}
                </p>
                {candidates.length === 0 ? (
                  <p className="text-xs text-slate-500">Không có ghi nhận nào khớp trong khoảng thời gian đã chọn.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {candidates.map((record) => (
                      <label key={record.ma_ghi_nhan} className="flex items-start gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked(student.ma_hs, record.ma_ghi_nhan || '')}
                          onChange={() => toggleChecked(student.ma_hs, record.ma_ghi_nhan || '')}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>
                          {record.ngay}
                          {record.tiet ? ` · Tiết ${formatTietLabel(record.tiet)}` : ''}
                          {record.mon_hoc ? ` · ${record.mon_hoc}` : ''} —{' '}
                          {(record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc)?.ten_muc : null) ||
                            record.noi_dung ||
                            getRecordTypeLabel(record.loai)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : selectedStudents.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-100 p-4 text-sm text-amber-900">
          Chọn ít nhất 1 nội dung họp ở bước 1 để hiện danh sách ghi nhận tương ứng đưa vào thư.
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void handleExport('word')}
            disabled={exporting !== null}
            className="h-10 w-full rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
          >
            {exporting === 'word'
              ? bulkProgress
                ? `Đang xuất... (${bulkProgress.done}/${bulkProgress.total})`
                : 'Đang xuất...'
              : `📄 Xuất Word${selectedStudents.length > 1 ? ` (${selectedStudents.length} file)` : ''}`}
          </button>
          <button
            type="button"
            onClick={() => void handleExport('pdf')}
            disabled={exporting !== null}
            className="h-10 w-full rounded-md bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
          >
            {exporting === 'pdf'
              ? bulkProgress
                ? `Đang xuất... (${bulkProgress.done}/${bulkProgress.total})`
                : 'Đang xuất...'
              : `📕 Xuất PDF${selectedStudents.length > 1 ? ` (${selectedStudents.length} file)` : ''}`}
          </button>
        </div>
        {exportError ? <p className="mt-2 text-sm font-semibold text-red-700">{exportError}</p> : null}
        {selectedStudents.length > 1 ? (
          <p className="mt-2 text-xs text-slate-500">
            Sẽ tạo {selectedStudents.length} file thư mời riêng, mỗi học sinh 1 file. Trình duyệt có thể hỏi xin phép tải
            nhiều file — chọn "Cho phép" để nhận đủ.
          </p>
        ) : null}
      </div>
    </section>
  )
}

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type {
  BuoiDiemDanh,
  CauHinhTuan,
  DiemDanh,
  DiemDanhCanLienLac,
  HinhThucLienLacPhuHuynh,
  HocSinh,
  LuaChonDiemDanh,
  TrangThaiDiemDanh,
} from '../../data/types'

type TimeScope = 'diem_danh' | 'thang'

type ContactDraft = {
  hinh_thuc: HinhThucLienLacPhuHuynh
  noi_dung: string
}

const STATUS_OPTIONS: Array<{ label: string; value: LuaChonDiemDanh }> = [
  { label: 'Có mặt', value: 'co_mat' },
  { label: 'Vắng có phép', value: 'vang_co_phep' },
  { label: 'Vắng không phép', value: 'vang_khong_phep' },
]

const CONTACT_OPTIONS: Array<{ label: string; value: HinhThucLienLacPhuHuynh }> = [
  { label: 'Điện thoại trực tiếp', value: 'dien_thoai' },
  { label: 'Gọi Zalo', value: 'goi_zalo' },
  { label: 'Nhắn tin Zalo', value: 'nhan_tin_zalo' },
  { label: 'SMS', value: 'sms' },
]

// Nhãn/màu vẫn giữ 'tre' để các bản ghi Trễ ghi từ trước (trước khi bỏ lựa chọn
// này khỏi form) tiếp tục hiển thị đúng trong lịch sử, dù không còn chọn mới được.
const STATUS_LABELS: Record<TrangThaiDiemDanh, string> = {
  tre: 'Trễ',
  vang_co_phep: 'Vắng có phép',
  vang_khong_phep: 'Vắng không phép',
}

const SESSION_LABELS: Record<BuoiDiemDanh, string> = {
  chieu: 'Chiều',
  sang: 'Sáng',
}

const STATUS_STYLES: Record<TrangThaiDiemDanh, string> = {
  tre: 'border-amber-300 bg-amber-100 text-amber-900',
  vang_co_phep: 'border-sky-300 bg-sky-100 text-sky-900',
  vang_khong_phep: 'border-rose-300 bg-rose-100 text-rose-900',
}

const inputClass =
  'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

const todayIso = toDateInputValue(new Date())

export function AttendanceManagementPage() {
  const [scope, setScope] = useState<TimeScope>('diem_danh')
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [selectedBuoi, setSelectedBuoi] = useState<BuoiDiemDanh>('sang')
  const [selectedMonth, setSelectedMonth] = useState(todayIso.slice(0, 7))
  const [students, setStudents] = useState<HocSinh[]>([])
  const [weeks, setWeeks] = useState<CauHinhTuan[]>([])
  const [weekEntries, setWeekEntries] = useState<DiemDanh[]>([])
  const [dateMonthEntries, setDateMonthEntries] = useState<DiemDanh[]>([])
  const [overviewMonthEntries, setOverviewMonthEntries] = useState<DiemDanh[]>([])
  const [pendingContacts, setPendingContacts] = useState<DiemDanhCanLienLac[]>([])
  const [contactTarget, setContactTarget] = useState<DiemDanhCanLienLac | null>(null)
  const [editingEntry, setEditingEntry] = useState<{ entry: DiemDanh; student: HocSinh } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    Promise.all([dataSource.getStudents(), dataSource.getWeekConfig(), dataSource.getPendingParentContacts()])
      .then(([loadedStudents, loadedWeeks, contacts]) => {
        if (!active) return
        setStudents(loadedStudents)
        setWeeks(loadedWeeks)
        setPendingContacts(contacts)
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Không tải được dữ liệu điểm danh.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const activeWeek = useMemo(() => resolveWeekForDate(weeks, selectedDate), [weeks, selectedDate])
  const dateMonth = selectedDate.slice(0, 7)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    if (scope === 'diem_danh') {
      if (!activeWeek) {
        setLoading(false)
        return
      }
      Promise.all([
        dataSource.getAttendanceEntries({ tuanSo: activeWeek.tuan_so }),
        dataSource.getAttendanceEntries({ ngayFrom: `${dateMonth}-01`, ngayTo: lastDayOfMonth(dateMonth) }),
      ])
        .then(([weekRows, monthRows]) => {
          if (!active) return
          setWeekEntries(weekRows)
          setDateMonthEntries(monthRows)
        })
        .catch((loadError: unknown) => {
          if (active) setError(loadError instanceof Error ? loadError.message : 'Không tải được dữ liệu điểm danh.')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    } else {
      dataSource
        .getAttendanceEntries({ ngayFrom: `${selectedMonth}-01`, ngayTo: lastDayOfMonth(selectedMonth) })
        .then((monthRows) => {
          if (active) setOverviewMonthEntries(monthRows)
        })
        .catch((loadError: unknown) => {
          if (active) setError(loadError instanceof Error ? loadError.message : 'Không tải được dữ liệu điểm danh.')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }

    return () => {
      active = false
    }
  }, [scope, activeWeek, dateMonth, selectedMonth])

  const pendingContactIds = useMemo(() => new Set(pendingContacts.map((item) => item.id)), [pendingContacts])

  const currentEntryByStudent = useMemo(() => {
    const map = new Map<string, DiemDanh>()
    for (const entry of weekEntries) {
      if (entry.ngay !== selectedDate || entry.buoi !== selectedBuoi || !entry.ma_hs) continue
      map.set(entry.ma_hs, entry)
    }
    return map
  }, [weekEntries, selectedDate, selectedBuoi])

  const weekAbsentCountByStudent = useMemo(() => countAbsencesByStudent(weekEntries), [weekEntries])
  const monthAbsentCountByStudent = useMemo(() => countAbsencesByStudent(dateMonthEntries), [dateMonthEntries])

  const sessionSummary = useMemo(
    () => summarizeAttendance(Array.from(currentEntryByStudent.values()), students.length),
    [currentEntryByStudent, students.length],
  )
  const monthSummary = useMemo(
    () => summarizeAttendance(overviewMonthEntries, students.length),
    [overviewMonthEntries, students.length],
  )

  const monthExceptions = useMemo(
    () => [...overviewMonthEntries].sort((left, right) => right.ngay.localeCompare(left.ngay)),
    [overviewMonthEntries],
  )
  const studentByCode = useMemo(() => new Map(students.map((student) => [student.ma_hs, student])), [students])

  async function refreshCurrentData() {
    const contacts = await dataSource.getPendingParentContacts()
    setPendingContacts(contacts)

    if (scope === 'diem_danh') {
      if (!activeWeek) return
      const [weekRows, monthRows] = await Promise.all([
        dataSource.getAttendanceEntries({ tuanSo: activeWeek.tuan_so }),
        dataSource.getAttendanceEntries({ ngayFrom: `${dateMonth}-01`, ngayTo: lastDayOfMonth(dateMonth) }),
      ])
      setWeekEntries(weekRows)
      setDateMonthEntries(monthRows)
    } else {
      const monthRows = await dataSource.getAttendanceEntries({
        ngayFrom: `${selectedMonth}-01`,
        ngayTo: lastDayOfMonth(selectedMonth),
      })
      setOverviewMonthEntries(monthRows)
    }
  }

  async function saveAttendance(student: HocSinh, status: LuaChonDiemDanh, contact: ContactDraft) {
    if (!activeWeek) return

    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const id = await dataSource.upsertAttendanceEntry({
        buoi: selectedBuoi,
        ma_hs: student.ma_hs,
        ngay: selectedDate,
        trang_thai: status,
        tuan_so: activeWeek.tuan_so,
      })

      if (id && status !== 'co_mat' && contact.noi_dung.trim()) {
        await dataSource.addParentContact({
          diem_danh_id: id,
          hinh_thuc: contact.hinh_thuc,
          noi_dung: contact.noi_dung.trim(),
          ma_hs: student.ma_hs,
          ho_ten: `${student.ho} ${student.ten}`,
          ngay: selectedDate,
          buoi: selectedBuoi,
        })
      }

      await refreshCurrentData()
      setMessage(
        status === 'co_mat'
          ? `Đã chuyển ${student.ho} ${student.ten} về có mặt.`
          : `Đã ghi điểm danh ${SESSION_LABELS[selectedBuoi].toLowerCase()} cho ${student.ho} ${student.ten}.`,
      )
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không lưu được điểm danh.')
    } finally {
      setSaving(false)
    }
  }

  async function savePendingContact(target: DiemDanhCanLienLac, contact: ContactDraft) {
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      await dataSource.addParentContact({
        diem_danh_id: target.id,
        hinh_thuc: contact.hinh_thuc,
        noi_dung: contact.noi_dung.trim() || null,
        ma_hs: target.ma_hs || '',
        ho_ten: `${target.ho} ${target.ten}`,
        ngay: target.ngay,
        buoi: target.buoi,
      })
      await refreshCurrentData()
      setContactTarget(null)
      setMessage('Đã ghi nhận liên lạc phụ huynh.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không ghi được liên lạc phụ huynh.')
    } finally {
      setSaving(false)
    }
  }

  function jumpToDate(date: string, buoi: BuoiDiemDanh) {
    setScope('diem_danh')
    setSelectedDate(date)
    setSelectedBuoi(buoi)
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
        <p className="text-xs font-semibold uppercase text-cyan-700">Điểm danh chính khóa</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">Điểm danh giáo viên</h2>
        <p className="mt-2 text-sm text-slate-700">
          Không có dòng nghĩa là có mặt. Trang này chỉ lưu ngoại lệ vắng có phép hoặc không phép. Học sinh đi trễ
          vẫn điểm danh là Có mặt, ghi nhận Trễ ở trang Ghi nhận (danh mục vi phạm).
        </p>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex gap-2">
          {[
            ['diem_danh', 'Điểm danh'],
            ['thang', 'Tháng'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value as TimeScope)}
              className={`h-10 flex-1 rounded-md px-4 text-sm font-semibold sm:flex-none ${
                scope === value
                  ? 'bg-indigo-600 text-white'
                  : 'border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {scope === 'diem_danh' ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Chọn ngày
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Buổi
              <select
                value={selectedBuoi}
                onChange={(event) => setSelectedBuoi(event.target.value as BuoiDiemDanh)}
                className={inputClass}
              >
                <option value="sang">Sáng</option>
                <option value="chieu">Chiều</option>
              </select>
            </label>
            <div className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                {activeWeek ? `Tuần ${activeWeek.tuan_so}` : 'Chưa có cấu hình tuần'}
              </p>
              <p>
                {formatWeekday(selectedDate)} · {formatShortDate(selectedDate)} ·{' '}
                {SESSION_LABELS[selectedBuoi]}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Chọn tháng
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className={inputClass}
              />
            </label>
            <div className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 md:col-span-2">
              <p className="font-semibold text-slate-900">Tổng quan tháng {selectedMonth}</p>
              <p>{monthExceptions.length} lượt ngoại lệ vắng có phép/không phép trong tháng.</p>
            </div>
          </div>
        )}
      </div>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard color="slate" label="Sĩ số" value={scope === 'diem_danh' ? sessionSummary.siSo : monthSummary.siSo} />
        <SummaryCard
          color="emerald"
          label="Hiện diện"
          value={scope === 'diem_danh' ? sessionSummary.hienDien : monthSummary.hienDien}
        />
        <SummaryCard color="rose" label="Vắng" value={scope === 'diem_danh' ? sessionSummary.vang : monthSummary.vang} />
      </div>
      <p className="-mt-3 text-xs text-slate-500">
        {scope === 'diem_danh'
          ? `Tính theo đúng buổi ${SESSION_LABELS[selectedBuoi].toLowerCase()} ngày ${formatShortDate(selectedDate)}.`
          : 'Tính theo số học sinh duy nhất có ít nhất 1 lượt vắng trong tháng (không nhân theo ngày).'}
      </p>

      {scope === 'diem_danh' ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-700">Ghi điểm danh</p>
              <h3 className="text-lg font-bold text-slate-950">
                {SESSION_LABELS[selectedBuoi]} · {formatShortDate(selectedDate)}
              </h3>
            </div>
            {loading ? <p className="text-sm font-semibold text-emerald-700">Đang tải...</p> : null}
          </div>

          <QuickMarkForm
            disabled={saving}
            onSave={(student, status, contact) => saveAttendance(student, status, contact)}
            students={students}
          />

          <div className="mt-5 border-t border-emerald-200 pt-4">
            <p className="text-xs font-semibold uppercase text-emerald-700">
              Danh sách đã điểm danh ({currentEntryByStudent.size})
            </p>
            <div className="mt-2 space-y-2">
              {currentEntryByStudent.size === 0 ? (
                <p className="rounded-md border border-slate-100 bg-white p-3 text-sm text-slate-600">
                  Chưa có học sinh nào bị đánh dấu vắng cho buổi này.
                </p>
              ) : (
                Array.from(currentEntryByStudent.values()).map((entry) => {
                  const student = entry.ma_hs ? studentByCode.get(entry.ma_hs) : undefined
                  const status = entry.trang_thai as TrangThaiDiemDanh
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-3"
                    >
                      <div className="min-w-0 flex-1">
                        {student ? (
                          <Link
                            to={`/quan-ly/hoc-sinh/${student.ma_hs}`}
                            className="block truncate font-semibold text-blue-700 hover:underline"
                          >
                            {student.ho} {student.ten}
                          </Link>
                        ) : (
                          <p className="truncate font-semibold text-slate-900">{entry.ma_hs}</p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                          <span className={`rounded border px-2 py-0.5 ${STATUS_STYLES[status]}`}>
                            {STATUS_LABELS[status]}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
                            Tuần vắng: {entry.ma_hs ? weekAbsentCountByStudent.get(entry.ma_hs) || 0 : 0}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
                            Tháng vắng: {entry.ma_hs ? monthAbsentCountByStudent.get(entry.ma_hs) || 0 : 0}
                          </span>
                          {pendingContactIds.has(entry.id) ? (
                            <span className="rounded-full border border-orange-300 bg-orange-100 px-2 py-0.5 text-orange-800">
                              ⚠ Chưa gọi PH
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {student ? (
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setEditingEntry({ entry, student })}
                            className="h-9 shrink-0 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              const ok = window.confirm(
                                `Xoá điểm danh ${SESSION_LABELS[selectedBuoi].toLowerCase()} của ${student.ho} ${student.ten}? Học sinh sẽ chuyển về Có mặt.`,
                              )
                              if (ok) saveAttendance(student, 'co_mat', { hinh_thuc: 'dien_thoai', noi_dung: '' })
                            }}
                            className="h-9 shrink-0 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            Xoá
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-700">Ngoại lệ trong tháng</p>
              <h3 className="text-lg font-bold text-slate-950">Tháng {selectedMonth}</h3>
            </div>
            {loading ? <p className="text-sm font-semibold text-emerald-700">Đang tải...</p> : null}
          </div>

          <div className="mt-4 space-y-2">
            {monthExceptions.length === 0 ? (
              <p className="rounded-md border border-emerald-100 bg-white p-3 text-sm text-slate-600">
                Không có ngoại lệ vắng nào trong tháng này.
              </p>
            ) : (
              monthExceptions.map((entry) => {
                const student = entry.ma_hs ? studentByCode.get(entry.ma_hs) : undefined
                const status = entry.trang_thai as TrangThaiDiemDanh
                const buoi = entry.buoi as BuoiDiemDanh
                return (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-2 rounded-md border border-emerald-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      {student ? (
                        <Link
                          to={`/quan-ly/hoc-sinh/${student.ma_hs}`}
                          className="font-semibold text-blue-700 hover:underline"
                        >
                          {student.ho} {student.ten}
                        </Link>
                      ) : (
                        <p className="font-semibold text-slate-900">{entry.ma_hs}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        {formatWeekday(entry.ngay)} · {formatShortDate(entry.ngay)} · {SESSION_LABELS[buoi]} ·{' '}
                        <span className={`rounded border px-1.5 py-0.5 font-semibold ${STATUS_STYLES[status]}`}>
                          {STATUS_LABELS[status]}
                        </span>
                        {pendingContactIds.has(entry.id) ? (
                          <span className="ml-1 rounded border border-orange-300 bg-orange-100 px-1.5 py-0.5 font-semibold text-orange-800">
                            Chưa gọi PH
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {student ? (
                      <button
                        type="button"
                        onClick={() => jumpToDate(entry.ngay, buoi)}
                        className="h-9 shrink-0 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Sửa ở Điểm danh
                      </button>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-orange-700">Cần xử lý</p>
            <h3 className="text-lg font-bold text-slate-950">Cần liên lạc phụ huynh</h3>
          </div>
          <p className="text-sm font-semibold text-orange-700">{pendingContacts.length} lượt</p>
        </div>

        <div className="mt-4 space-y-2">
          {pendingContacts.length === 0 ? (
            <p className="rounded-md border border-orange-100 bg-white p-3 text-sm text-slate-600">
              Không còn lượt vắng nào cần liên lạc phụ huynh.
            </p>
          ) : (
            pendingContacts.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-md border border-orange-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  {item.ma_hs ? (
                    <Link
                      to={`/quan-ly/hoc-sinh/${item.ma_hs}`}
                      className="font-semibold text-blue-700 hover:underline"
                    >
                      {item.ho} {item.ten}
                    </Link>
                  ) : (
                    <p className="font-semibold text-slate-900">
                      {item.ho} {item.ten}
                    </p>
                  )}
                  <p className="text-sm text-slate-600">
                    {formatShortDate(item.ngay)} · {SESSION_LABELS[item.buoi as BuoiDiemDanh]} ·{' '}
                    {STATUS_LABELS[item.trang_thai as TrangThaiDiemDanh]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setContactTarget(item)}
                  className="h-10 rounded-md bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700"
                >
                  Ghi nhận
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {contactTarget ? (
        <ContactOnlyModal
          disabled={saving}
          onClose={() => setContactTarget(null)}
          onSave={(contact) => savePendingContact(contactTarget, contact)}
          target={contactTarget}
        />
      ) : null}

      {editingEntry ? (
        <EditEntryModal
          date={selectedDate}
          disabled={saving}
          entry={editingEntry.entry}
          onClose={() => setEditingEntry(null)}
          onSave={async (status, contact) => {
            await saveAttendance(editingEntry.student, status, contact)
            setEditingEntry(null)
          }}
          session={selectedBuoi}
          student={editingEntry.student}
        />
      ) : null}
    </section>
  )
}

function QuickMarkForm({
  disabled,
  onSave,
  students,
}: {
  disabled: boolean
  onSave: (student: HocSinh, status: LuaChonDiemDanh, contact: ContactDraft) => void
  students: HocSinh[]
}) {
  const [selectedCode, setSelectedCode] = useState('')
  const [status, setStatus] = useState<LuaChonDiemDanh>('vang_co_phep')
  const [contact, setContact] = useState<ContactDraft>({ hinh_thuc: 'dien_thoai', noi_dung: '' })
  const studentByCode = useMemo(() => new Map(students.map((student) => [student.ma_hs, student])), [students])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const student = studentByCode.get(selectedCode)
    if (!student) return
    onSave(student, status, contact)
    setSelectedCode('')
    setStatus('vang_co_phep')
    setContact({ hinh_thuc: 'dien_thoai', noi_dung: '' })
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-md border border-emerald-100 bg-white p-3 md:grid-cols-3">
      <select
        value={selectedCode}
        onChange={(event) => setSelectedCode(event.target.value)}
        className={inputClass}
      >
        <option value="">Chọn học sinh...</option>
        {students.map((student) => (
          <option key={student.ma_hs} value={student.ma_hs}>
            {student.ho} {student.ten} ({student.ma_hs})
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as LuaChonDiemDanh)}
        className={inputClass}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={disabled || !selectedCode}
        className="h-10 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {disabled ? 'Đang lưu...' : 'Ghi điểm danh'}
      </button>

      {status !== 'co_mat' ? (
        <div className="space-y-2 md:col-span-3">
          <select
            value={contact.hinh_thuc}
            onChange={(event) =>
              setContact((current) => ({ ...current, hinh_thuc: event.target.value as HinhThucLienLacPhuHuynh }))
            }
            className={inputClass + ' w-full'}
          >
            {CONTACT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <textarea
            value={contact.noi_dung}
            onChange={(event) => setContact((current) => ({ ...current, noi_dung: event.target.value }))}
            placeholder="Nội dung liên lạc phụ huynh (có thể để trống)"
            className="min-h-16 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      ) : null}
    </form>
  )
}

function SummaryCard({
  color,
  label,
  value,
}: {
  color: 'amber' | 'emerald' | 'rose' | 'sky' | 'slate'
  label: string
  value: number
}) {
  const classes = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    sky: 'border-sky-200 bg-sky-50 text-sky-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
  }[color]

  return (
    <div className={`rounded-lg border p-4 ${classes}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  )
}

function EditEntryModal({
  date,
  disabled,
  entry,
  onClose,
  onSave,
  session,
  student,
}: {
  date: string
  disabled: boolean
  entry: DiemDanh
  onClose: () => void
  onSave: (status: LuaChonDiemDanh, contact: ContactDraft) => void
  session: BuoiDiemDanh
  student: HocSinh
}) {
  const savedStatus = (entry.trang_thai as LuaChonDiemDanh | undefined) || 'co_mat'
  const [status, setStatus] = useState<LuaChonDiemDanh>(savedStatus)
  const [contact, setContact] = useState<ContactDraft>({ hinh_thuc: 'dien_thoai', noi_dung: '' })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(status, contact)
  }

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-600">Sửa điểm danh</p>
          <h3 className="text-lg font-bold text-slate-950">
            {student.ho} {student.ten}
          </h3>
          <p className="text-sm text-slate-600">
            {formatShortDate(date)} · {SESSION_LABELS[session]}
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Trạng thái
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as LuaChonDiemDanh)}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {status !== 'co_mat' ? (
          <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
            <p className="text-sm font-bold text-orange-900">Liên lạc phụ huynh</p>
            <label className="mt-3 flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Hình thức
              <select
                value={contact.hinh_thuc}
                onChange={(event) =>
                  setContact((current) => ({
                    ...current,
                    hinh_thuc: event.target.value as HinhThucLienLacPhuHuynh,
                  }))
                }
                className={inputClass}
              >
                {CONTACT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Nội dung
              <textarea
                value={contact.noi_dung}
                onChange={(event) => setContact((current) => ({ ...current, noi_dung: event.target.value }))}
                className="min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Có thể để trống nếu chỉ cần ghi nhận đã liên lạc."
              />
            </label>
          </div>
        ) : null}

        <ModalActions disabled={disabled} onClose={onClose} />
      </form>
    </ModalShell>
  )
}

function ContactOnlyModal({
  disabled,
  onClose,
  onSave,
  target,
}: {
  disabled: boolean
  onClose: () => void
  onSave: (contact: ContactDraft) => void
  target: DiemDanhCanLienLac
}) {
  const [contact, setContact] = useState<ContactDraft>({ hinh_thuc: 'dien_thoai', noi_dung: '' })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(contact)
  }

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase text-orange-600">Ghi nhận liên lạc</p>
          <h3 className="text-lg font-bold text-slate-950">
            {target.ho} {target.ten}
          </h3>
          <p className="text-sm text-slate-600">
            {formatShortDate(target.ngay)} · {SESSION_LABELS[target.buoi as BuoiDiemDanh]} ·{' '}
            {STATUS_LABELS[target.trang_thai as TrangThaiDiemDanh]}
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Hình thức
          <select
            value={contact.hinh_thuc}
            onChange={(event) =>
              setContact((current) => ({
                ...current,
                hinh_thuc: event.target.value as HinhThucLienLacPhuHuynh,
              }))
            }
            className={inputClass}
          >
            {CONTACT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Nội dung
          <textarea
            value={contact.noi_dung}
            onChange={(event) => setContact((current) => ({ ...current, noi_dung: event.target.value }))}
            className="min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <ModalActions disabled={disabled} onClose={onClose} />
      </form>
    </ModalShell>
  )
}

function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="my-8 w-full max-w-lg rounded-lg bg-white p-4 shadow-xl sm:my-0 sm:p-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full border border-slate-200 text-lg font-bold text-slate-500 hover:bg-slate-100"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalActions({ disabled, onClose }: { disabled: boolean; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        Hủy
      </button>
      <button
        type="submit"
        disabled={disabled}
        className="h-10 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {disabled ? 'Đang lưu...' : 'Lưu'}
      </button>
    </div>
  )
}

function countAbsencesByStudent(entries: DiemDanh[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const entry of entries) {
    if (entry.trang_thai !== 'vang_co_phep' && entry.trang_thai !== 'vang_khong_phep') continue
    if (!entry.ma_hs) continue
    map.set(entry.ma_hs, (map.get(entry.ma_hs) || 0) + 1)
  }
  return map
}

function summarizeAttendance(entries: DiemDanh[], studentCount: number) {
  const vangCoPhep = entries.filter((entry) => entry.trang_thai === 'vang_co_phep').length
  const vangKhongPhep = entries.filter((entry) => entry.trang_thai === 'vang_khong_phep').length

  const absentStudentIds = new Set(
    entries
      .filter((entry) => entry.trang_thai === 'vang_co_phep' || entry.trang_thai === 'vang_khong_phep')
      .map((entry) => entry.ma_hs)
      .filter((maHs): maHs is string => Boolean(maHs)),
  )
  const siSo = studentCount
  const vang = absentStudentIds.size
  const hienDien = Math.max(0, siSo - vang)

  return { siSo, vang, hienDien, vangCoPhep, vangKhongPhep }
}

function findWeekForDate(weeks: CauHinhTuan[], date: string): CauHinhTuan | null {
  return weeks.find((week) => week.tu_ngay <= date && date <= week.den_ngay) || null
}

// CauHinhTuan chỉ cấu hình 5 ngày Thứ Hai-Thứ Sáu (so_ngay: 5), nên Thứ Bảy/Chủ Nhật
// không nằm trong khoảng tu_ngay..den_ngay của tuần nào. Trước đây rơi vào trường hợp
// này thì lấy đại weeks[0] (tuần đầu tiên từng cấu hình), sai hẳn sang tuần cũ và làm
// lệch tuan_so lúc lưu cũng như số liệu Sĩ số/Tuần vắng. Đúng ra phải lấy tuần gần nhất
// đã bắt đầu (tu_ngay lớn nhất mà vẫn <= date) — tức tuần chứa Thứ Hai-Thứ Sáu ngay trước đó.
function resolveWeekForDate(weeks: CauHinhTuan[], date: string): CauHinhTuan | null {
  const exact = findWeekForDate(weeks, date)
  if (exact) return exact

  const started = weeks
    .filter((week) => week.tu_ngay <= date)
    .sort((left, right) => right.tu_ngay.localeCompare(left.tu_ngay))
  if (started.length > 0) return started[0]

  const sorted = [...weeks].sort((left, right) => left.tu_ngay.localeCompare(right.tu_ngay))
  return sorted[0] || null
}

function formatShortDate(date: string): string {
  return parseIsoDate(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

function formatWeekday(date: string): string {
  return parseIsoDate(date).toLocaleDateString('vi-VN', { weekday: 'short' })
}

function lastDayOfMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return toDateInputValue(new Date(year, monthNumber, 0))
}

function parseIsoDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

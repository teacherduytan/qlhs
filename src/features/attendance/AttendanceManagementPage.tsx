import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
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

type TimeScope = 'day' | 'week' | 'month'

type EditingCell = {
  date: string
  student: HocSinh
}

type ContactDraft = {
  hinh_thuc: HinhThucLienLacPhuHuynh
  noi_dung: string
}

const STATUS_OPTIONS: Array<{ label: string; value: LuaChonDiemDanh }> = [
  { label: 'Có mặt', value: 'co_mat' },
  { label: 'Vắng có phép', value: 'vang_co_phep' },
  { label: 'Vắng không phép', value: 'vang_khong_phep' },
  { label: 'Trễ', value: 'tre' },
]

const CONTACT_OPTIONS: Array<{ label: string; value: HinhThucLienLacPhuHuynh }> = [
  { label: 'Điện thoại trực tiếp', value: 'dien_thoai' },
  { label: 'Gọi Zalo', value: 'goi_zalo' },
  { label: 'Nhắn tin Zalo', value: 'nhan_tin_zalo' },
  { label: 'SMS', value: 'sms' },
]

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
  const [scope, setScope] = useState<TimeScope>('day')
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(todayIso.slice(0, 7))
  const [students, setStudents] = useState<HocSinh[]>([])
  const [weeks, setWeeks] = useState<CauHinhTuan[]>([])
  const [summaryEntries, setSummaryEntries] = useState<DiemDanh[]>([])
  const [weekEntries, setWeekEntries] = useState<DiemDanh[]>([])
  const [pendingContacts, setPendingContacts] = useState<DiemDanhCanLienLac[]>([])
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [contactTarget, setContactTarget] = useState<DiemDanhCanLienLac | null>(null)
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

        const currentWeek = findWeekForDate(loadedWeeks, selectedDate) || loadedWeeks[0] || null
        setSelectedWeek((value) => value ?? currentWeek?.tuan_so ?? null)
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

  const activeWeek = useMemo(
    () => resolveGridWeek(scope, weeks, selectedDate, selectedWeek, selectedMonth),
    [scope, selectedDate, selectedMonth, selectedWeek, weeks],
  )

  const summaryRange = useMemo(
    () => resolveSummaryRange(scope, selectedDate, selectedWeek, selectedMonth, weeks),
    [scope, selectedDate, selectedMonth, selectedWeek, weeks],
  )

  useEffect(() => {
    if (!activeWeek || !summaryRange) return

    let active = true
    setLoading(true)
    setError(null)

    Promise.all([
      dataSource.getAttendanceEntries({
        ngayFrom: summaryRange.from,
        ngayTo: summaryRange.to,
      }),
      dataSource.getAttendanceEntries({ tuanSo: activeWeek.tuan_so }),
      dataSource.getPendingParentContacts(),
    ])
      .then(([summaryRows, weekRows, contacts]) => {
        if (!active) return
        setSummaryEntries(summaryRows)
        setWeekEntries(weekRows)
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
  }, [activeWeek, summaryRange])

  const weekDays = useMemo(() => (activeWeek ? daysInWeek(activeWeek) : []), [activeWeek])
  const entryMap = useMemo(() => buildEntryMap(weekEntries), [weekEntries])
  const summary = useMemo(
    () => buildSummary(summaryEntries, students.length, scope, selectedMonth, weeks, summaryRange),
    [scope, selectedMonth, students.length, summaryEntries, summaryRange, weeks],
  )

  async function refreshCurrentData() {
    if (!activeWeek || !summaryRange) return
    const [summaryRows, weekRows, contacts] = await Promise.all([
      dataSource.getAttendanceEntries({
        ngayFrom: summaryRange.from,
        ngayTo: summaryRange.to,
      }),
      dataSource.getAttendanceEntries({ tuanSo: activeWeek.tuan_so }),
      dataSource.getPendingParentContacts(),
    ])
    setSummaryEntries(summaryRows)
    setWeekEntries(weekRows)
    setPendingContacts(contacts)
  }

  async function saveCell(
    student: HocSinh,
    date: string,
    values: Record<BuoiDiemDanh, LuaChonDiemDanh>,
    contact: ContactDraft,
  ) {
    if (!activeWeek) return

    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const contactTargets: string[] = []
      for (const session of ['sang', 'chieu'] as BuoiDiemDanh[]) {
        const current = entryMap.get(entryKey(student.ma_hs, date, session))
        const next = values[session]
        if ((current?.trang_thai || 'co_mat') === next) {
          if (next !== 'co_mat' && current?.id) contactTargets.push(current.id)
          continue
        }

        const id = await dataSource.upsertAttendanceEntry({
          buoi: session,
          ma_hs: student.ma_hs,
          ngay: date,
          trang_thai: next,
          tuan_so: activeWeek.tuan_so,
        })
        if (id && next !== 'co_mat') contactTargets.push(id)
      }

      if (contact.noi_dung.trim()) {
        await Promise.all(
          contactTargets.map((diemDanhId) =>
            dataSource.addParentContact({
              diem_danh_id: diemDanhId,
              hinh_thuc: contact.hinh_thuc,
              noi_dung: contact.noi_dung.trim(),
            }),
          ),
        )
      }

      await refreshCurrentData()
      setEditingCell(null)
      setMessage('Đã cập nhật điểm danh.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không lưu được điểm danh.')
    } finally {
      setSaving(false)
    }
  }

  async function saveSingleSession(
    student: HocSinh,
    date: string,
    session: BuoiDiemDanh,
    status: LuaChonDiemDanh,
    contact: ContactDraft,
  ) {
    if (!activeWeek) return

    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const id = await dataSource.upsertAttendanceEntry({
        buoi: session,
        ma_hs: student.ma_hs,
        ngay: date,
        trang_thai: status,
        tuan_so: activeWeek.tuan_so,
      })

      if (id && status !== 'co_mat' && contact.noi_dung.trim()) {
        await dataSource.addParentContact({
          diem_danh_id: id,
          hinh_thuc: contact.hinh_thuc,
          noi_dung: contact.noi_dung.trim(),
        })
      }

      await refreshCurrentData()
      setMessage(
        status === 'co_mat'
          ? `Đã chuyển ${student.ho} ${student.ten} về có mặt.`
          : `Đã ghi điểm danh ${SESSION_LABELS[session].toLowerCase()} cho ${student.ho} ${student.ten}.`,
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

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
        <p className="text-xs font-semibold uppercase text-cyan-700">Điểm danh chính khóa</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">Điểm danh giáo viên</h2>
        <p className="mt-2 text-sm text-slate-700">
          Không có dòng nghĩa là có mặt. Trang này chỉ lưu các ngoại lệ vắng hoặc trễ.
        </p>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex flex-wrap gap-2">
          {[
            ['day', 'Ngày'],
            ['week', 'Tuần'],
            ['month', 'Tháng'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value as TimeScope)}
              className={`h-10 rounded-md px-4 text-sm font-semibold ${
                scope === value
                  ? 'bg-indigo-600 text-white'
                  : 'border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {scope === 'day' ? (
            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Chọn ngày
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className={inputClass}
              />
            </label>
          ) : null}

          {scope === 'week' ? (
            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Chọn tuần
              <select
                value={selectedWeek ?? ''}
                onChange={(event) => setSelectedWeek(Number(event.target.value))}
                className={inputClass}
              >
                {weeks.map((week) => (
                  <option key={week.tuan_so} value={week.tuan_so}>
                    Tuần {week.tuan_so} ({formatShortDate(week.tu_ngay)} - {formatShortDate(week.den_ngay)})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {scope === 'month' ? (
            <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Chọn tháng
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className={inputClass}
              />
            </label>
          ) : null}

          <div className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 md:col-span-2">
            <p className="font-semibold text-slate-900">
              Lưới đang xem: {activeWeek ? `Tuần ${activeWeek.tuan_so}` : 'chưa có tuần'}
            </p>
            <p>
              Tỷ lệ chuyên cần: <span className="font-bold">{summary.rateText}</span> · Tổng lượt có thể:{' '}
              {summary.totalSlots}
            </p>
          </div>
        </div>
      </div>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard color="sky" label="Vắng có phép" value={summary.vangCoPhep} />
        <SummaryCard color="rose" label="Vắng không phép" value={summary.vangKhongPhep} />
        <SummaryCard color="amber" label="Trễ" value={summary.tre} />
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-700">Lưới tuần</p>
            <h3 className="text-lg font-bold text-slate-950">
              {activeWeek ? `Tuần ${activeWeek.tuan_so}` : 'Chưa có cấu hình tuần'}
            </h3>
          </div>
          {loading ? <p className="text-sm font-semibold text-emerald-700">Đang tải...</p> : null}
        </div>

        {scope === 'day' ? (
          <CompactDayAttendance
            date={selectedDate}
            disabled={saving}
            entries={summaryEntries}
            onEditCell={(student) => setEditingCell({ date: selectedDate, student })}
            onSaveSession={(student, session, status, contact) =>
              saveSingleSession(student, selectedDate, session, status, contact)
            }
            students={students}
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-48 border-b border-emerald-200 bg-emerald-50 p-2 text-left font-semibold text-slate-700">
                    Học sinh
                  </th>
                  {weekDays.map((day) => (
                    <th key={day} className="min-w-32 border-b border-emerald-200 p-2 text-left font-semibold text-slate-700">
                      {formatWeekday(day)}
                      <span className="block text-xs font-normal text-slate-500">{formatShortDate(day)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.ma_hs} className="align-top">
                    <td className="sticky left-0 z-10 border-b border-emerald-100 bg-white p-2">
                      <p className="font-semibold text-slate-900">
                        {student.ho} {student.ten}
                      </p>
                      <p className="text-xs text-slate-500">
                        {student.ma_hs} · {student.dien}
                      </p>
                    </td>
                    {weekDays.map((day) => (
                      <td key={`${student.ma_hs}-${day}`} className="border-b border-emerald-100 bg-white p-2">
                        <button
                          type="button"
                          onClick={() => setEditingCell({ date: day, student })}
                          className="min-h-16 w-full rounded-md border border-slate-200 bg-slate-50 p-2 text-left hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          <SessionBadge entry={entryMap.get(entryKey(student.ma_hs, day, 'sang'))} session="sang" />
                          <SessionBadge entry={entryMap.get(entryKey(student.ma_hs, day, 'chieu'))} session="chieu" />
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                  <p className="font-semibold text-slate-900">
                    {item.ho} {item.ten}
                  </p>
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

      {editingCell ? (
        <EditAttendanceModal
          date={editingCell.date}
          disabled={saving}
          entries={{
            chieu: entryMap.get(entryKey(editingCell.student.ma_hs, editingCell.date, 'chieu')),
            sang: entryMap.get(entryKey(editingCell.student.ma_hs, editingCell.date, 'sang')),
          }}
          onClose={() => setEditingCell(null)}
          onSave={(values, contact) => saveCell(editingCell.student, editingCell.date, values, contact)}
          student={editingCell.student}
        />
      ) : null}

      {contactTarget ? (
        <ContactOnlyModal
          disabled={saving}
          onClose={() => setContactTarget(null)}
          onSave={(contact) => savePendingContact(contactTarget, contact)}
          target={contactTarget}
        />
      ) : null}
    </section>
  )
}

function CompactDayAttendance({
  date,
  disabled,
  entries,
  onEditCell,
  onSaveSession,
  students,
}: {
  date: string
  disabled: boolean
  entries: DiemDanh[]
  onEditCell: (student: HocSinh) => void
  onSaveSession: (
    student: HocSinh,
    session: BuoiDiemDanh,
    status: LuaChonDiemDanh,
    contact: ContactDraft,
  ) => void
  students: HocSinh[]
}) {
  const studentByCode = useMemo(() => new Map(students.map((student) => [student.ma_hs, student])), [students])

  const entriesBySession = useMemo(() => {
    const result: Record<BuoiDiemDanh, DiemDanh[]> = { chieu: [], sang: [] }
    for (const entry of entries) {
      if (entry.ngay !== date) continue
      if (entry.buoi !== 'sang' && entry.buoi !== 'chieu') continue
      result[entry.buoi].push(entry)
    }
    return result
  }, [entries, date])

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {(['sang', 'chieu'] as BuoiDiemDanh[]).map((session) => (
        <SessionBlock
          key={session}
          disabled={disabled}
          entries={entriesBySession[session]}
          onEditCell={onEditCell}
          onSaveSession={onSaveSession}
          session={session}
          studentByCode={studentByCode}
          students={students}
        />
      ))}
    </div>
  )
}

function SessionBlock({
  disabled,
  entries,
  onEditCell,
  onSaveSession,
  session,
  studentByCode,
  students,
}: {
  disabled: boolean
  entries: DiemDanh[]
  onEditCell: (student: HocSinh) => void
  onSaveSession: (
    student: HocSinh,
    session: BuoiDiemDanh,
    status: LuaChonDiemDanh,
    contact: ContactDraft,
  ) => void
  session: BuoiDiemDanh
  studentByCode: Map<string, HocSinh>
  students: HocSinh[]
}) {
  const [selectedCode, setSelectedCode] = useState('')
  const [status, setStatus] = useState<LuaChonDiemDanh>('vang_co_phep')
  const [contact, setContact] = useState<ContactDraft>({ hinh_thuc: 'dien_thoai', noi_dung: '' })

  function submitQuickAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const student = studentByCode.get(selectedCode)
    if (!student) return
    onSaveSession(student, session, status, contact)
    setSelectedCode('')
    setContact({ hinh_thuc: 'dien_thoai', noi_dung: '' })
  }

  return (
    <div className="rounded-md border border-emerald-100 bg-white p-3">
      <h4 className="text-sm font-bold uppercase text-emerald-700">{SESSION_LABELS[session]}</h4>

      <div className="mt-2 space-y-2">
        {entries.length === 0 ? (
          <p className="rounded border border-slate-100 bg-slate-50 p-2 text-sm text-slate-500">
            Không có ngoại lệ buổi {SESSION_LABELS[session].toLowerCase()}.
          </p>
        ) : (
          entries.map((entry) => {
            const student = entry.ma_hs ? studentByCode.get(entry.ma_hs) : undefined
            const status = entry.trang_thai as TrangThaiDiemDanh
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded border border-slate-200 p-2"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {student ? `${student.ho} ${student.ten}` : entry.ma_hs}
                  </p>
                  <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                </div>
                {student ? (
                  <button
                    type="button"
                    onClick={() => onEditCell(student)}
                    className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Sửa
                  </button>
                ) : null}
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={submitQuickAdd} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold uppercase text-slate-500">Thêm nhanh</p>
        <select
          value={selectedCode}
          onChange={(event) => setSelectedCode(event.target.value)}
          className={inputClass + ' w-full'}
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
          className={inputClass + ' w-full'}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {status !== 'co_mat' ? (
          <>
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
          </>
        ) : null}

        <button
          type="submit"
          disabled={disabled || !selectedCode}
          className="h-10 w-full rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {disabled ? 'Đang lưu...' : 'Ghi điểm danh'}
        </button>
      </form>
    </div>
  )
}

function SummaryCard({ color, label, value }: { color: 'amber' | 'rose' | 'sky'; label: string; value: number }) {
  const classes = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    sky: 'border-sky-200 bg-sky-50 text-sky-800',
  }[color]

  return (
    <div className={`rounded-lg border p-4 ${classes}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  )
}

function SessionBadge({ entry, session }: { entry?: DiemDanh; session: BuoiDiemDanh }) {
  if (!entry) {
    return (
      <span className="mb-1 flex items-center justify-between rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-400">
        {SESSION_LABELS[session]} <span>✓</span>
      </span>
    )
  }

  const status = entry.trang_thai as TrangThaiDiemDanh
  return (
    <span className={`mb-1 block rounded border px-2 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {SESSION_LABELS[session]}: {STATUS_LABELS[status]}
    </span>
  )
}

function EditAttendanceModal({
  date,
  disabled,
  entries,
  onClose,
  onSave,
  student,
}: {
  date: string
  disabled: boolean
  entries: Record<BuoiDiemDanh, DiemDanh | undefined>
  onClose: () => void
  onSave: (values: Record<BuoiDiemDanh, LuaChonDiemDanh>, contact: ContactDraft) => void
  student: HocSinh
}) {
  const [values, setValues] = useState<Record<BuoiDiemDanh, LuaChonDiemDanh>>({
    chieu: (entries.chieu?.trang_thai as LuaChonDiemDanh | undefined) || 'co_mat',
    sang: (entries.sang?.trang_thai as LuaChonDiemDanh | undefined) || 'co_mat',
  })
  const [contact, setContact] = useState<ContactDraft>({ hinh_thuc: 'dien_thoai', noi_dung: '' })
  const hasException = values.sang !== 'co_mat' || values.chieu !== 'co_mat'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(values, contact)
  }

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-600">Sửa điểm danh</p>
          <h3 className="text-lg font-bold text-slate-950">
            {student.ho} {student.ten}
          </h3>
          <p className="text-sm text-slate-600">{formatShortDate(date)}</p>
        </div>

        {(['sang', 'chieu'] as BuoiDiemDanh[]).map((session) => (
          <label key={session} className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            {SESSION_LABELS[session]}
            <select
              value={values[session]}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [session]: event.target.value as LuaChonDiemDanh,
                }))
              }
              className={inputClass}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}

        {hasException ? (
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
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

function buildEntryMap(entries: DiemDanh[]): Map<string, DiemDanh> {
  return new Map(
    entries
      .filter((entry) => entry.ma_hs && (entry.buoi === 'sang' || entry.buoi === 'chieu'))
      .map((entry) => [entryKey(entry.ma_hs || '', entry.ngay, entry.buoi as BuoiDiemDanh), entry]),
  )
}

function buildSummary(
  entries: DiemDanh[],
  studentCount: number,
  scope: TimeScope,
  selectedMonth: string,
  weeks: CauHinhTuan[],
  range: { from: string; to: string } | null,
) {
  const vangCoPhep = entries.filter((entry) => entry.trang_thai === 'vang_co_phep').length
  const vangKhongPhep = entries.filter((entry) => entry.trang_thai === 'vang_khong_phep').length
  const tre = entries.filter((entry) => entry.trang_thai === 'tre').length
  const totalExceptions = vangCoPhep + vangKhongPhep + tre
  const totalSlots = Math.max(0, studentCount * resolveDayCount(scope, selectedMonth, weeks, range) * 2)
  const rate = totalSlots > 0 ? 1 - totalExceptions / totalSlots : 1

  return {
    rateText: `${Math.max(0, rate * 100).toFixed(1)}%`,
    totalSlots,
    tre,
    vangCoPhep,
    vangKhongPhep,
  }
}

function resolveDayCount(
  scope: TimeScope,
  selectedMonth: string,
  weeks: CauHinhTuan[],
  range: { from: string; to: string } | null,
): number {
  if (scope === 'day') return 1
  if (scope === 'week') {
    const week = weeks.find((item) => item.tu_ngay === range?.from && item.den_ngay === range?.to)
    return week?.so_ngay || 0
  }
  return weeks
    .filter((week) => week.tu_ngay.slice(0, 7) === selectedMonth)
    .reduce((sum, week) => sum + week.so_ngay, 0)
}

function resolveSummaryRange(
  scope: TimeScope,
  selectedDate: string,
  selectedWeek: number | null,
  selectedMonth: string,
  weeks: CauHinhTuan[],
): { from: string; to: string } | null {
  if (scope === 'day') return { from: selectedDate, to: selectedDate }
  if (scope === 'week') {
    const week = weeks.find((item) => item.tuan_so === selectedWeek)
    return week ? { from: week.tu_ngay, to: week.den_ngay } : null
  }

  return { from: `${selectedMonth}-01`, to: lastDayOfMonth(selectedMonth) }
}

function resolveGridWeek(
  scope: TimeScope,
  weeks: CauHinhTuan[],
  selectedDate: string,
  selectedWeek: number | null,
  selectedMonth: string,
): CauHinhTuan | null {
  if (scope === 'day') return findWeekForDate(weeks, selectedDate)
  if (scope === 'week') return weeks.find((week) => week.tuan_so === selectedWeek) || null
  return weeks.find((week) => week.tu_ngay.slice(0, 7) === selectedMonth) || findWeekForDate(weeks, `${selectedMonth}-01`)
}

function daysInWeek(week: CauHinhTuan): string[] {
  const result: string[] = []
  const start = parseIsoDate(week.tu_ngay)
  for (let index = 0; index < week.so_ngay; index += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    result.push(toDateInputValue(date))
  }
  return result
}

function findWeekForDate(weeks: CauHinhTuan[], date: string): CauHinhTuan | null {
  return weeks.find((week) => week.tu_ngay <= date && date <= week.den_ngay) || null
}

function entryKey(maHs: string, date: string, session: BuoiDiemDanh): string {
  return `${maHs}|${date}|${session}`
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

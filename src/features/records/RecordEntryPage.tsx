import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type { CauHinhTuan, DanhMucDiem, GhiNhan, HocSinh, LoaiGhiNhan } from '../../data/types'
import { getRecordInsight } from './recordInsights'
import { getBadgeClassForCatalog } from '../scoring/scoreStyles'
import { selectDefaultWeek, sortWeeks } from '../time/WeekSelector'

type AttachMode = 'students' | 'team' | 'class'
type CatalogTone = 'all' | 'positive' | 'violation' | 'neutral'

type RecordForm = {
  catalogCode: string
  date: string
  weekNumber: number
  lesson: string
  subject: string
  note: string
  teacher: string
  selectedTeam: string
}

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'success'
      catalog: DanhMucDiem[]
      records: GhiNhan[]
      students: HocSinh[]
      weeks: CauHinhTuan[]
    }

const EMPTY_FORM: RecordForm = {
  catalogCode: '',
  date: toDateInputValue(new Date()),
  weekNumber: 0,
  lesson: '',
  subject: '',
  note: '',
  teacher: '',
  selectedTeam: '1',
}

const inputClass =
  'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

const selectClass =
  'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

export function RecordEntryPage() {
  const [state, setState] = useState<PageState>({ status: 'loading' })
  const [form, setForm] = useState<RecordForm>(EMPTY_FORM)
  const [attachMode, setAttachMode] = useState<AttachMode>('students')
  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogTone, setCatalogTone] = useState<CatalogTone>('all')
  const [studentQuery, setStudentQuery] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [createdRecords, setCreatedRecords] = useState<GhiNhan[]>([])

  useEffect(() => {
    let active = true

    Promise.all([
      dataSource.getStudents(),
      dataSource.getPointCatalog(),
      dataSource.getWeekConfig(),
      dataSource.getRecords(),
    ])
      .then(([students, catalog, weeks, records]) => {
        if (!active) return
        const weekNumber = selectDefaultWeek(weeks, records)
        const selectedWeek = weeks.find((week) => week.tuan_so === weekNumber)
        const today = toDateInputValue(new Date())
        const date = selectedWeek && isDateInWeek(today, selectedWeek) ? today : selectedWeek?.tu_ngay || today
        const firstCatalog = sortCatalog(catalog)[0]

        setState({ status: 'success', catalog, records, students, weeks })
        setForm((current) => ({
          ...current,
          catalogCode: firstCatalog?.ma_danh_muc || '',
          date,
          selectedTeam: String(firstExistingTeam(students) || 1),
          weekNumber,
        }))
        setSelectedStudentIds(students[0] ? [students[0].ma_hs] : [])
      })
      .catch((error) => {
        if (!active) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Không tải được dữ liệu ghi nhận.',
        })
      })

    return () => {
      active = false
    }
  }, [])

  const sortedStudents = useMemo(() => {
    if (state.status !== 'success') return []
    return [...state.students].sort(compareStudents)
  }, [state])

  const sortedWeeks = useMemo(() => {
    if (state.status !== 'success') return []
    return sortWeeks(state.weeks)
  }, [state])

  const catalogByCode = useMemo(() => {
    if (state.status !== 'success') return new Map<string, DanhMucDiem>()
    return new Map(state.catalog.map((item) => [item.ma_danh_muc, item]))
  }, [state])

  const selectedCatalog = catalogByCode.get(form.catalogCode) || null

  const visibleCatalog = useMemo(() => {
    if (state.status !== 'success') return []
    const keyword = normalize(catalogQuery)

    return sortCatalog(state.catalog)
      .filter((item) => {
        if (!keyword) return true
        return normalize(`${item.ma_danh_muc} ${item.nhom} ${item.ten_muc}`).includes(keyword)
      })
      .filter((item) => {
        if (catalogTone === 'positive') return item.diem > 0
        if (catalogTone === 'violation') return item.diem < 0
        if (catalogTone === 'neutral') return item.diem === 0
        return true
      })
  }, [catalogQuery, catalogTone, state])

  const visibleStudents = useMemo(() => {
    const keyword = normalize(studentQuery)
    return sortedStudents.filter((student) => {
      if (!keyword) return true
      return normalize(`${student.ma_hs} ${student.tt} ${student.ho} ${student.ten} ${student.to || ''}`).includes(
        keyword,
      )
    })
  }, [sortedStudents, studentQuery])

  const targetStudents = useMemo(() => {
    if (attachMode === 'class') return sortedStudents

    if (attachMode === 'team') {
      const team = Number(form.selectedTeam)
      return sortedStudents.filter((student) => student.to === team)
    }

    const selected = new Set(selectedStudentIds)
    return sortedStudents.filter((student) => selected.has(student.ma_hs))
  }, [attachMode, form.selectedTeam, selectedStudentIds, sortedStudents])

  const previewRecords = useMemo(() => {
    if (!selectedCatalog) return []
    return targetStudents.map((student) => createDraftRecord(student, selectedCatalog, form))
  }, [form, selectedCatalog, targetStudents])

  const selectedWeek = sortedWeeks.find((week) => week.tuan_so === form.weekNumber)

  function changeWeek(weekNumber: number) {
    const week = sortedWeeks.find((item) => item.tuan_so === weekNumber)
    setForm((current) => ({
      ...current,
      date: week && !isDateInWeek(current.date, week) ? week.tu_ngay : current.date,
      weekNumber,
    }))
  }

  function toggleStudent(maHs: string) {
    setSelectedStudentIds((current) =>
      current.includes(maHs) ? current.filter((id) => id !== maHs) : [...current, maHs],
    )
  }

  function selectVisibleStudents() {
    setSelectedStudentIds((current) => Array.from(new Set([...current, ...visibleStudents.map((student) => student.ma_hs)])))
  }

  function clearStudentSelection() {
    setSelectedStudentIds([])
  }

  async function saveRecords(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state.status !== 'success') return
    setSaveError(null)
    setCreatedRecords([])

    if (!selectedCatalog) {
      setSaveError('Cần chọn một danh mục vi phạm hoặc tích cực.')
      return
    }

    if (!targetStudents.length) {
      setSaveError('Cần chọn ít nhất một học sinh để gắn ghi nhận.')
      return
    }

    if (!form.weekNumber || !form.date) {
      setSaveError('Cần chọn tuần và ngày ghi nhận.')
      return
    }

    setSaving(true)
    try {
      const saved = await dataSource.addRecords(previewRecords)
      setState((current) =>
        current.status === 'success'
          ? { ...current, records: [...current.records, ...saved] }
          : current,
      )
      setCreatedRecords(saved)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Không lưu được ghi nhận.')
    } finally {
      setSaving(false)
    }
  }

  if (state.status === 'loading') {
    return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Đang tải dữ liệu ghi nhận...</div>
  }

  if (state.status === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
        {state.message}
      </div>
    )
  }

  return (
    <form onSubmit={saveRecords} className="space-y-4">
      <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-indigo-700">GhiNhan</p>
            <h2 className="text-xl font-bold text-slate-900">Gắn ghi nhận lên học sinh</h2>
            <p className="mt-1 text-sm text-slate-600">
              Chọn danh mục, chọn học sinh theo nhiều cách và lưu thành dòng ghi nhận có mã liên kết.
            </p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3 lg:w-[480px]">
            <Link
              to="/danh-muc"
              className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-center font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              Quản lý danh mục
            </Link>
            <Link
              to="/"
              className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-center font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              Xem tổng quan
            </Link>
            <Link
              to="/hoc-sinh"
              className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-center font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              Danh sách học sinh
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <InfoBox label="Danh mục đã có" value={state.catalog.length} />
          <InfoBox label="Học sinh trong lớp" value={state.students.length} />
          <InfoBox label="Sẽ tạo ghi nhận" value={previewRecords.length} />
          <InfoBox label="Tuần đang chọn" value={form.weekNumber || '-'} />
        </div>
      </section>

      <section className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">1. Chọn nội dung vi phạm/ghi nhận</h3>
            <p className="text-sm text-slate-600">
              Mỗi ghi nhận sẽ lưu `ma_danh_muc` để nối chặt với nội dung trong DanhMucDiem.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:w-[420px]">
            <input
              value={catalogQuery}
              onChange={(event) => setCatalogQuery(event.target.value)}
              className={inputClass}
              placeholder="Tìm mã hoặc nội dung..."
            />
            <select
              value={catalogTone}
              onChange={(event) => setCatalogTone(event.target.value as CatalogTone)}
              className={selectClass}
            >
              <option value="all">Tất cả</option>
              <option value="positive">Tích cực</option>
              <option value="violation">Vi phạm</option>
              <option value="neutral">Theo dõi</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {visibleCatalog.map((item) => {
            const active = item.ma_danh_muc === form.catalogCode
            return (
              <button
                key={item.ma_danh_muc}
                type="button"
                onClick={() => {
                  setForm((current) => ({
                    ...current,
                    catalogCode: item.ma_danh_muc,
                    note: current.note || item.ten_muc,
                  }))
                }}
                className={`rounded-lg border bg-white p-3 text-left transition ${
                  active ? 'border-cyan-600 ring-2 ring-cyan-200' : 'border-cyan-100 hover:border-cyan-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${getBadgeClassForCatalog(item)}`}>
                    {item.ma_danh_muc}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                      item.diem > 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : item.diem < 0
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    {item.diem > 0 ? `+${item.diem}` : item.diem}
                  </span>
                </div>
                <p className="mt-2 font-semibold text-slate-900">{item.ten_muc}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {labelGroup(item.nhom)} · {labelScope(item.pham_vi)}
                  {item.nghiem_trong ? ' · Nghiêm trọng' : ''}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <h3 className="text-base font-bold text-slate-900">2. Chọn cách gắn lên học sinh</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <ModeButton
            active={attachMode === 'students'}
            label="Chọn từng học sinh"
            detail={`${selectedStudentIds.length} học sinh đã chọn`}
            onClick={() => setAttachMode('students')}
          />
          <ModeButton
            active={attachMode === 'team'}
            label="Theo tổ"
            detail={`Tổ ${form.selectedTeam}: ${targetStudents.length} học sinh`}
            onClick={() => setAttachMode('team')}
          />
          <ModeButton
            active={attachMode === 'class'}
            label="Cả lớp"
            detail={`${targetStudents.length} học sinh`}
            onClick={() => setAttachMode('class')}
          />
        </div>

        {attachMode === 'students' ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <input
                value={studentQuery}
                onChange={(event) => setStudentQuery(event.target.value)}
                className={inputClass}
                placeholder="Tìm học sinh, mã, STT, tổ..."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectVisibleStudents}
                  className="h-10 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  Chọn danh sách đang lọc
                </button>
                <button
                  type="button"
                  onClick={clearStudentSelection}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
            <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {visibleStudents.map((student) => (
                <label
                  key={student.ma_hs}
                  className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-2 text-sm hover:border-emerald-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.ma_hs)}
                    onChange={() => toggleStudent(student.ma_hs)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    <span className="block font-semibold text-slate-900">
                      {student.tt}. {student.ho} {student.ten}
                    </span>
                    <span className="text-xs text-slate-500">
                      {student.ma_hs} · Tổ {student.to || '-'} · {student.dien}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {attachMode === 'team' ? (
          <div className="mt-4 max-w-xs">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Chọn tổ
              <select
                value={form.selectedTeam}
                onChange={(event) => setForm((current) => ({ ...current, selectedTeam: event.target.value }))}
                className={selectClass}
              >
                {getTeams(sortedStudents).map((team) => (
                  <option key={team} value={team}>
                    Tổ {team}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-base font-bold text-slate-900">3. Thông tin ghi nhận</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-6">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
            Tuần
            <select
              value={form.weekNumber}
              onChange={(event) => changeWeek(Number(event.target.value))}
              className={selectClass}
            >
              {sortedWeeks.map((week) => (
                <option key={week.tuan_so} value={week.tuan_so}>
                  Tuần {week.tuan_so} ({formatShortDate(week.tu_ngay)} - {formatShortDate(week.den_ngay)})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-1">
            Ngày
            <input
              type="date"
              min={selectedWeek?.tu_ngay}
              max={selectedWeek?.den_ngay}
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-1">
            Tiết
            <input
              value={form.lesson}
              onChange={(event) => setForm((current) => ({ ...current, lesson: event.target.value }))}
              className={inputClass}
              placeholder="VD: 2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-1">
            Môn
            <input
              value={form.subject}
              onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
              className={inputClass}
              placeholder="VD: Toán"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-1">
            Người ghi
            <input
              value={form.teacher}
              onChange={(event) => setForm((current) => ({ ...current, teacher: event.target.value }))}
              className={inputClass}
              placeholder="GV"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-6">
            Nội dung hiển thị
            <textarea
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              className="min-h-20 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder={selectedCatalog?.ten_muc || 'Nội dung sẽ lấy từ danh mục nếu để trống'}
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-rose-200 bg-rose-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">4. Xem trước mã liên kết</h3>
            <p className="text-sm text-slate-600">
              Luồng dữ liệu: danh mục `{form.catalogCode || '...'}` → học sinh → mã ghi nhận `GN...` sau khi lưu.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving || previewRecords.length === 0}
            className="h-10 rounded-md bg-rose-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? 'Đang lưu...' : `Lưu ${previewRecords.length} ghi nhận`}
          </button>
        </div>

        {saveError ? (
          <p className="mt-3 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700">
            {saveError}
          </p>
        ) : null}

        <PreviewTable
          catalogByCode={catalogByCode}
          records={previewRecords}
          saved={false}
          sourceRecords={state.records}
          students={state.students}
        />
      </section>

      {createdRecords.length ? (
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-base font-bold text-slate-900">Ghi nhận vừa tạo</h3>
          <p className="text-sm text-slate-600">
            Các mã này đã được ghi vào tab GhiNhan và có thể đối chiếu trong Dashboard/hồ sơ học sinh.
          </p>
          <PreviewTable
            catalogByCode={catalogByCode}
            records={createdRecords}
            saved
            sourceRecords={state.records}
            students={state.students}
          />
        </section>
      ) : null}
    </form>
  )
}

function PreviewTable({
  catalogByCode,
  records,
  saved,
  sourceRecords,
  students,
}: {
  catalogByCode: Map<string, DanhMucDiem>
  records: GhiNhan[]
  saved: boolean
  sourceRecords: GhiNhan[]
  students: HocSinh[]
}) {
  const studentById = new Map(students.map((student) => [student.ma_hs, student]))

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
          <tr>
            <th className="px-3 py-3">Mã ghi nhận</th>
            <th className="px-3 py-3">Học sinh</th>
            <th className="px-3 py-3">Mã danh mục</th>
            <th className="px-3 py-3">Nội dung</th>
            <th className="px-3 py-3">Lần</th>
            <th className="px-3 py-3 text-right">Điểm</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                Chưa có dòng ghi nhận để xem trước.
              </td>
            </tr>
          ) : (
            records.map((record, index) => {
              const student = record.ma_hs ? studentById.get(record.ma_hs) : undefined
              const catalogItem = record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined
              const insight = getRecordInsight(record, sourceRecords, catalogByCode)
              const nextCount = saved ? insight.duplicateCount : insight.duplicateCount + 1

              return (
                <tr key={record.ma_ghi_nhan || `${record.ma_hs}-${record.ma_danh_muc}-${index}`}>
                  <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-700">
                    {record.ma_ghi_nhan || 'Sẽ sinh khi lưu'}
                  </td>
                  <td className="px-3 py-3">
                    {student ? (
                      <Link
                        to={`/quan-ly/hoc-sinh/${student.ma_hs}`}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        {student.tt}. {student.ho} {student.ten}
                      </Link>
                    ) : (
                      <span className="text-slate-500">{record.ma_hs || '-'}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${getBadgeClassForCatalog(
                        catalogItem,
                      )}`}
                    >
                      {record.ma_danh_muc}
                    </span>
                  </td>
                  <td className="max-w-md px-3 py-3 text-slate-800">{record.noi_dung}</td>
                  <td className="px-3 py-3">
                    {insight.polarity === 'negative' ? (
                      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                        Lần {Math.max(1, nextCount)}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-bold ${
                      (record.diem_cong_tru || 0) > 0
                        ? 'text-emerald-700'
                        : (record.diem_cong_tru || 0) < 0
                          ? 'text-red-700'
                          : 'text-slate-600'
                    }`}
                  >
                    {formatScore(record.diem_cong_tru)}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-indigo-200 bg-white px-3 py-2">
      <p className="text-xs font-semibold uppercase text-indigo-700">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function ModeButton({
  active,
  detail,
  label,
  onClick,
}: {
  active: boolean
  detail: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition ${
        active
          ? 'border-emerald-600 bg-white ring-2 ring-emerald-200'
          : 'border-emerald-200 bg-white hover:border-emerald-300'
      }`}
    >
      <span className="block font-bold text-slate-900">{label}</span>
      <span className="mt-1 block text-sm text-slate-600">{detail}</span>
    </button>
  )
}

function createDraftRecord(
  student: HocSinh,
  catalogItem: DanhMucDiem,
  form: RecordForm,
): GhiNhan {
  return {
    ma_hs: student.ma_hs,
    to_lien_quan: student.to,
    ngay: form.date,
    tuan_so: form.weekNumber,
    dien_tai_thoi_diem: student.dien,
    tiet: form.lesson.trim() || null,
    mon_hoc: form.subject.trim() || null,
    loai: getRecordTypeForCatalog(catalogItem),
    ma_danh_muc: catalogItem.ma_danh_muc,
    noi_dung: form.note.trim() || catalogItem.ten_muc,
    so_lan: 1,
    ly_do: null,
    da_xu_ly: false,
    hinh_thuc_xu_ly: null,
    goi_phu_huynh: false,
    ghi_so_dau_bai: null,
    diem_so_mon: null,
    diem_cong_tru: catalogItem.diem,
    nguoi_ghi: form.teacher.trim() || null,
    nguon: 'nhap_tay',
    ma_log_import: null,
    trang_thai_xu_ly_tap_the: '',
    su_kien_goc: null,
  }
}

function getRecordTypeForCatalog(catalogItem: DanhMucDiem): LoaiGhiNhan {
  const map: Record<DanhMucDiem['nhom'], LoaiGhiNhan> = {
    CC: 'chuyen_can',
    VS: 've_sinh',
    NN: 'ne_nep',
    KL: 'trat_tu_ky_luat',
    KT: 'khen_thuong',
  }

  return map[catalogItem.nhom]
}

function sortCatalog(catalog: DanhMucDiem[]): DanhMucDiem[] {
  return [...catalog].sort((left, right) => {
    const group = left.nhom.localeCompare(right.nhom)
    return group || left.ma_danh_muc.localeCompare(right.ma_danh_muc)
  })
}

function compareStudents(left: HocSinh, right: HocSinh): number {
  return (left.to || 99) - (right.to || 99) || left.tt - right.tt || left.ten.localeCompare(right.ten)
}

function firstExistingTeam(students: HocSinh[]): number | null {
  return getTeams(students)[0] || null
}

function getTeams(students: HocSinh[]): number[] {
  return Array.from(
    new Set(
      students
        .map((student) => student.to)
        .filter((team): team is number => typeof team === 'number' && team > 0),
    ),
  ).sort((left, right) => left - right)
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function isDateInWeek(value: string, week: CauHinhTuan): boolean {
  return value >= week.tu_ngay && value <= week.den_ngay
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatShortDate(value: string): string {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}` : value
}

function labelGroup(value: DanhMucDiem['nhom']): string {
  const labels: Record<DanhMucDiem['nhom'], string> = {
    CC: 'Chuyên cần',
    VS: 'Vệ sinh',
    NN: 'Nề nếp',
    KL: 'Kỷ luật',
    KT: 'Tích cực',
  }
  return labels[value]
}

function labelScope(value: DanhMucDiem['pham_vi']): string {
  if (value === 'ca_nhan') return 'Cá nhân'
  if (value === 'to_truc') return 'Tổ trực'
  return 'Tập thể'
}

function formatScore(value: number | null): string {
  if (typeof value !== 'number') return '-'
  return value > 0 ? `+${value}` : String(value)
}

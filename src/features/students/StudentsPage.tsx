import { Fragment, type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type { BanCanSu, CauHinhTuan, DanhMucDiem, DienHocSinh, GhiNhan, HocSinh } from '../../data/types'
import { calculateWeeklyStudentScore } from '../scoring/scoring'
import { getBadgeClassForGroup } from '../scoring/scoreStyles'
import { getStudentGroup } from './studentGroups'

type StudentForm = {
  ho: string
  ten: string
  dien: DienHocSinh
  nu: boolean
  dan_toc: string
  ngay_sinh: string
  to: string
  sdt_1: string
  sdt_2: string
  la_co_do: boolean
  ghi_chu: string
}

const EMPTY_FORM: StudentForm = {
  ho: '',
  ten: '',
  dien: '2B',
  nu: false,
  dan_toc: 'Kinh',
  ngay_sinh: '',
  to: '',
  sdt_1: '',
  sdt_2: '',
  la_co_do: false,
  ghi_chu: '',
}

export function StudentsPage() {
  const [students, setStudents] = useState<HocSinh[]>([])
  const [records, setRecords] = useState<GhiNhan[]>([])
  const [catalog, setCatalog] = useState<DanhMucDiem[]>([])
  const [weekConfig, setWeekConfig] = useState<CauHinhTuan[]>([])
  const [banCanSu, setBanCanSu] = useState<BanCanSu[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [expandedMaHs, setExpandedMaHs] = useState<string | null>(null)
  const [studentListCollapsed, setStudentListCollapsed] = useState(false)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null)
  const [editingStudent, setEditingStudent] = useState<HocSinh | null>(null)
  const [form, setForm] = useState<StudentForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deletingMaHs, setDeletingMaHs] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    Promise.all([
      dataSource.getStudents(),
      dataSource.getRecords(),
      dataSource.getPointCatalog(),
      dataSource.getWeekConfig(),
      dataSource.getBanCanSu(),
    ])
      .then(([studentRows, recordRows, catalogRows, weekRows, banCanSuRows]) => {
        if (active) {
          setStudents(studentRows)
          setRecords(recordRows)
          setCatalog(catalogRows)
          setWeekConfig(weekRows)
          setBanCanSu(banCanSuRows)
          setLoadError(null)
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Không đọc được danh sách học sinh.')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const visibleStudents = useMemo(() => {
    const keyword = normalize(query)
    const sorted = [...students].sort((a, b) => a.tt - b.tt)

    if (!keyword) {
      return sorted
    }

    return sorted.filter((student) => {
      const haystack = normalize(
        `${student.tt} ${student.ma_hs} ${student.ho} ${student.ten} ${student.dien}`,
      )
      return haystack.includes(keyword)
    })
  }, [query, students])

  const currentWeek = useMemo(() => getLatestWeek(records, weekConfig), [records, weekConfig])

  function openAddForm() {
    setFormMode('add')
    setEditingStudent(null)
    setForm(EMPTY_FORM)
    setSaveError(null)
  }

  function openEditForm(student: HocSinh) {
    setFormMode('edit')
    setEditingStudent(student)
    setForm(formFromStudent(student))
    setSaveError(null)
  }

  function closeForm() {
    setFormMode(null)
    setEditingStudent(null)
    setForm(EMPTY_FORM)
    setSaveError(null)
  }

  async function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveError(null)

    if (!form.ho.trim() || !form.ten.trim()) {
      setSaveError('Cần nhập đủ họ và tên học sinh.')
      return
    }

    setSaving(true)
    try {
      if (formMode === 'add') {
        const created = await dataSource.addStudent(createStudent(form, students))
        setStudents((current) => [...current, created])
        closeForm()
      }

      if (formMode === 'edit' && editingStudent) {
        const updated = await dataSource.updateStudent(editingStudent.ma_hs, formToPatch(form))
        setStudents((current) =>
          current.map((student) => (student.ma_hs === updated.ma_hs ? updated : student)),
        )
        closeForm()
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Không lưu được học sinh.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteStudent(student: HocSinh) {
    const ok = window.confirm(`Xoá ${student.ho} ${student.ten} khỏi tab HocSinh?`)
    if (!ok) {
      return
    }

    setDeletingMaHs(student.ma_hs)
    try {
      await dataSource.deleteStudent(student.ma_hs)
      setStudents((current) => current.filter((row) => row.ma_hs !== student.ma_hs))
      if (editingStudent?.ma_hs === student.ma_hs) {
        closeForm()
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Không xoá được học sinh.')
    } finally {
      setDeletingMaHs(null)
    }
  }

  async function copyProfileLink(student: HocSinh) {
    const url = `${window.location.origin}${window.location.pathname}#/hs/${student.token_ho_so}`
    await window.navigator.clipboard.writeText(url)
    setCopyMessage(`Đã copy link hồ sơ của ${student.ho} ${student.ten}.`)
    window.setTimeout(() => setCopyMessage(null), 2500)
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Danh sách học sinh</h2>
          <p className="text-sm text-slate-600">
            Tìm kiếm, thêm, sửa và xoá học sinh trực tiếp trên tab HocSinh.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Thêm học sinh
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
          Tìm nhanh
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nhập tên, mã học sinh, STT..."
            className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <p className="text-sm font-medium text-blue-700">
          {visibleStudents.length}/{students.length} học sinh
        </p>
      </div>

      {formMode ? (
        <form
          onSubmit={saveStudent}
          className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900">
              {formMode === 'add' ? 'Thêm học sinh' : `Sửa ${editingStudent?.ma_hs}`}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white"
            >
              Đóng
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TextField
              label="Họ"
              value={form.ho}
              onChange={(value) => setForm((current) => ({ ...current, ho: value }))}
              required
            />
            <TextField
              label="Tên"
              value={form.ten}
              onChange={(value) => setForm((current) => ({ ...current, ten: value }))}
              required
            />
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Diện
              <select
                value={form.dien}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dien: event.target.value as DienHocSinh }))
                }
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="2B">2B</option>
                <option value="BT">BT</option>
                <option value="NT">NT</option>
              </select>
            </label>
            <TextField
              label="Dân tộc"
              value={form.dan_toc}
              onChange={(value) => setForm((current) => ({ ...current, dan_toc: value }))}
            />
            <TextField
              label="Ngày sinh"
              value={form.ngay_sinh}
              onChange={(value) => setForm((current) => ({ ...current, ngay_sinh: value }))}
              type="date"
            />
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Tổ
              <select
                value={form.to}
                onChange={(event) => setForm((current) => ({ ...current, to: event.target.value }))}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Chưa có</option>
                <option value="1">Tổ 1</option>
                <option value="2">Tổ 2</option>
                <option value="3">Tổ 3</option>
              </select>
            </label>
            <TextField
              label="SĐT 1"
              value={form.sdt_1}
              onChange={(value) => setForm((current) => ({ ...current, sdt_1: value }))}
            />
            <TextField
              label="SĐT 2"
              value={form.sdt_2}
              onChange={(value) => setForm((current) => ({ ...current, sdt_2: value }))}
            />
            <TextField
              label="Ghi chú"
              value={form.ghi_chu}
              onChange={(value) => setForm((current) => ({ ...current, ghi_chu: value }))}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.nu}
                onChange={(event) => setForm((current) => ({ ...current, nu: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              Nữ
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.la_co_do}
                onChange={(event) =>
                  setForm((current) => ({ ...current, la_co_do: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              Cờ đỏ
            </label>
          </div>

          {saveError ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {saveError}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Huỷ
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Đang tải danh sách...
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {loadError}
        </div>
      ) : null}

      {copyMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {copyMessage}
        </div>
      ) : null}

      {!loading && !loadError ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Danh sách học sinh ({visibleStudents.length})
              </h3>
              <p className="text-sm text-slate-600">
                {studentListCollapsed ? 'Đang thu gọn toàn bộ danh sách.' : 'Đang hiển thị đầy đủ danh sách.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStudentListCollapsed((current) => !current)}
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {studentListCollapsed ? 'Mở rộng danh sách' : 'Thu gọn danh sách'}
            </button>
          </div>
          {studentListCollapsed ? (
            <div className="p-4 text-sm text-slate-600">
              Danh sách đang thu gọn. Mở rộng để xem và thao tác từng học sinh.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">STT</th>
                    <th className="px-3 py-3">Mã HS</th>
                    <th className="px-3 py-3">Họ tên</th>
                    <th className="px-3 py-3">Tổ</th>
                    <th className="px-3 py-3">Diện</th>
                    <th className="px-3 py-3">Giới tính</th>
                    <th className="px-3 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleStudents.map((student) => {
                    const expanded = expandedMaHs === student.ma_hs
                    const role = banCanSu.find((item) => item.ma_hs === student.ma_hs)?.chuc_vu || 'Học sinh'
                    const score = calculateWeeklyStudentScore({
                      catalog,
                      records,
                      student,
                      tuanSo: currentWeek,
                    })
                    const weekRecords = records.filter(
                      (record) => record.ma_hs === student.ma_hs && record.tuan_so === currentWeek,
                    )

                    return (
                      <Fragment key={student.ma_hs}>
                        <tr className={expanded ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-500">{student.tt}</td>
                          <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-700">
                            {student.ma_hs}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <button
                              type="button"
                              onClick={() => setExpandedMaHs(expanded ? null : student.ma_hs)}
                              className="text-left font-semibold text-slate-900 hover:text-blue-700"
                            >
                              {student.ho} {student.ten}
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                            {resolveStudentGroup(student) || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-700">{student.dien}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                            {student.nu ? 'Nữ' : 'Nam'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setExpandedMaHs(expanded ? null : student.ma_hs)}
                                className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                              >
                                {expanded ? 'Thu gọn' : 'Chi tiết'}
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditForm(student)}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteStudent(student)}
                                disabled={deletingMaHs === student.ma_hs}
                                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
                              >
                                {deletingMaHs === student.ma_hs ? 'Đang xoá' : 'Xoá'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expanded ? (
                          <tr>
                            <td colSpan={7} className="bg-blue-50 px-3 py-4">
                              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                                <div className="grid gap-2 sm:grid-cols-4">
                                  <QuickStat label="CC" value={score.diem_chuyen_can} />
                                  <QuickStat label="VS" value={score.diem_ve_sinh} />
                                  <QuickStat label="NN" value={score.diem_ne_nep} />
                                  <QuickStat label="KL" value={score.diem_ky_luat} />
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                                  <span className="rounded-full bg-white px-3 py-1 font-semibold">
                                    Tổ {resolveStudentGroup(student) || '-'}
                                  </span>
                                  <span className="rounded-full bg-white px-3 py-1 font-semibold">
                                    {role}
                                  </span>
                                  <span className="rounded-full bg-white px-3 py-1 font-semibold">
                                    {weekRecords.length} ghi nhận tuần này
                                  </span>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Link
                                  to={`/hs/${student.token_ho_so}`}
                                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                                >
                                  Xem hồ sơ đầy đủ
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => void copyProfileLink(student)}
                                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Copy link hồ sơ
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!studentListCollapsed && visibleStudents.length === 0 ? (
            <div className="border-t border-slate-100 p-4 text-sm text-slate-600">
              Không có học sinh khớp từ khoá.
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function TextField({
  label,
  onChange,
  required,
  type = 'text',
  value,
}: {
  label: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  value: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  )
}

function QuickStat({ label, value }: { label: string; value: number }) {
  return (
    <div className={`rounded-md border bg-white p-3 ${getBadgeClassForGroup(label)}`}>
      <p className="text-xs font-semibold uppercase opacity-70">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function formFromStudent(student: HocSinh): StudentForm {
  return {
    ho: student.ho,
    ten: student.ten,
    dien: student.dien,
    nu: student.nu,
    dan_toc: student.dan_toc || 'Kinh',
    ngay_sinh: student.ngay_sinh || '',
    to: student.to ? String(student.to) : '',
    sdt_1: student.sdt_1 || '',
    sdt_2: student.sdt_2 || '',
    la_co_do: student.la_co_do,
    ghi_chu: student.ghi_chu || '',
  }
}

function formToPatch(form: StudentForm): Partial<HocSinh> {
  return {
    ho: form.ho.trim(),
    ten: form.ten.trim(),
    dien: form.dien,
    nu: form.nu,
    dan_toc: form.dan_toc.trim() || 'Kinh',
    ngay_sinh: nullable(form.ngay_sinh),
    to: form.to ? Number(form.to) : null,
    sdt_1: nullable(form.sdt_1),
    sdt_2: nullable(form.sdt_2),
    la_co_do: form.la_co_do,
    ghi_chu: nullable(form.ghi_chu),
  }
}

function createStudent(form: StudentForm, students: HocSinh[]): HocSinh {
  return {
    ma_hs: nextStudentId(students),
    tt: nextOrder(students),
    ...formToPatch(form),
    ngay_nhap_hoc: null,
    ngay_roi_lop: null,
    token_ho_so: randomToken(),
    anh_dai_dien: null,
  } as HocSinh
}

function nextStudentId(students: HocSinh[]): string {
  const max = students.reduce((currentMax, student) => {
    const numericId = Number.parseInt(student.ma_hs.replace('HS', ''), 10)
    return Number.isNaN(numericId) ? currentMax : Math.max(currentMax, numericId)
  }, 0)

  return `HS${String(max + 1).padStart(3, '0')}`
}

function nextOrder(students: HocSinh[]): number {
  return students.reduce((currentMax, student) => Math.max(currentMax, student.tt || 0), 0) + 1
}

function randomToken(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = new Uint8Array(8)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function resolveStudentGroup(student: HocSinh): number | null {
  return student.to || getStudentGroup(student.ma_hs)
}

function getLatestWeek(records: GhiNhan[], weekConfig: CauHinhTuan[]): number {
  const latestRecordWeek = Math.max(0, ...records.map((record) => record.tuan_so || 0))
  if (latestRecordWeek > 0) {
    return latestRecordWeek
  }

  return Math.max(1, ...weekConfig.map((week) => week.tuan_so || 0))
}

import { type FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type { BanCanSu, DienHocSinh, HocSinh, PhuHuynh } from '../../data/types'
import { getStudentGroup } from './studentGroups'

type DetailState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | {
      status: 'success'
      banCanSu: BanCanSu[]
      parents: PhuHuynh[]
      student: HocSinh
    }

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

export function TeacherStudentDetailPage() {
  const { maHs } = useParams()
  const [state, setState] = useState<DetailState>({ status: 'loading' })
  const [form, setForm] = useState<StudentForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    if (!maHs) {
      setState({ status: 'not_found' })
      return
    }

    Promise.all([dataSource.getStudents(), dataSource.getPhuHuynh(maHs), dataSource.getBanCanSu()])
      .then(([students, parents, banCanSu]) => {
        if (!active) return
        const student = students.find((item) => item.ma_hs === maHs)
        if (!student) {
          setState({ status: 'not_found' })
          return
        }
        setState({ status: 'success', banCanSu, parents, student })
        setForm(formFromStudent(student))
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Không tải được chi tiết học sinh.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [maHs])

  async function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state.status !== 'success' || !form) return

    setSaving(true)
    setSaveError(null)
    setSaveMessage(null)
    try {
      const updated = await dataSource.updateStudent(state.student.ma_hs, formToPatch(form))
      setState((current) =>
        current.status === 'success' ? { ...current, student: updated } : current,
      )
      setForm(formFromStudent(updated))
      setSaveMessage('Đã lưu thay đổi.')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Không lưu được thay đổi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-600">Quản lý học sinh</p>
          <h2 className="text-xl font-bold text-slate-900">Chi tiết học sinh</h2>
        </div>
        <Link
          to="/hoc-sinh"
          className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Về danh sách
        </Link>
      </div>

      {state.status === 'loading' ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Đang tải chi tiết học sinh...
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {state.message}
        </div>
      ) : null}

      {state.status === 'not_found' ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900">Không tìm thấy học sinh</h3>
          <p className="mt-2 text-sm text-slate-600">Mã học sinh không tồn tại trong tab HocSinh.</p>
        </div>
      ) : null}

      {state.status === 'success' && form ? (
        <>
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div>
                <p className="text-sm font-semibold text-blue-700">{state.student.ma_hs}</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">
                  {state.student.ho} {state.student.ten}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-700">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                    STT {state.student.tt}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                    Tổ {state.student.to || getStudentGroup(state.student.ma_hs) || '-'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                    {getRole(state.student.ma_hs, state.banCanSu)}
                  </span>
                </div>
              </div>
              <div className="grid gap-2 text-sm">
                <PhoneRow label="SĐT 1" value={state.student.sdt_1} />
                <PhoneRow label="SĐT 2" value={state.student.sdt_2} />
                {state.parents.map((parent) => (
                  <PhoneRow
                    key={`${parent.ma_hs}-${parent.quan_he}-${parent.sdt}`}
                    label={`${parent.quan_he || 'Phụ huynh'}${parent.uu_tien_lien_he ? ' ưu tiên' : ''}`}
                    name={parent.ho_ten_ph}
                    value={parent.sdt}
                  />
                ))}
              </div>
            </div>
          </section>

          <form onSubmit={saveStudent} className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-bold text-slate-900">Chỉnh sửa thông tin</h3>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>

            {saveError ? <p className="mb-3 text-sm font-semibold text-red-700">{saveError}</p> : null}
            {saveMessage ? <p className="mb-3 text-sm font-semibold text-emerald-700">{saveMessage}</p> : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TextField label="Họ" required value={form.ho} onChange={(value) => setForm({ ...form, ho: value })} />
              <TextField label="Tên" required value={form.ten} onChange={(value) => setForm({ ...form, ten: value })} />
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Diện
                <select
                  value={form.dien}
                  onChange={(event) => setForm({ ...form, dien: event.target.value as DienHocSinh })}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="2B">2B</option>
                  <option value="BT">BT</option>
                  <option value="NT">NT</option>
                </select>
              </label>
              <TextField label="Tổ" type="number" value={form.to} onChange={(value) => setForm({ ...form, to: value })} />
              <TextField label="Dân tộc" value={form.dan_toc} onChange={(value) => setForm({ ...form, dan_toc: value })} />
              <TextField label="Ngày sinh" type="date" value={form.ngay_sinh} onChange={(value) => setForm({ ...form, ngay_sinh: value })} />
              <TextField label="SĐT 1" value={form.sdt_1} onChange={(value) => setForm({ ...form, sdt_1: value })} />
              <TextField label="SĐT 2" value={form.sdt_2} onChange={(value) => setForm({ ...form, sdt_2: value })} />
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.nu}
                  onChange={(event) => setForm({ ...form, nu: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                Nữ
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.la_co_do}
                  onChange={(event) => setForm({ ...form, la_co_do: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                Cờ đỏ
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-4">
                Ghi chú
                <textarea
                  value={form.ghi_chu}
                  onChange={(event) => setForm({ ...form, ghi_chu: event.target.value })}
                  className="min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
          </form>
        </>
      ) : null}
    </section>
  )
}

function PhoneRow({ label, name, value }: { label: string; name?: string; value: unknown }) {
  const phoneText = toText(value)

  return (
    <div className="flex flex-col rounded-md border border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-slate-900">{label}</p>
        {name ? <p className="text-slate-600">{name}</p> : null}
      </div>
      {phoneText ? (
        <a href={`tel:${normalizePhone(phoneText)}`} className="font-bold text-blue-700 hover:text-blue-800">
          {phoneText}
        </a>
      ) : (
        <span className="text-slate-400">Chưa có</span>
      )}
    </div>
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

function formFromStudent(student: HocSinh): StudentForm {
  return {
    ho: toText(student.ho),
    ten: toText(student.ten),
    dien: student.dien,
    nu: student.nu,
    dan_toc: toText(student.dan_toc) || 'Kinh',
    ngay_sinh: toText(student.ngay_sinh),
    to: student.to ? String(student.to) : '',
    sdt_1: toText(student.sdt_1),
    sdt_2: toText(student.sdt_2),
    la_co_do: student.la_co_do,
    ghi_chu: toText(student.ghi_chu),
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

function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, '')
}

function toText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function getRole(maHs: string, banCanSu: BanCanSu[]): string {
  return banCanSu.find((item) => item.ma_hs === maHs)?.chuc_vu || 'Học sinh'
}

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type { BanCanSu, DanhMucDiem, DienHocSinh, GhiNhan, HocSinh, PhuHuynh } from '../../data/types'
import { getRecordPolarity } from '../records/recordInsights'

type DetailState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | {
      status: 'success'
      banCanSu: BanCanSu[]
      catalog: DanhMucDiem[]
      parents: PhuHuynh[]
      records: GhiNhan[]
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
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    if (!maHs) {
      setState({ status: 'not_found' })
      return
    }

    Promise.all([
      dataSource.getStudents(),
      dataSource.getPhuHuynh(maHs),
      dataSource.getBanCanSu(),
      dataSource.getRecords(maHs),
      dataSource.getPointCatalog(),
    ])
      .then(([students, parents, banCanSu, records, catalog]) => {
        if (!active) return
        const student = students.find((item) => item.ma_hs === maHs)
        if (!student) {
          setState({ status: 'not_found' })
          return
        }
        setState({ status: 'success', banCanSu, catalog, parents, records, student })
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

  async function deleteRecord(record: GhiNhan) {
    if (state.status !== 'success') return

    if (!record.ma_ghi_nhan) {
      window.alert('Ghi nhận này chưa có ma_ghi_nhan nên chưa thể xoá tự động.')
      return
    }

    const ok = window.confirm(
      `Xoá ghi nhận ${record.ma_ghi_nhan} của ${state.student.ho} ${state.student.ten}? Điểm và thống kê sẽ cập nhật theo dữ liệu còn lại.`,
    )
    if (!ok) return

    setDeletingRecordId(record.ma_ghi_nhan)
    try {
      await dataSource.deleteRecord(record.ma_ghi_nhan)
      setState((current) =>
        current.status === 'success'
          ? {
              ...current,
              records: current.records.filter((item) => item.ma_ghi_nhan !== record.ma_ghi_nhan),
            }
          : current,
      )
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Không xoá được ghi nhận.')
    } finally {
      setDeletingRecordId(null)
    }
  }

  const sortedRecords = useMemo(() => {
    if (state.status !== 'success') return []
    return [...state.records].sort(compareRecordsNewest)
  }, [state])

  const catalogByCode = useMemo(() => {
    if (state.status !== 'success') return new Map<string, DanhMucDiem>()
    return new Map(state.catalog.map((item) => [item.ma_danh_muc, item]))
  }, [state])

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-600">QLHS 11C5 · chế độ giáo viên</p>
          <h2 className="text-xl font-bold text-slate-900">Hồ sơ học sinh</h2>
          <p className="mt-1 text-sm text-slate-600">
            Cùng bố cục với link học sinh, có thêm quyền chỉnh sửa và xoá ghi nhận.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.status === 'success' ? (
            <Link
              to={`/hs/${state.student.token_ho_so}`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              Xem link học sinh
            </Link>
          ) : null}
          <Link
            to="/hoc-sinh"
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Về danh sách
          </Link>
        </div>
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
          <section className="overflow-hidden rounded-lg border border-sky-200 bg-sky-50 shadow-sm">
            <div className="border-b border-sky-200 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                    {state.student.ten.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-blue-600">
                      {getRole(state.student.ma_hs, state.banCanSu)}
                    </p>
                    <h3 className="truncate text-2xl font-bold text-slate-950">
                      {state.student.ho} {state.student.ten}
                    </h3>
                    <p className="text-sm text-slate-600">Mã học sinh: {state.student.ma_hs}</p>
                  </div>
                </div>
                <div className="grid min-w-40 grid-cols-2 overflow-hidden rounded-md border border-white/80 bg-white text-center shadow-sm">
                  <div className="border-r border-slate-100 px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-slate-500">STT</p>
                    <p className="text-lg font-bold text-slate-900">{state.student.tt}</p>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-slate-500">Ghi nhận</p>
                    <p className="text-lg font-bold text-slate-900">{state.records.length}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 bg-white/70 p-4 md:grid-cols-[1fr_1.3fr]">
              <div className="flex flex-wrap gap-2 text-sm text-slate-700">
                <span className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-sky-100">
                  Tổ {state.student.to || '-'}
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-sky-100">
                  {state.student.dien}
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-sky-100">
                  {state.student.nu ? 'Nữ' : 'Nam'}
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-sky-100">
                  Cờ đỏ: {state.student.la_co_do ? 'Có' : 'Không'}
                </span>
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

          <section className="rounded-lg border border-blue-300 bg-blue-50 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-blue-200 p-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-700">Ghi nhận của học sinh</p>
                <h3 className="text-xl font-bold text-slate-950">Ghi nhận tích cực và cần lưu ý trên lớp</h3>
                <p className="text-sm text-slate-600">
                  Đồng bộ với hồ sơ học sinh; giáo viên có thêm quyền xoá các dòng nhập nhầm.
                </p>
              </div>
              <Link
                to="/ghi-nhan"
                className="inline-flex h-10 items-center justify-center rounded-md border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                Thêm ghi nhận
              </Link>
            </div>

            <div className="overflow-x-auto bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-blue-100 text-left text-xs font-semibold uppercase text-blue-900">
                  <tr>
                    <th className="px-3 py-3">Ngày</th>
                    <th className="px-3 py-3">Mã</th>
                    <th className="px-3 py-3">Nội dung</th>
                    <th className="px-3 py-3 text-right">Điểm</th>
                    <th className="px-3 py-3">Nguồn</th>
                    <th className="px-3 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                        Học sinh này chưa có ghi nhận nào.
                      </td>
                    </tr>
                  ) : (
                    sortedRecords.map((record, index) => {
                      const catalogItem = record.ma_danh_muc
                        ? catalogByCode.get(record.ma_danh_muc)
                        : undefined

                      return (
                        <tr
                          key={record.ma_ghi_nhan || `${record.ngay}-${index}`}
                          className={`align-top ${getRecordRowClass(record, catalogItem)}`}
                        >
                          <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                            <div className="font-semibold">{formatDate(record.ngay)}</div>
                            <div className="text-xs text-slate-500">Tuần {record.tuan_so || '-'}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <div className="font-mono text-xs font-semibold text-slate-700">
                              {record.ma_ghi_nhan || 'Chưa có mã'}
                            </div>
                            {record.ma_danh_muc ? (
                              <Link
                                to={`/danh-muc?ma=${encodeURIComponent(record.ma_danh_muc)}`}
                                className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:underline"
                              >
                                {record.ma_danh_muc}
                              </Link>
                            ) : (
                              <span className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                                Chưa liên kết danh mục
                              </span>
                            )}
                          </td>
                          <td className="min-w-72 px-3 py-3">
                            <div className="font-semibold text-slate-900">
                              {getRecordTitle(record, catalogItem)}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {labelRecordDisplay(record, catalogItem)}
                              {record.mon_hoc ? ` · ${record.mon_hoc}` : ''}
                              {record.tiet ? ` · Tiết ${record.tiet}` : ''}
                            </div>
                          </td>
                          <td className={`whitespace-nowrap px-3 py-3 text-right font-bold ${getPointClass(record)}`}>
                            {formatPoint(record.diem_cong_tru)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                            {record.nguon || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => deleteRecord(record)}
                              disabled={!record.ma_ghi_nhan || deletingRecordId === record.ma_ghi_nhan}
                              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
                            >
                              {deletingRecordId === record.ma_ghi_nhan ? 'Đang xoá' : 'Xoá'}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <form onSubmit={saveStudent} className="rounded-lg border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-violet-700">Thông tin cá nhân</p>
                <h3 className="text-base font-bold text-slate-900">Chỉnh sửa thông tin</h3>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-md bg-violet-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-400"
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

function compareRecordsNewest(left: GhiNhan, right: GhiNhan): number {
  return (
    String(right.ngay || '').localeCompare(String(left.ngay || '')) ||
    (right.tuan_so || 0) - (left.tuan_so || 0) ||
    String(right.ma_ghi_nhan || '').localeCompare(String(left.ma_ghi_nhan || ''))
  )
}

function getRecordTitle(record: GhiNhan, catalogItem?: DanhMucDiem): string {
  return (
    catalogItem?.ten_muc ||
    toText(record.noi_dung) ||
    toText(record.ly_do) ||
    labelRecordType(record.loai)
  )
}

function labelRecordType(value: GhiNhan['loai']): string {
  const labels: Record<GhiNhan['loai'], string> = {
    chuyen_can: 'Chuyên cần',
    hoc_tap: 'Học tập',
    khen_thuong: 'Tích cực',
    ne_nep: 'Nề nếp',
    trat_tu_ky_luat: 'Kỷ luật',
    ve_sinh: 'Vệ sinh',
  }

  return labels[value] || value
}

function labelRecordDisplay(record: GhiNhan, catalogItem?: DanhMucDiem): string {
  const catalogByCode = catalogItem ? new Map([[catalogItem.ma_danh_muc, catalogItem]]) : new Map<string, DanhMucDiem>()
  const polarity = getRecordPolarity(record, catalogByCode)

  if (polarity === 'positive') {
    return 'Tích cực / thành tích'
  }

  if (polarity === 'negative') {
    return 'Vi phạm'
  }

  return labelRecordType(record.loai)
}

function getRecordRowClass(record: GhiNhan, catalogItem?: DanhMucDiem): string {
  const catalogByCode = catalogItem ? new Map([[catalogItem.ma_danh_muc, catalogItem]]) : new Map<string, DanhMucDiem>()
  const polarity = getRecordPolarity(record, catalogByCode)

  if (polarity === 'positive') {
    return 'bg-emerald-50 hover:bg-emerald-100'
  }

  if (polarity === 'negative') {
    return 'bg-red-50 hover:bg-red-100'
  }

  return 'bg-white hover:bg-slate-50'
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN').format(date)
}

function formatPoint(value: number | null): string {
  if (typeof value !== 'number') return '-'
  return value > 0 ? `+${value}` : String(value)
}

function getPointClass(record: GhiNhan): string {
  if (typeof record.diem_cong_tru !== 'number') return 'text-slate-600'
  if (record.diem_cong_tru > 0) return 'text-emerald-700'
  if (record.diem_cong_tru < 0) return 'text-red-700'
  return 'text-slate-600'
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

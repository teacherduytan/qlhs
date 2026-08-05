import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { dataSource } from '../../data/client'
import { CopyIcon } from '../../components/CopyIcon'
import type {
  BanCanSu,
  BuoiDiemDanh,
  CauHinhTuan,
  DanhMucDiem,
  DeXuatGhiNhan,
  DienHocSinh,
  GhiNhan,
  HinhThucLienLacPhuHuynh,
  HocSinh,
  LienLacPhuHuynh,
  NhomDiem,
  NoiDungTinNhan,
  PhuHuynh,
} from '../../data/types'
import { formatTietLabel, getRecordPolarity } from '../records/recordInsights'
import { Pagination, usePagination } from '../../components/Pagination'
import { PhoneActionMenu, buildSmsHref } from '../../components/PhoneActionMenu'
import { findCurrentMessage, formatKyLabel } from './messageContents'

const CONTACT_LABELS: Record<HinhThucLienLacPhuHuynh, string> = {
  dien_thoai: 'Điện thoại trực tiếp',
  goi_zalo: 'Gọi Zalo',
  nhan_tin_zalo: 'Nhắn tin Zalo',
  sms: 'SMS',
}

const SESSION_LABELS: Record<BuoiDiemDanh | 'ca_ngay', string> = {
  chieu: 'Chiều',
  ca_ngay: 'Cả ngày',
  sang: 'Sáng',
}

const ROLE_OPTIONS = [
  'Không giữ chức vụ',
  'Lớp trưởng',
  'Lớp phó học tập',
  'Lớp phó lao động',
  'Lớp phó kỷ luật',
  'Bí thư chi đoàn',
  'Tổ trưởng',
  'Tổ phó',
]
const NEW_CATEGORY_VALUE = '__new__'
const NHOM_OPTIONS: Array<{ label: string; value: NhomDiem }> = [
  { label: 'Chuyên cần', value: 'CC' },
  { label: 'Vệ sinh', value: 'VS' },
  { label: 'Nề nếp', value: 'NN' },
  { label: 'Kỷ luật', value: 'KL' },
  { label: 'Tích cực', value: 'KT' },
]

type DetailState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | {
      status: 'success'
      banCanSu: BanCanSu[]
      catalog: DanhMucDiem[]
      contacts: LienLacPhuHuynh[]
      messages: NoiDungTinNhan[]
      parents: PhuHuynh[]
      proposals: DeXuatGhiNhan[]
      records: GhiNhan[]
      student: HocSinh
      weekConfig: CauHinhTuan[]
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

type RoleForm = {
  chucVu: string
  to: string
  ngayBatDau: string
  pin: string
  duocDeXuat: boolean
}

export function TeacherStudentDetailPage() {
  const { maHs } = useParams()
  const [state, setState] = useState<DetailState>({ status: 'loading' })
  const [form, setForm] = useState<StudentForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null)
  const [roleForm, setRoleForm] = useState<RoleForm | null>(null)
  const [roleSaving, setRoleSaving] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [roleMessage, setRoleMessage] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [messageEditText, setMessageEditText] = useState('')
  const [messageSavingId, setMessageSavingId] = useState<string | null>(null)
  const [messageActionError, setMessageActionError] = useState<string | null>(null)

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
      dataSource.getParentContactHistory({ maHs }),
      dataSource.getDeXuatGhiNhan({ maHs }),
      dataSource.getMessageContents(maHs),
      dataSource.getWeekConfig(),
    ])
      .then(([students, parents, banCanSu, records, catalog, contacts, proposals, messages, weekConfig]) => {
        if (!active) return
        const student = students.find((item) => item.ma_hs === maHs)
        if (!student) {
          setState({ status: 'not_found' })
          return
        }
        setState({
          status: 'success',
          banCanSu,
          catalog,
          contacts,
          messages,
          parents,
          proposals,
          records,
          student,
          weekConfig,
        })
        setForm(formFromStudent(student))
        setRoleForm(roleFormFromBanCanSu(maHs, banCanSu))
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

  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state.status !== 'success' || !roleForm) return

    setRoleSaving(true)
    setRoleError(null)
    setRoleMessage(null)

    try {
      const maHsValue = state.student.ma_hs
      const existing = state.banCanSu.find((item) => item.ma_hs === maHsValue) || null
      const patch: Pick<BanCanSu, 'to' | 'ngay_bat_dau' | 'ma_pin' | 'duoc_de_xuat_ghi_nhan'> = {
        to: roleForm.to ? Number(roleForm.to) : null,
        ngay_bat_dau: roleForm.ngayBatDau || null,
        ma_pin: roleForm.duocDeXuat ? roleForm.pin.trim() || null : null,
        duoc_de_xuat_ghi_nhan: roleForm.duocDeXuat,
      }

      let nextEntry: BanCanSu | null = null

      if (roleForm.chucVu === ROLE_OPTIONS[0]) {
        if (existing) await dataSource.deleteBanCanSu(maHsValue, existing.chuc_vu)
      } else if (existing && existing.chuc_vu === roleForm.chucVu) {
        nextEntry = await dataSource.updateBanCanSu(maHsValue, roleForm.chucVu, patch)
      } else {
        if (existing) await dataSource.deleteBanCanSu(maHsValue, existing.chuc_vu)
        nextEntry = await dataSource.addBanCanSu({ ma_hs: maHsValue, chuc_vu: roleForm.chucVu, ...patch })
      }

      setState((current) => {
        if (current.status !== 'success') return current
        const others = current.banCanSu.filter((item) => item.ma_hs !== maHsValue)
        return { ...current, banCanSu: nextEntry ? [...others, nextEntry] : others }
      })
      setRoleMessage('Đã lưu chức vụ.')
    } catch (error) {
      setRoleError(error instanceof Error ? error.message : 'Không lưu được chức vụ.')
    } finally {
      setRoleSaving(false)
    }
  }

  function startEditMessage(message: NoiDungTinNhan) {
    setMessageActionError(null)
    setEditingMessageId(message.id)
    setMessageEditText(message.noi_dung)
  }

  function cancelEditMessage() {
    setEditingMessageId(null)
  }

  async function saveEditMessage(message: NoiDungTinNhan) {
    if (!messageEditText.trim()) {
      setMessageActionError('Nội dung tin nhắn không được để trống.')
      return
    }

    setMessageSavingId(message.id)
    setMessageActionError(null)
    try {
      const updated = await dataSource.updateMessageContent(message.id, messageEditText)
      setState((current) =>
        current.status === 'success'
          ? { ...current, messages: current.messages.map((item) => (item.id === message.id ? updated : item)) }
          : current,
      )
      setEditingMessageId(null)
    } catch (error) {
      setMessageActionError(error instanceof Error ? error.message : 'Không sửa được nội dung tin nhắn.')
    } finally {
      setMessageSavingId(null)
    }
  }

  async function deleteMessage(message: NoiDungTinNhan) {
    const ok = window.confirm(`Xoá nội dung tin nhắn ${formatKyLabel(message)}?`)
    if (!ok) return

    setMessageSavingId(message.id)
    setMessageActionError(null)
    try {
      await dataSource.deleteMessageContent(message.id)
      setState((current) =>
        current.status === 'success'
          ? { ...current, messages: current.messages.filter((item) => item.id !== message.id) }
          : current,
      )
    } catch (error) {
      setMessageActionError(error instanceof Error ? error.message : 'Không xoá được nội dung tin nhắn.')
    } finally {
      setMessageSavingId(null)
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

  const recordsPage = usePagination(sortedRecords)
  const contactsPage = usePagination(state.status === 'success' ? state.contacts : [])
  const proposalsPage = usePagination(state.status === 'success' ? state.proposals : [])

  const currentMessage = useMemo(() => {
    if (state.status !== 'success') return null
    return findCurrentMessage(state.messages, state.weekConfig)
  }, [state])
  const messagesPage = usePagination(state.status === 'success' ? state.messages : [])

  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-blue-600">QLHS 11C5 · chế độ giáo viên</p>
          <h2 className="text-xl font-bold text-slate-900">Hồ sơ học sinh</h2>
          <p className="mt-1 text-sm text-slate-600">
            Cùng bố cục với link học sinh, có thêm quyền chỉnh sửa và xoá ghi nhận.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {state.status === 'success' ? (
            <Link
              to={`/hs/${state.student.token_ho_so}`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-blue-200 bg-blue-100 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              Xem link học sinh
            </Link>
          ) : null}
          <Link
            to="/hoc-sinh"
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
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
        <div className="rounded-lg border border-amber-200 bg-amber-100 p-4 text-sm text-amber-900">
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
          <section className="overflow-hidden rounded-lg border border-sky-200 bg-sky-100 shadow-sm">
            <div className="border-b border-sky-200 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                    {state.student.ten.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-blue-600">
                      {getRole(state.student.ma_hs, state.banCanSu)}
                    </p>
                    <h3 className="wrap-break-word text-xl font-bold text-slate-950 sm:text-2xl">
                      {state.student.ho} {state.student.ten}
                    </h3>
                    <p className="text-sm text-slate-600">Mã học sinh: {state.student.ma_hs}</p>
                  </div>
                </div>
                <div className="grid w-full shrink-0 grid-cols-2 overflow-hidden rounded-md border border-white/80 bg-white text-center shadow-sm md:w-40">
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
                <PhoneRow label="SĐT 1" value={state.student.sdt_1} smsBody={currentMessage?.noi_dung || ''} />
                <PhoneRow label="SĐT 2" value={state.student.sdt_2} smsBody={currentMessage?.noi_dung || ''} />
                {state.parents.map((parent) => (
                  <PhoneRow
                    key={`${parent.ma_hs}-${parent.quan_he}-${parent.sdt}`}
                    label={`${parent.quan_he || 'Phụ huynh'}${parent.uu_tien_lien_he ? ' ưu tiên' : ''}`}
                    name={parent.ho_ten_ph}
                    value={parent.sdt}
                    smsBody={currentMessage?.noi_dung || ''}
                  />
                ))}
              </div>
            </div>
          </section>

          {roleForm ? (
            <section className="rounded-lg border border-teal-200 bg-teal-100 shadow-sm">
              <div className="border-b border-teal-200 p-4">
                <p className="text-xs font-semibold uppercase text-teal-700">Ban cán sự</p>
                <h3 className="text-lg font-bold text-slate-950">Chức vụ trong lớp</h3>
                <p className="text-sm text-slate-600">
                  Tích "Cho phép gửi đề xuất ghi nhận" và đặt mã PIN để học sinh này được quyền gửi đề xuất ghi nhận
                  cho bạn cùng lớp qua link hồ sơ, không phụ thuộc chức vụ cụ thể nào — giáo viên vẫn phải duyệt
                  trước khi tính điểm.
                </p>
              </div>

              <form onSubmit={saveRole} className="grid gap-3 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Chức vụ
                  <select
                    value={roleForm.chucVu}
                    onChange={(event) => setRoleForm({ ...roleForm, chucVu: event.target.value })}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <TextField
                  label="Tổ phụ trách (nếu có)"
                  type="number"
                  value={roleForm.to}
                  onChange={(value) => setRoleForm({ ...roleForm, to: value })}
                />
                <TextField
                  label="Ngày bắt đầu"
                  type="date"
                  value={roleForm.ngayBatDau}
                  onChange={(value) => setRoleForm({ ...roleForm, ngayBatDau: value })}
                />
                <label className="flex flex-col justify-end gap-1 text-sm font-medium text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={roleForm.duocDeXuat}
                      onChange={(event) => setRoleForm({ ...roleForm, duocDeXuat: event.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    Cho phép gửi đề xuất ghi nhận
                  </span>
                </label>
                {roleForm.duocDeXuat ? (
                  <TextField
                    label="Mã PIN (để gửi đề xuất ghi nhận)"
                    value={roleForm.pin}
                    onChange={(value) => setRoleForm({ ...roleForm, pin: value })}
                  />
                ) : (
                  <div />
                )}

                <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
                  <button
                    type="submit"
                    disabled={roleSaving}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {roleSaving ? 'Đang lưu...' : 'Lưu chức vụ'}
                  </button>
                  {roleError ? <p className="text-sm font-semibold text-red-700">{roleError}</p> : null}
                  {roleMessage ? <p className="text-sm font-semibold text-emerald-700">{roleMessage}</p> : null}
                </div>
              </form>
            </section>
          ) : null}

          <section className="rounded-lg border border-blue-300 bg-blue-100 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-blue-200 p-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-blue-700">Ghi nhận của học sinh</p>
                <h3 className="text-xl font-bold text-slate-950">Ghi nhận tích cực và cần lưu ý trên lớp</h3>
                <p className="text-sm text-slate-600">
                  Đồng bộ với hồ sơ học sinh; giáo viên có thêm quyền xoá các dòng nhập nhầm.
                </p>
              </div>
              <Link
                to="/ghi-nhan"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
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
                    recordsPage.pageItems.map((record, index) => {
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
                                className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-semibold text-blue-700 hover:underline"
                              >
                                {record.ma_danh_muc}
                              </Link>
                            ) : (
                              <span className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
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
                              {formatTietLabel(record.tiet) ? ` · ${formatTietLabel(record.tiet)}` : ''}
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
                              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:text-slate-400"
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
            <div className="p-4">
              <Pagination onChange={recordsPage.setPage} page={recordsPage.page} totalPages={recordsPage.totalPages} />
            </div>
          </section>

          <section className="rounded-lg border border-teal-200 bg-teal-100 shadow-sm">
            <div className="border-b border-teal-200 p-4">
              <p className="text-xs font-semibold uppercase text-teal-700">Đề xuất từ ban cán sự lớp</p>
              <h3 className="text-xl font-bold text-slate-950">Lịch sử đề xuất ghi nhận cho học sinh này</h3>
              <p className="text-sm text-slate-600">
                Các đề xuất mà học sinh được cấp quyền (đánh dấu "Cho phép gửi đề xuất ghi nhận") gửi cho bạn học
                này. Giáo viên có thể sửa hoặc xoá trực tiếp tại đây.
              </p>
            </div>
            <div className="space-y-2 bg-white p-4">
              {state.proposals.length === 0 ? (
                <p className="rounded-md border border-teal-100 bg-teal-100 p-3 text-sm text-slate-600">
                  Chưa có đề xuất nào cho học sinh này.
                </p>
              ) : (
                proposalsPage.pageItems.map((item) => (
                  <TeacherProposalItem
                    key={item.id}
                    catalog={state.catalog}
                    item={item}
                    onChanged={(next) =>
                      setState((current) =>
                        current.status === 'success'
                          ? {
                              ...current,
                              proposals: next
                                ? current.proposals.map((entry) => (entry.id === next.id ? next : entry))
                                : current.proposals.filter((entry) => entry.id !== item.id),
                            }
                          : current,
                      )
                    }
                  />
                ))
              )}
              <Pagination
                onChange={proposalsPage.setPage}
                page={proposalsPage.page}
                totalPages={proposalsPage.totalPages}
              />
            </div>
          </section>

          <section className="rounded-lg border border-cyan-200 bg-cyan-100 shadow-sm">
            <div className="border-b border-cyan-200 p-4">
              <p className="text-xs font-semibold uppercase text-cyan-700">SMS phụ huynh</p>
              <h3 className="text-xl font-bold text-slate-950">Lịch sử tin nhắn</h3>
              <p className="text-sm text-slate-600">
                Nội dung SMS đã import theo từng tuần/tháng cho em này — bấm "Dùng nội dung này" để mở tin nhắn với
                đúng nội dung của kỳ đó thay vì kỳ gần nhất.
              </p>
            </div>
            <div className="space-y-2 bg-white p-4">
              {messageActionError ? (
                <p className="rounded-md border border-red-200 bg-red-100 p-3 text-sm font-semibold text-red-700">
                  {messageActionError}
                </p>
              ) : null}
              {state.messages.length === 0 ? (
                <p className="rounded-md border border-cyan-100 bg-cyan-100 p-3 text-sm text-slate-600">
                  Chưa có nội dung tin nhắn nào được import cho học sinh này.
                </p>
              ) : (
                messagesPage.pageItems.map((message) => (
                  <div key={message.id} className="rounded-md border border-cyan-100 bg-cyan-100 p-3">
                    {editingMessageId === message.id ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-900">{formatKyLabel(message)}</p>
                        <textarea
                          value={messageEditText}
                          onChange={(event) => setMessageEditText(event.target.value)}
                          className="min-h-20 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void saveEditMessage(message)}
                            disabled={messageSavingId === message.id}
                            className="h-9 rounded-md bg-cyan-700 px-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                          >
                            {messageSavingId === message.id ? 'Đang lưu...' : 'Lưu'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditMessage}
                            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Huỷ
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatKyLabel(message)}
                            {currentMessage?.id === message.id ? (
                              <span className="ml-2 rounded-full bg-cyan-700 px-2 py-0.5 text-xs font-semibold text-white">
                                Hiện tại
                              </span>
                            ) : null}
                          </p>
                          <p className="wrap-break-word text-sm text-slate-700">{message.noi_dung}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <a
                            href={buildSmsHref(state.student.sdt_1 || state.student.sdt_2 || '', message.noi_dung)}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-cyan-300 bg-white px-3 text-sm font-semibold text-cyan-800 hover:bg-cyan-100"
                          >
                            Dùng nội dung này
                          </a>
                          <button
                            type="button"
                            onClick={() => startEditMessage(message)}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteMessage(message)}
                            disabled={messageSavingId === message.id}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            {messageSavingId === message.id ? 'Đang xoá...' : 'Xoá'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <Pagination
                onChange={messagesPage.setPage}
                page={messagesPage.page}
                totalPages={messagesPage.totalPages}
              />
            </div>
          </section>

          <section className="rounded-lg border border-orange-200 bg-orange-100 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-orange-200 p-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-orange-700">Liên lạc phụ huynh</p>
                <h3 className="text-xl font-bold text-slate-950">Lịch sử đã liên lạc</h3>
                <p className="text-sm text-slate-600">
                  Ghi nhận khi đánh dấu vắng/trễ ở trang Điểm danh.
                </p>
              </div>
              <Link
                to={`/lien-lac-phu-huynh?q=${encodeURIComponent(state.student.ma_hs)}`}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-orange-200 bg-white px-3 text-sm font-semibold text-orange-700 hover:bg-orange-100"
              >
                Xem trong Lịch sử liên lạc
              </Link>
            </div>

            <div className="space-y-2 bg-white p-4">
              {state.contacts.length === 0 ? (
                <p className="rounded-md border border-orange-100 bg-orange-100 p-3 text-sm text-slate-600">
                  Chưa có lượt liên lạc phụ huynh nào cho học sinh này.
                </p>
              ) : (
                contactsPage.pageItems.map((item) => (
                  <div key={item.id} className="rounded-md border border-slate-200 p-3">
                    <div className="space-y-1">
                      <p className="wrap-break-word text-sm font-semibold text-slate-900">
                        {item.ngay ? formatDate(item.ngay) : '—'} ·{' '}
                        {item.buoi ? SESSION_LABELS[item.buoi] : '—'} ·{' '}
                        {item.hinh_thuc ? CONTACT_LABELS[item.hinh_thuc] : 'Không rõ hình thức'}
                      </p>
                      <p className="wrap-break-word text-xs text-slate-500">
                        {item.thoi_gian ? formatDateTime(item.thoi_gian) : ''}
                        {item.nguoi_lien_lac ? ` · ${item.nguoi_lien_lac}` : ''}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{item.noi_dung || 'Không có ghi chú.'}</p>
                  </div>
                ))
              )}
              <Pagination
                onChange={contactsPage.setPage}
                page={contactsPage.page}
                totalPages={contactsPage.totalPages}
              />
            </div>
          </section>

          <form onSubmit={saveStudent} className="rounded-lg border border-violet-200 bg-violet-100 p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-violet-700">Thông tin cá nhân</p>
                <h3 className="text-base font-bold text-slate-900">Chỉnh sửa thông tin</h3>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-violet-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-400"
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

function TeacherProposalItem({
  catalog,
  item,
  onChanged,
}: {
  catalog: DanhMucDiem[]
  item: DeXuatGhiNhan
  onChanged: (next: DeXuatGhiNhan | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [selectedCatalog, setSelectedCatalog] = useState(item.ma_danh_muc || NEW_CATEGORY_VALUE)
  const [deXuatNhom, setDeXuatNhom] = useState<NhomDiem>(item.de_xuat_nhom || 'NN')
  const [noiDung, setNoiDung] = useState(item.noi_dung || '')
  const [ngay, setNgay] = useState(item.ngay)
  const [tiet, setTiet] = useState(item.tiet || '')
  const [monHoc, setMonHoc] = useState(item.mon_hoc || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isNewCategory = selectedCatalog === NEW_CATEGORY_VALUE

  const statusLabel =
    item.trang_thai === 'da_duyet' ? 'Đã duyệt' : item.trang_thai === 'tu_choi' ? 'Bị từ chối' : 'Chờ duyệt'
  const statusClass =
    item.trang_thai === 'da_duyet'
      ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
      : item.trang_thai === 'tu_choi'
        ? 'border-rose-300 bg-rose-100 text-rose-800'
        : 'border-amber-300 bg-amber-100 text-amber-800'

  async function saveEdit() {
    setBusy(true)
    setError(null)
    try {
      const patch = {
        ma_danh_muc: isNewCategory ? null : selectedCatalog,
        noi_dung: noiDung.trim() || null,
        de_xuat_nhom: isNewCategory ? deXuatNhom : null,
        ngay,
        tiet: tiet.trim() || null,
        mon_hoc: monHoc.trim() || null,
      }
      await dataSource.updateDeXuatGhiNhanByTeacher(item.id, patch)
      setEditing(false)
      onChanged({ ...item, ...patch })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không sửa được đề xuất.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    const ok = window.confirm('Xoá đề xuất này? Không thể hoàn tác.')
    if (!ok) return

    setBusy(true)
    setError(null)
    try {
      await dataSource.deleteDeXuatGhiNhanByTeacher(item.id)
      onChanged(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xoá được đề xuất.')
      setBusy(false)
    }
  }

  return (
    <div className="rounded-md border border-teal-100 bg-white p-2">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="wrap-break-word text-sm font-semibold text-slate-900">
            {item.nguoi_de_xuat} đề xuất
          </p>
          <p className="wrap-break-word text-xs text-slate-500">
            {formatDate(item.ngay)} · {item.ma_danh_muc || `Đề xuất mới (${item.de_xuat_nhom || '?'})`}
            {formatTietLabel(item.tiet) ? ` · ${formatTietLabel(item.tiet)}` : ''}
            {item.mon_hoc ? ` · ${item.mon_hoc}` : ''}
          </p>
          {item.noi_dung ? <p className="mt-1 wrap-break-word text-sm text-slate-700">{item.noi_dung}</p> : null}
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      {item.trang_thai !== 'cho_duyet' ? (
        <p className="mt-1 text-xs text-slate-500">
          Đề xuất đã được xử lý — sửa/xoá tại đây chỉ đổi bản ghi đề xuất, không tự đổi ghi nhận đã tạo.
        </p>
      ) : null}

      {editing ? (
        <div className="mt-2 space-y-2 rounded-md border border-teal-100 bg-teal-100/50 p-2">
          <select
            value={selectedCatalog}
            onChange={(event) => setSelectedCatalog(event.target.value)}
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {catalog.map((entry) => (
              <option key={entry.ma_danh_muc} value={entry.ma_danh_muc}>
                {entry.ma_danh_muc} · {entry.ten_muc}
              </option>
            ))}
            <option value={NEW_CATEGORY_VALUE}>➕ Không có, đề xuất danh mục mới</option>
          </select>
          {isNewCategory ? (
            <select
              value={deXuatNhom}
              onChange={(event) => setDeXuatNhom(event.target.value as NhomDiem)}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {NHOM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}
          <input
            type="date"
            value={ngay}
            onChange={(event) => setNgay(event.target.value)}
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={tiet}
              onChange={(event) => setTiet(event.target.value)}
              placeholder="Tiết (VD: 2)"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <input
              value={monHoc}
              onChange={(event) => setMonHoc(event.target.value)}
              placeholder="Môn (VD: Toán)"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <textarea
            value={noiDung}
            onChange={(event) => setNoiDung(event.target.value)}
            className="min-h-14 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveEdit()}
              className="h-8 rounded-md bg-teal-700 px-3 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {busy ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Sửa
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="h-8 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {busy ? 'Đang xoá...' : 'Xoá'}
          </button>
        </div>
      )}

      {error && !editing ? <p className="mt-1 text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  )
}

function PhoneRow({
  label,
  name,
  value,
  smsBody,
}: {
  label: string
  name?: string
  value: unknown
  smsBody: string
}) {
  const phoneText = toText(value)
  const [copied, setCopied] = useState(false)

  async function copyPhone() {
    await window.navigator.clipboard.writeText(phoneText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-1 rounded-md border border-slate-200 bg-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="wrap-break-word font-semibold text-slate-900">{label}</p>
        {name ? <p className="wrap-break-word text-slate-600">{name}</p> : null}
      </div>
      {phoneText ? (
        <div className="flex shrink-0 items-center gap-1">
          <PhoneActionMenu
            phone={phoneText}
            smsBody={smsBody}
            smsEmptyHint="Chưa có nội dung tin nhắn cho em này."
          />
          <button
            type="button"
            onClick={() => void copyPhone()}
            aria-label={`Copy ${label}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          >
            <CopyIcon copied={copied} />
          </button>
        </div>
      ) : (
        <span className="shrink-0 text-slate-400">Chưa có</span>
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
    return 'bg-emerald-100 hover:bg-emerald-100'
  }

  if (polarity === 'negative') {
    return 'bg-red-100 hover:bg-red-100'
  }

  return 'bg-white hover:bg-slate-100'
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN').format(date)
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

function toText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function getRole(maHs: string, banCanSu: BanCanSu[]): string {
  return banCanSu.find((item) => item.ma_hs === maHs)?.chuc_vu || 'Học sinh'
}

function roleFormFromBanCanSu(maHs: string, banCanSu: BanCanSu[]): RoleForm {
  const current = banCanSu.find((item) => item.ma_hs === maHs)
  return {
    chucVu: current?.chuc_vu || ROLE_OPTIONS[0],
    to: current?.to ? String(current.to) : '',
    ngayBatDau: current?.ngay_bat_dau || '',
    pin: current?.ma_pin || '',
    duocDeXuat: current?.duoc_de_xuat_ghi_nhan || false,
  }
}

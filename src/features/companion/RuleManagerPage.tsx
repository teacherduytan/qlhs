import { type FormEvent, useEffect, useState } from 'react'
import { dataSource } from '../../data/client'
import type {
  BacTinhTu,
  CauDinhHuongDongHanh,
  CauHinhTuan,
  ChiSoDongHanh,
  DongHanhDiemDanh,
  DanhMucDiem,
  DieuKienHuyHieu,
  DiemCauHinhHeSoDieuKien,
  DiemCauHinhThanhPhan,
  DiemNguongXepLoai,
  GhiNhan,
  HocSinh,
  HuyHieuDongHanh,
  LoaiTinhThanhPhanDiem,
  LuatDongHanh,
  MucDoCanhBao,
  NhomDiem,
  PhepSoSanh,
} from '../../data/types'
import { apDungHuyHieu, apDungLuat, chonCauDinhHuong } from './applyRules'
import { tinhChiSoTuan } from './computeMetrics'
import { DIEM_THUONG_MOI_HUY_HIEU_MAC_DINH, tinhRankTuan } from './rankTinhTu'
import { TheNhanVatTuan } from './TheNhanVatTuan'
import {
  DEFAULT_SO_THAP_PHAN_LAM_TRON,
  calculateWeeklyStudentScore,
} from '../scoring/scoring'
import { findWeek, selectDefaultWeek, sortWeeks } from '../time/WeekSelector'

type Tab = 'canh_bao' | 'huy_hieu' | 'cau_dinh_huong' | 'chi_so' | 'rank' | 'diem'

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'success'
      chiSo: ChiSoDongHanh[]
      luat: LuatDongHanh[]
      huyHieu: HuyHieuDongHanh[]
      cauDinhHuong: CauDinhHuongDongHanh[]
      students: HocSinh[]
      catalog: DanhMucDiem[]
      records: GhiNhan[]
      attendance: DongHanhDiemDanh[]
      weekConfig: CauHinhTuan[]
      rankBac: BacTinhTu[]
      cauHinh: Record<string, string>
      diemThanhPhan: DiemCauHinhThanhPhan[]
      diemHeSoDieuKien: DiemCauHinhHeSoDieuKien[]
      diemNguongXepLoai: DiemNguongXepLoai[]
      diemCauHinhChung: Record<string, string>
    }

const MUC_DO_OPTIONS: Array<{ value: MucDoCanhBao; label: string }> = [
  { value: 'khan', label: 'Khẩn (đỏ, luôn hiện trên cùng)' },
  { value: 'canh_bao', label: 'Cảnh báo' },
  { value: 'nhac_som', label: 'Nhắc sớm' },
  { value: 'nhac_nhe', label: 'Nhắc nhẹ' },
]

const PHEP_OPTIONS: PhepSoSanh[] = ['>=', '>', '=', '<', '<=']

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'canh_bao', label: 'Cảnh báo & nhắc nhở' },
  { key: 'huy_hieu', label: 'Huy hiệu' },
  { key: 'cau_dinh_huong', label: 'Câu định hướng' },
  { key: 'chi_so', label: 'Chỉ số' },
  { key: 'rank', label: 'Bậc tinh tú' },
  { key: 'diem', label: 'Công thức điểm rèn luyện' },
]

export function RuleManagerPage() {
  const [state, setState] = useState<PageState>({ status: 'loading' })
  const [tab, setTab] = useState<Tab>('canh_bao')

  useEffect(() => {
    let mounted = true
    Promise.all([
      dataSource.getDongHanhChiSo(),
      dataSource.getDongHanhLuat(),
      dataSource.getDongHanhHuyHieu(),
      dataSource.getDongHanhCauDinhHuong(),
      dataSource.getStudents(),
      dataSource.getPointCatalog(),
      dataSource.getRecords(),
      dataSource.getAttendanceEntries(),
      dataSource.getWeekConfig(),
      dataSource.getRankBacTinhTu(),
      dataSource.getDongHanhCauHinh(),
      dataSource.getDiemCauHinhThanhPhan(),
      dataSource.getDiemCauHinhHeSoDieuKien(),
      dataSource.getDiemNguongXepLoai(),
      dataSource.getDiemCauHinhChung(),
    ])
      .then(
        ([
          chiSo,
          luat,
          huyHieu,
          cauDinhHuong,
          students,
          catalog,
          records,
          attendance,
          weekConfig,
          rankBac,
          cauHinh,
          diemThanhPhan,
          diemHeSoDieuKien,
          diemNguongXepLoai,
          diemCauHinhChung,
        ]) => {
          if (!mounted) return
          setState({
            status: 'success',
            chiSo,
            luat,
            huyHieu,
            cauDinhHuong,
            students,
            catalog,
            records,
            attendance,
            weekConfig,
            rankBac,
            cauHinh,
            diemThanhPhan,
            diemHeSoDieuKien,
            diemNguongXepLoai,
            diemCauHinhChung,
          })
        },
      )
      .catch((error: unknown) => {
        if (mounted) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Không tải được dữ liệu Đồng hành.',
          })
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  if (state.status === 'loading') {
    return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Đang tải...</div>
  }

  if (state.status === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-100 p-4 text-sm font-medium text-red-700">
        {state.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase text-teal-700">Hệ thống Đồng hành</p>
        <h2 className="text-xl font-bold text-slate-950">Quản lý luật (rule-based)</h2>
        <p className="text-sm text-slate-600">
          Toàn bộ ngưỡng/câu chữ ở đây là dữ liệu, sửa xong dùng ngay — không cần deploy lại.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`h-9 rounded-md px-3 text-sm font-semibold ${
              tab === item.key ? 'bg-teal-700 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'canh_bao' ? <CanhBaoTab state={state} setState={setState} /> : null}
      {tab === 'huy_hieu' ? <HuyHieuTab state={state} setState={setState} /> : null}
      {tab === 'cau_dinh_huong' ? <CauDinhHuongTab state={state} setState={setState} /> : null}
      {tab === 'chi_so' ? <ChiSoTab state={state} /> : null}
      {tab === 'rank' ? <RankTab state={state} setState={setState} /> : null}
      {tab === 'diem' ? <DiemCongThucTab state={state} setState={setState} /> : null}

      <PreviewPanel state={state} />
    </div>
  )
}

type SuccessState = Extract<PageState, { status: 'success' }>
type SetState = (updater: (current: PageState) => PageState) => void

function withSuccess(setState: SetState, updater: (current: SuccessState) => SuccessState) {
  setState((current) => (current.status === 'success' ? updater(current) : current))
}

// ===================== Tab: Canh bao & nhac nho =====================

const EMPTY_LUAT: LuatDongHanh = {
  ma_luat: '',
  ten_luat: '',
  ma_chi_so: '',
  phep_so_sanh: '>=',
  nguong: 1,
  ma_danh_muc_ap_dung: null,
  muc_do: 'nhac_nhe',
  cau_hien_thi: '',
  uu_tien: 100,
  nhom_che: null,
  can_duyet: true,
  dang_bat: true,
  thu_tu: 0,
}

function CanhBaoTab({ state, setState }: { state: SuccessState; setState: SetState }) {
  const [form, setForm] = useState<LuatDongHanh>(EMPTY_LUAT)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit(luat: LuatDongHanh) {
    setEditing(luat.ma_luat)
    setForm(luat)
    setError(null)
  }

  function startAdd() {
    setEditing('__new__')
    setForm(EMPTY_LUAT)
    setError(null)
  }

  function cancel() {
    setEditing(null)
    setForm(EMPTY_LUAT)
    setError(null)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.ma_luat.trim() || !form.ten_luat.trim() || !form.ma_chi_so || !form.cau_hien_thi.trim()) {
      setError('Cần nhập đủ Mã luật, Tên luật, Chỉ số và Câu hiển thị.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (editing === '__new__') {
        const created = await dataSource.addDongHanhLuat(form)
        withSuccess(setState, (current) => ({ ...current, luat: [...current.luat, created] }))
      } else if (editing) {
        const updated = await dataSource.updateDongHanhLuat(editing, form)
        withSuccess(setState, (current) => ({
          ...current,
          luat: current.luat.map((item) => (item.ma_luat === editing ? updated : item)),
        }))
      }
      cancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được luật.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(maLuat: string) {
    if (!window.confirm(`Xoá luật ${maLuat}?`)) return
    try {
      await dataSource.deleteDongHanhLuat(maLuat)
      withSuccess(setState, (current) => ({
        ...current,
        luat: current.luat.filter((item) => item.ma_luat !== maLuat),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xoá được luật.')
    }
  }

  async function toggle(luat: LuatDongHanh) {
    try {
      const updated = await dataSource.updateDongHanhLuat(luat.ma_luat, { dang_bat: !luat.dang_bat })
      withSuccess(setState, (current) => ({
        ...current,
        luat: current.luat.map((item) => (item.ma_luat === luat.ma_luat ? updated : item)),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đổi được trạng thái.')
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="rounded-md border border-red-200 bg-red-100 p-2 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Mã</th>
              <th className="px-3 py-2">Tên luật</th>
              <th className="px-3 py-2">Điều kiện</th>
              <th className="px-3 py-2">Mức độ</th>
              <th className="px-3 py-2">Ưu tiên</th>
              <th className="px-3 py-2">Nhóm che</th>
              <th className="px-3 py-2">Bật</th>
              <th className="px-3 py-2">Sửa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.luat.map((luat) => (
              <tr key={luat.ma_luat} className={luat.dang_bat ? '' : 'opacity-50'}>
                <td className="px-3 py-2 font-semibold">{luat.ma_luat}</td>
                <td className="px-3 py-2">{luat.ten_luat}</td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {luat.ma_chi_so} {luat.phep_so_sanh} {luat.nguong}
                  {luat.ma_danh_muc_ap_dung ? ` (${luat.ma_danh_muc_ap_dung})` : ''}
                </td>
                <td className="px-3 py-2">{luat.muc_do}</td>
                <td className="px-3 py-2">{luat.uu_tien}</td>
                <td className="px-3 py-2">{luat.nhom_che || '—'}</td>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={luat.dang_bat} onChange={() => void toggle(luat)} className="h-4 w-4" />
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(luat)} className="text-xs font-semibold text-blue-700 hover:underline">
                      Sửa
                    </button>
                    <button type="button" onClick={() => void remove(luat.ma_luat)} className="text-xs font-semibold text-red-700 hover:underline">
                      Xoá
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <form onSubmit={save} className="grid gap-2 rounded-lg border border-teal-200 bg-teal-100/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Mã luật
            <input
              value={form.ma_luat}
              disabled={editing !== '__new__'}
              onChange={(event) => setForm((current) => ({ ...current, ma_luat: event.target.value.toUpperCase() }))}
              placeholder="VD: CB6"
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 lg:col-span-2">
            Tên luật
            <input
              value={form.ten_luat}
              onChange={(event) => setForm((current) => ({ ...current, ten_luat: event.target.value }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Mức độ
            <select
              value={form.muc_do}
              onChange={(event) => setForm((current) => ({ ...current, muc_do: event.target.value as MucDoCanhBao }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              {MUC_DO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Chỉ số
            <select
              value={form.ma_chi_so}
              onChange={(event) => setForm((current) => ({ ...current, ma_chi_so: event.target.value }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="">-- Chọn --</option>
              {state.chiSo.map((item) => (
                <option key={item.ma_chi_so} value={item.ma_chi_so}>
                  {item.ten_hien_thi}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Phép so sánh
            <select
              value={form.phep_so_sanh}
              onChange={(event) => setForm((current) => ({ ...current, phep_so_sanh: event.target.value as PhepSoSanh }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              {PHEP_OPTIONS.map((phep) => (
                <option key={phep} value={phep}>
                  {phep}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Ngưỡng
            <input
              type="number"
              value={form.nguong ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, nguong: event.target.value === '' ? null : Number(event.target.value) }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          {form.ma_chi_so === 'so_lan_theo_ma' ? (
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Mã danh mục áp dụng
              <input
                value={form.ma_danh_muc_ap_dung || ''}
                onChange={(event) => setForm((current) => ({ ...current, ma_danh_muc_ap_dung: event.target.value.toUpperCase() || null }))}
                placeholder="VD: NN11"
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
              />
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Ưu tiên (nhỏ = cao)
            <input
              type="number"
              value={form.uu_tien}
              onChange={(event) => setForm((current) => ({ ...current, uu_tien: Number(event.target.value) }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Nhóm che (để trống nếu không che ai)
            <input
              value={form.nhom_che || ''}
              onChange={(event) => setForm((current) => ({ ...current, nhom_che: event.target.value || null }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 sm:col-span-2 lg:col-span-4">
            Câu hiển thị (dùng được {'{n}'}, {'{ma}'}, {'{ngay}'})
            <input
              value={form.cau_hien_thi}
              onChange={(event) => setForm((current) => ({ ...current, cau_hien_thi: event.target.value }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          {error ? <p className="text-xs font-semibold text-red-700 sm:col-span-2 lg:col-span-4">{error}</p> : null}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={saving} className="h-9 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button type="button" onClick={cancel} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Huỷ
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={startAdd} className="h-9 rounded-md border border-teal-300 bg-teal-100 px-3 text-sm font-semibold text-teal-700 hover:bg-teal-100">
          + Thêm luật cảnh báo
        </button>
      )}
    </div>
  )
}

// ===================== Tab: Huy hieu =====================

const EMPTY_HUY_HIEU: HuyHieuDongHanh = {
  ma_huy_hieu: '',
  ten_huy_hieu: '',
  icon: '🏅',
  dieu_kien: [{ ma_chi_so: '', phep: '=', nguong: 0 }],
  mo_ta: '',
  tu_dong: true,
  dang_bat: true,
  thu_tu: 0,
}

function HuyHieuTab({ state, setState }: { state: SuccessState; setState: SetState }) {
  const [form, setForm] = useState<HuyHieuDongHanh>(EMPTY_HUY_HIEU)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit(item: HuyHieuDongHanh) {
    setEditing(item.ma_huy_hieu)
    setForm(item)
    setError(null)
  }

  function startAdd() {
    setEditing('__new__')
    setForm(EMPTY_HUY_HIEU)
    setError(null)
  }

  function cancel() {
    setEditing(null)
    setForm(EMPTY_HUY_HIEU)
    setError(null)
  }

  function updateDieuKien(index: number, patch: Partial<DieuKienHuyHieu>) {
    setForm((current) => ({
      ...current,
      dieu_kien: current.dieu_kien.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }))
  }

  function addDieuKien() {
    setForm((current) => ({ ...current, dieu_kien: [...current.dieu_kien, { ma_chi_so: '', phep: '=', nguong: 0 }] }))
  }

  function removeDieuKien(index: number) {
    setForm((current) => ({ ...current, dieu_kien: current.dieu_kien.filter((_, itemIndex) => itemIndex !== index) }))
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.ma_huy_hieu.trim() || !form.ten_huy_hieu.trim() || form.dieu_kien.some((item) => !item.ma_chi_so)) {
      setError('Cần nhập Mã, Tên và chọn đủ chỉ số cho từng điều kiện.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (editing === '__new__') {
        const created = await dataSource.addDongHanhHuyHieu(form)
        withSuccess(setState, (current) => ({ ...current, huyHieu: [...current.huyHieu, created] }))
      } else if (editing) {
        const updated = await dataSource.updateDongHanhHuyHieu(editing, form)
        withSuccess(setState, (current) => ({
          ...current,
          huyHieu: current.huyHieu.map((item) => (item.ma_huy_hieu === editing ? updated : item)),
        }))
      }
      cancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được huy hiệu.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(maHuyHieu: string) {
    if (!window.confirm(`Xoá huy hiệu ${maHuyHieu}?`)) return
    try {
      await dataSource.deleteDongHanhHuyHieu(maHuyHieu)
      withSuccess(setState, (current) => ({
        ...current,
        huyHieu: current.huyHieu.filter((item) => item.ma_huy_hieu !== maHuyHieu),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xoá được huy hiệu.')
    }
  }

  async function toggle(item: HuyHieuDongHanh) {
    try {
      const updated = await dataSource.updateDongHanhHuyHieu(item.ma_huy_hieu, { dang_bat: !item.dang_bat })
      withSuccess(setState, (current) => ({
        ...current,
        huyHieu: current.huyHieu.map((row) => (row.ma_huy_hieu === item.ma_huy_hieu ? updated : row)),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đổi được trạng thái.')
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="rounded-md border border-red-200 bg-red-100 p-2 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {state.huyHieu.map((item) => (
          <div key={item.ma_huy_hieu} className={`rounded-lg border border-slate-200 bg-white p-3 ${item.dang_bat ? '' : 'opacity-50'}`}>
            <div className="flex items-start justify-between">
              <p className="text-sm font-semibold text-slate-900">
                {item.icon} {item.ten_huy_hieu}
              </p>
              <input type="checkbox" checked={item.dang_bat} onChange={() => void toggle(item)} className="h-4 w-4" />
            </div>
            <p className="mt-1 text-xs text-slate-500">{item.mo_ta}</p>
            <ul className="mt-1 text-xs text-slate-600">
              {item.dieu_kien.map((dieuKien, index) => (
                <li key={index}>
                  {dieuKien.ma_chi_so} {dieuKien.phep} {dieuKien.nguong}
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => startEdit(item)} className="text-xs font-semibold text-blue-700 hover:underline">
                Sửa
              </button>
              <button type="button" onClick={() => void remove(item.ma_huy_hieu)} className="text-xs font-semibold text-red-700 hover:underline">
                Xoá
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <form onSubmit={save} className="space-y-2 rounded-lg border border-teal-200 bg-teal-100/40 p-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Mã huy hiệu
              <input
                value={form.ma_huy_hieu}
                disabled={editing !== '__new__'}
                onChange={(event) => setForm((current) => ({ ...current, ma_huy_hieu: event.target.value }))}
                placeholder="VD: sao_thang"
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Icon (emoji)
              <input
                value={form.icon || ''}
                onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">
              Tên huy hiệu
              <input
                value={form.ten_huy_hieu}
                onChange={(event) => setForm((current) => ({ ...current, ten_huy_hieu: event.target.value }))}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 sm:col-span-2 lg:col-span-4">
              Mô tả
              <input
                value={form.mo_ta || ''}
                onChange={(event) => setForm((current) => ({ ...current, mo_ta: event.target.value }))}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
              />
            </label>
          </div>

          <div className="space-y-2 rounded-md border border-slate-200 bg-white p-2">
            <p className="text-xs font-semibold text-slate-600">Điều kiện đạt (AND tất cả các dòng)</p>
            {form.dieu_kien.map((dieuKien, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <select
                  value={dieuKien.ma_chi_so}
                  onChange={(event) => updateDieuKien(index, { ma_chi_so: event.target.value })}
                  className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                >
                  <option value="">-- Chỉ số --</option>
                  {state.chiSo
                    .filter((item) => item.kieu !== 'so_theo_ma')
                    .map((item) => (
                      <option key={item.ma_chi_so} value={item.ma_chi_so}>
                        {item.ten_hien_thi}
                      </option>
                    ))}
                </select>
                <select
                  value={dieuKien.phep}
                  onChange={(event) => updateDieuKien(index, { phep: event.target.value as PhepSoSanh })}
                  className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                >
                  {PHEP_OPTIONS.map((phep) => (
                    <option key={phep} value={phep}>
                      {phep}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={dieuKien.nguong}
                  onChange={(event) => updateDieuKien(index, { nguong: Number(event.target.value) })}
                  className="h-9 w-24 rounded-md border border-slate-300 bg-white px-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeDieuKien(index)}
                  disabled={form.dieu_kien.length <= 1}
                  className="h-9 rounded-md border border-red-200 bg-white px-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  Xoá dòng
                </button>
              </div>
            ))}
            <button type="button" onClick={addDieuKien} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              + Thêm điều kiện
            </button>
          </div>

          {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="h-9 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button type="button" onClick={cancel} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Huỷ
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={startAdd} className="h-9 rounded-md border border-teal-300 bg-teal-100 px-3 text-sm font-semibold text-teal-700 hover:bg-teal-100">
          + Thêm huy hiệu
        </button>
      )}
    </div>
  )
}

// ===================== Tab: Cau dinh huong =====================

const EMPTY_CAU: CauDinhHuongDongHanh = {
  ma_cau: '',
  gan_voi: '',
  cau: '',
  dang_bat: true,
  thu_tu: 0,
}

function CauDinhHuongTab({ state, setState }: { state: SuccessState; setState: SetState }) {
  const [form, setForm] = useState<CauDinhHuongDongHanh>(EMPTY_CAU)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit(item: CauDinhHuongDongHanh) {
    setEditing(item.ma_cau)
    setForm(item)
    setError(null)
  }

  function startAdd() {
    setEditing('__new__')
    setForm(EMPTY_CAU)
    setError(null)
  }

  function cancel() {
    setEditing(null)
    setForm(EMPTY_CAU)
    setError(null)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.ma_cau.trim() || !form.gan_voi.trim() || !form.cau.trim()) {
      setError('Cần nhập đủ Mã câu, Gắn với, Nội dung câu.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (editing === '__new__') {
        const created = await dataSource.addDongHanhCauDinhHuong(form)
        withSuccess(setState, (current) => ({ ...current, cauDinhHuong: [...current.cauDinhHuong, created] }))
      } else if (editing) {
        const updated = await dataSource.updateDongHanhCauDinhHuong(editing, form)
        withSuccess(setState, (current) => ({
          ...current,
          cauDinhHuong: current.cauDinhHuong.map((item) => (item.ma_cau === editing ? updated : item)),
        }))
      }
      cancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được câu định hướng.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(maCau: string) {
    if (!window.confirm(`Xoá câu ${maCau}?`)) return
    try {
      await dataSource.deleteDongHanhCauDinhHuong(maCau)
      withSuccess(setState, (current) => ({
        ...current,
        cauDinhHuong: current.cauDinhHuong.filter((item) => item.ma_cau !== maCau),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xoá được câu.')
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="rounded-md border border-red-200 bg-red-100 p-2 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Mã</th>
              <th className="px-3 py-2">Gắn với</th>
              <th className="px-3 py-2">Câu</th>
              <th className="px-3 py-2">Bật</th>
              <th className="px-3 py-2">Sửa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.cauDinhHuong.map((item) => (
              <tr key={item.ma_cau} className={item.dang_bat ? '' : 'opacity-50'}>
                <td className="px-3 py-2 font-semibold">{item.ma_cau}</td>
                <td className="px-3 py-2">{item.gan_voi}</td>
                <td className="px-3 py-2">{item.cau}</td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={item.dang_bat}
                    onChange={() =>
                      void dataSource.updateDongHanhCauDinhHuong(item.ma_cau, { dang_bat: !item.dang_bat }).then((updated) =>
                        withSuccess(setState, (current) => ({
                          ...current,
                          cauDinhHuong: current.cauDinhHuong.map((row) => (row.ma_cau === item.ma_cau ? updated : row)),
                        })),
                      )
                    }
                    className="h-4 w-4"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(item)} className="text-xs font-semibold text-blue-700 hover:underline">
                      Sửa
                    </button>
                    <button type="button" onClick={() => void remove(item.ma_cau)} className="text-xs font-semibold text-red-700 hover:underline">
                      Xoá
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <form onSubmit={save} className="grid gap-2 rounded-lg border border-teal-200 bg-teal-100/40 p-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Mã câu
            <input
              value={form.ma_cau}
              disabled={editing !== '__new__'}
              onChange={(event) => setForm((current) => ({ ...current, ma_cau: event.target.value }))}
              placeholder="VD: CDH-06"
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Gắn với (mã danh mục / nhóm che / 'mac_dinh_tot')
            <input
              value={form.gan_voi}
              onChange={(event) => setForm((current) => ({ ...current, gan_voi: event.target.value }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">
            Nội dung câu
            <textarea
              value={form.cau}
              onChange={(event) => setForm((current) => ({ ...current, cau: event.target.value }))}
              className="min-h-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            />
          </label>
          {error ? <p className="text-xs font-semibold text-red-700 sm:col-span-2">{error}</p> : null}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={saving} className="h-9 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button type="button" onClick={cancel} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Huỷ
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={startAdd} className="h-9 rounded-md border border-teal-300 bg-teal-100 px-3 text-sm font-semibold text-teal-700 hover:bg-teal-100">
          + Thêm câu định hướng
        </button>
      )}
    </div>
  )
}

// ===================== Tab: Chi so (chu yeu de xem) =====================

function ChiSoTab({ state }: { state: SuccessState }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
          <tr>
            <th className="px-3 py-2">Mã chỉ số</th>
            <th className="px-3 py-2">Tên hiển thị</th>
            <th className="px-3 py-2">Kiểu</th>
            <th className="px-3 py-2">Mô tả</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {state.chiSo.map((item) => (
            <tr key={item.ma_chi_so}>
              <td className="px-3 py-2 font-mono text-xs font-semibold">{item.ma_chi_so}</td>
              <td className="px-3 py-2">{item.ten_hien_thi}</td>
              <td className="px-3 py-2">{item.kieu}</td>
              <td className="px-3 py-2 text-xs text-slate-500">{item.mo_ta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ===================== Tab: Bac tinh tu =====================

const EMPTY_BAC: BacTinhTu = {
  bac: 0,
  ma: '',
  ten: '',
  icon: '🌟',
  diem_toi_thieu: 0,
  mo_ta: '',
  dang_bat: true,
}

function RankTab({ state, setState }: { state: SuccessState; setState: SetState }) {
  const [form, setForm] = useState<BacTinhTu>(EMPTY_BAC)
  const [editing, setEditing] = useState<number | '__new__' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [diemThuong, setDiemThuong] = useState(
    state.cauHinh.diem_thuong_moi_huy_hieu || String(DIEM_THUONG_MOI_HUY_HIEU_MAC_DINH),
  )
  const [savingDiemThuong, setSavingDiemThuong] = useState(false)

  function startEdit(item: BacTinhTu) {
    setEditing(item.bac)
    setForm(item)
    setError(null)
  }

  function startAdd() {
    setEditing('__new__')
    setForm(EMPTY_BAC)
    setError(null)
  }

  function cancel() {
    setEditing(null)
    setForm(EMPTY_BAC)
    setError(null)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.ma.trim() || !form.ten.trim() || !form.icon.trim() || !form.bac) {
      setError('Cần nhập đủ Bậc (số), Mã, Tên, Icon.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (editing === '__new__') {
        const created = await dataSource.addRankBacTinhTu(form)
        withSuccess(setState, (current) => ({
          ...current,
          rankBac: [...current.rankBac, created].sort((a, b) => a.bac - b.bac),
        }))
      } else if (typeof editing === 'number') {
        const updated = await dataSource.updateRankBacTinhTu(editing, form)
        withSuccess(setState, (current) => ({
          ...current,
          rankBac: current.rankBac.map((item) => (item.bac === editing ? updated : item)),
        }))
      }
      cancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được bậc.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(bac: number) {
    if (!window.confirm(`Xoá bậc ${bac}?`)) return
    try {
      await dataSource.deleteRankBacTinhTu(bac)
      withSuccess(setState, (current) => ({
        ...current,
        rankBac: current.rankBac.filter((item) => item.bac !== bac),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xoá được bậc.')
    }
  }

  async function toggle(item: BacTinhTu) {
    try {
      const updated = await dataSource.updateRankBacTinhTu(item.bac, { dang_bat: !item.dang_bat })
      withSuccess(setState, (current) => ({
        ...current,
        rankBac: current.rankBac.map((row) => (row.bac === item.bac ? updated : row)),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đổi được trạng thái.')
    }
  }

  async function saveDiemThuong(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingDiemThuong(true)
    setError(null)
    try {
      await dataSource.updateDongHanhCauHinh('diem_thuong_moi_huy_hieu', diemThuong)
      withSuccess(setState, (current) => ({
        ...current,
        cauHinh: { ...current.cauHinh, diem_thuong_moi_huy_hieu: diemThuong },
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được điểm thưởng.')
    } finally {
      setSavingDiemThuong(false)
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="rounded-md border border-red-200 bg-red-100 p-2 text-sm font-semibold text-red-700">{error}</p> : null}

      <form onSubmit={saveDiemThuong} className="flex flex-wrap items-end gap-2 rounded-lg border border-amber-200 bg-amber-100/40 p-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Điểm thưởng mỗi huy hiệu đạt trong tuần
          <input
            type="number"
            value={diemThuong}
            onChange={(event) => setDiemThuong(event.target.value)}
            className="h-9 w-32 rounded-md border border-slate-300 bg-white px-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={savingDiemThuong}
          className="h-9 rounded-md bg-amber-700 px-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:bg-slate-400"
        >
          {savingDiemThuong ? 'Đang lưu...' : 'Lưu'}
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-170 text-sm">
          <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Bậc</th>
              <th className="px-3 py-2">Icon</th>
              <th className="px-3 py-2">Tên</th>
              <th className="px-3 py-2">Mã</th>
              <th className="px-3 py-2">Điểm tối thiểu</th>
              <th className="px-3 py-2">Bật</th>
              <th className="px-3 py-2">Sửa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.rankBac.map((item) => (
              <tr key={item.bac} className={item.dang_bat ? '' : 'opacity-50'}>
                <td className="px-3 py-2 font-semibold">{item.bac}</td>
                <td className="px-3 py-2 text-lg">{item.icon}</td>
                <td className="px-3 py-2">{item.ten}</td>
                <td className="px-3 py-2 font-mono text-xs">{item.ma}</td>
                <td className="px-3 py-2">{item.diem_toi_thieu}</td>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={item.dang_bat} onChange={() => void toggle(item)} className="h-4 w-4" />
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(item)} className="text-xs font-semibold text-blue-700 hover:underline">
                      Sửa
                    </button>
                    <button type="button" onClick={() => void remove(item.bac)} className="text-xs font-semibold text-red-700 hover:underline">
                      Xoá
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <form onSubmit={save} className="grid gap-2 rounded-lg border border-teal-200 bg-teal-100/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Bậc (số, càng cao càng mạnh)
            <input
              type="number"
              value={form.bac || ''}
              disabled={editing !== '__new__'}
              onChange={(event) => setForm((current) => ({ ...current, bac: Number(event.target.value) }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Mã (không dấu)
            <input
              value={form.ma}
              onChange={(event) => setForm((current) => ({ ...current, ma: event.target.value }))}
              placeholder="VD: sieu_tan_tinh"
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Tên hiển thị
            <input
              value={form.ten}
              onChange={(event) => setForm((current) => ({ ...current, ten: event.target.value }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Icon (emoji)
            <input
              value={form.icon}
              onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Điểm tối thiểu để đạt bậc này
            <input
              type="number"
              value={form.diem_toi_thieu}
              onChange={(event) => setForm((current) => ({ ...current, diem_toi_thieu: Number(event.target.value) }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 sm:col-span-2 lg:col-span-3">
            Mô tả ngắn
            <input
              value={form.mo_ta || ''}
              onChange={(event) => setForm((current) => ({ ...current, mo_ta: event.target.value }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          {error ? <p className="text-xs font-semibold text-red-700 sm:col-span-2 lg:col-span-4">{error}</p> : null}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={saving} className="h-9 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button type="button" onClick={cancel} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Huỷ
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={startAdd} className="h-9 rounded-md border border-teal-300 bg-teal-100 px-3 text-sm font-semibold text-teal-700 hover:bg-teal-100">
          + Thêm bậc
        </button>
      )}
    </div>
  )
}

// ===================== Tab: Cong thuc diem ren luyen =====================

const EMPTY_THANH_PHAN: DiemCauHinhThanhPhan = {
  ma_thanh_phan: '',
  ten_hien_thi: '',
  loai_tinh: 'tich_luy_danh_muc',
  nhom_diem_lien_ket: 'CC',
  thang_goc_min: 0,
  thang_goc_max: 100,
  he_so_chuan_hoa: 1,
  trong_so: 1,
  bat_buoc: true,
  dang_bat: true,
  thu_tu: 0,
}

const EMPTY_NGUONG: DiemNguongXepLoai = {
  ma_xep_loai: '',
  ten_hien_thi: '',
  diem_toi_thieu: 0,
  thu_tu: 0,
}

const LOAI_TINH_OPTIONS: Array<{ value: LoaiTinhThanhPhanDiem; label: string }> = [
  { value: 'tich_luy_danh_muc', label: 'Tích luỹ danh mục (như CC/VS/NN/KL)' },
  { value: 'trung_binh_diem_so', label: 'Trung bình điểm số (như Học tập)' },
]

const NHOM_DIEM_OPTIONS: NhomDiem[] = ['CC', 'VS', 'NN', 'KL', 'KT']

function DiemCongThucTab({ state, setState }: { state: SuccessState; setState: SetState }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        Pipeline tính điểm cố định trong code (xem <code>scoring.ts</code>), chỉ tham số (trọng số, hệ số chuẩn
        hoá, ngưỡng, có bắt buộc hay không) nằm ở đây — sửa xong <b>Lưu</b> là các trang xem hồ sơ dùng ngay,
        không cần deploy lại. Xem chi tiết công thức ở{' '}
        <code>docs/13-cau-hinh-hoa-cong-thuc-diem-ren-luyen.md</code>.
      </div>

      <ThanhPhanManager state={state} setState={setState} />
      <NguongXepLoaiManager state={state} setState={setState} />
      <HeSoDieuKienManager state={state} setState={setState} />
      <LamTronManager state={state} setState={setState} />
      <DiemPreviewPanel state={state} />
    </div>
  )
}

function ThanhPhanManager({ state, setState }: { state: SuccessState; setState: SetState }) {
  const [form, setForm] = useState<DiemCauHinhThanhPhan>(EMPTY_THANH_PHAN)
  const [editing, setEditing] = useState<string | '__new__' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit(item: DiemCauHinhThanhPhan) {
    setEditing(item.ma_thanh_phan)
    setForm(item)
    setError(null)
  }

  function startAdd() {
    setEditing('__new__')
    setForm(EMPTY_THANH_PHAN)
    setError(null)
  }

  function cancel() {
    setEditing(null)
    setForm(EMPTY_THANH_PHAN)
    setError(null)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.ma_thanh_phan.trim() || !form.ten_hien_thi.trim()) {
      setError('Cần nhập Mã thành phần và Tên hiển thị.')
      return
    }
    if (form.loai_tinh === 'tich_luy_danh_muc' && !form.nhom_diem_lien_ket) {
      setError('Kiểu "Tích luỹ danh mục" cần chọn Nhóm điểm liên kết.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload: DiemCauHinhThanhPhan = {
        ...form,
        nhom_diem_lien_ket: form.loai_tinh === 'trung_binh_diem_so' ? null : form.nhom_diem_lien_ket,
      }
      if (editing === '__new__') {
        const created = await dataSource.addDiemCauHinhThanhPhan(payload)
        withSuccess(setState, (current) => ({
          ...current,
          diemThanhPhan: [...current.diemThanhPhan, created].sort((a, b) => a.thu_tu - b.thu_tu),
        }))
      } else if (typeof editing === 'string') {
        const updated = await dataSource.updateDiemCauHinhThanhPhan(editing, payload)
        withSuccess(setState, (current) => ({
          ...current,
          diemThanhPhan: current.diemThanhPhan.map((item) =>
            item.ma_thanh_phan === editing ? updated : item,
          ),
        }))
      }
      cancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được thành phần.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(maThanhPhan: string) {
    if (!window.confirm(`Xoá thành phần ${maThanhPhan}? Công thức sẽ tự bỏ nó khi tính điểm.`)) return
    try {
      await dataSource.deleteDiemCauHinhThanhPhan(maThanhPhan)
      withSuccess(setState, (current) => ({
        ...current,
        diemThanhPhan: current.diemThanhPhan.filter((item) => item.ma_thanh_phan !== maThanhPhan),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xoá được thành phần.')
    }
  }

  async function toggle(item: DiemCauHinhThanhPhan) {
    try {
      const updated = await dataSource.updateDiemCauHinhThanhPhan(item.ma_thanh_phan, {
        dang_bat: !item.dang_bat,
      })
      withSuccess(setState, (current) => ({
        ...current,
        diemThanhPhan: current.diemThanhPhan.map((row) =>
          row.ma_thanh_phan === item.ma_thanh_phan ? updated : row,
        ),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đổi được trạng thái.')
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-900">Thành phần tham gia công thức</h3>
      {error ? <p className="rounded-md border border-red-200 bg-red-100 p-2 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-220 text-sm">
          <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Mã</th>
              <th className="px-3 py-2">Tên</th>
              <th className="px-3 py-2">Kiểu tính</th>
              <th className="px-3 py-2">Thang gốc</th>
              <th className="px-3 py-2">Hệ số chuẩn hoá</th>
              <th className="px-3 py-2">Trọng số</th>
              <th className="px-3 py-2">Bắt buộc</th>
              <th className="px-3 py-2">Bật</th>
              <th className="px-3 py-2">Sửa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...state.diemThanhPhan]
              .sort((a, b) => a.thu_tu - b.thu_tu)
              .map((item) => (
                <tr key={item.ma_thanh_phan} className={item.dang_bat ? '' : 'opacity-50'}>
                  <td className="px-3 py-2 font-mono text-xs font-semibold">{item.ma_thanh_phan}</td>
                  <td className="px-3 py-2">{item.ten_hien_thi}</td>
                  <td className="px-3 py-2 text-xs">
                    {item.loai_tinh === 'tich_luy_danh_muc' ? `Tích luỹ (${item.nhom_diem_lien_ket})` : 'TB điểm số'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {item.thang_goc_min}–{item.thang_goc_max}
                  </td>
                  <td className="px-3 py-2">×{item.he_so_chuan_hoa}</td>
                  <td className="px-3 py-2">{item.trong_so}</td>
                  <td className="px-3 py-2 text-xs">{item.bat_buoc ? 'Luôn tính' : 'Chỉ khi có dữ liệu'}</td>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={item.dang_bat} onChange={() => void toggle(item)} className="h-4 w-4" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEdit(item)} className="text-xs font-semibold text-blue-700 hover:underline">
                        Sửa
                      </button>
                      <button type="button" onClick={() => void remove(item.ma_thanh_phan)} className="text-xs font-semibold text-red-700 hover:underline">
                        Xoá
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <form onSubmit={save} className="grid gap-2 rounded-lg border border-teal-200 bg-teal-100/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Mã thành phần (không dấu)
            <input
              value={form.ma_thanh_phan}
              disabled={editing !== '__new__'}
              onChange={(event) => setForm((current) => ({ ...current, ma_thanh_phan: event.target.value }))}
              placeholder="VD: DD (đạo đức)"
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Tên hiển thị
            <input
              value={form.ten_hien_thi}
              onChange={(event) => setForm((current) => ({ ...current, ten_hien_thi: event.target.value }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Kiểu tính
            <select
              value={form.loai_tinh}
              onChange={(event) =>
                setForm((current) => ({ ...current, loai_tinh: event.target.value as LoaiTinhThanhPhanDiem }))
              }
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              {LOAI_TINH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {form.loai_tinh === 'tich_luy_danh_muc' ? (
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Nhóm điểm liên kết
              <select
                value={form.nhom_diem_lien_ket || ''}
                onChange={(event) =>
                  setForm((current) => ({ ...current, nhom_diem_lien_ket: event.target.value as NhomDiem }))
                }
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
              >
                {NHOM_DIEM_OPTIONS.map((nhom) => (
                  <option key={nhom} value={nhom}>
                    {nhom}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Thang gốc tối thiểu
            <input
              type="number"
              value={form.thang_goc_min}
              onChange={(event) => setForm((current) => ({ ...current, thang_goc_min: Number(event.target.value) }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Thang gốc tối đa
            <input
              type="number"
              value={form.thang_goc_max}
              onChange={(event) => setForm((current) => ({ ...current, thang_goc_max: Number(event.target.value) }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Hệ số chuẩn hoá (nhân để quy về 0–100 chung)
            <input
              type="number"
              step="0.1"
              value={form.he_so_chuan_hoa}
              onChange={(event) => setForm((current) => ({ ...current, he_so_chuan_hoa: Number(event.target.value) }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Trọng số khi gộp
            <input
              type="number"
              step="0.1"
              value={form.trong_so}
              onChange={(event) => setForm((current) => ({ ...current, trong_so: Number(event.target.value) }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Thứ tự hiển thị
            <input
              type="number"
              value={form.thu_tu}
              onChange={(event) => setForm((current) => ({ ...current, thu_tu: Number(event.target.value) }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={form.bat_buoc}
              onChange={(event) => setForm((current) => ({ ...current, bat_buoc: event.target.checked }))}
              className="h-4 w-4"
            />
            Luôn tính dù tuần đó không có dữ liệu (bắt buộc)
          </label>
          {error ? <p className="text-xs font-semibold text-red-700 sm:col-span-2 lg:col-span-4">{error}</p> : null}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={saving} className="h-9 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button type="button" onClick={cancel} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Huỷ
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={startAdd} className="h-9 rounded-md border border-teal-300 bg-teal-100 px-3 text-sm font-semibold text-teal-700 hover:bg-teal-100">
          + Thêm thành phần
        </button>
      )}
    </div>
  )
}

function NguongXepLoaiManager({ state, setState }: { state: SuccessState; setState: SetState }) {
  const [form, setForm] = useState<DiemNguongXepLoai>(EMPTY_NGUONG)
  const [editing, setEditing] = useState<string | '__new__' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit(item: DiemNguongXepLoai) {
    setEditing(item.ma_xep_loai)
    setForm(item)
    setError(null)
  }

  function startAdd() {
    setEditing('__new__')
    setForm(EMPTY_NGUONG)
    setError(null)
  }

  function cancel() {
    setEditing(null)
    setForm(EMPTY_NGUONG)
    setError(null)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.ma_xep_loai.trim() || !form.ten_hien_thi.trim()) {
      setError('Cần nhập Mã xếp loại và Tên hiển thị.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (editing === '__new__') {
        const created = await dataSource.addDiemNguongXepLoai(form)
        withSuccess(setState, (current) => ({
          ...current,
          diemNguongXepLoai: [...current.diemNguongXepLoai, created].sort((a, b) => a.thu_tu - b.thu_tu),
        }))
      } else if (typeof editing === 'string') {
        const updated = await dataSource.updateDiemNguongXepLoai(editing, form)
        withSuccess(setState, (current) => ({
          ...current,
          diemNguongXepLoai: current.diemNguongXepLoai.map((item) =>
            item.ma_xep_loai === editing ? updated : item,
          ),
        }))
      }
      cancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được ngưỡng xếp loại.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(maXepLoai: string) {
    if (!window.confirm(`Xoá xếp loại ${maXepLoai}?`)) return
    try {
      await dataSource.deleteDiemNguongXepLoai(maXepLoai)
      withSuccess(setState, (current) => ({
        ...current,
        diemNguongXepLoai: current.diemNguongXepLoai.filter((item) => item.ma_xep_loai !== maXepLoai),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xoá được ngưỡng xếp loại.')
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-900">Ngưỡng xếp loại (1 bảng duy nhất, thang 0–100)</h3>
      {error ? <p className="rounded-md border border-red-200 bg-red-100 p-2 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-120 text-sm">
          <thead className="bg-slate-100 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Mã</th>
              <th className="px-3 py-2">Tên hiển thị</th>
              <th className="px-3 py-2">Điểm tối thiểu</th>
              <th className="px-3 py-2">Sửa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...state.diemNguongXepLoai]
              .sort((a, b) => b.thu_tu - a.thu_tu)
              .map((item) => (
                <tr key={item.ma_xep_loai}>
                  <td className="px-3 py-2 font-mono text-xs font-semibold">{item.ma_xep_loai}</td>
                  <td className="px-3 py-2">{item.ten_hien_thi}</td>
                  <td className="px-3 py-2">{item.diem_toi_thieu}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEdit(item)} className="text-xs font-semibold text-blue-700 hover:underline">
                        Sửa
                      </button>
                      <button type="button" onClick={() => void remove(item.ma_xep_loai)} className="text-xs font-semibold text-red-700 hover:underline">
                        Xoá
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <form onSubmit={save} className="grid gap-2 rounded-lg border border-teal-200 bg-teal-100/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Mã xếp loại (không dấu)
            <input
              value={form.ma_xep_loai}
              disabled={editing !== '__new__'}
              onChange={(event) => setForm((current) => ({ ...current, ma_xep_loai: event.target.value }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Tên hiển thị
            <input
              value={form.ten_hien_thi}
              onChange={(event) => setForm((current) => ({ ...current, ten_hien_thi: event.target.value }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Điểm tối thiểu (0–100)
            <input
              type="number"
              value={form.diem_toi_thieu}
              onChange={(event) => setForm((current) => ({ ...current, diem_toi_thieu: Number(event.target.value) }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Thứ tự
            <input
              type="number"
              value={form.thu_tu}
              onChange={(event) => setForm((current) => ({ ...current, thu_tu: Number(event.target.value) }))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            />
          </label>
          {error ? <p className="text-xs font-semibold text-red-700 sm:col-span-2 lg:col-span-4">{error}</p> : null}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={saving} className="h-9 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button type="button" onClick={cancel} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Huỷ
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={startAdd} className="h-9 rounded-md border border-teal-300 bg-teal-100 px-3 text-sm font-semibold text-teal-700 hover:bg-teal-100">
          + Thêm xếp loại
        </button>
      )}
    </div>
  )
}

function HeSoDieuKienManager({ state, setState }: { state: SuccessState; setState: SetState }) {
  const [saving, setSaving] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function save(item: DiemCauHinhHeSoDieuKien, heSo: number) {
    if (item.id === undefined) return
    setSaving(item.id)
    setError(null)
    try {
      const updated = await dataSource.updateDiemCauHinhHeSoDieuKien(item.id, { he_so: heSo })
      withSuccess(setState, (current) => ({
        ...current,
        diemHeSoDieuKien: current.diemHeSoDieuKien.map((row) => (row.id === item.id ? updated : row)),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được hệ số điều kiện.')
    } finally {
      setSaving(null)
    }
  }

  async function toggle(item: DiemCauHinhHeSoDieuKien) {
    if (item.id === undefined) return
    try {
      const updated = await dataSource.updateDiemCauHinhHeSoDieuKien(item.id, { dang_bat: !item.dang_bat })
      withSuccess(setState, (current) => ({
        ...current,
        diemHeSoDieuKien: current.diemHeSoDieuKien.map((row) => (row.id === item.id ? updated : row)),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đổi được trạng thái.')
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-900">Hệ số điều kiện (vd cờ đỏ vi phạm bị trừ điểm gấp đôi)</h3>
      {error ? <p className="rounded-md border border-red-200 bg-red-100 p-2 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="space-y-2">
        {state.diemHeSoDieuKien.map((item) => (
          <div
            key={item.ma_dieu_kien}
            className={`flex flex-wrap items-end gap-2 rounded-lg border border-amber-200 bg-amber-100/40 p-3 ${
              item.dang_bat ? '' : 'opacity-50'
            }`}
          >
            <div className="flex-1 min-w-55">
              <p className="text-sm font-semibold text-slate-800">{item.ten_hien_thi}</p>
              <p className="text-xs text-slate-500">
                Cột điều kiện: <code>{item.dieu_kien_hoc_sinh}</code> ·{' '}
                {item.ma_thanh_phan ? `chỉ áp dụng thành phần ${item.ma_thanh_phan}` : 'áp dụng mọi thành phần'} ·{' '}
                {item.chi_ap_dung_khi_am ? 'chỉ khi điểm bị trừ (âm)' : 'áp dụng cả điểm cộng lẫn trừ'}
              </p>
            </div>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Hệ số nhân
              <input
                type="number"
                step="0.1"
                defaultValue={item.he_so}
                key={`${item.id}-${item.he_so}`}
                onBlur={(event) => {
                  const value = Number(event.target.value)
                  if (!Number.isNaN(value) && value !== item.he_so) void save(item, value)
                }}
                className="h-9 w-24 rounded-md border border-slate-300 bg-white px-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input type="checkbox" checked={item.dang_bat} onChange={() => void toggle(item)} className="h-4 w-4" />
              Bật
            </label>
            {saving === item.id ? <span className="text-xs text-slate-500">Đang lưu...</span> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function LamTronManager({ state, setState }: { state: SuccessState; setState: SetState }) {
  const [value, setValue] = useState(
    state.diemCauHinhChung.lam_tron_so_thap_phan || String(DEFAULT_SO_THAP_PHAN_LAM_TRON),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await dataSource.updateDiemCauHinhChung('lam_tron_so_thap_phan', value)
      withSuccess(setState, (current) => ({
        ...current,
        diemCauHinhChung: { ...current.diemCauHinhChung, lam_tron_so_thap_phan: value },
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được số thập phân làm tròn.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3">
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
        Số chữ số thập phân khi làm tròn điểm xếp loại
        <input
          type="number"
          min={0}
          max={4}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-9 w-32 rounded-md border border-slate-300 bg-white px-2 text-sm"
        />
      </label>
      <button type="submit" disabled={saving} className="h-9 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400">
        {saving ? 'Đang lưu...' : 'Lưu'}
      </button>
      {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
    </form>
  )
}

function DiemPreviewPanel({ state }: { state: SuccessState }) {
  const weeks = sortWeeks(state.weekConfig)
  const [maHs, setMaHs] = useState(state.students[0]?.ma_hs || '')
  const [tuanSo, setTuanSo] = useState(() => selectDefaultWeek(state.weekConfig, state.records))
  const student = state.students.find((item) => item.ma_hs === maHs)

  const score = student
    ? calculateWeeklyStudentScore({
        catalog: state.catalog,
        records: state.records,
        student,
        tuanSo,
        thanhPhanCauHinh: state.diemThanhPhan,
        heSoDieuKienCauHinh: state.diemHeSoDieuKien,
        nguongXepLoai: state.diemNguongXepLoai,
        soThapPhanLamTron: Number(state.diemCauHinhChung.lam_tron_so_thap_phan) || DEFAULT_SO_THAP_PHAN_LAM_TRON,
      })
    : null

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-100/40 p-4">
      <p className="text-xs font-semibold uppercase text-blue-700">Xem thử ngay</p>
      <h3 className="text-base font-bold text-slate-900">Công thức hiện tại (đã lưu) cho ra điểm gì</h3>

      <div className="mt-2 flex flex-wrap gap-2">
        <select
          value={maHs}
          onChange={(event) => setMaHs(event.target.value)}
          className="h-9 min-w-[220px] rounded-md border border-slate-300 bg-white px-2 text-sm"
        >
          {state.students.map((item) => (
            <option key={item.ma_hs} value={item.ma_hs}>
              {item.tt}. {item.ho} {item.ten}
            </option>
          ))}
        </select>
        <select
          value={tuanSo}
          onChange={(event) => setTuanSo(Number(event.target.value))}
          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
        >
          {weeks.map((week) => (
            <option key={week.tuan_so} value={week.tuan_so}>
              Tuần {week.tuan_so}
            </option>
          ))}
        </select>
      </div>

      {score ? (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            {Object.entries(score.thanh_phan).map(([ma, giaTri]) => (
              <span key={ma} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                {ma}: {giaTri}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-600">
            Học tập (hiển thị, thang 0–20): {score.diem_hoc_tap ?? 'Chưa có dữ liệu tuần này'}
          </p>
          <p className="text-base font-bold text-slate-900">
            Điểm xếp loại thi đua: {score.diem_xep_loai_thi_dua} · {score.xep_loai}
            {score.can_canh_bao_ngay ? <span className="ml-2 text-red-700">(có vi phạm nghiêm trọng)</span> : null}
          </p>
        </div>
      ) : null}

      {findWeek(state.weekConfig, tuanSo) ? null : <p className="mt-2 text-xs text-red-600">Không tìm thấy dữ liệu tuần này.</p>}
    </div>
  )
}

// ===================== Xem thu (preview) =====================

function PreviewPanel({ state }: { state: SuccessState }) {
  const weeks = sortWeeks(state.weekConfig)
  const [maHs, setMaHs] = useState(state.students[0]?.ma_hs || '')
  const [tuanSo, setTuanSo] = useState(() => selectDefaultWeek(state.weekConfig, state.records))

  const student = state.students.find((item) => item.ma_hs === maHs)
  const tuanSoTruoc = (() => {
    const index = weeks.findIndex((week) => week.tuan_so === tuanSo)
    return index > 0 ? weeks[index - 1].tuan_so : null
  })()

  const chiSo = student
    ? tinhChiSoTuan({
        attendance: state.attendance,
        catalog: state.catalog,
        maHs: student.ma_hs,
        records: state.records,
        tuanSo,
        tuanSoTruoc,
      })
    : null

  const luatKhop = chiSo ? apDungLuat(chiSo, state.luat) : []
  const huyHieuKhop = chiSo ? apDungHuyHieu(chiSo, state.huyHieu) : []
  const cauDinhHuong = chiSo ? chonCauDinhHuong(luatKhop, state.cauDinhHuong) : null

  const diemThuongMoiHuyHieu = Number(state.cauHinh.diem_thuong_moi_huy_hieu) || DIEM_THUONG_MOI_HUY_HIEU_MAC_DINH
  const score = student
    ? calculateWeeklyStudentScore({ catalog: state.catalog, records: state.records, student, tuanSo })
    : null
  const rank = score
    ? tinhRankTuan(score.diem_xep_loai_thi_dua, huyHieuKhop.length, state.rankBac, diemThuongMoiHuyHieu)
    : null
  const bacTuanTruoc = (() => {
    if (!rank || tuanSoTruoc === null || !student) return null
    const scoreTruoc = calculateWeeklyStudentScore({
      catalog: state.catalog,
      records: state.records,
      student,
      tuanSo: tuanSoTruoc,
    })
    const chiSoTruoc = tinhChiSoTuan({
      attendance: state.attendance,
      catalog: state.catalog,
      maHs: student.ma_hs,
      records: state.records,
      tuanSo: tuanSoTruoc,
      tuanSoTruoc: null,
    })
    const huyHieuTruoc = apDungHuyHieu(chiSoTruoc, state.huyHieu)
    return tinhRankTuan(scoreTruoc.diem_xep_loai_thi_dua, huyHieuTruoc.length, state.rankBac, diemThuongMoiHuyHieu)
      .bacHienTai
  })()

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-100/40 p-4">
      <p className="text-xs font-semibold uppercase text-blue-700">Xem thử ngay</p>
      <h3 className="text-base font-bold text-slate-900">Kiểm tra luật hiện tại cho ra câu gì</h3>

      <div className="mt-2 flex flex-wrap gap-2">
        <select
          value={maHs}
          onChange={(event) => setMaHs(event.target.value)}
          className="h-9 min-w-[220px] rounded-md border border-slate-300 bg-white px-2 text-sm"
        >
          {state.students.map((item) => (
            <option key={item.ma_hs} value={item.ma_hs}>
              {item.tt}. {item.ho} {item.ten}
            </option>
          ))}
        </select>
        <select
          value={tuanSo}
          onChange={(event) => setTuanSo(Number(event.target.value))}
          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
        >
          {weeks.map((week) => (
            <option key={week.tuan_so} value={week.tuan_so}>
              Tuần {week.tuan_so}
            </option>
          ))}
        </select>
      </div>

      {chiSo && student && rank ? (
        <div className="mt-3 space-y-2 text-sm">
          <div className="rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-600">
            Vắng KP: {chiSo.vang_khong_phep} · Vắng CP: {chiSo.vang_co_phep} · Trễ: {chiSo.di_tre} · Lỗi tuần này:{' '}
            {chiSo.so_loi_tuan_nay} · Lỗi tuần trước: {chiSo.so_loi_tuan_truoc} · Xu hướng: {chiSo.xu_huong_loi} · Nghiêm trọng:{' '}
            {chiSo.co_nghiem_trong ? 'Có' : 'Không'}
          </div>

          <TheNhanVatTuan
            bacTuanTruoc={bacTuanTruoc}
            hoTen={`${student.ho} ${student.ten}`}
            huyHieu={huyHieuKhop.map((item) => ({ ma: item.ma_huy_hieu, ten: item.ten_huy_hieu, icon: item.icon || undefined }))}
            rank={rank}
            thangBac={state.rankBac}
            tuanLabel={`Tuần ${tuanSo}`}
            vietTat={student.ten.slice(0, 1).toUpperCase()}
          />

          <div>
            <p className="text-xs font-semibold text-slate-600">Huy hiệu tuần này ({huyHieuKhop.length})</p>
            {huyHieuKhop.length === 0 ? (
              <p className="text-xs text-slate-500">Chưa đạt huy hiệu nào.</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-2">
                {huyHieuKhop.map((item) => (
                  <span key={item.ma_huy_hieu} className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                    {item.icon} {item.ten_huy_hieu}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600">Câu cảnh báo ({luatKhop.length})</p>
            {luatKhop.length === 0 ? (
              <p className="text-xs text-slate-500">Không có cảnh báo nào.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {luatKhop.map(({ luat, cauHienThi }) => (
                  <li key={luat.ma_luat} className="rounded-md border border-slate-200 bg-white p-2 text-xs">
                    <span className="font-semibold">
                      [{luat.ma_luat} · {luat.muc_do}]
                    </span>{' '}
                    {cauHienThi}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600">Câu định hướng</p>
            <p className="text-xs text-slate-700">{cauDinhHuong ? cauDinhHuong.cau : 'Không có câu phù hợp.'}</p>
          </div>
        </div>
      ) : null}

      {findWeek(state.weekConfig, tuanSo) ? null : <p className="mt-2 text-xs text-red-600">Không tìm thấy dữ liệu tuần này.</p>}
    </div>
  )
}

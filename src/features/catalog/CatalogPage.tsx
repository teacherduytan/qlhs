import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { dataSource } from '../../data/client'
import type { DanhMucDiem, NhomDiem, PhamViDanhMuc } from '../../data/types'
import { getBadgeClassForCatalog } from '../scoring/scoreStyles'

type CatalogForm = {
  ma_danh_muc: string
  nhom: NhomDiem
  ten_muc: string
  diem: string
  nghiem_trong: boolean
  pham_vi: PhamViDanhMuc
}

type CatalogSortKey = 'code_asc' | 'group_asc' | 'name_asc' | 'score_asc' | 'score_desc'
type CatalogToneFilter = 'all' | 'positive' | 'violation' | 'neutral'

const GROUP_OPTIONS: Array<{ value: NhomDiem; label: string }> = [
  { value: 'CC', label: 'Chuyên cần' },
  { value: 'VS', label: 'Vệ sinh' },
  { value: 'NN', label: 'Nề nếp' },
  { value: 'KL', label: 'Kỷ luật' },
  { value: 'KT', label: 'Tích cực' },
]

const SCOPE_OPTIONS: Array<{ value: PhamViDanhMuc; label: string }> = [
  { value: 'ca_nhan', label: 'Cá nhân' },
  { value: 'tap_the', label: 'Tập thể' },
  { value: 'to_truc', label: 'Tổ trực' },
]

const EMPTY_FORM: CatalogForm = {
  ma_danh_muc: '',
  nhom: 'NN',
  ten_muc: '',
  diem: '-1',
  nghiem_trong: false,
  pham_vi: 'ca_nhan',
}

const inputClass =
  'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

const selectClass =
  'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

export function CatalogPage() {
  const [catalog, setCatalog] = useState<DanhMucDiem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState<'all' | NhomDiem>('all')
  const [toneFilter, setToneFilter] = useState<CatalogToneFilter>('all')
  const [sortKey, setSortKey] = useState<CatalogSortKey>('code_asc')
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [form, setForm] = useState<CatalogForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deletingCode, setDeletingCode] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    dataSource
      .getPointCatalog()
      .then((rows) => {
        if (!active) return
        setCatalog(rows)
        setLoadError(null)
      })
      .catch((error) => {
        if (!active) return
        setLoadError(error instanceof Error ? error.message : 'Không đọc được danh mục điểm.')
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

  const stats = useMemo(() => {
    return catalog.reduce(
      (acc, item) => {
        if (item.diem > 0) acc.positive += 1
        if (item.diem < 0) acc.violation += 1
        if (item.diem === 0) acc.neutral += 1
        return acc
      },
      { positive: 0, violation: 0, neutral: 0 },
    )
  }, [catalog])

  const visibleCatalog = useMemo(() => {
    const keyword = normalize(query)

    return [...catalog]
      .filter((item) => {
        if (!keyword) return true
        return normalize(`${item.ma_danh_muc} ${item.nhom} ${item.ten_muc} ${item.pham_vi}`).includes(
          keyword,
        )
      })
      .filter((item) => groupFilter === 'all' || item.nhom === groupFilter)
      .filter((item) => {
        if (toneFilter === 'positive') return item.diem > 0
        if (toneFilter === 'violation') return item.diem < 0
        if (toneFilter === 'neutral') return item.diem === 0
        return true
      })
      .sort((left, right) => compareCatalogItems(left, right, sortKey))
  }, [catalog, groupFilter, query, sortKey, toneFilter])

  function openAddForm() {
    setFormMode('add')
    setEditingCode(null)
    setForm(EMPTY_FORM)
    setSaveError(null)
  }

  function openEditForm(item: DanhMucDiem) {
    setFormMode('edit')
    setEditingCode(item.ma_danh_muc)
    setForm({
      ma_danh_muc: item.ma_danh_muc,
      nhom: item.nhom,
      ten_muc: item.ten_muc,
      diem: String(item.diem),
      nghiem_trong: Boolean(item.nghiem_trong),
      pham_vi: item.pham_vi,
    })
    setSaveError(null)
  }

  async function saveCatalogItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveError(null)

    let payload: DanhMucDiem
    try {
      payload = formToCatalogItem(form, editingCode)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Dữ liệu danh mục chưa hợp lệ.')
      return
    }

    setSaving(true)
    try {
      if (formMode === 'add') {
        const created = await dataSource.addPointCatalogItem(payload)
        setCatalog((current) => [...current, created])
        openAddForm()
      } else if (editingCode) {
        const updated = await dataSource.updatePointCatalogItem(editingCode, payload)
        setCatalog((current) =>
          current.map((item) => (item.ma_danh_muc === editingCode ? updated : item)),
        )
        openAddForm()
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Không lưu được danh mục.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCatalogItem(item: DanhMucDiem) {
    const ok = window.confirm(
      `Xóa danh mục ${item.ma_danh_muc} - ${item.ten_muc}? Nếu mã đã có trong GhiNhan, hệ thống sẽ chặn để giữ dữ liệu lịch sử.`,
    )
    if (!ok) return

    setDeletingCode(item.ma_danh_muc)
    try {
      await dataSource.deletePointCatalogItem(item.ma_danh_muc)
      setCatalog((current) => current.filter((row) => row.ma_danh_muc !== item.ma_danh_muc))
      if (editingCode === item.ma_danh_muc) {
        openAddForm()
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Không xóa được danh mục.')
    } finally {
      setDeletingCode(null)
    }
  }

  if (loading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Đang tải danh mục...</div>
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
        {loadError}
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan-700">DanhMucDiem</p>
            <h2 className="text-xl font-bold text-slate-900">Quản lý danh mục vi phạm/tích cực</h2>
            <p className="mt-1 text-sm text-slate-600">
              Tạo nội dung ghi nhận thực tế để Dashboard, Import và tính điểm dùng chung một nguồn.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddForm}
            className="h-10 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-cyan-800"
          >
            Thêm danh mục
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <StatBox label="Tổng danh mục" value={catalog.length} tone="slate" />
          <StatBox label="Tích cực" value={stats.positive} tone="emerald" />
          <StatBox label="Vi phạm" value={stats.violation} tone="red" />
          <StatBox label="Theo dõi" value={stats.neutral} tone="amber" />
        </div>
      </div>

      <form onSubmit={saveCatalogItem} className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-bold text-slate-900">
            {formMode === 'add' ? 'Thêm danh mục mới' : `Sửa danh mục ${editingCode}`}
          </h3>
          <p className="text-sm text-slate-600">
            Điểm dương là ghi nhận tích cực, điểm âm là vi phạm, điểm 0 dùng để theo dõi.
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-6">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-1">
            Mã
            <input
              value={form.ma_danh_muc}
              disabled={formMode === 'edit'}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  ma_danh_muc: event.target.value.toUpperCase(),
                }))
              }
              className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
              placeholder="NN06"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-1">
            Nhóm
            <select
              value={form.nhom}
              onChange={(event) =>
                setForm((current) => ({ ...current, nhom: event.target.value as NhomDiem }))
              }
              className={selectClass}
            >
              {GROUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value} - {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-2">
            Nội dung danh mục
            <input
              value={form.ten_muc}
              onChange={(event) =>
                setForm((current) => ({ ...current, ten_muc: event.target.value }))
              }
              className={inputClass}
              placeholder="Không mang dụng cụ học tập"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-1">
            Điểm
            <input
              value={form.diem}
              type="number"
              step="0.5"
              onChange={(event) =>
                setForm((current) => ({ ...current, diem: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-1">
            Phạm vi
            <select
              value={form.pham_vi}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  pham_vi: event.target.value as PhamViDanhMuc,
                }))
              }
              className={selectClass}
            >
              {SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.nghiem_trong}
              onChange={(event) =>
                setForm((current) => ({ ...current, nghiem_trong: event.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            Vi phạm nghiêm trọng
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            {saveError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {saveError}
              </p>
            ) : null}
            {formMode === 'edit' ? (
              <button
                type="button"
                onClick={openAddForm}
                className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy sửa
              </button>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? 'Đang lưu...' : formMode === 'add' ? 'Lưu danh mục' : 'Cập nhật'}
            </button>
          </div>
        </div>
      </form>

      <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 md:col-span-1">
            Tìm kiếm
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={inputClass}
              placeholder="Mã, nhóm, nội dung..."
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Nhóm
            <select
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value as 'all' | NhomDiem)}
              className={selectClass}
            >
              <option value="all">Tất cả nhóm</option>
              {GROUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value} - {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Loại ghi nhận
            <select
              value={toneFilter}
              onChange={(event) => setToneFilter(event.target.value as CatalogToneFilter)}
              className={selectClass}
            >
              <option value="all">Tất cả</option>
              <option value="positive">Tích cực</option>
              <option value="violation">Vi phạm</option>
              <option value="neutral">Theo dõi</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Sắp xếp
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as CatalogSortKey)}
              className={selectClass}
            >
              <option value="code_asc">Mã A-Z</option>
              <option value="group_asc">Nhóm A-Z</option>
              <option value="name_asc">Nội dung A-Z</option>
              <option value="score_asc">Điểm thấp đến cao</option>
              <option value="score_desc">Điểm cao đến thấp</option>
            </select>
          </label>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-violet-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-violet-100 text-left text-xs font-semibold uppercase text-violet-900">
              <tr>
                <th className="px-3 py-3">Mã</th>
                <th className="px-3 py-3">Nhóm</th>
                <th className="px-3 py-3">Nội dung vi phạm/ghi nhận</th>
                <th className="px-3 py-3">Loại</th>
                <th className="px-3 py-3 text-right">Điểm</th>
                <th className="px-3 py-3">Phạm vi</th>
                <th className="px-3 py-3">Mức</th>
                <th className="px-3 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleCatalog.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">
                    Chưa có danh mục phù hợp bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                visibleCatalog.map((item) => (
                  <tr key={item.ma_danh_muc} className="align-top hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getBadgeClassForCatalog(
                          item,
                        )}`}
                      >
                        {item.ma_danh_muc}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-700">
                      {item.nhom} - {labelGroup(item.nhom)}
                    </td>
                    <td className="max-w-md px-3 py-3 text-slate-800">{item.ten_muc}</td>
                    <td className="px-3 py-3">
                      <ToneBadge item={item} />
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-bold ${
                        item.diem < 0
                          ? 'text-red-700'
                          : item.diem > 0
                            ? 'text-emerald-700'
                            : 'text-slate-600'
                      }`}
                    >
                      {formatScore(item.diem)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{labelScope(item.pham_vi)}</td>
                    <td className="px-3 py-3">
                      {item.nghiem_trong ? (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                          Nghiêm trọng
                        </span>
                      ) : (
                        <span className="text-slate-500">Thông thường</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(item)}
                          className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCatalogItem(item)}
                          disabled={deletingCode === item.ma_danh_muc}
                          className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
                        >
                          {deletingCode === item.ma_danh_muc ? 'Đang xóa' : 'Xóa'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function StatBox({
  label,
  tone,
  value,
}: {
  label: string
  tone: 'slate' | 'emerald' | 'red' | 'amber'
  value: number
}) {
  const toneClass = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    slate: 'border-slate-200 bg-white text-slate-800',
  }[tone]

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

function ToneBadge({ item }: { item: DanhMucDiem }) {
  if (item.diem > 0) {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
        Tích cực
      </span>
    )
  }

  if (item.diem < 0) {
    return (
      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
        Vi phạm
      </span>
    )
  }

  return (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
      Theo dõi
    </span>
  )
}

function formToCatalogItem(form: CatalogForm, fixedCode: string | null): DanhMucDiem {
  const code = (fixedCode || form.ma_danh_muc).trim().toUpperCase()
  const name = form.ten_muc.trim()
  const point = Number(form.diem)

  if (!code) {
    throw new Error('Cần nhập mã danh mục.')
  }

  if (!/^[A-Z0-9_-]+$/.test(code)) {
    throw new Error('Mã chỉ nên dùng chữ in hoa, số, dấu gạch ngang hoặc gạch dưới.')
  }

  if (!name) {
    throw new Error('Cần nhập nội dung danh mục.')
  }

  if (Number.isNaN(point)) {
    throw new Error('Điểm danh mục chưa hợp lệ.')
  }

  return {
    ma_danh_muc: code,
    nhom: form.nhom,
    ten_muc: name,
    diem: point,
    nghiem_trong: form.nghiem_trong,
    pham_vi: form.pham_vi,
  }
}

function compareCatalogItems(
  left: DanhMucDiem,
  right: DanhMucDiem,
  sortKey: CatalogSortKey,
): number {
  if (sortKey === 'group_asc') {
    return `${left.nhom}-${left.ma_danh_muc}`.localeCompare(`${right.nhom}-${right.ma_danh_muc}`)
  }

  if (sortKey === 'name_asc') {
    return left.ten_muc.localeCompare(right.ten_muc)
  }

  if (sortKey === 'score_asc') {
    return left.diem - right.diem || left.ma_danh_muc.localeCompare(right.ma_danh_muc)
  }

  if (sortKey === 'score_desc') {
    return right.diem - left.diem || left.ma_danh_muc.localeCompare(right.ma_danh_muc)
  }

  return left.ma_danh_muc.localeCompare(right.ma_danh_muc)
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function labelGroup(value: NhomDiem): string {
  return GROUP_OPTIONS.find((option) => option.value === value)?.label || value
}

function labelScope(value: PhamViDanhMuc): string {
  return SCOPE_OPTIONS.find((option) => option.value === value)?.label || value
}

function formatScore(value: number): string {
  if (value > 0) return `+${value}`
  return String(value)
}

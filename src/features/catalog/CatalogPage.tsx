import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type { DanhMucDiem, DanhMucXuLy, GhiNhan, HocSinh, NhomDiem, PhamViDanhMuc } from '../../data/types'
import { getBadgeClassForCatalog } from '../scoring/scoreStyles'

type CatalogForm = {
  ma_danh_muc: string
  nhom: NhomDiem
  ten_muc: string
  diem: string
  nghiem_trong: boolean
  pham_vi: PhamViDanhMuc
  mo_ta: string
  de_xuat_xu_ly: string
  ma_xu_ly_de_xuat: string
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
  mo_ta: '',
  de_xuat_xu_ly: '',
  ma_xu_ly_de_xuat: '',
}

const inputClass =
  'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

const selectClass =
  'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

export function CatalogPage() {
  const [searchParams] = useSearchParams()
  const [catalog, setCatalog] = useState<DanhMucDiem[]>([])
  const [handlingCatalog, setHandlingCatalog] = useState<DanhMucXuLy[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState<'all' | NhomDiem>('all')
  const [toneFilter, setToneFilter] = useState<CatalogToneFilter>('all')
  const [sortKey, setSortKey] = useState<CatalogSortKey>('code_asc')
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null)
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [form, setForm] = useState<CatalogForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [creatingHandling, setCreatingHandling] = useState(false)
  const [deletingCode, setDeletingCode] = useState<string | null>(null)
  const [students, setStudents] = useState<HocSinh[]>([])
  const [records, setRecords] = useState<GhiNhan[]>([])
  const [selectedCatalogCode, setSelectedCatalogCode] = useState<string | null>(null)
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set())
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const linkedCode = (searchParams.get('ma') || '').trim().toUpperCase()

  useEffect(() => {
    let active = true

    Promise.all([
      dataSource.getPointCatalog(),
      dataSource.getRecords(),
      dataSource.getStudents(),
      dataSource.getHandlingCatalog(),
    ])
      .then(([catalogRows, recordRows, studentRows, handlingRows]) => {
        if (!active) return
        setCatalog(catalogRows)
        setRecords(recordRows)
        setStudents(studentRows)
        setHandlingCatalog(handlingRows)
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

  useEffect(() => {
    if (!linkedCode) return
    setQuery(linkedCode)
    setGroupFilter('all')
    setToneFilter('all')
    setSortKey('code_asc')
    setSelectedCatalogCode(linkedCode)
  }, [linkedCode])

  useEffect(() => {
    setSelectedRecordIds((current) => {
      const activeIds = new Set(records.map((record) => record.ma_ghi_nhan).filter(Boolean))
      const next = new Set([...current].filter((id) => activeIds.has(id)))
      return next.size === current.size ? current : next
    })
  }, [records])

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
        return normalize(
          `${item.ma_danh_muc} ${item.nhom} ${item.ten_muc} ${item.pham_vi} ${item.mo_ta || ''} ${
            item.de_xuat_xu_ly || ''
          }`,
        ).includes(keyword)
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

  const recordCountByCatalogCode = useMemo(() => {
    const counts = new Map<string, number>()

    records.forEach((record) => {
      if (!record.ma_danh_muc) return
      counts.set(record.ma_danh_muc, (counts.get(record.ma_danh_muc) || 0) + 1)
    })

    return counts
  }, [records])

  const studentByCode = useMemo(() => {
    return new Map(students.map((student) => [student.ma_hs, student]))
  }, [students])

  const selectedCatalogItem = useMemo(() => {
    if (!selectedCatalogCode) return null
    return catalog.find((item) => item.ma_danh_muc === selectedCatalogCode) || null
  }, [catalog, selectedCatalogCode])

  const selectedCatalogRecords = useMemo(() => {
    if (!selectedCatalogCode) return []

    return records
      .filter((record) => record.ma_danh_muc === selectedCatalogCode)
      .sort(compareRecordsNewest)
  }, [records, selectedCatalogCode])

  const selectableRecordIds = useMemo(() => {
    return selectedCatalogRecords
      .map((record) => record.ma_ghi_nhan)
      .filter((id): id is string => Boolean(id))
  }, [selectedCatalogRecords])

  const selectedCount = useMemo(() => {
    return selectableRecordIds.filter((id) => selectedRecordIds.has(id)).length
  }, [selectableRecordIds, selectedRecordIds])

  const allSelected = selectableRecordIds.length > 0 && selectedCount === selectableRecordIds.length

  useEffect(() => {
    if (!selectedCatalogItem) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeLinkedRecords()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedCatalogItem])

  useEffect(() => {
    if (!formMode) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [formMode])

  function openAddForm() {
    setFormMode('add')
    setEditingCode(null)
    setForm(createCatalogFormForGroup(EMPTY_FORM.nhom, catalog))
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
      mo_ta: item.mo_ta || '',
      de_xuat_xu_ly: item.de_xuat_xu_ly || '',
      ma_xu_ly_de_xuat: item.ma_xu_ly_de_xuat || '',
    })
    setSaveError(null)
  }

  function closeForm() {
    setFormMode(null)
    setEditingCode(null)
    setForm(EMPTY_FORM)
    setSaveError(null)
  }

  function changeCatalogGroup(group: NhomDiem) {
    setForm((current) => ({
      ...current,
      nhom: group,
      ma_danh_muc: formMode === 'add' ? nextCodeForGroup(group, catalog) : current.ma_danh_muc,
    }))
  }

  function applySuggestedHandling() {
    setForm((current) => ({
      ...current,
      de_xuat_xu_ly: suggestCatalogHandling(current),
    }))
  }

  async function createHandlingFromForm() {
    const content = form.de_xuat_xu_ly.trim()
    if (!content) {
      setSaveError('Cần có nội dung đề xuất xử lý/phạt trước khi tạo mã xử lý.')
      return
    }

    const item: DanhMucXuLy = {
      ma_xu_ly: nextHandlingCode(handlingCatalog),
      ten_xu_ly: `Xử lý: ${form.ten_muc.trim() || form.ma_danh_muc || 'danh mục mới'}`,
      noi_dung_xu_ly: content,
      muc_do: inferHandlingLevel(form),
      ghi_chu: form.ten_muc.trim() ? `Tạo từ danh mục ${form.ten_muc.trim()}` : 'Tạo từ form danh mục',
    }

    setCreatingHandling(true)
    setSaveError(null)
    try {
      const created = await dataSource.addHandlingCatalogItem(item)
      setHandlingCatalog((current) => [...current, created].sort(compareHandlingItems))
      setForm((current) => ({ ...current, ma_xu_ly_de_xuat: created.ma_xu_ly }))
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Không tạo được mã xử lý/phạt.')
    } finally {
      setCreatingHandling(false)
    }
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

    const duplicatedCode = catalog.some(
      (item) =>
        item.ma_danh_muc.trim().toUpperCase() === payload.ma_danh_muc &&
        item.ma_danh_muc.trim().toUpperCase() !== (editingCode || '').trim().toUpperCase(),
    )
    if (duplicatedCode) {
      setSaveError(`Mã ${payload.ma_danh_muc} đã tồn tại trong DanhMucDiem. Hãy chọn mã khác.`)
      return
    }

    setSaving(true)
    try {
      if (formMode === 'add') {
        const created = await dataSource.addPointCatalogItem(payload)
        setCatalog((current) => [...current, created])
        closeForm()
      } else if (editingCode) {
        const updated = await dataSource.updatePointCatalogItem(editingCode, payload)
        setCatalog((current) =>
          current.map((item) => (item.ma_danh_muc === editingCode ? updated : item)),
        )
        closeForm()
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
        closeForm()
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Không xóa được danh mục.')
    } finally {
      setDeletingCode(null)
    }
  }

  function openLinkedRecords(item: DanhMucDiem) {
    setSelectedCatalogCode(item.ma_danh_muc)
    setSelectedRecordIds(new Set())
  }

  function closeLinkedRecords() {
    setSelectedCatalogCode(null)
    setSelectedRecordIds(new Set())
  }

  function toggleRecordSelection(recordId: string) {
    setSelectedRecordIds((current) => {
      const next = new Set(current)
      if (next.has(recordId)) {
        next.delete(recordId)
      } else {
        next.add(recordId)
      }
      return next
    })
  }

  function toggleAllRecords() {
    if (allSelected) {
      setSelectedRecordIds(new Set())
      return
    }

    setSelectedRecordIds(new Set(selectableRecordIds))
  }

  async function deleteLinkedRecord(record: GhiNhan) {
    if (!record.ma_ghi_nhan) {
      window.alert('Ghi nháº­n nÃ y chÆ°a cÃ³ ma_ghi_nhan nÃªn chÆ°a thá»ƒ xoÃ¡ tá»± Ä‘á»™ng.')
      return
    }

    const student = record.ma_hs ? studentByCode.get(record.ma_hs) : undefined
    const studentName = student ? `${student.ho} ${student.ten}` : record.ma_hs || 'dÃ²ng khÃ´ng cÃ³ há»c sinh'
    const ok = window.confirm(
      `XoÃ¡ ghi nháº­n ${record.ma_ghi_nhan} khá»i danh má»¥c ${record.ma_danh_muc}? Há»c sinh/danh má»¥c váº«n giá»¯ nguyÃªn, chá»‰ xoÃ¡ dÃ²ng GhiNhan cá»§a ${studentName}.`,
    )
    if (!ok) return

    setDeletingRecordId(record.ma_ghi_nhan)
    try {
      await dataSource.deleteRecord(record.ma_ghi_nhan)
      removeRecordsFromState([record.ma_ghi_nhan])
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'KhÃ´ng xoÃ¡ Ä‘Æ°á»£c ghi nháº­n.')
    } finally {
      setDeletingRecordId(null)
    }
  }

  async function deleteSelectedLinkedRecords() {
    const ids = selectableRecordIds.filter((id) => selectedRecordIds.has(id))
    if (ids.length === 0) return

    const ok = window.confirm(
      `XoÃ¡ ${ids.length} dÃ²ng ghi nháº­n khá»i danh má»¥c ${selectedCatalogCode}? Há»c sinh vÃ  danh má»¥c khÃ´ng bá»‹ xoÃ¡, chá»‰ xoÃ¡ cÃ¡c dÃ²ng GhiNhan Ä‘ang chá»n.`,
    )
    if (!ok) return

    setBulkDeleting(true)
    try {
      await Promise.all(ids.map((id) => dataSource.deleteRecord(id)))
      removeRecordsFromState(ids)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'KhÃ´ng xoÃ¡ Ä‘Æ°á»£c cÃ¡c ghi nháº­n Ä‘Ã£ chá»n.')
    } finally {
      setBulkDeleting(false)
    }
  }

  function removeRecordsFromState(recordIds: string[]) {
    const ids = new Set(recordIds)
    setRecords((current) => current.filter((record) => !record.ma_ghi_nhan || !ids.has(record.ma_ghi_nhan)))
    setSelectedRecordIds((current) => {
      const next = new Set(current)
      ids.forEach((id) => next.delete(id))
      return next
    })
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

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase text-indigo-700">DanhMucXuLy</p>
          <h3 className="text-base font-bold text-slate-900">Danh mục đề xuất xử lý/phạt</h3>
          <p className="text-sm text-slate-600">
            Các mã này được gắn vào DanhMucDiem để tái sử dụng cùng một cách xử lý cho nhiều loại vi phạm.
          </p>
        </div>

        <div className="mt-3 overflow-x-auto rounded-lg border border-indigo-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-indigo-100 text-left text-xs font-semibold uppercase text-indigo-900">
              <tr>
                <th className="px-3 py-2">Mã</th>
                <th className="px-3 py-2">Tên xử lý</th>
                <th className="px-3 py-2">Mức</th>
                <th className="px-3 py-2">Nội dung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {handlingCatalog.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                    Chưa có mã xử lý/phạt. Mở thêm/sửa danh mục và bấm "Tạo mã xử lý" để tạo mã đầu tiên.
                  </td>
                </tr>
              ) : (
                [...handlingCatalog].sort(compareHandlingItems).map((item) => (
                  <tr key={item.ma_xu_ly} className="align-top">
                    <td className="px-3 py-2 font-mono font-bold text-indigo-800">{item.ma_xu_ly}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{item.ten_xu_ly}</td>
                    <td className="px-3 py-2 text-slate-700">{labelHandlingLevel(item.muc_do)}</td>
                    <td className="max-w-xl whitespace-pre-line px-3 py-2 text-slate-700">
                      {item.noi_dung_xu_ly}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {false ? (
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
              onChange={(event) => changeCatalogGroup(event.target.value as NhomDiem)}
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
      ) : null}

      {formMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={saveCatalogItem}
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-form-title"
            className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h3 id="catalog-form-title" className="text-lg font-bold text-slate-900">
                  {formMode === 'add' ? 'Thêm danh mục mới' : `Sửa danh mục ${editingCode}`}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Điểm dương là ghi nhận tích cực, điểm âm là vi phạm, điểm 0 dùng để theo dõi.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <div className="max-h-[calc(90vh-150px)] overflow-y-auto px-5 py-4">
              <div className="grid gap-3 md:grid-cols-6">
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
                    onChange={(event) => changeCatalogGroup(event.target.value as NhomDiem)}
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

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Mô tả / ví dụ áp dụng
                  <textarea
                    value={form.mo_ta}
                    onChange={(event) => setForm((current) => ({ ...current, mo_ta: event.target.value }))}
                    className="min-h-24 resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Ví dụ: Không thuộc 1 từ, một ý nhỏ, một đoạn ngắn; giáo viên ghi rõ phần chưa thuộc."
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  Đề xuất xử lý / phạt
                  <textarea
                    value={form.de_xuat_xu_ly}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, de_xuat_xu_ly: event.target.value }))
                    }
                    className="min-h-24 resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Ví dụ: Lần 1: chép 20 lần/từ; lần 2: chép 50 lần và báo GVCN; lần 3: mời phụ huynh."
                  />
                </label>
              </div>

              <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Mã xử lý/phạt liên kết
                    <select
                      value={form.ma_xu_ly_de_xuat}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, ma_xu_ly_de_xuat: event.target.value }))
                      }
                      className={selectClass}
                    >
                      <option value="">Chưa chọn mã xử lý</option>
                      {[...handlingCatalog].sort(compareHandlingItems).map((item) => (
                        <option key={item.ma_xu_ly} value={item.ma_xu_ly}>
                          {item.ma_xu_ly} - {item.ten_xu_ly}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void createHandlingFromForm()}
                    disabled={creatingHandling || !form.de_xuat_xu_ly.trim()}
                    className="h-10 rounded-md bg-indigo-700 px-3 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {creatingHandling ? 'Đang tạo...' : 'Tạo mã xử lý'}
                  </button>
                </div>

                {form.ma_xu_ly_de_xuat ? (
                  <p className="mt-2 text-xs text-indigo-900">
                    Đang liên kết với mã {form.ma_xu_ly_de_xuat}. Nội dung text ở ô trên vẫn được giữ để đọc nhanh.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-indigo-900">
                    Có thể chọn mã đã có hoặc tạo mã mới từ nội dung AI/gợi ý xử lý hiện tại.
                  </p>
                )}
              </div>

              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-amber-900">
                    Với danh mục điểm âm, có thể dùng gợi ý xử lý theo mức lặp lại rồi chỉnh lại cho đúng thực tế lớp.
                  </p>
                  <button
                    type="button"
                    onClick={applySuggestedHandling}
                    className="h-9 rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Gợi ý xử lý
                  </button>
                </div>
              </div>

              <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
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

              {saveError ? (
                <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {saveError}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={closeForm}
                className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? 'Đang lưu...' : formMode === 'add' ? 'Lưu danh mục' : 'Cập nhật'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
        {linkedCode ? (
          <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
            Đang xem danh mục liên kết: {linkedCode}
          </div>
        ) : null}
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
                <th className="px-3 py-3 text-right">Đang gắn</th>
                <th className="px-3 py-3 text-right">Điểm</th>
                <th className="px-3 py-3">Phạm vi</th>
                <th className="px-3 py-3">Mức</th>
                <th className="px-3 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleCatalog.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-sm text-slate-500">
                    Chưa có danh mục phù hợp bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                visibleCatalog.map((item) => (
                  <tr
                    key={item.ma_danh_muc}
                    id={`catalog-${item.ma_danh_muc}`}
                    className={`align-top hover:bg-slate-50 ${
                      item.ma_danh_muc === linkedCode || item.ma_danh_muc === selectedCatalogCode
                        ? 'bg-blue-50 ring-2 ring-inset ring-blue-300'
                        : ''
                    }`}
                  >
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
                    <td className="max-w-md px-3 py-3 text-slate-800">
                      <p className="font-semibold">{item.ten_muc}</p>
                      {item.mo_ta ? <p className="mt-1 text-xs text-slate-600">{item.mo_ta}</p> : null}
                      {item.de_xuat_xu_ly ? (
                        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                          <span className="font-semibold">Đề xuất xử lý:</span> {item.de_xuat_xu_ly}
                        </p>
                      ) : null}
                      {item.ma_xu_ly_de_xuat ? (
                        <p className="mt-2 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-900">
                          <span className="font-semibold">Mã xử lý:</span> {item.ma_xu_ly_de_xuat}
                          {getHandlingTitle(item.ma_xu_ly_de_xuat, handlingCatalog)
                            ? ` - ${getHandlingTitle(item.ma_xu_ly_de_xuat, handlingCatalog)}`
                            : ''}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <ToneBadge item={item} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openLinkedRecords(item)}
                        className="rounded-md border border-violet-200 bg-white px-2 py-1 text-xs font-bold text-violet-700 hover:bg-violet-50"
                      >
                        {recordCountByCatalogCode.get(item.ma_danh_muc) || 0} dòng
                      </button>
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
                          onClick={() => openLinkedRecords(item)}
                          className="rounded-md border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                        >
                          Xem HS
                        </button>
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

        {selectedCatalogItem ? (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 px-3 py-6 sm:px-6"
            onClick={closeLinkedRecords}
          >
            <section
              className="flex max-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col rounded-lg border border-rose-200 bg-rose-50 p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-rose-700">Học sinh đang gắn danh mục</p>
                <h3 className="mt-1 text-base font-bold text-slate-900">
                  {selectedCatalogItem.ma_danh_muc} - {selectedCatalogItem.ten_muc}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Xoá ở đây là xoá dòng GhiNhan liên kết, không xoá học sinh và không xoá danh mục.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={closeLinkedRecords}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={toggleAllRecords}
                  disabled={selectableRecordIds.length === 0}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {allSelected ? 'Bỏ chọn tất cả' : `Chọn ${selectableRecordIds.length} dòng`}
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedLinkedRecords}
                  disabled={selectedCount === 0 || bulkDeleting}
                  className="h-10 rounded-md bg-red-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {bulkDeleting ? 'Đang xoá...' : `Xoá đã chọn (${selectedCount})`}
                </button>
              </div>
            </div>

            <div className="mt-4 max-h-[65vh] overflow-auto rounded-lg border border-rose-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-rose-100 text-left text-xs font-semibold uppercase text-rose-900">
                  <tr>
                    <th className="w-12 px-3 py-3">Chọn</th>
                    <th className="px-3 py-3">Học sinh</th>
                    <th className="px-3 py-3">Ngày/tuần</th>
                    <th className="px-3 py-3">Nội dung</th>
                    <th className="px-3 py-3 text-right">Điểm</th>
                    <th className="px-3 py-3">Nguồn</th>
                    <th className="px-3 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedCatalogRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                        Danh mục này chưa gắn với học sinh hoặc ghi nhận nào.
                      </td>
                    </tr>
                  ) : (
                    selectedCatalogRecords.map((record, index) => {
                      const student = record.ma_hs ? studentByCode.get(record.ma_hs) : undefined
                      const recordId = record.ma_ghi_nhan || ''

                      return (
                        <tr key={record.ma_ghi_nhan || `${record.ngay}-${index}`} className="align-top">
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={Boolean(recordId && selectedRecordIds.has(recordId))}
                              disabled={!recordId || bulkDeleting}
                              onChange={() => recordId && toggleRecordSelection(recordId)}
                              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="min-w-44 px-3 py-3">
                            {student ? (
                              <Link
                                to={`/quan-ly/hoc-sinh/${encodeURIComponent(student.ma_hs)}`}
                                className="font-semibold text-blue-700 hover:underline"
                              >
                                {student.ho} {student.ten}
                              </Link>
                            ) : (
                              <span className="font-semibold text-slate-700">
                                {record.ma_hs || 'Không gắn học sinh'}
                              </span>
                            )}
                            <div className="mt-1 font-mono text-xs text-slate-500">
                              {record.ma_ghi_nhan || 'Chưa có ma_ghi_nhan'}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                            <div className="font-semibold">{formatDate(record.ngay)}</div>
                            <div className="text-xs text-slate-500">Tuần {record.tuan_so || '-'}</div>
                          </td>
                          <td className="min-w-72 px-3 py-3">
                            <div className="font-semibold text-slate-900">
                              {record.noi_dung || record.ly_do || selectedCatalogItem.ten_muc}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {labelRecordType(record.loai)}
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
                              onClick={() => deleteLinkedRecord(record)}
                              disabled={!record.ma_ghi_nhan || deletingRecordId === record.ma_ghi_nhan || bulkDeleting}
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
          </div>
        ) : null}
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

function createCatalogFormForGroup(group: NhomDiem, catalog: DanhMucDiem[]): CatalogForm {
  return {
    ...EMPTY_FORM,
    nhom: group,
    ma_danh_muc: nextCodeForGroup(group, catalog),
  }
}

function nextCodeForGroup(group: NhomDiem, catalog: DanhMucDiem[]): string {
  const existingCodes = new Set(catalog.map((item) => item.ma_danh_muc.trim().toUpperCase()))
  const maxNumber = catalog.reduce((max, item) => {
    const code = item.ma_danh_muc.trim().toUpperCase()
    if (!code.startsWith(group)) return max

    const match = code.slice(group.length).match(/^(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)

  let nextNumber = maxNumber + 1
  let candidate = `${group}${String(nextNumber).padStart(2, '0')}`
  while (existingCodes.has(candidate)) {
    nextNumber += 1
    candidate = `${group}${String(nextNumber).padStart(2, '0')}`
  }

  return candidate
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
    mo_ta: form.mo_ta.trim() || null,
    de_xuat_xu_ly: form.de_xuat_xu_ly.trim() || null,
    ma_xu_ly_de_xuat: form.ma_xu_ly_de_xuat.trim() || null,
  }
}

function nextHandlingCode(catalog: DanhMucXuLy[]): string {
  const existingCodes = new Set(catalog.map((item) => item.ma_xu_ly.trim().toUpperCase()))
  const maxNumber = catalog.reduce((max, item) => {
    const code = item.ma_xu_ly.trim().toUpperCase()
    const match = code.match(/^XL(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)

  let nextNumber = maxNumber + 1
  let candidate = `XL${String(nextNumber).padStart(2, '0')}`
  while (existingCodes.has(candidate)) {
    nextNumber += 1
    candidate = `XL${String(nextNumber).padStart(2, '0')}`
  }

  return candidate
}

function inferHandlingLevel(form: CatalogForm): DanhMucXuLy['muc_do'] {
  const point = Number(form.diem)
  if (point > 0 || form.nhom === 'KT') return 'tich_cuc'
  if (form.nghiem_trong || point <= -10) return 'nang'
  if (point <= -5) return 'vua'
  return 'nhe'
}

function compareHandlingItems(left: DanhMucXuLy, right: DanhMucXuLy): number {
  return left.ma_xu_ly.localeCompare(right.ma_xu_ly)
}

function labelHandlingLevel(value: DanhMucXuLy['muc_do']): string {
  if (value === 'nhe') return 'Nhẹ'
  if (value === 'nang') return 'Nặng'
  if (value === 'tich_cuc') return 'Tích cực'
  return 'Vừa'
}

function getHandlingTitle(code: string, catalog: DanhMucXuLy[]): string {
  return catalog.find((item) => item.ma_xu_ly === code)?.ten_xu_ly || ''
}

function suggestCatalogHandling(form: CatalogForm): string {
  const point = Number(form.diem)
  const normalizedName = normalize(form.ten_muc)

  if (normalizedName.includes('khong thuoc bai')) {
    return [
      'Lần 1: nhắc nhở, ghi rõ phần không thuộc; nếu không thuộc 1 từ/1 ý nhỏ thì chép 20 lần nội dung đó.',
      'Lần 2: chép phạt 50 lần phần chưa thuộc, trừ điểm nội bộ theo danh mục.',
      'Lần 3: viết kiểm điểm và báo phụ huynh.',
      'Tái phạm nhiều lần: mời phụ huynh trao đổi biện pháp học bài tại nhà.',
    ].join('\n')
  }

  if (normalizedName.includes('dung cu') || normalizedName.includes('sgk') || normalizedName.includes('may tinh')) {
    return [
      'Lần 1: nhắc nhở, yêu cầu bổ sung dụng cụ ở tiết sau.',
      'Lần 2: đóng 10k quỹ lớp hoặc chép phạt 50 lần nội quy chuẩn bị bài.',
      'Lần 3: viết kiểm điểm và báo phụ huynh.',
      'Tái phạm nhiều lần: mời phụ huynh phối hợp chuẩn bị dụng cụ học tập.',
    ].join('\n')
  }

  if (point < 0) {
    return [
      'Lần 1: nhắc nhở riêng, ghi nhận vào hệ thống.',
      'Lần 2: chép phạt 50 lần nội dung liên quan hoặc đóng 10k quỹ lớp theo quy ước lớp.',
      'Lần 3: viết kiểm điểm, báo phụ huynh.',
      'Tái phạm nhiều lần hoặc nghiêm trọng: mời phụ huynh làm việc với GVCN.',
    ].join('\n')
  }

  if (point > 0) {
    return 'Ghi nhận tích cực, cộng điểm nội bộ; nếu lặp lại nhiều lần có thể tuyên dương trước lớp hoặc trong tổng kết tuần.'
  }

  return 'Theo dõi thêm; giáo viên quyết định nhắc nhở hoặc chuyển thành vi phạm/tích cực nếu sự việc lặp lại.'
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

function compareRecordsNewest(left: GhiNhan, right: GhiNhan): number {
  return (
    String(right.ngay || '').localeCompare(String(left.ngay || '')) ||
    (right.tuan_so || 0) - (left.tuan_so || 0) ||
    String(right.ma_ghi_nhan || '').localeCompare(String(left.ma_ghi_nhan || ''))
  )
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

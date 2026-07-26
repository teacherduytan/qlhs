import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type { BuoiDiemDanh, HinhThucLienLacPhuHuynh, LienLacPhuHuynh } from '../../data/types'
import { Pagination, usePagination } from '../../components/Pagination'

const CONTACT_LABELS: Record<HinhThucLienLacPhuHuynh, string> = {
  dien_thoai: 'Điện thoại trực tiếp',
  goi_zalo: 'Gọi Zalo',
  nhan_tin_zalo: 'Nhắn tin Zalo',
  sms: 'SMS',
}

const CONTACT_OPTIONS: Array<{ label: string; value: HinhThucLienLacPhuHuynh }> = [
  { label: 'Điện thoại trực tiếp', value: 'dien_thoai' },
  { label: 'Gọi Zalo', value: 'goi_zalo' },
  { label: 'Nhắn tin Zalo', value: 'nhan_tin_zalo' },
  { label: 'SMS', value: 'sms' },
]

type EditForm = {
  hinh_thuc: HinhThucLienLacPhuHuynh
  noi_dung: string
}

const SESSION_LABELS: Record<BuoiDiemDanh | 'ca_ngay', string> = {
  chieu: 'Chiều',
  ca_ngay: 'Cả ngày',
  sang: 'Sáng',
}

export function ParentContactHistoryPage() {
  const [searchParams] = useSearchParams()
  const [history, setHistory] = useState<LienLacPhuHuynh[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ hinh_thuc: 'dien_thoai', noi_dung: '' })
  const [savingId, setSavingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    dataSource
      .getParentContactHistory()
      .then((rows) => {
        if (active) setHistory(rows)
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Không tải được lịch sử liên lạc.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return history.filter((item) => {
      if (keyword) {
        const haystack = `${item.ho_ten || ''} ${item.ma_hs || ''}`.toLowerCase()
        if (!haystack.includes(keyword)) return false
      }
      if (fromDate && (!item.ngay || item.ngay < fromDate)) return false
      if (toDate && (!item.ngay || item.ngay > toDate)) return false
      return true
    })
  }, [history, search, fromDate, toDate])

  const filteredPage = usePagination(filtered)

  function startEdit(item: LienLacPhuHuynh) {
    setActionError(null)
    setEditingId(item.id)
    setEditForm({
      hinh_thuc: item.hinh_thuc || 'dien_thoai',
      noi_dung: item.noi_dung || '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(item: LienLacPhuHuynh) {
    setSavingId(item.id)
    setActionError(null)
    try {
      await dataSource.updateParentContact(item.id, {
        hinh_thuc: editForm.hinh_thuc,
        noi_dung: editForm.noi_dung.trim() || null,
      })
      setHistory((current) =>
        current.map((row) =>
          row.id === item.id ? { ...row, hinh_thuc: editForm.hinh_thuc, noi_dung: editForm.noi_dung.trim() || null } : row,
        ),
      )
      setEditingId(null)
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : 'Không sửa được liên lạc phụ huynh.')
    } finally {
      setSavingId(null)
    }
  }

  async function removeItem(item: LienLacPhuHuynh) {
    const ok = window.confirm(
      `Xoá lượt liên lạc ${item.ho_ten || item.ma_hs || ''} ngày ${item.ngay ? formatShortDate(item.ngay) : ''}?`,
    )
    if (!ok) return

    setSavingId(item.id)
    setActionError(null)
    try {
      await dataSource.deleteParentContact(item.id)
      setHistory((current) => current.filter((row) => row.id !== item.id))
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Không xoá được liên lạc phụ huynh.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-orange-200 bg-orange-100 p-4">
        <p className="text-xs font-semibold uppercase text-orange-700">Điểm danh chính khóa</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">Lịch sử liên lạc phụ huynh</h2>
        <p className="mt-2 text-sm text-slate-700">
          Toàn bộ lượt liên lạc đã ghi nhận, mới nhất trước. Ghi nhận lượt mới ở trang Điểm danh.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Tìm học sinh
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tên hoặc mã học sinh"
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Từ ngày
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Đến ngày
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      {error ? <p className="rounded-md border border-red-200 bg-red-100 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {actionError ? (
        <p className="rounded-md border border-red-200 bg-red-100 p-3 text-sm font-semibold text-red-700">{actionError}</p>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-950">Danh sách</h3>
          <p className="text-sm font-semibold text-slate-500">
            {loading ? 'Đang tải...' : `${filtered.length} lượt`}
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {!loading && filtered.length === 0 ? (
            <p className="rounded-md border border-slate-100 bg-slate-100 p-3 text-sm text-slate-600">
              Không có lượt liên lạc nào khớp bộ lọc.
            </p>
          ) : (
            filteredPage.pageItems.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-200 p-3">
                <div className="space-y-1">
                  {item.ma_hs ? (
                    <Link
                      to={`/quan-ly/hoc-sinh/${item.ma_hs}`}
                      className="block font-semibold text-blue-700 hover:underline"
                    >
                      {item.ho_ten || item.ma_hs}
                    </Link>
                  ) : (
                    <p className="font-semibold text-slate-900">{item.ho_ten || 'Không rõ học sinh'}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    {item.ngay ? formatShortDate(item.ngay) : '—'} ·{' '}
                    {item.buoi ? SESSION_LABELS[item.buoi] : '—'} ·{' '}
                    {item.hinh_thuc ? CONTACT_LABELS[item.hinh_thuc] : 'Không rõ hình thức'}
                  </p>
                  <p className="wrap-break-word text-xs text-slate-500">
                    {item.thoi_gian ? formatDateTime(item.thoi_gian) : ''}
                    {item.nguoi_lien_lac ? ` · ${item.nguoi_lien_lac}` : ''}
                  </p>
                </div>

                {editingId === item.id ? (
                  <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-100 p-3">
                    <select
                      value={editForm.hinh_thuc}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, hinh_thuc: event.target.value as HinhThucLienLacPhuHuynh }))
                      }
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {CONTACT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={editForm.noi_dung}
                      onChange={(event) => setEditForm((current) => ({ ...current, noi_dung: event.target.value }))}
                      placeholder="Nội dung liên lạc (có thể để trống)"
                      className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveEdit(item)}
                        disabled={savingId === item.id}
                        className="h-9 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {savingId === item.id ? 'Đang lưu...' : 'Lưu'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-slate-700">{item.noi_dung || 'Không có ghi chú.'}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="h-8 flex-1 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:flex-none"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeItem(item)}
                        disabled={savingId === item.id}
                        className="h-8 flex-1 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:text-slate-400 sm:flex-none"
                      >
                        {savingId === item.id ? 'Đang xoá...' : 'Xoá'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        <Pagination onChange={filteredPage.setPage} page={filteredPage.page} totalPages={filteredPage.totalPages} />
      </div>
    </section>
  )
}

function formatShortDate(value: string): string {
  const [year, month, day] = value.split('-')
  return day && month && year ? `${day}/${month}/${year}` : value
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

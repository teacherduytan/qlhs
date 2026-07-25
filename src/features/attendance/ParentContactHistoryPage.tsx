import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type { BuoiDiemDanh, HinhThucLienLacPhuHuynh, LienLacPhuHuynh } from '../../data/types'

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

export function ParentContactHistoryPage() {
  const [searchParams] = useSearchParams()
  const [history, setHistory] = useState<LienLacPhuHuynh[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

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

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
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

      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-950">Danh sách</h3>
          <p className="text-sm font-semibold text-slate-500">
            {loading ? 'Đang tải...' : `${filtered.length} lượt`}
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {!loading && filtered.length === 0 ? (
            <p className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
              Không có lượt liên lạc nào khớp bộ lọc.
            </p>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    {item.ma_hs ? (
                      <Link
                        to={`/quan-ly/hoc-sinh/${item.ma_hs}`}
                        className="font-semibold text-blue-700 hover:underline"
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
                  </div>
                  <p className="text-xs text-slate-500">
                    {item.thoi_gian ? formatDateTime(item.thoi_gian) : ''}
                    {item.nguoi_lien_lac ? ` · ${item.nguoi_lien_lac}` : ''}
                  </p>
                </div>
                <p className="mt-2 text-sm text-slate-700">{item.noi_dung || 'Không có ghi chú.'}</p>
              </div>
            ))
          )}
        </div>
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

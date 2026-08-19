import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type { TaiLieuChiTiet } from '../../data/types'
import { TaiLieuPagesPreview } from './TaiLieuPagesPreview'

/** Tab "Tai lieu dinh kem" trong trang chi tiet hoc sinh — chi liet ke, sua/xoa thuc hien o thu vien chung /tai-lieu. */
export function StudentDocumentsTab({ maHs }: { maHs: string }) {
  const [items, setItems] = useState<TaiLieuChiTiet[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    dataSource
      .getTaiLieu({ maHs })
      .then((rows) => {
        if (active) setItems(rows)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được tài liệu đính kèm.')
      })
    return () => {
      active = false
    }
  }, [maHs])

  async function handleDelete(id: string) {
    if (!window.confirm('Xoá tài liệu này? Không thể khôi phục.')) return
    try {
      await dataSource.deleteTaiLieu(id)
      setItems((current) => (current || []).filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xoá được tài liệu.')
    }
  }

  return (
    <section className="rounded-lg border border-cyan-200 bg-cyan-100 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-cyan-200 p-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-cyan-700">Tài liệu đính kèm</p>
          <h3 className="text-xl font-bold text-slate-950">Ảnh/tài liệu liên quan học sinh này</h3>
          <p className="text-sm text-slate-600">Bản tường trình, bản cam kết, đơn xin phép... đã tải lên.</p>
        </div>
        <Link
          to={`/tai-lieu?tab=tai-len&maHs=${maHs}`}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-cyan-300 bg-white px-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-100"
        >
          + Tải lên tài liệu
        </Link>
      </div>

      <div className="bg-white p-4">
        {error ? <p className="mb-3 text-sm font-semibold text-red-700">{error}</p> : null}

        {items === null ? (
          <p className="text-sm text-slate-500">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có tài liệu nào đính kèm cho học sinh này.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 shadow-sm">
                <TaiLieuPagesPreview trang={item.trang} className="h-32 w-full" />
                <p className="text-sm font-semibold text-slate-900">{item.danh_muc?.ten || 'Không rõ loại'}</p>
                <p className="text-xs text-slate-500">{item.ngay_viet || 'Chưa rõ ngày viết'}</p>
                {item.ghi_chu ? <p className="text-xs italic text-slate-500">{item.ghi_chu}</p> : null}
                <div className="mt-1 flex gap-2">
                  <Link
                    to={`/tai-lieu?tab=thu-vien&maHs=${maHs}`}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Sửa ở thư viện
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Xoá
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

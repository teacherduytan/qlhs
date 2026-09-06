import { useState } from 'react'
import { dataSource } from '../../data/client'
import type { TaiLieuTrang } from '../../data/types'

/**
 * Thay cho luoi thumbnail anh (TaiLieuPagesPreview/TaiLieuThumbnail cu) - chi
 * hien 1 nut nho "Trang N" cho moi trang, KHONG tai/hien anh nao ca cho den
 * khi nguoi dung bam vao. Danh sach nhieu tai lieu (thu vien chung, trang ca
 * nhan hoc sinh) truoc day phai xin signed URL + tai anh that cho TUNG trang
 * cua TUNG tai lieu cung luc (rat nang/cham khi co nhieu tai lieu). Bam 1 nut
 * "Trang N" se xin signed URL (bucket private) roi mo ngay trong 1 tab moi -
 * mo san 1 tab trong (`window.open('', '_blank')`) TRONG luc bam (dong bo)
 * roi gan URL that vao sau khi xin xong (bat dong bo), tranh bi trinh duyet
 * chan popup vi mo tab sau khi await xong khong con nam trong "user gesture".
 */
export function TaiLieuPageButtons({
  trang,
  onRemovePage,
  removeBusy,
  className,
}: {
  trang: TaiLieuTrang[]
  onRemovePage?: (pageId: string) => void
  removeBusy?: boolean
  className?: string
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)

  async function openPage(page: TaiLieuTrang) {
    const newTab = window.open('', '_blank')
    setLoadingId(page.id)
    setErrorId(null)
    try {
      const url = await dataSource.getTaiLieuUrl(page.duong_dan_luu_tru)
      if (newTab) newTab.location.href = url
      else window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      newTab?.close()
      setErrorId(page.id)
    } finally {
      setLoadingId(null)
    }
  }

  if (trang.length === 0) {
    return <p className="text-xs text-slate-400">Không có trang nào.</p>
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className || ''}`}>
      {trang.map((page, index) => (
        <span key={page.id} className="inline-flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => void openPage(page)}
            disabled={loadingId === page.id}
            title="Mở trang này trong tab mới"
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {loadingId === page.id ? 'Đang mở…' : `📄 Trang ${index + 1}`}
          </button>
          {onRemovePage ? (
            <button
              type="button"
              disabled={removeBusy}
              onClick={() => onRemovePage(page.id)}
              title="Xoá trang này"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ×
            </button>
          ) : null}
        </span>
      ))}
      {errorId ? <span className="text-xs font-semibold text-red-600">Không mở được trang đã chọn.</span> : null}
    </div>
  )
}

import { useState } from 'react'
import type { TaiLieuTrang } from '../../data/types'
import { TaiLieuThumbnail } from './TaiLieuThumbnail'

/** Anh dai dien 1 tai_lieu co the co nhieu trang — mac dinh chi hien trang dau + so trang, bam de xem het. */
export function TaiLieuPagesPreview({ trang, className }: { trang: TaiLieuTrang[]; className?: string }) {
  const [expanded, setExpanded] = useState(false)
  const baseClass = className || 'h-36 w-full'

  if (trang.length === 0) {
    return (
      <div className={`${baseClass} flex items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400`}>
        Không có trang
      </div>
    )
  }

  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)} className="relative block w-full text-left">
        <TaiLieuThumbnail duongDanLuuTru={trang[0].duong_dan_luu_tru} loaiTep={trang[0].loai_tep} className={baseClass} />
        {trang.length > 1 ? (
          <span className="absolute bottom-1 right-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
            📄 {trang.length} trang
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-3 gap-1">
        {trang.map((page, index) => (
          <div key={page.id} className="relative">
            <TaiLieuThumbnail duongDanLuuTru={page.duong_dan_luu_tru} loaiTep={page.loai_tep} className="h-20 w-full" />
            <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[10px] font-semibold text-white">
              {index + 1}
            </span>
          </div>
        ))}
      </div>
      {trang.length > 1 ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="self-start text-[11px] font-semibold text-blue-700 hover:underline"
        >
          Thu gọn
        </button>
      ) : null}
    </div>
  )
}

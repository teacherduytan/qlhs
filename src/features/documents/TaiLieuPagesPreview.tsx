import { useState } from 'react'
import type { TaiLieuTrang } from '../../data/types'
import { TaiLieuThumbnail } from './TaiLieuThumbnail'
import { TaiLieuLightbox } from './TaiLieuLightbox'

/** Anh dai dien 1 tai_lieu (co the nhieu trang) — bam vao de mo lightbox, dung nut/vuot de xem qua lai cac trang. */
export function TaiLieuPagesPreview({ trang, className }: { trang: TaiLieuTrang[]; className?: string }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const baseClass = className || 'h-36 w-full'

  if (trang.length === 0) {
    return (
      <div className={`${baseClass} flex items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400`}>
        Không có trang
      </div>
    )
  }

  return (
    <>
      <div className="relative">
        <TaiLieuThumbnail
          duongDanLuuTru={trang[0].duong_dan_luu_tru}
          loaiTep={trang[0].loai_tep}
          className={baseClass}
          onClick={() => setLightboxOpen(true)}
        />
        {trang.length > 1 ? (
          <span className="pointer-events-none absolute bottom-1 right-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
            📄 {trang.length} trang
          </span>
        ) : null}
      </div>

      {lightboxOpen ? <TaiLieuLightbox trang={trang} startIndex={0} onClose={() => setLightboxOpen(false)} /> : null}
    </>
  )
}

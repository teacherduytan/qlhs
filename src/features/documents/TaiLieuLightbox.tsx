import { useEffect, useState } from 'react'
import { dataSource } from '../../data/client'
import type { TaiLieuTrang } from '../../data/types'

/** Xem toan man hinh 1 tai_lieu nhieu trang, bam nut/vuot/phim mui ten de chuyen qua lai giua cac trang. */
export function TaiLieuLightbox({
  trang,
  startIndex,
  onClose,
}: {
  trang: TaiLieuTrang[]
  startIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(startIndex)
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; url: string | null }>({
    status: 'loading',
    url: null,
  })

  const page = trang[index]
  const isPdf = page?.loai_tep === 'application/pdf'

  useEffect(() => {
    if (!page) return
    let active = true
    setState({ status: 'loading', url: null })
    dataSource
      .getTaiLieuUrl(page.duong_dan_luu_tru)
      .then((url) => {
        if (active) setState({ status: 'ready', url })
      })
      .catch(() => {
        if (active) setState({ status: 'error', url: null })
      })
    return () => {
      active = false
    }
  }, [page])

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowLeft') setIndex((current) => Math.max(0, current - 1))
      else if (event.key === 'ArrowRight') setIndex((current) => Math.min(trang.length - 1, current + 1))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [trang.length, onClose])

  if (!page) return null

  return (
    <div
      className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black/85 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Xem tài liệu, trang ${index + 1} trên ${trang.length}`}
    >
      <div className="absolute right-3 top-3 flex items-center gap-2">
        {trang.length > 1 ? (
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">
            Trang {index + 1}/{trang.length}
          </span>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl font-bold text-white hover:bg-white/20"
          aria-label="Đóng"
        >
          ×
        </button>
      </div>

      {trang.length > 1 && index > 0 ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setIndex((current) => current - 1)
          }}
          className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:left-4"
          aria-label="Trang trước"
        >
          ‹
        </button>
      ) : null}

      <div
        className="flex max-h-[85vh] max-w-[92vw] items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        {state.status === 'loading' ? (
          <div className="h-40 w-40 animate-pulse rounded-md bg-white/10" />
        ) : state.status === 'error' || !state.url ? (
          <p className="text-sm font-semibold text-white">Không tải được trang này.</p>
        ) : isPdf ? (
          <a href={state.url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 text-white">
            <span className="text-5xl" aria-hidden="true">
              📄
            </span>
            <span className="text-sm font-semibold underline">Mở file PDF trong tab mới</span>
          </a>
        ) : (
          <img src={state.url} alt="" className="max-h-[85vh] max-w-[92vw] rounded-md object-contain" />
        )}
      </div>

      {trang.length > 1 && index < trang.length - 1 ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setIndex((current) => current + 1)
          }}
          className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:right-4"
          aria-label="Trang sau"
        >
          ›
        </button>
      ) : null}

      {trang.length > 1 ? (
        <div className="mt-4 flex gap-1.5" onClick={(event) => event.stopPropagation()}>
          {trang.map((dotPage, dotIndex) => (
            <button
              key={dotPage.id}
              type="button"
              onClick={() => setIndex(dotIndex)}
              className={`h-2 w-2 rounded-full transition ${dotIndex === index ? 'bg-white' : 'bg-white/40'}`}
              aria-label={`Xem trang ${dotIndex + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { dataSource } from '../../data/client'

/**
 * Anh/PDF trong bucket private nen luon phai xin signed URL truoc khi hien thi.
 * Neu co onClick thi render button (dung khi muon mo lightbox nhieu trang thay vi
 * mo tab moi); khong truyen onClick thi giu hanh vi cu — mo signed URL o tab moi.
 */
export function TaiLieuThumbnail({
  duongDanLuuTru,
  loaiTep,
  className,
  onClick,
}: {
  duongDanLuuTru: string
  loaiTep: string | null
  className?: string
  onClick?: () => void
}) {
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; url: string | null }>({
    status: 'loading',
    url: null,
  })

  useEffect(() => {
    let active = true
    setState({ status: 'loading', url: null })
    dataSource
      .getTaiLieuUrl(duongDanLuuTru)
      .then((url) => {
        if (active) setState({ status: 'ready', url })
      })
      .catch(() => {
        if (active) setState({ status: 'error', url: null })
      })
    return () => {
      active = false
    }
  }, [duongDanLuuTru])

  const isPdf = loaiTep === 'application/pdf'
  const baseClass = className || 'h-28 w-full'

  if (state.status === 'loading') {
    return <div className={`${baseClass} animate-pulse rounded-md bg-slate-200`} />
  }

  if (state.status === 'error' || !state.url) {
    return (
      <div className={`${baseClass} flex items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400`}>
        Không tải được
      </div>
    )
  }

  if (isPdf) {
    const pdfClassName = `${baseClass} flex flex-col items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100`
    const pdfContent = (
      <>
        <span className="text-2xl" aria-hidden="true">
          📄
        </span>
        <span className="text-xs font-semibold">Xem PDF</span>
      </>
    )
    if (onClick) {
      return (
        <button type="button" onClick={onClick} className={pdfClassName}>
          {pdfContent}
        </button>
      )
    }
    return (
      <a href={state.url} target="_blank" rel="noreferrer" className={pdfClassName}>
        {pdfContent}
      </a>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${baseClass} block overflow-hidden rounded-md`}>
        <img src={state.url} alt="" className="h-full w-full object-cover" />
      </button>
    )
  }

  return (
    <a href={state.url} target="_blank" rel="noreferrer" className={`${baseClass} block overflow-hidden rounded-md`}>
      <img src={state.url} alt="" className="h-full w-full object-cover" />
    </a>
  )
}

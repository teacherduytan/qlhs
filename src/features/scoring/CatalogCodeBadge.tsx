import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { DanhMucDiem } from '../../data/types'
import { getBadgeClassForCatalog, getBadgeClassForGroup } from './scoreStyles'

const POPOVER_WIDTH = 288
const POPOVER_MARGIN = 8

// Bam vao ma danh muc hien popover chi tiet. Dinh vi bang position:fixed tinh
// tu getBoundingClientRect() cua nut bam (portal ra document.body) thay vi
// absolute ben trong nut - vi component nay duoc dat o rat nhieu noi nam
// trong bang/hang co overflow-x-auto (CatalogPage, TeacherStudentDetailPage...),
// absolute se bi ancestor do cat/day lech ra ngoai vung nhin thay tren di dong
// (cung 1 loi da gap va sua o PhoneActionMenu.tsx).
export function CatalogCodeBadge({
  catalogItem,
  className = '',
  code,
  label,
}: {
  catalogItem?: DanhMucDiem
  className?: string
  code: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const badgeClass = catalogItem ? getBadgeClassForCatalog(catalogItem) : getBadgeClassForGroup(code)

  function openPopover() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return

    const left = Math.min(
      Math.max(rect.left, POPOVER_MARGIN),
      window.innerWidth - POPOVER_WIDTH - POPOVER_MARGIN,
    )
    setPosition({ top: rect.bottom + 6, left })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setOpen(false)
    }

    function handleScrollOrResize() {
      setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPopover())}
        className={`rounded-full border px-2 py-1 text-xs font-semibold transition hover:shadow-sm ${badgeClass} ${className}`}
      >
        {label || code}
      </button>
      {open && position
        ? createPortal(
            <div
              ref={popoverRef}
              style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
              className="fixed z-50 rounded-md border border-slate-200 bg-white p-3 text-left text-xs text-slate-700 shadow-lg"
            >
              <span className="block font-bold text-slate-900">
                {code}
                {catalogItem?.ten_muc ? ` · ${catalogItem.ten_muc}` : ''}
              </span>
              {catalogItem ? (
                <>
                  <span className="mt-2 block">Nhóm: {catalogItem.nhom}</span>
                  <span className="block">Điểm: {catalogItem.diem}</span>
                  <span className="block">Phạm vi: {labelScope(catalogItem.pham_vi)}</span>
                  {catalogItem.nghiem_trong ? (
                    <span className="mt-2 block font-semibold text-red-700">Vi phạm nghiêm trọng</span>
                  ) : null}
                </>
              ) : (
                <span className="mt-2 block">Chưa có mô tả trong bảng tra cứu mã.</span>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function labelScope(value: DanhMucDiem['pham_vi']): string {
  if (value === 'ca_nhan') {
    return 'Cá nhân'
  }

  if (value === 'to_truc') {
    return 'Tổ trực'
  }

  return 'Tập thể'
}

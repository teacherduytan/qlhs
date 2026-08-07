import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MENU_WIDTH = 240
const MENU_MARGIN = 8

// Bam vao so dien thoai hien menu nho 2 lua chon "Goi"/"Nhan tin" thay vi
// mo thang app goi dien nhu truoc - "Nhan tin" dien san noi dung SMS (neu
// co) qua tham so body cua URI scheme sms:.
//
// Menu duoc "portal" thang ra document.body va dinh vi bang position:fixed
// theo toa do that cua nut bam (getBoundingClientRect), KHONG dat absolute
// ben trong nut nhu truoc - vi nhieu noi dung dung component nay (StudentsPage.tsx)
// nam trong bang co overflow-x-auto, absolute ben trong bi ancestor do clip mat/
// day lech ra vung khong the bam duoc tren di dong.
export function PhoneActionMenu({
  phone,
  smsBody,
  smsEmptyHint,
  className = 'font-bold text-blue-700 hover:text-blue-800',
}: {
  phone: string
  smsBody: string
  smsEmptyHint?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return

    const left = Math.min(Math.max(rect.right - MENU_WIDTH, MENU_MARGIN), window.innerWidth - MENU_WIDTH - MENU_MARGIN)
    setPosition({ top: rect.bottom + 4, left })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
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

  const normalized = normalizePhone(phone)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={className}
      >
        {phone}
      </button>
      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
              className="fixed z-50 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
            >
              <a
                href={`tel:${normalized}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <span aria-hidden="true">📞</span> Gọi
              </a>
              <a
                href={buildSmsHref(normalized, smsBody)}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <span aria-hidden="true">💬</span> Nhắn tin
              </a>
              {!smsBody && smsEmptyHint ? (
                <p className="px-3 pb-1 pt-1 text-xs text-slate-400">{smsEmptyHint}</p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

// iOS Safari can dau "&" truoc "body=" trong sms:, con Android/da so trinh
// duyet khac dung dau "?" - khong co cach nao dung chung 1 dinh dang cho ca
// 2 nen tach nhanh qua User-Agent.
export function buildSmsHref(phone: string, body: string): string {
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
  const separator = isIOS ? '&' : '?'
  const normalized = normalizePhone(phone)
  return body ? `sms:${normalized}${separator}body=${encodeURIComponent(body)}` : `sms:${normalized}`
}

export function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, '')
}

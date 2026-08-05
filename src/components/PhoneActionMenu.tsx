import { useEffect, useRef, useState } from 'react'

// Bam vao so dien thoai hien menu nho 2 lua chon "Goi"/"Nhan tin" thay vi
// mo thang app goi dien nhu truoc - "Nhan tin" dien san noi dung SMS (neu
// co) qua tham so body cua URI scheme sms:.
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
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const normalized = normalizePhone(phone)

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button type="button" onClick={() => setOpen((value) => !value)} className={className}>
        {phone}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-60 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
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
          {!smsBody && smsEmptyHint ? <p className="px-3 pb-1 pt-1 text-xs text-slate-400">{smsEmptyHint}</p> : null}
        </div>
      ) : null}
    </div>
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

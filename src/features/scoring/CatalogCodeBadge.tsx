import { useState } from 'react'
import type { DanhMucDiem } from '../../data/types'
import { getBadgeClassForCatalog, getBadgeClassForGroup } from './scoreStyles'

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
  const badgeClass = catalogItem ? getBadgeClassForCatalog(catalogItem) : getBadgeClassForGroup(code)

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`rounded-full border px-2 py-1 text-xs font-semibold transition hover:shadow-sm ${badgeClass} ${className}`}
      >
        {label || code}
      </button>
      {open ? (
        <span className="absolute left-0 top-full z-20 mt-2 w-72 rounded-md border border-slate-200 bg-white p-3 text-left text-xs text-slate-700 shadow-lg">
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
        </span>
      ) : null}
    </span>
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

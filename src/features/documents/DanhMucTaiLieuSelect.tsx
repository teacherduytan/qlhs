import { useState } from 'react'
import { dataSource } from '../../data/client'
import type { DanhMucTaiLieu } from '../../data/types'

const NEW_VALUE = '__new_danh_muc_tai_lieu__'

/** Dropdown loai tai lieu, cho tao loai moi ngay tai cho (kem tick "co tinh la cam ket") — xem docs/11-...md muc 6. */
export function DanhMucTaiLieuSelect({
  danhMuc,
  value,
  onChange,
  onCreated,
}: {
  danhMuc: DanhMucTaiLieu[]
  value: string
  onChange: (id: string) => void
  onCreated: (item: DanhMucTaiLieu) => void
}) {
  const [creating, setCreating] = useState(false)
  const [tenMoi, setTenMoi] = useState('')
  const [laCamKet, setLaCamKet] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitNew() {
    if (!tenMoi.trim()) return
    setBusy(true)
    setError(null)
    try {
      const created = await dataSource.addDanhMucTaiLieu({ ten: tenMoi.trim(), tinh_la_cam_ket: laCamKet })
      onCreated(created)
      onChange(created.id)
      setCreating(false)
      setTenMoi('')
      setLaCamKet(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được loại tài liệu mới.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <select
        value={creating ? NEW_VALUE : value}
        onChange={(event) => {
          if (event.target.value === NEW_VALUE) {
            setCreating(true)
          } else {
            setCreating(false)
            onChange(event.target.value)
          }
        }}
        className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {danhMuc.map((item) => (
          <option key={item.id} value={item.id}>
            {item.ten}
          </option>
        ))}
        <option value={NEW_VALUE}>+ Thêm loại mới</option>
      </select>

      {creating ? (
        <div className="flex flex-col gap-1.5 rounded-md border border-blue-200 bg-blue-50 p-2">
          <input
            autoFocus
            type="text"
            value={tenMoi}
            onChange={(event) => setTenMoi(event.target.value)}
            placeholder="Tên loại tài liệu mới"
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={laCamKet}
              onChange={(event) => setLaCamKet(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            Loại này có tính là cam kết không? (để tính vào báo cáo tái phạm)
          </label>
          {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !tenMoi.trim()}
              onClick={() => void submitNew()}
              className="h-8 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {busy ? 'Đang tạo...' : 'Tạo loại mới'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false)
                setError(null)
              }}
              className="h-8 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-600"
            >
              Huỷ
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

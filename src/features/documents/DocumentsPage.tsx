import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type { DanhMucTaiLieu, GhiNhan, HocSinh, TaiLieuChiTiet } from '../../data/types'
import { chuanBiFileTaiLen } from './imageCompression'
import { StudentMultiSelect } from './StudentMultiSelect'
import { DanhMucTaiLieuSelect } from './DanhMucTaiLieuSelect'
import { TaiLieuThumbnail } from './TaiLieuThumbnail'
import { TaiLieuPagesPreview } from './TaiLieuPagesPreview'

type PageTab = 'tai-len' | 'thu-vien'

/** 1 trang/anh cu the trong 1 UploadEntry — nhieu trang cung 1 UploadEntry = nhieu anh cua CUNG 1 tai lieu giay. */
interface EntryPage {
  key: string
  file: File
  previewUrl: string
  isImage: boolean
  canhBao: string | null
}

/** 1 UploadEntry = 1 tai_lieu se duoc tao, co the gom nhieu trang (vd chup 2 to giay cua 1 ban tuong trinh). */
interface UploadEntry {
  key: string
  pages: EntryPage[]
  danhMucId: string
  ngayViet: string
  maHsList: string[]
  ghiNhanId: string
  ghiChu: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error: string | null
}

function todayIso(): string {
  const now = new Date()
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}

let entryCounter = 0
function nextEntryKey(): string {
  entryCounter += 1
  return `entry-${entryCounter}-${Date.now()}`
}

export function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const preselectMaHs = searchParams.get('maHs') || ''
  const [tab, setTab] = useState<PageTab>(searchParams.get('tab') === 'thu-vien' ? 'thu-vien' : 'tai-len')

  const [students, setStudents] = useState<HocSinh[]>([])
  const [danhMuc, setDanhMuc] = useState<DanhMucTaiLieu[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([dataSource.getStudents(), dataSource.getDanhMucTaiLieu()])
      .then(([studentRows, danhMucRows]) => {
        if (!active) return
        setStudents(studentRows)
        setDanhMuc(danhMucRows.filter((item) => item.active))
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Không tải được dữ liệu.')
      })
    return () => {
      active = false
    }
  }, [])

  function changeTab(next: PageTab) {
    setTab(next)
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase text-blue-600">Nội bộ giáo viên</p>
        <h2 className="text-xl font-bold text-slate-900">Thư viện tài liệu học sinh</h2>
        <p className="text-sm text-slate-600">
          Đính kèm ảnh giấy tờ (bản tường trình, bản cam kết, đơn xin phép...) — phụ huynh không xem được.
        </p>
      </div>

      {loadError ? <p className="text-sm font-semibold text-red-700">{loadError}</p> : null}

      <div className="flex gap-1 rounded-lg border border-slate-300 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => changeTab('tai-len')}
          className={`h-10 flex-1 rounded-md text-sm font-semibold transition ${
            tab === 'tai-len' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          📤 Tải lên tài liệu
        </button>
        <button
          type="button"
          onClick={() => changeTab('thu-vien')}
          className={`h-10 flex-1 rounded-md text-sm font-semibold transition ${
            tab === 'thu-vien' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          🗂️ Thư viện chung
        </button>
      </div>

      {tab === 'tai-len' ? (
        <UploadPanel
          students={students}
          danhMuc={danhMuc}
          preselectMaHs={preselectMaHs}
          onDanhMucCreated={(item) => setDanhMuc((current) => [...current, item])}
        />
      ) : (
        <LibraryPanel students={students} danhMuc={danhMuc} />
      )}
    </section>
  )
}

function UploadPanel({
  students,
  danhMuc,
  preselectMaHs,
  onDanhMucCreated,
}: {
  students: HocSinh[]
  danhMuc: DanhMucTaiLieu[]
  preselectMaHs: string
  onDanhMucCreated: (item: DanhMucTaiLieu) => void
}) {
  const [entries, setEntries] = useState<UploadEntry[]>([])
  const [recordsByMaHs, setRecordsByMaHs] = useState<Record<string, GhiNhan[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  const defaultDanhMucId = danhMuc[0]?.id || ''

  async function preparePages(fileList: FileList | null): Promise<EntryPage[]> {
    if (!fileList || fileList.length === 0) return []
    const files = Array.from(fileList)
    const prepared = await Promise.all(files.map((file) => chuanBiFileTaiLen(file)))
    return prepared.map(({ file, canhBao }) => ({
      key: nextEntryKey(),
      file,
      previewUrl: URL.createObjectURL(file),
      isImage: file.type.startsWith('image/'),
      canhBao,
    }))
  }

  // Moi lan chon/chup file o o chinh = 1 tai lieu moi (co the nhieu trang neu chon
  // nhieu file cung luc, vd 2 to giay cua cung 1 ban tuong trinh chup thanh 2 anh).
  async function handleNewDocumentFilesPicked(fileList: FileList | null) {
    const pages = await preparePages(fileList)
    if (pages.length === 0) return
    setSubmitMessage(null)
    setSubmitError(null)

    const newEntry: UploadEntry = {
      key: nextEntryKey(),
      pages,
      danhMucId: defaultDanhMucId,
      ngayViet: todayIso(),
      maHsList: preselectMaHs ? [preselectMaHs] : [],
      ghiNhanId: '',
      ghiChu: '',
      status: 'pending',
      error: null,
    }
    setEntries((current) => [...current, newEntry])
  }

  async function addPagesToEntry(key: string, fileList: FileList | null) {
    const pages = await preparePages(fileList)
    if (pages.length === 0) return
    setEntries((current) =>
      current.map((entry) => (entry.key === key ? { ...entry, pages: [...entry.pages, ...pages] } : entry)),
    )
  }

  function removePageFromEntry(entryKey: string, pageKey: string) {
    setEntries((current) =>
      current.map((entry) => {
        if (entry.key !== entryKey) return entry
        const target = entry.pages.find((page) => page.key === pageKey)
        if (target) URL.revokeObjectURL(target.previewUrl)
        return { ...entry, pages: entry.pages.filter((page) => page.key !== pageKey) }
      }),
    )
  }

  function updateEntry(key: string, patch: Partial<UploadEntry>) {
    setEntries((current) => current.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)))
  }

  function removeEntry(key: string) {
    setEntries((current) => {
      const target = current.find((entry) => entry.key === key)
      target?.pages.forEach((page) => URL.revokeObjectURL(page.previewUrl))
      return current.filter((entry) => entry.key !== key)
    })
  }

  function applyFirstToAll() {
    if (entries.length < 2) return
    const first = entries[0]
    setEntries((current) =>
      current.map((entry, index) =>
        index === 0
          ? entry
          : {
              ...entry,
              danhMucId: first.danhMucId,
              ngayViet: first.ngayViet,
              maHsList: first.maHsList,
              ghiNhanId: first.ghiNhanId,
            },
      ),
    )
  }

  async function ensureRecordsLoaded(maHsList: string[]) {
    const missing = maHsList.filter((maHs) => !(maHs in recordsByMaHs))
    if (missing.length === 0) return
    const results = await Promise.all(missing.map((maHs) => dataSource.getRecords(maHs)))
    setRecordsByMaHs((current) => {
      const next = { ...current }
      missing.forEach((maHs, index) => {
        next[maHs] = results[index]
      })
      return next
    })
  }

  async function submitAll() {
    if (entries.length === 0) return
    for (const entry of entries) {
      if (entry.pages.length === 0) {
        setSubmitError('Mỗi tài liệu phải có ít nhất 1 trang (ảnh/PDF).')
        return
      }
      if (entry.maHsList.length === 0) {
        setSubmitError('Mỗi tài liệu phải chọn ít nhất 1 học sinh liên quan.')
        return
      }
      if (!entry.danhMucId) {
        setSubmitError('Mỗi tài liệu phải chọn loại tài liệu.')
        return
      }
    }

    setSubmitting(true)
    setSubmitError(null)
    setSubmitMessage(null)

    let successCount = 0
    for (const entry of entries) {
      updateEntry(entry.key, { status: 'uploading', error: null })
      try {
        await dataSource.uploadTaiLieu({
          files: entry.pages.map((page) => page.file),
          danhMucTaiLieuId: entry.danhMucId,
          ngayViet: entry.ngayViet,
          maHsList: entry.maHsList,
          ghiNhanId: entry.ghiNhanId || null,
          ghiChu: entry.ghiChu || null,
        })
        updateEntry(entry.key, { status: 'done' })
        successCount += 1
      } catch (error) {
        updateEntry(entry.key, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Không tải lên được.',
        })
      }
    }

    setSubmitting(false)
    if (successCount === entries.length) {
      entries.forEach((entry) => entry.pages.forEach((page) => URL.revokeObjectURL(page.previewUrl)))
      setEntries([])
      setSubmitMessage(`Đã lưu ${successCount} tài liệu.`)
    } else {
      setSubmitMessage(`Đã lưu ${successCount}/${entries.length} tài liệu — kiểm tra lỗi bên dưới.`)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-6 text-center hover:bg-blue-100">
        <span className="text-3xl" aria-hidden="true">
          📷
        </span>
        <span className="text-sm font-semibold text-blue-700">Chọn hoặc chụp ảnh / PDF cho 1 tài liệu mới</span>
        <span className="text-xs text-slate-500">
          Chọn nhiều ảnh cùng lúc nếu tài liệu có nhiều trang (vd 2 tờ giấy của cùng 1 bản tường trình)
        </span>
        <input
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          multiple
          className="hidden"
          onChange={(event) => {
            void handleNewDocumentFilesPicked(event.target.files)
            event.target.value = ''
          }}
        />
      </label>

      {entries.length > 1 ? (
        <button
          type="button"
          onClick={applyFirstToAll}
          className="self-start rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
        >
          ⬇️ Áp dụng loại/ngày/học sinh của file đầu tiên cho tất cả
        </button>
      ) : null}

      <div className="flex flex-col gap-3">
        {entries.map((entry, index) => (
          <UploadEntryCard
            key={entry.key}
            entry={entry}
            index={index}
            students={students}
            danhMuc={danhMuc}
            recordsByMaHs={recordsByMaHs}
            onChange={(patch) => updateEntry(entry.key, patch)}
            onRemove={() => removeEntry(entry.key)}
            onAddPages={(fileList) => void addPagesToEntry(entry.key, fileList)}
            onRemovePage={(pageKey) => removePageFromEntry(entry.key, pageKey)}
            onDanhMucCreated={onDanhMucCreated}
            onMaHsListSettled={(maHsList) => void ensureRecordsLoaded(maHsList)}
          />
        ))}
      </div>

      {entries.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submitAll()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {submitting ? 'Đang lưu...' : `Lưu ${entries.length} tài liệu`}
          </button>
          {submitError ? <p className="text-sm font-semibold text-red-700">{submitError}</p> : null}
          {submitMessage ? <p className="text-sm font-semibold text-emerald-700">{submitMessage}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

function UploadEntryCard({
  entry,
  index,
  students,
  danhMuc,
  recordsByMaHs,
  onChange,
  onRemove,
  onAddPages,
  onRemovePage,
  onDanhMucCreated,
  onMaHsListSettled,
}: {
  entry: UploadEntry
  index: number
  students: HocSinh[]
  danhMuc: DanhMucTaiLieu[]
  recordsByMaHs: Record<string, GhiNhan[]>
  onChange: (patch: Partial<UploadEntry>) => void
  onRemove: () => void
  onAddPages: (fileList: FileList | null) => void
  onRemovePage: (pageKey: string) => void
  onDanhMucCreated: (item: DanhMucTaiLieu) => void
  onMaHsListSettled: (maHsList: string[]) => void
}) {
  const selectedDanhMuc = danhMuc.find((item) => item.id === entry.danhMucId)
  const showGhiNhanLink = Boolean(selectedDanhMuc?.tinh_la_cam_ket)

  useEffect(() => {
    if (showGhiNhanLink) onMaHsListSettled(entry.maHsList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGhiNhanLink, entry.maHsList.join(',')])

  const relatedRecords = useMemo(() => {
    if (!showGhiNhanLink) return []
    const seen = new Set<string>()
    const merged: GhiNhan[] = []
    for (const maHs of entry.maHsList) {
      for (const record of recordsByMaHs[maHs] || []) {
        if (record.ma_ghi_nhan && !seen.has(record.ma_ghi_nhan)) {
          seen.add(record.ma_ghi_nhan)
          merged.push(record)
        }
      }
    }
    return merged.sort((left, right) => (left.ngay < right.ngay ? 1 : -1)).slice(0, 30)
  }, [showGhiNhanLink, entry.maHsList, recordsByMaHs])

  const statusBadge =
    entry.status === 'uploading'
      ? { text: 'Đang tải lên...', className: 'bg-amber-100 text-amber-800' }
      : entry.status === 'done'
        ? { text: 'Đã lưu ✓', className: 'bg-emerald-100 text-emerald-800' }
        : entry.status === 'error'
          ? { text: 'Lỗi', className: 'bg-red-100 text-red-800' }
          : null

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-slate-500">
          Tài liệu {index + 1} · {entry.pages.length} trang
        </p>
        <div className="flex items-center gap-2">
          {statusBadge ? (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge.className}`}>
              {statusBadge.text}
            </span>
          ) : null}
          <button type="button" onClick={onRemove} className="text-xs font-semibold text-red-600 hover:underline">
            Xoá cả tài liệu
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {entry.pages.map((page, pageIndex) => (
          <div key={page.key} className="relative w-20 shrink-0">
            {page.isImage ? (
              <img src={page.previewUrl} alt="" className="h-20 w-20 rounded-md object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-md bg-slate-100 text-2xl" aria-hidden="true">
                📄
              </div>
            )}
            <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[10px] font-semibold text-white">
              {pageIndex + 1}
            </span>
            <button
              type="button"
              onClick={() => onRemovePage(page.key)}
              title="Xoá trang này"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow"
            >
              ×
            </button>
            {page.canhBao ? (
              <p className="mt-0.5 truncate text-[10px] font-medium text-amber-700" title={page.canhBao}>
                ⚠
              </p>
            ) : null}
          </div>
        ))}

        <label className="flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600">
          <span className="text-lg" aria-hidden="true">
            +
          </span>
          <span className="text-[10px] font-semibold">Thêm trang</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            multiple
            className="hidden"
            onChange={(event) => {
              onAddPages(event.target.files)
              event.target.value = ''
            }}
          />
        </label>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {entry.error ? <p className="text-xs font-semibold text-red-700">{entry.error}</p> : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Loại tài liệu
            <DanhMucTaiLieuSelect
              danhMuc={danhMuc}
              value={entry.danhMucId}
              onChange={(id) => onChange({ danhMucId: id })}
              onCreated={onDanhMucCreated}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Ngày viết
            <input
              type="date"
              value={entry.ngayViet}
              onChange={(event) => onChange({ ngayViet: event.target.value })}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Học sinh liên quan
          <StudentMultiSelect students={students} selected={entry.maHsList} onChange={(list) => onChange({ maHsList: list })} />
        </label>

        {showGhiNhanLink ? (
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Liên kết với ghi nhận vi phạm (tuỳ chọn)
            <select
              value={entry.ghiNhanId}
              onChange={(event) => onChange({ ghiNhanId: event.target.value })}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">— Không liên kết —</option>
              {relatedRecords.map((record) => (
                <option key={record.ma_ghi_nhan} value={record.ma_ghi_nhan}>
                  {record.ngay} · {record.noi_dung || record.loai}
                </option>
              ))}
            </select>
            <span className="text-[11px] font-normal text-slate-500">
              Liên kết để hệ thống tự nhận diện tái phạm ở báo cáo lịch sử vi phạm.
            </span>
          </label>
        ) : null}

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Ghi chú (tuỳ chọn)
          <textarea
            value={entry.ghiChu}
            onChange={(event) => onChange({ ghiChu: event.target.value })}
            className="min-h-16 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>
    </div>
  )
}

interface LibraryFilters {
  danhMucId: string
  maHs: string
  tuNgay: string
  denNgay: string
}

function LibraryPanel({ students, danhMuc }: { students: HocSinh[]; danhMuc: DanhMucTaiLieu[] }) {
  const [filters, setFilters] = useState<LibraryFilters>({ danhMucId: '', maHs: '', tuNgay: '', denNgay: '' })
  const [items, setItems] = useState<TaiLieuChiTiet[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    dataSource
      .getTaiLieu({
        danhMucId: filters.danhMucId || undefined,
        maHs: filters.maHs || undefined,
        tuNgay: filters.tuNgay || undefined,
        denNgay: filters.denNgay || undefined,
      })
      .then((rows) => {
        if (active) setItems(rows)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được thư viện tài liệu.')
      })
    return () => {
      active = false
    }
  }, [filters])

  async function handleDelete(id: string) {
    if (!window.confirm('Xoá tài liệu này? Không thể khôi phục.')) return
    try {
      await dataSource.deleteTaiLieu(id)
      setItems((current) => (current || []).filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xoá được tài liệu.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Loại tài liệu
          <select
            value={filters.danhMucId}
            onChange={(event) => setFilters({ ...filters, danhMucId: event.target.value })}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Tất cả</option>
            {danhMuc.map((item) => (
              <option key={item.id} value={item.id}>
                {item.ten}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Học sinh
          <select
            value={filters.maHs}
            onChange={(event) => setFilters({ ...filters, maHs: event.target.value })}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Tất cả</option>
            {students.map((student) => (
              <option key={student.ma_hs} value={student.ma_hs}>
                {student.ho} {student.ten}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Từ ngày viết
          <input
            type="date"
            value={filters.tuNgay}
            onChange={(event) => setFilters({ ...filters, tuNgay: event.target.value })}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Đến ngày viết
          <input
            type="date"
            value={filters.denNgay}
            onChange={(event) => setFilters({ ...filters, denNgay: event.target.value })}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

      {items === null ? (
        <p className="text-sm text-slate-500">Đang tải...</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Không có tài liệu nào khớp bộ lọc.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) =>
            editingId === item.id ? (
              <TaiLieuEditCard
                key={item.id}
                item={item}
                students={students}
                danhMuc={danhMuc}
                onCancel={() => setEditingId(null)}
                onSaved={(updated) => {
                  setItems((current) => (current || []).map((row) => (row.id === updated.id ? updated : row)))
                  setEditingId(null)
                }}
              />
            ) : (
              <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <TaiLieuPagesPreview trang={item.trang} className="h-36 w-full" />
                <p className="text-sm font-semibold text-slate-900">{item.danh_muc?.ten || 'Không rõ loại'}</p>
                <p className="text-xs text-slate-500">{item.ngay_viet || 'Chưa rõ ngày viết'}</p>
                <p className="text-xs text-slate-600">
                  {item.hoc_sinh.length > 0 ? item.hoc_sinh.map((hs) => `${hs.ho} ${hs.ten}`).join(', ') : 'Chưa gắn học sinh'}
                </p>
                {item.ghi_chu ? <p className="text-xs text-slate-500 italic">{item.ghi_chu}</p> : null}
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(item.id)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Xoá
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}

function TaiLieuEditCard({
  item,
  students,
  danhMuc,
  onCancel,
  onSaved,
}: {
  item: TaiLieuChiTiet
  students: HocSinh[]
  danhMuc: DanhMucTaiLieu[]
  onCancel: () => void
  onSaved: (item: TaiLieuChiTiet) => void
}) {
  const [danhMucId, setDanhMucId] = useState(item.danh_muc_tai_lieu_id)
  const [ngayViet, setNgayViet] = useState(item.ngay_viet || '')
  const [maHsList, setMaHsList] = useState(item.hoc_sinh.map((hs) => hs.ma_hs))
  const [ghiChu, setGhiChu] = useState(item.ghi_chu || '')
  const [danhMucList, setDanhMucList] = useState(danhMuc)
  const [trang, setTrang] = useState(item.trang)
  const [busy, setBusy] = useState(false)
  const [pageBusy, setPageBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const updated = await dataSource.updateTaiLieu(item.id, {
        danhMucTaiLieuId: danhMucId,
        ngayViet: ngayViet || null,
        ghiChu,
        maHsList,
      })
      onSaved(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được thay đổi.')
    } finally {
      setBusy(false)
    }
  }

  async function addPages(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setPageBusy(true)
    setError(null)
    try {
      const files = await Promise.all(Array.from(fileList).map((file) => chuanBiFileTaiLen(file)))
      const updated = await dataSource.addTaiLieuTrang(item.id, files.map((f) => f.file))
      setTrang(updated.trang)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thêm được trang.')
    } finally {
      setPageBusy(false)
    }
  }

  async function removePage(trangId: string) {
    if (!window.confirm('Xoá trang này khỏi tài liệu?')) return
    setPageBusy(true)
    setError(null)
    try {
      const updated = await dataSource.deleteTaiLieuTrang(trangId)
      setTrang(updated.trang)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xoá được trang.')
    } finally {
      setPageBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-blue-300 bg-blue-50 p-3 shadow-sm sm:col-span-2 lg:col-span-3">
      <p className="text-xs font-semibold uppercase text-blue-700">Sửa tài liệu</p>

      <div className="flex flex-wrap gap-2">
        {trang.map((page, pageIndex) => (
          <div key={page.id} className="relative w-20 shrink-0">
            <TaiLieuThumbnail duongDanLuuTru={page.duong_dan_luu_tru} loaiTep={page.loai_tep} className="h-20 w-20" />
            <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[10px] font-semibold text-white">
              {pageIndex + 1}
            </span>
            <button
              type="button"
              disabled={pageBusy}
              onClick={() => void removePage(page.id)}
              title="Xoá trang này"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow disabled:cursor-not-allowed disabled:opacity-60"
            >
              ×
            </button>
          </div>
        ))}
        <label className="flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600">
          <span className="text-lg" aria-hidden="true">
            +
          </span>
          <span className="text-[10px] font-semibold">Thêm trang</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            multiple
            className="hidden"
            disabled={pageBusy}
            onChange={(event) => {
              void addPages(event.target.files)
              event.target.value = ''
            }}
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Loại tài liệu
          <DanhMucTaiLieuSelect
            danhMuc={danhMucList}
            value={danhMucId}
            onChange={setDanhMucId}
            onCreated={(created) => setDanhMucList((current) => [...current, created])}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
          Ngày viết
          <input
            type="date"
            value={ngayViet}
            onChange={(event) => setNgayViet(event.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
        Học sinh liên quan
        <StudentMultiSelect students={students} selected={maHsList} onChange={setMaHsList} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
        Ghi chú
        <textarea
          value={ghiChu}
          onChange={(event) => setGhiChu(event.target.value)}
          className="min-h-16 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>
      {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="h-9 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
        <button type="button" onClick={onCancel} className="h-9 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-600">
          Huỷ
        </button>
      </div>
    </div>
  )
}

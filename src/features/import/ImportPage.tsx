import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { dataSource } from '../../data/client'
import type { DanhMucDiem, ImportResult, LoaiDuLieuImport, NhatKyImport, TrangThaiImport } from '../../data/types'

type ParseState =
  | { status: 'empty' }
  | { status: 'valid'; rows: Record<string, unknown>[] }
  | { status: 'invalid'; message: string }

const IMPORT_OPTIONS: Array<{ value: LoaiDuLieuImport; label: string }> = [
  { value: 'ghi_nhan', label: 'Ghi nhận' },
  { value: 'hoc_sinh', label: 'Học sinh' },
  { value: 'phu_huynh', label: 'Phụ huynh' },
  { value: 'ban_can_su', label: 'Ban cán sự' },
]

const PREVIEW_LIMIT = 8
const ISSUE_PREVIEW_LIMIT = 10

const STATUS_LABELS: Record<TrangThaiImport, string> = {
  thanh_cong: 'Thành công',
  loi_mot_phan: 'Lỗi một phần',
  that_bai: 'Thất bại',
  da_xoa: 'Đã xoá',
}

export function ImportPage() {
  const [loai, setLoai] = useState<LoaiDuLieuImport>('ghi_nhan')
  const [nguoiThucHien, setNguoiThucHien] = useState('GVCN')
  const [jsonText, setJsonText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importLogs, setImportLogs] = useState<NhatKyImport[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [deletingLog, setDeletingLog] = useState<string | null>(null)
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null)
  const [pointCatalog, setPointCatalog] = useState<DanhMucDiem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const parseState = useMemo(() => parseJsonRows(jsonText), [jsonText])
  const previewColumns = useMemo(() => {
    if (parseState.status !== 'valid') {
      return []
    }

    return collectPreviewColumns(parseState.rows)
  }, [parseState])
  const sortedImportLogs = useMemo(
    () => [...importLogs].sort((a, b) => sortDateDesc(a.thoi_gian, b.thoi_gian)),
    [importLogs],
  )
  const catalogCheck = useMemo(() => {
    if (loai !== 'ghi_nhan' || parseState.status !== 'valid') {
      return EMPTY_CATALOG_CHECK
    }

    return checkRecordCatalogLinks(parseState.rows, pointCatalog)
  }, [loai, parseState, pointCatalog])
  const hasCatalogBlockingError =
    loai === 'ghi_nhan' && (catalogLoading || Boolean(catalogError) || catalogCheck.errors.length > 0)

  useEffect(() => {
    void loadImportLogs()
    void loadPointCatalog()
  }, [])

  async function loadPointCatalog() {
    setCatalogLoading(true)
    setCatalogError(null)

    try {
      setPointCatalog(await dataSource.getPointCatalog())
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Không tải được DanhMucDiem để kiểm tra mã import.')
    } finally {
      setCatalogLoading(false)
    }
  }

  async function loadImportLogs() {
    setLogsLoading(true)
    setLogsError(null)

    try {
      setImportLogs(await dataSource.getImportLogs())
    } catch (error) {
      setLogsError(error instanceof Error ? error.message : 'Không tải được lịch sử import.')
    } finally {
      setLogsLoading(false)
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setFileName(file.name)
    setJsonText(await file.text())
    setResult(null)
    setSubmitError(null)
    event.target.value = ''
  }

  async function submitImport() {
    if (parseState.status !== 'valid' || parseState.rows.length === 0) {
      setSubmitError('JSON cần là một array có ít nhất 1 dòng object.')
      return
    }

    if (hasCatalogBlockingError) {
      setSubmitError('Cần sửa các lỗi liên kết DanhMucDiem trước khi import GhiNhan.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    setResult(null)

    try {
      const importResult = await dataSource.importJson(loai, parseState.rows, nguoiThucHien.trim())
      setResult(importResult)
      setDeleteMessage(null)
      await loadImportLogs()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Import không thành công.')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteImport(log: NhatKyImport) {
    if (log.trang_thai === 'da_xoa') {
      return
    }

    const confirmed = window.confirm(
      `Xoá toàn bộ dữ liệu GhiNhan của lần import ${log.ma_log}? Log import vẫn được giữ lại.`,
    )
    if (!confirmed) {
      return
    }

    setDeletingLog(log.ma_log)
    setLogsError(null)
    setDeleteMessage(null)

    try {
      const deleteResult = await dataSource.deleteImport(log.ma_log)
      setDeleteMessage(
        `Đã xoá ${deleteResult.so_dong_da_xoa} dòng GhiNhan của lần import ${deleteResult.ma_log}.`,
      )
      await loadImportLogs()
    } catch (error) {
      setLogsError(error instanceof Error ? error.message : 'Không xoá được dữ liệu import.')
    } finally {
      setDeletingLog(null)
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Import JSON</h2>
        <p className="text-sm text-slate-600">
          Dán JSON hoặc tải file để ghi dữ liệu vào Sheet và lưu nhật ký import.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Loại dữ liệu
          <select
            value={loai}
            onChange={(event) => {
              setLoai(event.target.value as LoaiDuLieuImport)
              setResult(null)
              setSubmitError(null)
            }}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {IMPORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Người thực hiện
          <input
            value={nguoiThucHien}
            onChange={(event) => setNguoiThucHien(event.target.value)}
            className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          File JSON
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleFileChange(event)}
            className="block h-10 cursor-pointer rounded-md border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:h-full file:border-0 file:bg-slate-100 file:px-3 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
          />
        </label>
      </div>

      {fileName ? (
        <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Đã tải: {fileName}
        </div>
      ) : null}

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        Nội dung JSON
        <textarea
          value={jsonText}
          onChange={(event) => {
            setJsonText(event.target.value)
            setFileName(null)
            setResult(null)
            setSubmitError(null)
          }}
          spellCheck={false}
          placeholder='[{"ma_hs":"HS001","ngay":"2026-07-13","tuan_so":2}]'
          className="min-h-64 resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      {parseState.status === 'invalid' ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {parseState.message}
        </div>
      ) : null}

      {parseState.status === 'valid' ? (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-bold text-slate-900">Xem trước</h3>
            <p className="text-sm font-medium text-blue-700">{parseState.rows.length} dòng</p>
          </div>

          <div className="overflow-hidden rounded-md border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    {previewColumns.map((column) => (
                      <th key={column} className="px-3 py-3">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parseState.rows.slice(0, PREVIEW_LIMIT).map((row, index) => (
                    <tr key={index}>
                      {previewColumns.map((column) => (
                        <td
                          key={column}
                          className="max-w-64 truncate whitespace-nowrap px-3 py-3 text-slate-700"
                          title={formatCell(row[column])}
                        >
                          {formatCell(row[column]) || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {parseState.rows.length > PREVIEW_LIMIT ? (
            <p className="text-xs text-slate-500">
              Đang hiển thị {PREVIEW_LIMIT} dòng đầu tiên.
            </p>
          ) : null}
        </div>
      ) : null}

      {loai === 'ghi_nhan' && parseState.status === 'valid' ? (
        <div
          className={`rounded-lg border p-4 text-sm ${
            catalogCheck.errors.length
              ? 'border-red-200 bg-red-50 text-red-900'
              : catalogCheck.warnings.length || catalogError
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-bold">Kiểm tra liên kết DanhMucDiem</h3>
            <button
              type="button"
              onClick={() => void loadPointCatalog()}
              disabled={catalogLoading}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {catalogLoading ? 'Đang tải...' : 'Tải lại danh mục'}
            </button>
          </div>

          <p className="mt-2">
            {catalogCheck.linkedCount} dòng có mã khớp danh mục hiện hành
            {catalogCheck.studyCount ? `, ${catalogCheck.studyCount} dòng điểm học tập không dùng mã` : ''}.
          </p>

          {catalogError ? <p className="mt-2 font-semibold">{catalogError}</p> : null}

          {catalogCheck.errors.length ? (
            <IssueList title="Cần sửa trước khi import" items={catalogCheck.errors} />
          ) : null}

          {catalogCheck.warnings.length ? (
            <IssueList title="Cảnh báo" items={catalogCheck.warnings} />
          ) : null}
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {submitError}
        </div>
      ) : null}

      {result ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Import {result.trang_thai}</p>
          <p>
            Log {result.ma_log}: {result.so_dong_thanh_cong} dòng thành công,{' '}
            {result.so_dong_loi} dòng lỗi.
          </p>
          {result.ghi_chu ? <p>{result.ghi_chu}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void submitImport()}
          disabled={submitting || parseState.status !== 'valid' || parseState.rows.length === 0 || hasCatalogBlockingError}
          className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submitting ? 'Đang import...' : 'Xác nhận import'}
        </button>
        <button
          type="button"
          onClick={() => {
            setJsonText('')
            setFileName(null)
            setSubmitError(null)
            setResult(null)
          }}
          className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Xoá nội dung
        </button>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Lịch sử import</h3>
            <p className="text-sm text-slate-600">
              Xoá nhanh dữ liệu GhiNhan theo đúng lần import, log vẫn được giữ để đối chiếu.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadImportLogs()}
            disabled={logsLoading}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {logsLoading ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>

        {logsError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {logsError}
          </div>
        ) : null}

        {deleteMessage ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {deleteMessage}
          </div>
        ) : null}

        {sortedImportLogs.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
            {logsLoading ? 'Đang tải lịch sử import...' : 'Chưa có lịch sử import.'}
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Log</th>
                    <th className="px-3 py-3">Thời gian</th>
                    <th className="px-3 py-3">Loại</th>
                    <th className="px-3 py-3">Số dòng</th>
                    <th className="px-3 py-3">Trạng thái</th>
                    <th className="px-3 py-3">Ghi chú</th>
                    <th className="px-3 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedImportLogs.map((log) => {
                    const isDeleting = deletingLog === log.ma_log
                    const canDelete = canDeleteImportLog(log)

                    return (
                      <tr key={log.ma_log}>
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-700">
                          {log.ma_log}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                          {formatDateTime(log.thoi_gian)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                          {log.loai_du_lieu}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-700">{log.so_dong}</td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusClass(log.trang_thai)}`}
                          >
                            {STATUS_LABELS[log.trang_thai] ?? log.trang_thai}
                          </span>
                        </td>
                        <td className="max-w-72 truncate px-3 py-3 text-slate-600" title={log.ghi_chu ?? ''}>
                          {log.ghi_chu || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void deleteImport(log)}
                            disabled={!canDelete || isDeleting}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
                            title={
                              canDelete
                                ? 'Xoá dữ liệu GhiNhan của lần import này'
                                : 'Chỉ xoá được import GhiNhan chưa bị xoá'
                            }
                          >
                            {isDeleting ? 'Đang xoá...' : 'Xoá dữ liệu của lần này'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

type CatalogCheck = {
  errors: string[]
  linkedCount: number
  studyCount: number
  warnings: string[]
}

const EMPTY_CATALOG_CHECK: CatalogCheck = {
  errors: [],
  linkedCount: 0,
  studyCount: 0,
  warnings: [],
}

function IssueList({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="mt-3">
      <p className="font-bold">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {items.slice(0, ISSUE_PREVIEW_LIMIT).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {items.length > ISSUE_PREVIEW_LIMIT ? (
        <p className="mt-1 text-xs font-semibold">Còn {items.length - ISSUE_PREVIEW_LIMIT} dòng khác.</p>
      ) : null}
    </div>
  )
}

function checkRecordCatalogLinks(rows: Record<string, unknown>[], catalog: DanhMucDiem[]): CatalogCheck {
  const catalogByCode = new Map(
    catalog.map((item) => [String(item.ma_danh_muc || '').trim().toUpperCase(), item]),
  )
  const result: CatalogCheck = { errors: [], linkedCount: 0, studyCount: 0, warnings: [] }

  rows.forEach((row, index) => {
    const rowNumber = index + 1
    const code = toText(row.ma_danh_muc).trim().toUpperCase()
    const type = toText(row.loai).trim()

    if (code) {
      const catalogItem = catalogByCode.get(code)
      if (!catalogItem) {
        result.errors.push(`Dòng ${rowNumber}: ma_danh_muc "${code}" chưa có trong DanhMucDiem.`)
        return
      }

      result.linkedCount += 1
      if (type === 'hoc_tap') {
        result.warnings.push(
          `Dòng ${rowNumber}: có ma_danh_muc "${code}" nên loại/điểm sẽ lấy theo DanhMucDiem, không giữ loai=hoc_tap.`,
        )
      }
      return
    }

    if (type === 'hoc_tap') {
      result.studyCount += 1
      return
    }

    result.errors.push(
      `Dòng ${rowNumber}: thiếu ma_danh_muc. Chỉ dòng loai=hoc_tap mới được import không có mã danh mục.`,
    )
  })

  return result
}

function parseJsonRows(jsonText: string): ParseState {
  const trimmed = jsonText.trim()
  if (!trimmed) {
    return { status: 'empty' }
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown

    const rows = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.ban_ghi)
        ? parsed.ban_ghi
        : null

    if (!rows) {
      return { status: 'invalid', message: 'JSON cần là array hoặc object có ban_ghi array.' }
    }

    if (!rows.every(isRecord)) {
      return { status: 'invalid', message: 'Mỗi phần tử trong array cần là object.' }
    }

    return { status: 'valid', rows }
  } catch (error) {
    return {
      status: 'invalid',
      message: error instanceof Error ? error.message : 'JSON không hợp lệ.',
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function collectPreviewColumns(rows: Record<string, unknown>[]): string[] {
  const columns = new Set<string>()

  rows.slice(0, PREVIEW_LIMIT).forEach((row) => {
    Object.keys(row).forEach((key) => columns.add(key))
  })

  return Array.from(columns).slice(0, 10)
}

function toText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

function canDeleteImportLog(log: NhatKyImport): boolean {
  return log.loai_du_lieu === 'ghi_nhan' && log.trang_thai !== 'da_xoa'
}

function sortDateDesc(left: string, right: string): number {
  const leftTime = new Date(left).getTime()
  const rightTime = new Date(right).getTime()

  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return String(right).localeCompare(String(left))
  }

  return rightTime - leftTime
}

function formatDateTime(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value || '-'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: value.includes(':') ? 'short' : undefined,
  }).format(parsed)
}

function getStatusClass(status: TrangThaiImport): string {
  if (status === 'da_xoa') {
    return 'bg-slate-100 text-slate-700'
  }

  if (status === 'thanh_cong') {
    return 'bg-emerald-100 text-emerald-800'
  }

  if (status === 'loi_mot_phan') {
    return 'bg-amber-100 text-amber-800'
  }

  return 'bg-red-100 text-red-800'
}

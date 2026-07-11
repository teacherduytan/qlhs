import { type ChangeEvent, useMemo, useState } from 'react'
import { dataSource } from '../../data/client'
import type { ImportResult, LoaiDuLieuImport } from '../../data/types'

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

export function ImportPage() {
  const [loai, setLoai] = useState<LoaiDuLieuImport>('ghi_nhan')
  const [nguoiThucHien, setNguoiThucHien] = useState('GVCN')
  const [jsonText, setJsonText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const parseState = useMemo(() => parseJsonRows(jsonText), [jsonText])
  const previewColumns = useMemo(() => {
    if (parseState.status !== 'valid') {
      return []
    }

    return collectPreviewColumns(parseState.rows)
  }, [parseState])

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

    setSubmitting(true)
    setSubmitError(null)
    setResult(null)

    try {
      const importResult = await dataSource.importJson(loai, parseState.rows, nguoiThucHien.trim())
      setResult(importResult)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Import không thành công.')
    } finally {
      setSubmitting(false)
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
          disabled={submitting || parseState.status !== 'valid' || parseState.rows.length === 0}
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
    </section>
  )
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

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

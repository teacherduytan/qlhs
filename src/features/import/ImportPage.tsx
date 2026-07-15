import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { dataSource } from '../../data/client'
import type {
  DanhMucDiem,
  ImportResult,
  LoaiDuLieuImport,
  NhatKyImport,
  NhomDiem,
  PhamViDanhMuc,
  TrangThaiImport,
} from '../../data/types'

type ParseState =
  | { status: 'empty' }
  | { status: 'valid'; rows: Record<string, unknown>[]; catalogSuggestions: CatalogSuggestion[] }
  | { status: 'invalid'; message: string }

type CatalogSuggestion = {
  nhom_goi_y: string
  ten_muc_goi_y: string
  diem_goi_y: string | number | null
  pham_vi_goi_y: string
  mo_ta_tho: string
  ly_do_can_tao: string
  ma_goi_y: string | null
}

type CatalogSuggestionForm = {
  sourceIndex: number
  ma_danh_muc: string
  nhom: NhomDiem
  ten_muc: string
  diem: string
  nghiem_trong: boolean
  pham_vi: PhamViDanhMuc
  mo_ta_tho: string
  ly_do_can_tao: string
}

const IMPORT_OPTIONS: Array<{ value: LoaiDuLieuImport; label: string }> = [
  { value: 'ghi_nhan', label: 'Ghi nhận' },
  { value: 'hoc_sinh', label: 'Học sinh' },
  { value: 'phu_huynh', label: 'Phụ huynh' },
  { value: 'ban_can_su', label: 'Ban cán sự' },
]

const PREVIEW_LIMIT = 8
const ISSUE_PREVIEW_LIMIT = 10
const GROUP_OPTIONS: Array<{ value: NhomDiem; label: string }> = [
  { value: 'CC', label: 'Chuyên cần' },
  { value: 'VS', label: 'Vệ sinh' },
  { value: 'NN', label: 'Nề nếp' },
  { value: 'KL', label: 'Trật tự kỷ luật' },
  { value: 'KT', label: 'Tích cực' },
]
const SCOPE_OPTIONS: Array<{ value: PhamViDanhMuc; label: string }> = [
  { value: 'ca_nhan', label: 'Cá nhân' },
  { value: 'tap_the', label: 'Tập thể' },
  { value: 'to_truc', label: 'Tổ trực' },
]

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
  const [suggestionForms, setSuggestionForms] = useState<CatalogSuggestionForm[]>([])
  const [creatingSuggestionIndex, setCreatingSuggestionIndex] = useState<number | null>(null)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null)

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

  useEffect(() => {
    if (parseState.status !== 'valid') {
      setSuggestionForms([])
      setSuggestionError(null)
      setSuggestionMessage(null)
      return
    }

    setSuggestionForms(
      parseState.catalogSuggestions.map((suggestion, index) =>
        suggestionToForm(suggestion, index, pointCatalog),
      ),
    )
    setSuggestionError(null)
    setSuggestionMessage(null)
  }, [jsonText, parseState.status])

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
    setSuggestionError(null)
    setSuggestionMessage(null)
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

  async function createCatalogFromSuggestion(form: CatalogSuggestionForm) {
    const code = form.ma_danh_muc.trim().toUpperCase()
    const point = Number(form.diem)

    if (!code || !form.ten_muc.trim()) {
      setSuggestionError('Cần có mã danh mục và tên mục trước khi tạo.')
      return
    }

    if (!Number.isFinite(point)) {
      setSuggestionError('Điểm gợi ý phải là số hợp lệ.')
      return
    }

    if (pointCatalog.some((item) => item.ma_danh_muc.trim().toUpperCase() === code)) {
      setSuggestionError(`Mã ${code} đã có trong DanhMucDiem. Hãy đổi mã hoặc chọn mã có sẵn trong JSON.`)
      return
    }

    const payload: DanhMucDiem = {
      ma_danh_muc: code,
      nhom: form.nhom,
      ten_muc: form.ten_muc.trim(),
      diem: point,
      nghiem_trong: form.nghiem_trong,
      pham_vi: form.pham_vi,
    }

    setCreatingSuggestionIndex(form.sourceIndex)
    setSuggestionError(null)
    setSuggestionMessage(null)

    try {
      const created = await dataSource.addPointCatalogItem(payload)
      const applyResult = applyCatalogCodeToJsonText(jsonText, form, created.ma_danh_muc)

      setPointCatalog((current) => [...current, created].sort(compareCatalogItems))
      setJsonText(applyResult.jsonText)
      setSuggestionMessage(
        applyResult.updatedRows > 0
          ? `Đã tạo ${created.ma_danh_muc} và gắn mã vào ${applyResult.updatedRows} dòng ghi nhận đang chờ.`
          : `Đã tạo ${created.ma_danh_muc}. Chưa tìm thấy dòng ghi nhận khớp tự động, cần gắn mã thủ công nếu còn lỗi thiếu mã.`,
      )
      await loadPointCatalog()
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : 'Không tạo được danh mục từ đề xuất.')
    } finally {
      setCreatingSuggestionIndex(null)
    }
  }

  function updateSuggestionForm(sourceIndex: number, patch: Partial<CatalogSuggestionForm>) {
    setSuggestionForms((current) =>
      current.map((form) => (form.sourceIndex === sourceIndex ? { ...form, ...patch } : form)),
    )
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
            setSuggestionError(null)
            setSuggestionMessage(null)
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

      {loai === 'ghi_nhan' && parseState.status === 'valid' && suggestionForms.length > 0 ? (
        <div className="space-y-3 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
          <div>
            <h3 className="text-base font-bold">Đề xuất danh mục mới từ AI</h3>
            <p className="mt-1">
              Tạo danh mục ngay tại đây để các dòng thiếu mã trong JSON được gắn mã và tiếp tục import.
            </p>
          </div>

          {suggestionError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">
              {suggestionError}
            </div>
          ) : null}

          {suggestionMessage ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
              {suggestionMessage}
            </div>
          ) : null}

          <div className="space-y-3">
            {suggestionForms.map((form) => {
              const isCreating = creatingSuggestionIndex === form.sourceIndex

              return (
                <div key={form.sourceIndex} className="rounded-lg border border-cyan-200 bg-white p-3">
                  <div className="grid gap-3 lg:grid-cols-[0.8fr_1.4fr_0.8fr_0.9fr_0.9fr_auto]">
                    <label className="flex flex-col gap-1 font-medium text-slate-700">
                      Mã
                      <input
                        value={form.ma_danh_muc}
                        onChange={(event) =>
                          updateSuggestionForm(form.sourceIndex, {
                            ma_danh_muc: event.target.value.toUpperCase(),
                          })
                        }
                        className="h-10 rounded-md border border-slate-300 px-3 font-mono text-sm font-normal text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      />
                    </label>

                    <label className="flex flex-col gap-1 font-medium text-slate-700">
                      Tên danh mục
                      <input
                        value={form.ten_muc}
                        onChange={(event) =>
                          updateSuggestionForm(form.sourceIndex, { ten_muc: event.target.value })
                        }
                        className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      />
                    </label>

                    <label className="flex flex-col gap-1 font-medium text-slate-700">
                      Nhóm
                      <select
                        value={form.nhom}
                        onChange={(event) =>
                          updateSuggestionForm(form.sourceIndex, { nhom: event.target.value as NhomDiem })
                        }
                        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      >
                        {GROUP_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.value} - {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 font-medium text-slate-700">
                      Điểm
                      <input
                        type="number"
                        value={form.diem}
                        onChange={(event) =>
                          updateSuggestionForm(form.sourceIndex, { diem: event.target.value })
                        }
                        className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      />
                    </label>

                    <label className="flex flex-col gap-1 font-medium text-slate-700">
                      Phạm vi
                      <select
                        value={form.pham_vi}
                        onChange={(event) =>
                          updateSuggestionForm(form.sourceIndex, {
                            pham_vi: event.target.value as PhamViDanhMuc,
                          })
                        }
                        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      >
                        {SCOPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => void createCatalogFromSuggestion(form)}
                      disabled={isCreating || catalogLoading}
                      className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-cyan-700 px-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {isCreating ? 'Đang tạo...' : 'Tạo & gắn mã'}
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                    <p>
                      <span className="font-semibold text-slate-700">Mô tả thô:</span>{' '}
                      {form.mo_ta_tho || '-'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Lý do:</span>{' '}
                      {form.ly_do_can_tao || '-'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
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
            setSuggestionError(null)
            setSuggestionMessage(null)
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
    const catalogSuggestions =
      isRecord(parsed) && Array.isArray(parsed.de_xuat_danh_muc)
        ? parsed.de_xuat_danh_muc.filter(isRecord).map(normalizeCatalogSuggestion)
        : []

    if (!rows) {
      return { status: 'invalid', message: 'JSON cần là array hoặc object có ban_ghi array.' }
    }

    if (!rows.every(isRecord)) {
      return { status: 'invalid', message: 'Mỗi phần tử trong array cần là object.' }
    }

    return { status: 'valid', rows, catalogSuggestions }
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

function normalizeCatalogSuggestion(row: Record<string, unknown>): CatalogSuggestion {
  return {
    nhom_goi_y: toText(row.nhom_goi_y).trim().toUpperCase(),
    ten_muc_goi_y: toText(row.ten_muc_goi_y).trim(),
    diem_goi_y: row.diem_goi_y === undefined ? null : (row.diem_goi_y as string | number | null),
    pham_vi_goi_y: toText(row.pham_vi_goi_y).trim(),
    mo_ta_tho: toText(row.mo_ta_tho).trim(),
    ly_do_can_tao: toText(row.ly_do_can_tao).trim(),
    ma_goi_y: toText(row.ma_goi_y).trim() || null,
  }
}

function suggestionToForm(
  suggestion: CatalogSuggestion,
  sourceIndex: number,
  catalog: DanhMucDiem[],
): CatalogSuggestionForm {
  const group = toPointGroup(suggestion.nhom_goi_y, suggestion.diem_goi_y)

  return {
    sourceIndex,
    ma_danh_muc: normalizeCatalogCode(suggestion.ma_goi_y) || nextCodeForGroup(group, catalog),
    nhom: group,
    ten_muc: suggestion.ten_muc_goi_y || suggestion.mo_ta_tho,
    diem: toText(suggestion.diem_goi_y || (group === 'KT' ? 1 : -1)),
    nghiem_trong: Number(suggestion.diem_goi_y) <= -10,
    pham_vi: toCatalogScope(suggestion.pham_vi_goi_y),
    mo_ta_tho: suggestion.mo_ta_tho,
    ly_do_can_tao: suggestion.ly_do_can_tao,
  }
}

function toPointGroup(value: string, point: string | number | null): NhomDiem {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'CC' || normalized === 'VS' || normalized === 'NN' || normalized === 'KL' || normalized === 'KT') {
    return normalized
  }

  return Number(point) > 0 ? 'KT' : 'NN'
}

function toCatalogScope(value: string): PhamViDanhMuc {
  const normalized = normalizeForMatch(value).replace(/\s+/g, '_')
  if (normalized === 'tap_the') return 'tap_the'
  if (normalized === 'to_truc') return 'to_truc'
  return 'ca_nhan'
}

function normalizeCatalogCode(value: string | null): string {
  return toText(value).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')
}

function nextCodeForGroup(group: NhomDiem, catalog: DanhMucDiem[]): string {
  const maxNumber = catalog.reduce((max, item) => {
    if (item.nhom !== group) return max
    const match = item.ma_danh_muc.match(/(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)

  return `${group}${String(maxNumber + 1).padStart(2, '0')}`
}

function applyCatalogCodeToJsonText(
  jsonText: string,
  form: CatalogSuggestionForm,
  code: string,
): { jsonText: string; updatedRows: number } {
  try {
    const parsed = JSON.parse(jsonText) as unknown
    const sourceRows = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.ban_ghi)
        ? parsed.ban_ghi
        : null

    if (!sourceRows || !sourceRows.every(isRecord)) {
      return { jsonText, updatedRows: 0 }
    }

    const pendingIndexes = sourceRows
      .map((row, index) => (rowNeedsCatalog(row) ? index : -1))
      .filter((index) => index >= 0)
    let updatedRows = 0
    const matchedIndexes = sourceRows
      .map((row, index) => (rowNeedsCatalog(row) && rowMatchesSuggestion(row, form) ? index : -1))
      .filter((index) => index >= 0)
    const indexesToUpdate = matchedIndexes.length > 0 ? matchedIndexes : pendingIndexes.length === 1 ? pendingIndexes : []

    const rows = sourceRows.map((row, index) => {
      if (!indexesToUpdate.includes(index)) {
        return row
      }

      updatedRows += 1
      return {
        ...row,
        ma_danh_muc: code,
        noi_dung: cleanupNeedCreatePrefix(toText(row.noi_dung)) || form.mo_ta_tho || form.ten_muc,
      }
    })

    if (Array.isArray(parsed)) {
      return { jsonText: JSON.stringify(rows, null, 2), updatedRows }
    }

    const nextPayload: Record<string, unknown> = { ...(parsed as Record<string, unknown>), ban_ghi: rows }
    const suggestions = Array.isArray(nextPayload.de_xuat_danh_muc)
      ? nextPayload.de_xuat_danh_muc.filter((_item: unknown, index: number) => index !== form.sourceIndex)
      : []

    nextPayload.de_xuat_danh_muc = suggestions
    return { jsonText: JSON.stringify(nextPayload, null, 2), updatedRows }
  } catch {
    return { jsonText, updatedRows: 0 }
  }
}

function rowNeedsCatalog(row: Record<string, unknown>): boolean {
  return !toText(row.ma_danh_muc).trim() && toText(row.loai).trim() !== 'hoc_tap'
}

function rowMatchesSuggestion(row: Record<string, unknown>, form: CatalogSuggestionForm): boolean {
  const haystack = normalizeForMatch(`${toText(row.noi_dung)} ${toText(row.ly_do)}`)
  const needles = [form.mo_ta_tho, form.ten_muc].map(normalizeForMatch).filter(Boolean)

  return needles.some((needle) => haystack.includes(needle))
}

function cleanupNeedCreatePrefix(value: string): string {
  return value.replace(/^\s*\[CẦN TẠO DANH MỤC[^\]]*\]\s*/i, '').trim()
}

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function compareCatalogItems(left: DanhMucDiem, right: DanhMucDiem): number {
  return `${left.nhom}-${left.ma_danh_muc}`.localeCompare(`${right.nhom}-${right.ma_danh_muc}`)
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

import { type ChangeEvent, useMemo, useState } from 'react'
import { dataSource } from '../../data/client'
import type { HocPhiImportPayload, HocPhiImportResult } from '../../data/types'

type ParseState =
  | { status: 'empty' }
  | { status: 'valid'; payload: HocPhiImportPayload }
  | { status: 'invalid'; message: string }

// Khoi nhap hoc phi (dinh dang cot dong - xem
// docs/hocphiPHxem/15-chi-tiet-hoc-phi-dong-cot.md), nhung vao 4 bang moi
// (hoc_phi_ky, hoc_phi_cot_cau_hinh, hoc_phi_tong, hoc_phi_chi_tiet).
// Duoc nhung vao ImportPage.tsx nhu 1 che do rieng (khong con la route/trang
// doc lap) de gop chung 1 luong "Import" duy nhat trong app, chon qua nut
// gat che do o dau trang. File nguon (Excel xuat ra) khong co ma_hs, chi co
// ho_ten - server se tu khop theo ten (khong dau, khong phan biet hoa/
// thuong) va tra ve danh sach "can ra soat" cho cac dong khong khop duoc,
// KHONG chan ca lan nhap.
export function HocPhiImportPage() {
  const [jsonText, setJsonText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [taoThongBao, setTaoThongBao] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<HocPhiImportResult | null>(null)

  const parseState = useMemo<ParseState>(() => parseHocPhiPayload(jsonText), [jsonText])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setJsonText(await file.text())
    setResult(null)
    setSubmitError(null)
    event.target.value = ''
  }

  async function submitImport() {
    if (parseState.status !== 'valid') {
      setSubmitError('JSON chưa hợp lệ theo định dạng cột động.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    setResult(null)

    try {
      const importResult = await dataSource.upsertHocPhiKy(parseState.payload, taoThongBao)
      setResult(importResult)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Nhập học phí không thành công.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">Nhập học phí (cột động)</h3>
        <p className="text-sm text-slate-600">
          Dán JSON hoặc tải file theo định dạng ở{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5">docs/hocphiPHxem/15-chi-tiet-hoc-phi-dong-cot.md</code>{' '}
          để cập nhật chi tiết học phí cho một kỳ (theo <code className="rounded bg-slate-100 px-1 py-0.5">ma_ky</code>). File
          nguồn không có mã học sinh — hệ thống sẽ tự khớp theo họ tên, dòng nào không khớp được sẽ liệt kê để rà soát
          thủ công, không chặn phần còn lại.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          File JSON
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleFileChange(event)}
            className="block h-10 cursor-pointer rounded-md border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:h-full file:border-0 file:bg-slate-100 file:px-3 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 md:justify-self-end md:self-end">
          <input
            type="checkbox"
            checked={taoThongBao}
            onChange={(event) => setTaoThongBao(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Tự tạo/cập nhật thông báo cho phụ huynh sau khi nhập
        </label>
      </div>

      {fileName ? (
        <div className="rounded-md border border-blue-100 bg-blue-100 px-3 py-2 text-sm text-blue-900">
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
          placeholder='{"ma_ky":"2026-09","ten_ky":"Tháng 9/2026","cot_hoc_phi":[...],"hoc_sinh":[...]}'
          className="min-h-64 resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      {parseState.status === 'invalid' ? (
        <div className="rounded-lg border border-amber-200 bg-amber-100 p-4 text-sm text-amber-900">
          {parseState.message}
        </div>
      ) : null}

      {parseState.status === 'valid' ? (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p>
            Kỳ <b>{parseState.payload.ma_ky}</b> — {parseState.payload.ten_ky} — {parseState.payload.cot_hoc_phi.length}{' '}
            cột, {parseState.payload.hoc_sinh.length} học sinh trong file.
          </p>
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-lg border border-red-200 bg-red-100 p-4 text-sm font-semibold text-red-900">
          {submitError}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void submitImport()}
        disabled={parseState.status !== 'valid' || submitting}
        className="h-11 rounded-md bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {submitting ? 'Đang nhập...' : 'Xác nhận nhập học phí'}
      </button>

      {result ? (
        <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-100 p-4 text-sm text-emerald-900">
          <p className="font-bold">
            Đã nhập kỳ {result.maKy}: {result.daKhopMaHs}/{result.tongSoDong} dòng khớp học sinh thành công.
          </p>

          {result.canRaSoat.length > 0 ? (
            <div className="rounded-md border border-amber-300 bg-amber-100 p-3 text-amber-900">
              <p className="font-bold">Cần rà soát thủ công ({result.canRaSoat.length} dòng chưa khớp học sinh):</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {result.canRaSoat.map((item, index) => (
                  <li key={index}>
                    {item.stt ? `STT ${item.stt} — ` : ''}
                    {item.ho_ten}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                Hãy kiểm tra tên trong file (sai chính tả, viết tắt...) hoặc bổ sung học sinh vào danh sách rồi nhập
                lại — nhập lại cùng <code className="rounded bg-white px-1 py-0.5">ma_ky</code> sẽ ghi đè, không tạo
                trùng.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function parseHocPhiPayload(text: string): ParseState {
  const trimmed = text.trim()
  if (!trimmed) return { status: 'empty' }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { status: 'invalid', message: 'JSON không hợp lệ — kiểm tra lại dấu ngoặc, dấu phẩy.' }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { status: 'invalid', message: 'JSON phải là một object (không phải mảng) chứa ma_ky, cot_hoc_phi, hoc_sinh.' }
  }

  const payload = parsed as Record<string, unknown>

  if (typeof payload.ma_ky !== 'string' || !payload.ma_ky.trim()) {
    return { status: 'invalid', message: 'Thiếu hoặc sai định dạng trường "ma_ky" (chuỗi, ví dụ "2026-09").' }
  }
  if (typeof payload.ten_ky !== 'string' || !payload.ten_ky.trim()) {
    return { status: 'invalid', message: 'Thiếu hoặc sai định dạng trường "ten_ky" (chuỗi).' }
  }
  if (!Array.isArray(payload.cot_hoc_phi) || payload.cot_hoc_phi.length === 0) {
    return { status: 'invalid', message: 'Thiếu "cot_hoc_phi" (mảng định nghĩa cột) hoặc mảng đang rỗng.' }
  }
  if (!Array.isArray(payload.hoc_sinh) || payload.hoc_sinh.length === 0) {
    return { status: 'invalid', message: 'Thiếu "hoc_sinh" (mảng dữ liệu học sinh) hoặc mảng đang rỗng.' }
  }

  for (const cot of payload.cot_hoc_phi) {
    if (
      !cot ||
      typeof cot !== 'object' ||
      typeof (cot as Record<string, unknown>).ma_cot !== 'string' ||
      typeof (cot as Record<string, unknown>).ten_cot !== 'string' ||
      !['thu', 'giam_tru', 'no'].includes((cot as Record<string, unknown>).loai as string)
    ) {
      return {
        status: 'invalid',
        message: 'Mỗi phần tử "cot_hoc_phi" cần có ma_cot, ten_cot (chuỗi) và loai (thu/giam_tru/no).',
      }
    }
  }

  for (const hs of payload.hoc_sinh) {
    if (
      !hs ||
      typeof hs !== 'object' ||
      typeof (hs as Record<string, unknown>).ho_ten !== 'string' ||
      !(hs as Record<string, unknown>).ho_ten
    ) {
      return { status: 'invalid', message: 'Mỗi phần tử "hoc_sinh" cần có "ho_ten" (chuỗi, không rỗng).' }
    }
    if (typeof (hs as Record<string, unknown>).chi_tiet !== 'object' || (hs as Record<string, unknown>).chi_tiet === null) {
      return { status: 'invalid', message: 'Mỗi phần tử "hoc_sinh" cần có "chi_tiet" (object key-value theo ma_cot).' }
    }
  }

  return { status: 'valid', payload: payload as unknown as HocPhiImportPayload }
}

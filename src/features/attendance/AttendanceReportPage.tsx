import { type FormEvent, useMemo, useState } from 'react'
import { dataSource } from '../../data/client'
import type {
  AttendanceByDien,
  AttendanceFormPayload,
  AttendanceMealKey,
  AttendanceReport,
  BuoiHoc,
  DienHocSinh,
} from '../../data/types'

type AttendanceFormState = {
  ngay: string
  buoi: BuoiHoc
  treTinhCoMat: boolean
}

const DIEN_ORDER: DienHocSinh[] = ['NT', 'BT', '2B']
const DIEN_LABELS: Record<DienHocSinh, string> = {
  NT: 'Nội trú',
  BT: 'Bán trú',
  '2B': 'Hai buổi',
}

const MEAL_FIELDS: Array<{ key: AttendanceMealKey; label: string }> = [
  { key: 'mon_chinh_1', label: 'Số món chính 1' },
  { key: 'mon_chinh_2', label: 'Số món chính 2' },
  { key: 'mon_phu_1', label: 'Số món phụ 1 (Trứng)' },
  { key: 'mon_phu_2', label: 'Số món phụ 2 (Cá hộp)' },
  { key: 'mon_chinh_1_ngay_mai', label: 'Số món chính 1 (ngày mai)' },
  { key: 'mon_chinh_2_ngay_mai', label: 'Số món chính 2 (ngày mai)' },
  { key: 'mon_phu_1_ngay_mai', label: 'Số món phụ 1 (ngày mai) Trứng' },
  { key: 'mon_phu_2_ngay_mai', label: 'Số món phụ 2 (ngày mai) Cá hộp' },
]

const EMPTY_COUNTS: AttendanceByDien = { NT: 0, BT: 0, '2B': 0 }

const EMPTY_MEALS: Record<AttendanceMealKey, string> = {
  mon_chinh_1: '',
  mon_chinh_2: '',
  mon_phu_1: '',
  mon_phu_2: '',
  mon_chinh_1_ngay_mai: '',
  mon_chinh_2_ngay_mai: '',
  mon_phu_1_ngay_mai: '',
  mon_phu_2_ngay_mai: '',
}

const inputClass =
  'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

export function AttendanceReportPage() {
  const [form, setForm] = useState<AttendanceFormState>({
    ngay: toDateInputValue(new Date()),
    buoi: 'SANG',
    treTinhCoMat: true,
  })
  const [report, setReport] = useState<AttendanceReport | null>(null)
  const [presentCounts, setPresentCounts] = useState<AttendanceByDien>(EMPTY_COUNTS)
  const [absentText, setAbsentText] = useState('')
  const [meals, setMeals] = useState<Record<AttendanceMealKey, string>>(EMPTY_MEALS)
  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const absentList = useMemo(
    () =>
      absentText
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    [absentText],
  )

  async function calculateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const result = await dataSource.calculateAttendanceReport(form.ngay, form.buoi, form.treTinhCoMat)
      setReport(result)
      setPresentCounts(result.co_mat)
      setAbsentText(result.vang.join('\n'))
      setMessage(`Đã tính từ ${result.sheet_name}, tuần ${result.tuan_so}.`)
    } catch (calcError) {
      setReport(null)
      setError(calcError instanceof Error ? calcError.message : 'Không tính được báo cáo sĩ số.')
    } finally {
      setLoading(false)
    }
  }

  async function openPrefilledForm() {
    if (!report) {
      setError('Hãy bấm Tính toán trước khi mở Google Form.')
      return
    }

    setOpening(true)
    setError(null)
    setMessage(null)

    const payload: AttendanceFormPayload = {
      ngay: report.ngay,
      buoi: report.buoi,
      co_mat: presentCounts,
      vang: absentList,
      so_mon: meals,
    }

    try {
      const result = await dataSource.buildAttendanceFormUrl(payload)
      window.open(result.url, '_blank', 'noopener,noreferrer')
      setMessage('Đã mở Google Form ở tab mới. Giáo viên kiểm tra lại rồi tự bấm Gửi trên Form.')
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Không tạo được link Google Form.')
    } finally {
      setOpening(false)
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
        <p className="text-xs font-semibold uppercase text-sky-700">Báo cáo hằng ngày</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">Báo cáo sĩ số 11C5</h2>
        <p className="mt-2 text-sm text-slate-700">
          App chỉ tạo link Google Form đã điền sẵn. Giáo viên vẫn tự kiểm tra và bấm Gửi trên Form.
        </p>
      </div>

      <form onSubmit={calculateReport} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            Ngày
            <input
              required
              type="date"
              value={form.ngay}
              onChange={(event) => setForm((current) => ({ ...current, ngay: event.target.value }))}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
            Buổi
            <select
              value={form.buoi}
              onChange={(event) => setForm((current) => ({ ...current, buoi: event.target.value as BuoiHoc }))}
              className={inputClass}
            >
              <option value="SANG">Sáng</option>
              <option value="CHIEU">Chiều</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="h-10 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? 'Đang tính...' : 'Tính toán'}
          </button>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.treTinhCoMat}
            onChange={(event) => setForm((current) => ({ ...current, treTinhCoMat: event.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          Tính học sinh đi trễ là có mặt
        </label>
      </form>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      ) : null}

      {report ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-700">Kết quả</p>
                <h3 className="text-lg font-bold text-slate-950">
                  {labelSession(report.buoi)} ngày {formatDate(report.ngay)}
                </h3>
              </div>
              <p className="text-xs font-medium text-slate-500">{report.sheet_name}</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {DIEN_ORDER.map((dien) => (
                <label key={dien} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <span className="text-xs font-semibold uppercase text-slate-500">{DIEN_LABELS[dien]}</span>
                  <span className="mt-1 flex items-end gap-1">
                    <input
                      type="number"
                      min={0}
                      value={presentCounts[dien]}
                      onChange={(event) =>
                        setPresentCounts((current) => ({
                          ...current,
                          [dien]: Number(event.target.value) || 0,
                        }))
                      }
                      className="h-10 w-20 rounded-md border border-slate-300 bg-white px-2 text-lg font-bold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <span className="pb-2 text-sm font-medium text-slate-600">/ {report.tong[dien]} có mặt</span>
                  </span>
                </label>
              ))}
            </div>

            <label className="mt-4 flex flex-col gap-1 text-sm font-semibold text-slate-700">
              Danh sách vắng
              <textarea
                value={absentText}
                onChange={(event) => setAbsentText(event.target.value)}
                rows={6}
                placeholder="Mỗi dòng một học sinh vắng, ví dụ: Nguyễn Văn A (BT)"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-blue-700">Google Form</p>
            <h3 className="text-lg font-bold text-slate-950">Số món ăn</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {MEAL_FIELDS.map((field) => (
                <label key={field.key} className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                  {field.label}
                  <input
                    type="number"
                    min={0}
                    value={meals[field.key]}
                    onChange={(event) =>
                      setMeals((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    className={inputClass}
                  />
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void openPrefilledForm()}
              disabled={opening}
              className="mt-5 h-11 w-full rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {opening ? 'Đang tạo link...' : 'Mở Google Form đã điền sẵn'}
            </button>
          </section>
        </div>
      ) : null}
    </section>
  )
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function labelSession(value: BuoiHoc): string {
  return value === 'SANG' ? 'Sáng' : 'Chiều'
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-')
  return day && month && year ? `${day}/${month}/${year}` : value
}

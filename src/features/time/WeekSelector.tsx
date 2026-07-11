import type { CauHinhTuan, GhiNhan } from '../../data/types'

type WeekSelectorProps = {
  label?: string
  value: number
  weeks: CauHinhTuan[]
  onChange: (tuanSo: number) => void
}

type WeekDatePickerProps = {
  disabled?: boolean
  label?: string
  selectedWeek?: CauHinhTuan
  value: string
  onChange: (date: string) => void
}

export function WeekSelector({ label = 'Tuần', onChange, value, weeks }: WeekSelectorProps) {
  const sortedWeeks = sortWeeks(weeks)

  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {sortedWeeks.length ? (
          sortedWeeks.map((week) => (
            <option key={week.tuan_so} value={week.tuan_so}>
              {formatWeekLabel(week)}
            </option>
          ))
        ) : (
          <option value={value}>Tuần {value}</option>
        )}
      </select>
    </label>
  )
}

export function WeekDatePicker({
  disabled,
  label = 'Ngày cụ thể',
  onChange,
  selectedWeek,
  value,
}: WeekDatePickerProps) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <div className="flex gap-2">
        <input
          type="date"
          value={value}
          min={selectedWeek?.tu_ngay || undefined}
          max={selectedWeek?.den_ngay || undefined}
          disabled={disabled || !selectedWeek}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        />
        <button
          type="button"
          onClick={() => onChange('')}
          disabled={!value}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          Cả tuần
        </button>
      </div>
    </label>
  )
}

export function selectDefaultWeek(weeks: CauHinhTuan[], records: GhiNhan[] = []): number {
  const sortedWeeks = sortWeeks(weeks)
  const today = startOfDay(new Date())
  const currentWeek = sortedWeeks.find((week) => isDateInWeek(today, week))

  if (currentWeek) {
    return currentWeek.tuan_so
  }

  const latestPastWeek = [...sortedWeeks]
    .reverse()
    .find((week) => {
      const start = parseIsoDate(week.tu_ngay)
      return start ? start <= today : false
    })

  if (latestPastWeek) {
    return latestPastWeek.tuan_so
  }

  if (sortedWeeks[0]) {
    return sortedWeeks[0].tuan_so
  }

  return Math.max(1, ...records.map((record) => record.tuan_so || 0))
}

export function sortWeeks(weeks: CauHinhTuan[]): CauHinhTuan[] {
  return [...weeks].sort((left, right) => {
    const leftDate = parseIsoDate(left.tu_ngay)?.getTime() ?? 0
    const rightDate = parseIsoDate(right.tu_ngay)?.getTime() ?? 0

    if (leftDate !== rightDate) {
      return leftDate - rightDate
    }

    return left.tuan_so - right.tuan_so
  })
}

export function findWeek(weeks: CauHinhTuan[], tuanSo: number): CauHinhTuan | undefined {
  return weeks.find((week) => week.tuan_so === tuanSo)
}

export function formatWeekLabel(week: CauHinhTuan): string {
  return `Tuần ${week.tuan_so} (${formatShortDate(week.tu_ngay)} - ${formatShortDate(week.den_ngay)})`
}

function isDateInWeek(date: Date, week: CauHinhTuan): boolean {
  const start = parseIsoDate(week.tu_ngay)
  const end = parseIsoDate(week.den_ngay)

  return Boolean(start && end && date >= start && date <= end)
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed)
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatShortDate(value: string): string {
  const date = parseIsoDate(value)
  if (!date) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}

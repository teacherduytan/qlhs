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
  const selectableWeeks = getSelectableWeeks(weeks)
  const selectedIndex = selectableWeeks.findIndex((week) => week.tuan_so === value)
  const selectedWeek = selectableWeeks[selectedIndex]
  const quickGroups = groupWeeksByMonth(selectableWeeks)
  const currentWeekValue = selectDefaultWeek(weeks)

  return (
    <div className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const previousWeek = selectableWeeks[selectedIndex - 1]
            if (previousWeek) onChange(previousWeek.tuan_so)
          }}
          disabled={selectedIndex <= 0}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          ← Tuần trước
        </button>

        <div className="min-w-[220px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900">
          {selectedWeek ? formatWeekLabel(selectedWeek) : `Tuần ${value}`}
        </div>

        <button
          type="button"
          onClick={() => {
            const nextWeek = selectableWeeks[selectedIndex + 1]
            if (nextWeek) onChange(nextWeek.tuan_so)
          }}
          disabled={selectedIndex < 0 || selectedIndex >= selectableWeeks.length - 1}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          Tuần sau →
        </button>

        <button
          type="button"
          onClick={() => onChange(currentWeekValue)}
          disabled={value === currentWeekValue || selectableWeeks.length === 0}
          className="h-10 rounded-md border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          Về tuần hiện tại
        </button>

        <details className="relative">
          <summary className="flex h-10 cursor-pointer list-none items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Chọn nhanh
          </summary>
          <div className="absolute left-0 z-20 mt-2 w-72 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
            <select
              value={selectedWeek?.tuan_so ?? ''}
              onChange={(event) => onChange(Number(event.target.value))}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {quickGroups.length ? (
                quickGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.weeks.map((week) => (
                      <option key={week.tuan_so} value={week.tuan_so}>
                        {formatWeekLabel(week)}
                      </option>
                    ))}
                  </optgroup>
                ))
              ) : (
                <option value={value}>Tuần {value}</option>
              )}
            </select>
          </div>
        </details>
      </div>
    </div>
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
  const sortedWeeks = getSelectableWeeks(weeks)
  const today = startOfDay(new Date())
  const currentWeek = findWeekByDate(sortedWeeks, today)

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

export function getSelectableWeeks(weeks: CauHinhTuan[]): CauHinhTuan[] {
  return sortWeeks(weeks).filter((week) => week.loai_tuan !== 'nghi_le')
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

export function findWeekByDate(weeks: CauHinhTuan[], date: Date | string): CauHinhTuan | undefined {
  const target = typeof date === 'string' ? parseIsoDate(date) : startOfDay(date)
  if (!target) {
    return undefined
  }

  return getSelectableWeeks(weeks).find((week) => isDateInWeek(target, week))
}

export function getTodayIsoDate(): string {
  return toIsoDate(startOfDay(new Date()))
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

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

function groupWeeksByMonth(weeks: CauHinhTuan[]): Array<{ label: string; weeks: CauHinhTuan[] }> {
  const groups = new Map<string, CauHinhTuan[]>()

  weeks.forEach((week) => {
    const start = parseIsoDate(week.tu_ngay)
    const label = start ? `${getSemesterLabel(start)} › Tháng ${start.getMonth() + 1}/${start.getFullYear()}` : 'Chưa rõ tháng'
    const group = groups.get(label) || []
    group.push(week)
    groups.set(label, group)
  })

  return Array.from(groups.entries()).map(([label, groupWeeks]) => ({
    label,
    weeks: groupWeeks,
  }))
}

function getSemesterLabel(date: Date): string {
  const month = date.getMonth() + 1
  return month >= 8 && month <= 12 ? 'Học kỳ 1' : 'Học kỳ 2'
}

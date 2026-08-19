import { useState } from 'react'
import type { HocSinh } from '../../data/types'

/** Multi-select hoc sinh voi o tim nhanh theo ten — dung chung cho form tai len va bo loc thu vien tai lieu. */
export function StudentMultiSelect({
  students,
  selected,
  onChange,
}: {
  students: HocSinh[]
  selected: string[]
  onChange: (maHsList: string[]) => void
}) {
  const [search, setSearch] = useState('')
  const normalizedSearch = normalizeText(search)
  const filtered = normalizedSearch
    ? students.filter((student) => normalizeText(`${student.ho} ${student.ten}`).includes(normalizedSearch))
    : students

  function toggle(maHs: string) {
    if (selected.includes(maHs)) {
      onChange(selected.filter((item) => item !== maHs))
    } else {
      onChange([...selected, maHs])
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((maHs) => {
            const student = students.find((item) => item.ma_hs === maHs)
            return (
              <button
                key={maHs}
                type="button"
                onClick={() => toggle(maHs)}
                className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
              >
                {student ? `${student.ho} ${student.ten}` : maHs}
                <span aria-hidden="true">×</span>
              </button>
            )
          })}
        </div>
      ) : null}

      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Tìm nhanh theo tên..."
        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <p className="p-2 text-xs text-slate-500">Không tìm thấy học sinh phù hợp.</p>
        ) : (
          filtered.map((student) => (
            <label
              key={student.ma_hs}
              className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-2 py-1.5 text-sm last:border-b-0 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.includes(student.ma_hs)}
                onChange={() => toggle(student.ma_hs)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <span className="text-slate-500">{student.tt}.</span>
              {student.ho} {student.ten}
            </label>
          ))
        )}
      </div>
    </div>
  )
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toLowerCase()
}

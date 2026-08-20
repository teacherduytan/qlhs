import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type { HocSinh, NhatKyImport, NoiDungTinNhan } from '../../data/types'
import { StudentPhonePill } from './StudentsPage'

type Batch = {
  key: string
  log: NhatKyImport | null
  messages: NoiDungTinNhan[]
}

export function MessageBatchesPage() {
  const [students, setStudents] = useState<HocSinh[]>([])
  const [messages, setMessages] = useState<NoiDungTinNhan[]>([])
  const [logs, setLogs] = useState<NhatKyImport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [collapsedBatches, setCollapsedBatches] = useState<Set<string>>(new Set())

  useEffect(() => {
    let active = true

    Promise.all([dataSource.getStudents(), dataSource.getMessageContents(), dataSource.getImportLogs()])
      .then(([studentRows, messageRows, logRows]) => {
        if (!active) return
        setStudents(studentRows)
        setMessages(messageRows)
        setLogs(logRows)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Không tải được danh sách tin nhắn.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const studentByMaHs = useMemo(() => new Map(students.map((student) => [student.ma_hs, student])), [students])

  const batches = useMemo(() => {
    const logByMaLog = new Map(logs.map((log) => [log.ma_log, log]))
    const grouped = new Map<string, NoiDungTinNhan[]>()

    for (const message of messages) {
      if (!message.da_duyet) continue
      const key = message.nguon_import || 'khong-ro-dot'
      const list = grouped.get(key)
      if (list) list.push(message)
      else grouped.set(key, [message])
    }

    const result: Batch[] = Array.from(grouped.entries()).map(([key, list]) => ({
      key,
      log: logByMaLog.get(key) || null,
      messages: [...list].sort((left, right) => {
        const leftStudent = studentByMaHs.get(left.ma_hs)
        const rightStudent = studentByMaHs.get(right.ma_hs)
        return (leftStudent?.tt || 0) - (rightStudent?.tt || 0)
      }),
    }))

    result.sort((left, right) => {
      const leftTime = left.log?.thoi_gian || ''
      const rightTime = right.log?.thoi_gian || ''
      return leftTime < rightTime ? 1 : leftTime > rightTime ? -1 : 0
    })

    return result
  }, [messages, logs, studentByMaHs])

  const keyword = search.trim().toLowerCase()
  const visibleBatches = keyword
    ? batches
        .map((batch) => ({
          ...batch,
          messages: batch.messages.filter((message) => {
            const student = studentByMaHs.get(message.ma_hs)
            const haystack = `${student?.ho || ''} ${student?.ten || ''} ${message.ma_hs}`.toLowerCase()
            return haystack.includes(keyword)
          }),
        }))
        .filter((batch) => batch.messages.length > 0)
    : batches

  function toggleBatch(key: string) {
    setCollapsedBatches((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-cyan-200 bg-cyan-100 p-4">
        <p className="text-xs font-semibold uppercase text-cyan-700">SMS phụ huynh</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">Nhắn tin theo đợt</h2>
        <p className="mt-2 text-sm text-slate-700">
          Mỗi đợt import nội dung tin nhắn (trang Import) gom lại thành 1 nhóm — bấm gửi SMS ngay cạnh từng học
          sinh thay vì phải vào từng trang cá nhân.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
        Tìm học sinh trong các đợt
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tên hoặc mã học sinh"
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-sm"
        />
      </label>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-100 p-3 text-sm font-semibold text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Đang tải...</div>
      ) : null}

      {!loading && visibleBatches.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          {keyword
            ? 'Không tìm thấy học sinh phù hợp trong các đợt.'
            : 'Chưa có đợt tin nhắn nào — import nội dung tin nhắn ở trang Import trước.'}
        </div>
      ) : null}

      <div className="space-y-4">
        {visibleBatches.map((batch, index) => {
          const isCollapsed = collapsedBatches.has(batch.key) && index !== 0
          const batchLabel = batch.log?.ghi_chu || (batch.log ? formatDateTime(batch.log.thoi_gian) : 'Đợt không rõ nguồn')

          return (
            <div key={batch.key} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => toggleBatch(batch.key)}
                className="flex w-full items-center justify-between gap-3 bg-slate-700 px-4 py-3 text-left text-white"
              >
                <div>
                  <p className="font-bold">{batchLabel}</p>
                  <p className="text-xs text-slate-200">{batch.messages.length} học sinh</p>
                </div>
                <span className="text-lg">{isCollapsed ? '▸' : '▾'}</span>
              </button>

              {!isCollapsed ? (
                <div className="divide-y divide-slate-100">
                  {batch.messages.map((message) => {
                    const student = studentByMaHs.get(message.ma_hs)
                    return (
                      <div key={message.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          {student ? (
                            <Link
                              to={`/quan-ly/hoc-sinh/${student.ma_hs}`}
                              className="font-semibold text-blue-700 hover:underline"
                            >
                              {student.ho} {student.ten}
                            </Link>
                          ) : (
                            <p className="font-semibold text-slate-900">{message.ma_hs}</p>
                          )}
                          <p className="wrap-break-word text-sm text-slate-700">{message.noi_dung}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {student?.sdt_1 ? (
                            <StudentPhonePill label="SĐT 1" phone={student.sdt_1} smsBody={message.noi_dung} />
                          ) : null}
                          {student?.sdt_2 ? (
                            <StudentPhonePill label="SĐT 2" phone={student.sdt_2} smsBody={message.noi_dung} />
                          ) : null}
                          {student && !student.sdt_1 && !student.sdt_2 ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                              Chưa có SĐT
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

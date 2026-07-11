import { useEffect, useMemo, useState } from 'react'
import { dataSource } from '../../data/client'
import type {
  CauHinhTuan,
  DanhMucDiem,
  GhiNhan,
  HocSinh,
  TrangThaiXuLyTapThe,
} from '../../data/types'
import { calculateClassWeeklyScores, type WeeklyStudentScore } from '../scoring/scoring'
import { buildPedagogySuggestions } from '../scoring/suggestions'
import { getStudentGroup } from '../students/studentGroups'

type DashboardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'success'
      catalog: DanhMucDiem[]
      records: GhiNhan[]
      scores: WeeklyStudentScore[]
      students: HocSinh[]
      tuanSo: number
    }

export function DashboardPage() {
  const [state, setState] = useState<DashboardState>({ status: 'loading' })
  const [selectedStudentByEvent, setSelectedStudentByEvent] = useState<Record<string, string>>({})
  const [processingEventId, setProcessingEventId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    Promise.all([
      dataSource.getStudents(),
      dataSource.getRecords(),
      dataSource.getPointCatalog(),
      dataSource.getWeekConfig(),
    ])
      .then(([students, records, catalog, weekConfig]) => {
        if (!active) {
          return
        }

        const tuanSo = getLatestWeek(records, weekConfig)
        setState({
          status: 'success',
          catalog,
          records,
          scores: calculateClassWeeklyScores({ catalog, records, students, tuanSo }),
          students,
          tuanSo,
        })
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Không tải được tổng quan lớp.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [])

  const body = useMemo(() => {
    if (state.status !== 'success') {
      return null
    }

    const studentById = new Map(state.students.map((student) => [student.ma_hs, student]))
    const sortedScores = [...state.scores].sort(
      (a, b) => a.diem_xep_loai_thi_dua - b.diem_xep_loai_thi_dua,
    )
    const previousScores = new Map(
      calculateClassWeeklyScores({
        catalog: state.catalog,
        records: state.records,
        students: state.students,
        tuanSo: Math.max(1, state.tuanSo - 1),
      }).map((score) => [score.ma_hs, score]),
    )
    const collectiveEvents = getCollectiveEvents(state.records, state.catalog, state.tuanSo)
    const missingGroupStudents = state.students.filter((student) => !getStudentGroup(student.ma_hs))

    return {
      collectiveEvents,
      missingGroupStudents,
      previousScores,
      sortedScores,
      studentById,
    }
  }, [state])

  async function processCollectiveEvent(
    record: GhiNhan,
    status: TrangThaiXuLyTapThe,
    generatedRecords: GhiNhan[],
  ) {
    if (state.status !== 'success') {
      return
    }

    if (!record.ma_ghi_nhan) {
      setActionError('Sự kiện này chưa có ma_ghi_nhan nên chưa thể xử lý tự động.')
      return
    }

    setProcessingEventId(record.ma_ghi_nhan)
    setActionError(null)

    try {
      const createdRecords = await dataSource.processCollectiveEvent(
        record.ma_ghi_nhan,
        status,
        generatedRecords,
      )

      setState((current) => {
        if (current.status !== 'success') {
          return current
        }

        const records = [
          ...current.records.map((item) =>
            item.ma_ghi_nhan === record.ma_ghi_nhan
              ? { ...item, trang_thai_xu_ly_tap_the: status }
              : item,
          ),
          ...createdRecords,
        ]

        return {
          ...current,
          records,
          scores: calculateClassWeeklyScores({
            catalog: current.catalog,
            records,
            students: current.students,
            tuanSo: current.tuanSo,
          }),
        }
      })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Không xử lý được sự kiện tập thể.')
    } finally {
      setProcessingEventId(null)
    }
  }

  async function assignToStudent(record: GhiNhan) {
    if (state.status !== 'success') {
      return
    }

    const eventId = eventKey(record)
    const student = state.students.find((item) => item.ma_hs === selectedStudentByEvent[eventId])
    if (!student) {
      setActionError('Cần chọn học sinh để gán sự kiện.')
      return
    }

    await processCollectiveEvent(record, 'da_gan_ca_nhan', [
      createIndividualRecord(record, student),
    ])
  }

  async function applyToTargets(record: GhiNhan, catalogItem: DanhMucDiem | undefined) {
    if (state.status !== 'success') {
      return
    }

    const targetStudents = getTargetStudents(record, catalogItem, state.students)
    if (targetStudents.length === 0) {
      setActionError('Không tìm thấy học sinh thuộc phạm vi áp dụng của sự kiện này.')
      return
    }

    const ok = window.confirm(`Tạo ${targetStudents.length} dòng ghi nhận cá nhân từ sự kiện này?`)
    if (!ok) {
      return
    }

    await processCollectiveEvent(
      record,
      'da_ap_dung_ca_lop',
      targetStudents.map((student) => createIndividualRecord(record, student)),
    )
  }

  async function skipEvent(record: GhiNhan) {
    const ok = window.confirm('Bỏ qua sự kiện này và không tạo dòng trừ điểm cá nhân?')
    if (!ok) {
      return
    }

    await processCollectiveEvent(record, 'bo_qua', [])
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Tổng quan giáo viên</h2>
        <p className="text-sm text-slate-600">
          Xếp hạng điểm thi đua và sự kiện tập thể cần theo dõi.
        </p>
      </div>

      {state.status === 'loading' ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Đang tải tổng quan...
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {state.message}
        </div>
      ) : null}

      {state.status === 'success' && body ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryMetric label="Tuần" value={state.tuanSo} />
            <SummaryMetric label="Sĩ số" value={state.students.length} />
            <SummaryMetric
              label="Cần chú ý"
              value={body.sortedScores.filter(needsAttention).length}
            />
          </div>

          {body.missingGroupStudents.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {body.missingGroupStudents.length} học sinh chưa có tổ trong danh sách hiện tại.
            </div>
          ) : null}

          {actionError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {actionError}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h3 className="text-base font-bold text-slate-900">Điểm thi đua học sinh</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Học sinh</th>
                    <th className="px-3 py-3">CC</th>
                    <th className="px-3 py-3">VS</th>
                    <th className="px-3 py-3">NN</th>
                    <th className="px-3 py-3">KL</th>
                    <th className="px-3 py-3">HT</th>
                    <th className="px-3 py-3">Tổng</th>
                    <th className="px-3 py-3">Xếp loại</th>
                    <th className="px-3 py-3">Gợi ý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {body.sortedScores.map((score) => {
                    const student = body.studentById.get(score.ma_hs)
                    const suggestions = buildPedagogySuggestions({
                      currentWeekRecords: getStudentRecords(state.records, score.ma_hs, [
                        state.tuanSo,
                      ]),
                      previousScore: body.previousScores.get(score.ma_hs),
                      score,
                      twoWeekRecords: getStudentRecords(state.records, score.ma_hs, [
                        state.tuanSo,
                        Math.max(1, state.tuanSo - 1),
                      ]),
                    })
                    return (
                      <tr
                        key={score.ma_hs}
                        className={needsAttention(score) ? 'bg-red-50' : 'hover:bg-slate-50'}
                      >
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-900">
                          {student ? `${student.ho} ${student.ten}` : score.ma_hs}
                        </td>
                        <td className="px-3 py-3">{score.diem_chuyen_can}</td>
                        <td className="px-3 py-3">{score.diem_ve_sinh}</td>
                        <td className="px-3 py-3">{score.diem_ne_nep}</td>
                        <td className="px-3 py-3">{score.diem_ky_luat}</td>
                        <td className="px-3 py-3">{formatStudyScore(score.diem_hoc_tap)}</td>
                        <td className="px-3 py-3 font-bold text-slate-900">
                          {score.diem_xep_loai_thi_dua}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {score.xep_loai}
                          </span>
                        </td>
                        <td className="max-w-80 px-3 py-3">
                          {suggestions.length ? (
                            <ul className="space-y-1 text-xs text-slate-700">
                              {suggestions.map((suggestion) => (
                                <li key={suggestion}>{suggestion}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h3 className="text-base font-bold text-slate-900">Sự kiện của lớp/tổ</h3>
              <p className="text-sm text-slate-600">
                Các dòng tập thể hoặc tổ trực chưa tính vào điểm cá nhân.
              </p>
            </div>
            {body.collectiveEvents.length ? (
              <div className="divide-y divide-slate-100">
                {body.collectiveEvents.map(({ catalogItem, record }) => (
                  <article key={eventKey(record)} className="space-y-3 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {record.ma_danh_muc} · {catalogItem?.ten_muc || 'Sự kiện tập thể'}
                        </p>
                        <p className="text-sm text-slate-600">
                          {record.noi_dung || record.ly_do || 'Không có mô tả'}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                        {catalogItem?.pham_vi === 'to_truc'
                          ? `Tổ ${record.to_lien_quan || '-'}`
                          : 'Tập thể'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                      <select
                        value={selectedStudentByEvent[eventKey(record)] || ''}
                        onChange={(event) =>
                          setSelectedStudentByEvent((current) => ({
                            ...current,
                            [eventKey(record)]: event.target.value,
                          }))
                        }
                        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">Chọn học sinh để gán</option>
                        {state.students
                          .slice()
                          .sort((a, b) => a.tt - b.tt)
                          .map((student) => (
                            <option key={student.ma_hs} value={student.ma_hs}>
                              {student.tt}. {student.ho} {student.ten}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void assignToStudent(record)}
                        disabled={processingEventId === record.ma_ghi_nhan}
                        className="h-10 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        Gán cho 1 học sinh
                      </button>
                      <button
                        type="button"
                        onClick={() => void applyToTargets(record, catalogItem)}
                        disabled={processingEventId === record.ma_ghi_nhan}
                        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        Áp dụng cho tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => void skipEvent(record)}
                        disabled={processingEventId === record.ma_ghi_nhan}
                        className="h-10 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        Bỏ qua
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-4 text-sm text-slate-600">Chưa có sự kiện tập thể trong tuần.</div>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function needsAttention(score: WeeklyStudentScore): boolean {
  return (
    score.can_canh_bao_ngay ||
    score.diem_chuyen_can < 50 ||
    score.diem_ve_sinh < 50 ||
    score.diem_ne_nep < 50 ||
    score.diem_ky_luat < 50
  )
}

function getCollectiveEvents(records: GhiNhan[], catalog: DanhMucDiem[], tuanSo: number) {
  const catalogByCode = new Map(catalog.map((item) => [item.ma_danh_muc, item]))

  return records
    .filter(
      (record) =>
        record.tuan_so === tuanSo && record.trang_thai_xu_ly_tap_the === 'chua_xu_ly',
    )
    .map((record) => ({
      catalogItem: record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined,
      record,
    }))
    .filter(({ catalogItem }) => catalogItem?.pham_vi === 'tap_the' || catalogItem?.pham_vi === 'to_truc')
}

function getTargetStudents(
  record: GhiNhan,
  catalogItem: DanhMucDiem | undefined,
  students: HocSinh[],
): HocSinh[] {
  if (catalogItem?.pham_vi === 'tap_the') {
    return students
  }

  if (catalogItem?.pham_vi === 'to_truc' && record.to_lien_quan) {
    return students.filter((student) => getStudentGroup(student.ma_hs) === record.to_lien_quan)
  }

  return []
}

function createIndividualRecord(source: GhiNhan, student: HocSinh): GhiNhan {
  return {
    ...source,
    ma_ghi_nhan: undefined,
    ma_hs: student.ma_hs,
    to_lien_quan: null,
    dien_tai_thoi_diem: student.dien,
    nguon: 'web',
    ma_log_import: null,
    trang_thai_xu_ly_tap_the: '',
    su_kien_goc: source.ma_ghi_nhan || null,
  }
}

function eventKey(record: GhiNhan): string {
  return record.ma_ghi_nhan || `${record.ngay}-${record.ma_danh_muc || 'event'}`
}

function getLatestWeek(records: GhiNhan[], weekConfig: CauHinhTuan[]): number {
  const latestRecordWeek = Math.max(0, ...records.map((record) => record.tuan_so || 0))
  if (latestRecordWeek > 0) {
    return latestRecordWeek
  }

  return Math.max(1, ...weekConfig.map((week) => week.tuan_so || 0))
}

function getStudentRecords(records: GhiNhan[], maHs: string, weeks: number[]): GhiNhan[] {
  return records.filter((record) => record.ma_hs === maHs && weeks.includes(record.tuan_so))
}

function formatStudyScore(score: number | null): string {
  return score === null ? 'Chưa có dữ liệu' : String(score)
}

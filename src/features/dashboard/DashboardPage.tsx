import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type {
  BanCanSu,
  CauHinhTuan,
  DanhMucDiem,
  GhiNhan,
  HocSinh,
  TrangThaiXuLyTapThe,
} from '../../data/types'
import { calculateClassWeeklyScores, type WeeklyStudentScore } from '../scoring/scoring'
import {
  getBadgeClassForCatalog,
  getBadgeClassForGroup,
  getBadgeClassForRecord,
} from '../scoring/scoreStyles'
import { buildPedagogySuggestions } from '../scoring/suggestions'
import { getStudentGroup } from '../students/studentGroups'
import { findWeek, selectDefaultWeek, WeekDatePicker, WeekSelector } from '../time/WeekSelector'
import { CatalogCodeBadge } from '../scoring/CatalogCodeBadge'

type DashboardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'success'
      banCanSu: BanCanSu[]
      catalog: DanhMucDiem[]
      records: GhiNhan[]
      students: HocSinh[]
      tuanSo: number
      weekConfig: CauHinhTuan[]
    }

type OverviewStat = {
  code: string
  tone: 'action' | 'neutral' | 'good'
  label: string
  value: string
  detail: string
  drillDown?: OverviewDrillDown
  dateTarget?: string
  groupTarget?: GroupViewKey
}

type OverviewStatGroups = {
  action: OverviewStat[]
  observation: OverviewStat[]
}

type OverviewDrillDown =
  | { kind: 'attention'; items: AttentionDrillDownItem[] }
  | { kind: 'records'; emptyText: string; items: RecordDrillDownItem[] }
  | { kind: 'events'; emptyText: string; items: EventDrillDownItem[] }
  | { kind: 'students'; emptyText: string; items: StudentDrillDownItem[] }
  | { kind: 'trend'; items: TrendDrillDownItem[] }

type AttentionDrillDownItem = {
  maHs: string
  name: string
  token: string
  lowestComponent: string
  lowestScore: number
  totalScore: number
}

type RecordDrillDownItem = {
  badgeClass: string
  catalogItem?: DanhMucDiem
  id: string
  code: string
  date: string
  description: string
  name: string
  status: string
  token?: string
}

type EventDrillDownItem = {
  badgeClass: string
  catalogItem?: DanhMucDiem
  id: string
  code: string
  date: string
  description: string
  scope: string
}

type StudentDrillDownItem = {
  maHs: string
  name: string
  token: string
}

type TrendDrillDownItem = {
  group: string
  current: string
  previous: string
  delta: string
}

type GroupViewKey = 'CC' | 'VS' | 'NN' | 'KL' | 'HT'

type GroupViewRow = {
  maHs: string
  name: string
  token: string
  score: number | null
  recordCount: number
  records: GhiNhan[]
}

export function DashboardPage() {
  const [state, setState] = useState<DashboardState>({ status: 'loading' })
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [scoresCollapsed, setScoresCollapsed] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupViewKey | null>(null)
  const [showAllGroupStudents, setShowAllGroupStudents] = useState(false)
  const [expandedTeamEventId, setExpandedTeamEventId] = useState<string | null>(null)
  const [selectedStudentByEvent, setSelectedStudentByEvent] = useState<Record<string, string>>({})
  const [processingEventId, setProcessingEventId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const groupViewRef = useRef<HTMLDivElement | null>(null)
  const dailyLogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let active = true

    Promise.all([
      dataSource.getStudents(),
      dataSource.getRecords(),
      dataSource.getPointCatalog(),
      dataSource.getWeekConfig(),
      dataSource.getBanCanSu(),
    ])
      .then(([students, records, catalog, weekConfig, banCanSu]) => {
        if (!active) {
          return
        }

        const tuanSo = selectDefaultWeek(weekConfig, records)
        setState({
          status: 'success',
          banCanSu,
          catalog,
          records,
          students,
          tuanSo,
          weekConfig,
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
    const catalogByCode = new Map(state.catalog.map((item) => [item.ma_danh_muc, item]))
    const currentScores = calculateClassWeeklyScores({
      catalog: state.catalog,
      records: state.records,
      students: state.students,
      tuanSo: state.tuanSo,
    })
    const sortedScores = [...currentScores].sort(
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
    const missingGroupStudents = state.students.filter((student) => !resolveStudentGroup(student))
    const selectedWeek = findWeek(state.weekConfig, state.tuanSo)
    const dailyLogs = buildDailyLogs(state.records, state.weekConfig, state.tuanSo, selectedDate)
    const overviewStats = buildOverviewStats({
      catalog: state.catalog,
      collectiveEventsCount: collectiveEvents.length,
      currentScores,
      previousScores,
      records: state.records,
      selectedWeek,
      students: state.students,
      tuanSo: state.tuanSo,
    })
    const groupViewRows = buildGroupViewRows({
      catalog: state.catalog,
      group: selectedGroup,
      records: state.records,
      scores: currentScores,
      showAll: showAllGroupStudents,
      students: state.students,
      tuanSo: state.tuanSo,
    })

    return {
      catalogByCode,
      collectiveEvents,
      dailyLogs,
      banCanSu: state.banCanSu,
      missingGroupStudents,
      overviewStats,
      previousScores,
      groupViewRows,
      selectedWeek,
      sortedScores,
      studentById,
    }
  }, [selectedDate, selectedGroup, showAllGroupStudents, state])

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

  function selectWeek(tuanSo: number) {
    setExpandedDay(null)
    setExpandedTeamEventId(null)
    setSelectedDate('')
    setState((current) => (current.status === 'success' ? { ...current, tuanSo } : current))
  }

  function selectDate(date: string) {
    setExpandedDay(date || null)
    setSelectedDate(date)
  }

  function openGroupView(group: GroupViewKey) {
    setSelectedGroup(group)
    window.setTimeout(() => groupViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function openRecordDate(date: string) {
    setSelectedDate(date)
    setExpandedDay(date)
    window.setTimeout(() => dailyLogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
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

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <WeekSelector
                value={state.tuanSo}
                weeks={state.weekConfig}
                onChange={selectWeek}
              />
              <WeekDatePicker
                selectedWeek={body.selectedWeek}
                value={selectedDate}
                onChange={selectDate}
              />
            </div>
          </div>

          <OverviewStats
            onSelectDate={openRecordDate}
            onSelectGroup={openGroupView}
            stats={body.overviewStats}
          />

          <GroupViolationView
            catalogByCode={body.catalogByCode}
            group={selectedGroup}
            onGroupChange={setSelectedGroup}
            rows={body.groupViewRows}
            sectionRef={groupViewRef}
            showAll={showAllGroupStudents}
            onShowAllChange={setShowAllGroupStudents}
          />

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
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Điểm thi đua học sinh</h3>
                <p className="text-sm text-slate-600">{body.sortedScores.length} học sinh</p>
                <p className="mt-1 text-xs text-slate-500">
                  Điểm xếp loại chỉ so sánh được giữa các học sinh có cùng trạng thái đã/chưa có
                  điểm học tập trong tuần.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScoresCollapsed((current) => !current)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {scoresCollapsed ? 'Mở rộng danh sách' : 'Thu gọn danh sách'}
              </button>
            </div>
            {scoresCollapsed ? (
              <div className="p-4 text-sm text-slate-600">
                Danh sách đang thu gọn. Mở rộng để xem từng học sinh.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3">STT</th>
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
                    {body.sortedScores.map((score, index) => {
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
                          <td className="whitespace-nowrap px-3 py-3 text-slate-600">{index + 1}</td>
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
            )}
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
                        {catalogItem?.pham_vi === 'to_truc' ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTeamEventId((current) =>
                                current === eventKey(record) ? null : eventKey(record),
                              )
                            }
                            className="text-left text-sm font-bold text-blue-700 hover:text-blue-800"
                          >
                            {record.ma_danh_muc} · {catalogItem?.ten_muc || 'Sự kiện tổ trực'}
                          </button>
                        ) : (
                          <p className="text-sm font-bold text-slate-900">
                            {record.ma_danh_muc} · {catalogItem?.ten_muc || 'Sự kiện tập thể'}
                          </p>
                        )}
                        <p className="text-sm text-slate-600">
                          {record.noi_dung || record.ly_do || 'Không có mô tả'}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-semibold ${getBadgeClassForCatalog(catalogItem)}`}
                      >
                        {catalogItem?.pham_vi === 'to_truc'
                          ? `Tổ ${record.to_lien_quan || '-'}`
                          : 'Tập thể'}
                      </span>
                    </div>
                    {catalogItem?.pham_vi === 'to_truc' &&
                    expandedTeamEventId === eventKey(record) ? (
                      <TeamInfoPanel
                        banCanSu={body.banCanSu}
                        catalog={state.catalog}
                        records={state.records}
                        students={state.students}
                        teamNumber={record.to_lien_quan}
                      />
                    ) : null}
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

          <div ref={dailyLogRef} className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h3 className="text-base font-bold text-slate-900">Nhật ký theo ngày</h3>
              <p className="text-sm text-slate-600">
                {selectedDate
                  ? `Đang xem riêng ngày ${formatDate(selectedDate)}.`
                  : `Tất cả các ngày trong tuần ${state.tuanSo}.`}
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {body.dailyLogs.map((day) => (
                <section key={day.date} className="p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                    className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">{formatDate(day.date)}</p>
                      <p className="text-sm text-slate-600">
                        {day.records.length
                          ? `${day.records.length} ghi nhận`
                          : 'Chưa có ghi nhận'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                      {day.summary.map((item) => (
                        <span
                          key={item.label}
                          className={`rounded-full border px-2 py-1 ${getBadgeClassForGroup(item.label)}`}
                        >
                          {item.label}: {item.count}
                        </span>
                      ))}
                    </div>
                  </button>
                  {expandedDay === day.date && day.records.length ? (
                    <div className="mt-3 space-y-2">
                      {day.records.map((record, index) => (
                        <article
                          key={record.ma_ghi_nhan || `${record.ngay}-${record.ma_hs}-${index}`}
                          className="rounded-md border border-slate-200 p-3 text-sm"
                        >
                          <p className="font-semibold text-slate-900">
                            {record.ma_hs || `Tổ ${record.to_lien_quan || 'tập thể'}`} ·{' '}
                            <CatalogCodeBadge
                              catalogItem={record.ma_danh_muc ? body.catalogByCode.get(record.ma_danh_muc) : undefined}
                              code={record.ma_danh_muc || record.loai}
                            />
                          </p>
                          <p className="text-slate-600">
                            {record.noi_dung || record.ly_do || 'Không có mô tả'}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
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

function OverviewStats({
  onSelectDate,
  onSelectGroup,
  stats,
}: {
  onSelectDate: (date: string) => void
  onSelectGroup: (group: GroupViewKey) => void
  stats: OverviewStatGroups
}) {
  const [activeCode, setActiveCode] = useState<string | null>(null)
  const allStats = [...stats.action, ...stats.observation]
  const activeStat = activeCode ? allStats.find((stat) => stat.code === activeCode) : undefined

  function selectStat(stat: OverviewStat) {
    if (stat.groupTarget) {
      setActiveCode(null)
      onSelectGroup(stat.groupTarget)
      return
    }

    if (stat.dateTarget) {
      setActiveCode(null)
      onSelectDate(stat.dateTarget)
      return
    }

    setActiveCode(activeCode === stat.code ? null : stat.code)
  }

  return (
    <div className="space-y-3">
      <OverviewGroup
        title="Nhóm cần hành động ngay"
        description="Các tín hiệu nên xử lý hoặc xem trước."
        activeCode={activeCode}
        onSelectStat={selectStat}
        stats={stats.action}
      />
      <OverviewGroup
        title="Nhóm quan sát chung"
        description="Bối cảnh chung của lớp trong tuần đang xem."
        activeCode={activeCode}
        onSelectStat={selectStat}
        stats={stats.observation}
      />
      {activeStat?.drillDown ? (
        <OverviewDrillDownModal onClose={() => setActiveCode(null)}>
          <OverviewDrillDownPanel
            drillDown={activeStat.drillDown}
            statLabel={`${activeStat.code} · ${activeStat.label}`}
            onClose={() => setActiveCode(null)}
          />
        </OverviewDrillDownModal>
      ) : null}
    </div>
  )
}

function OverviewGroup({
  activeCode,
  description,
  onSelectStat,
  stats,
  title,
}: {
  activeCode: string | null
  description: string
  onSelectStat: (stat: OverviewStat) => void
  stats: OverviewStat[]
  title: string
}) {
  if (!stats.length) {
    return null
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <OverviewCard
            key={stat.code}
            active={activeCode === stat.code}
            onSelect={() => onSelectStat(stat)}
            stat={stat}
          />
        ))}
      </div>
    </section>
  )
}

function OverviewCard({
  active,
  onSelect,
  stat,
}: {
  active: boolean
  onSelect: () => void
  stat: OverviewStat
}) {
  const toneClass =
    stat.tone === 'action'
      ? 'border-red-200 bg-red-50 text-red-900'
      : stat.tone === 'good'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
        : 'border-slate-200 bg-white text-slate-900'
  const valueClass =
    stat.tone === 'action'
      ? 'text-red-700'
      : stat.tone === 'good'
        ? 'text-emerald-700'
        : 'text-blue-700'
  const activeClass = active ? 'ring-2 ring-blue-300' : ''
  const interactiveClass = stat.drillDown || stat.groupTarget || stat.dateTarget ? 'cursor-pointer hover:shadow-sm' : ''
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase opacity-70">{stat.code}</p>
          <h4 className="mt-1 text-sm font-bold">{stat.label}</h4>
        </div>
        <p className={`text-right text-xl font-bold ${valueClass}`}>{stat.value}</p>
      </div>
      <p className="mt-3 text-sm opacity-80">{stat.detail}</p>
      {stat.drillDown || stat.groupTarget || stat.dateTarget ? (
        <p className="mt-3 text-xs font-semibold opacity-70">
          {active
            ? 'Đang mở chi tiết'
            : stat.groupTarget
              ? 'Bấm để xem theo nhóm'
              : stat.dateTarget
                ? 'Bấm để xem nhật ký ngày'
                : 'Bấm để xem chi tiết'}
        </p>
      ) : null}
    </>
  )

  if (!stat.drillDown && !stat.groupTarget && !stat.dateTarget) {
    return <article className={`rounded-lg border p-4 ${toneClass}`}>{content}</article>
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg border p-4 text-left transition ${toneClass} ${activeClass} ${interactiveClass}`}
    >
      {content}
    </button>
  )
}

function OverviewDrillDownModal({
  children,
  onClose,
}: {
  children: ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <div className="w-full max-w-5xl" onMouseDown={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function OverviewDrillDownPanel({
  drillDown,
  onClose,
  statLabel,
}: {
  drillDown: OverviewDrillDown
  onClose: () => void
  statLabel: string
}) {
  return (
    <section className="max-h-[85vh] overflow-y-auto rounded-lg border border-blue-200 bg-white p-4 shadow-xl">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Chi tiết {statLabel}</h3>
          <p className="text-sm text-slate-600">Danh sách cấu thành đúng con số đang xem.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chi tiết"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-xl font-semibold leading-none text-slate-700 hover:bg-slate-50"
        >
          ×
        </button>
      </div>

      {drillDown.kind === 'attention' ? (
        drillDown.items.length ? (
          <div className="mt-3 divide-y divide-slate-100">
            {drillDown.items.map((item, index) => (
              <div
                key={item.maHs}
                className="grid gap-2 py-3 text-sm sm:grid-cols-[3rem_1fr_auto_auto] sm:items-center"
              >
                <span className="text-slate-500">{index + 1}</span>
                <Link to={`/hs/${item.token}`} className="font-semibold text-blue-700 hover:text-blue-800">
                  {item.name}
                </Link>
                <span className="text-slate-600">
                  Thấp nhất: {item.lowestComponent} {item.lowestScore}
                </span>
                <span className="font-semibold text-slate-900">Tổng {item.totalScore}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Không có học sinh nào cần chú ý tuần này.</p>
        )
      ) : null}

      {drillDown.kind === 'records' ? (
        drillDown.items.length ? (
          <div className="mt-3 divide-y divide-slate-100">
            {drillDown.items.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-2 py-3 text-sm lg:grid-cols-[3rem_8rem_1fr_9rem_8rem] lg:items-center"
              >
                <span className="text-slate-500">{index + 1}</span>
                <CatalogCodeBadge catalogItem={item.catalogItem} code={item.code} />
                <div>
                  {item.token ? (
                    <Link to={`/hs/${item.token}`} className="font-semibold text-blue-700 hover:text-blue-800">
                      {item.name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-slate-900">{item.name}</span>
                  )}
                  <p className="text-slate-600">{item.description}</p>
                </div>
                <span className="text-slate-600">{formatDate(item.date)}</span>
                <span className="font-medium text-slate-700">{item.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">{drillDown.emptyText}</p>
        )
      ) : null}

      {drillDown.kind === 'events' ? (
        drillDown.items.length ? (
          <div className="mt-3 divide-y divide-slate-100">
            {drillDown.items.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 py-3 text-sm lg:grid-cols-[8rem_8rem_1fr_9rem] lg:items-center"
              >
                <CatalogCodeBadge catalogItem={item.catalogItem} code={item.code} />
                <span className="font-medium text-blue-700">{item.scope}</span>
                <span className="text-slate-600">{item.description}</span>
                <span className="text-slate-600">{formatDate(item.date)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">{drillDown.emptyText}</p>
        )
      ) : null}

      {drillDown.kind === 'students' ? (
        drillDown.items.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {drillDown.items.map((item, index) => (
              <Link
                key={item.maHs}
                to={`/hs/${item.token}`}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 hover:text-blue-800"
              >
                <span className="mr-2 text-slate-500">{index + 1}.</span>
                {item.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">{drillDown.emptyText}</p>
        )
      ) : null}

      {drillDown.kind === 'trend' ? (
        <div className="mt-3 overflow-hidden rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Nhóm</th>
                <th className="px-3 py-3">Tuần này</th>
                <th className="px-3 py-3">Tuần trước</th>
                <th className="px-3 py-3">Chênh lệch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drillDown.items.map((item) => (
                <tr key={item.group}>
                  <td className="px-3 py-3 font-semibold text-slate-900">{item.group}</td>
                  <td className="px-3 py-3 text-slate-700">{item.current}</td>
                  <td className="px-3 py-3 text-slate-700">{item.previous}</td>
                  <td className="px-3 py-3 font-semibold text-blue-700">{item.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

const GROUP_OPTIONS: Array<{ group: GroupViewKey; label: string }> = [
  { group: 'CC', label: 'Chuyên cần' },
  { group: 'VS', label: 'Vệ sinh' },
  { group: 'NN', label: 'Nề nếp' },
  { group: 'KL', label: 'Kỷ luật' },
  { group: 'HT', label: 'Học tập' },
]

function GroupViolationView({
  catalogByCode,
  group,
  onGroupChange,
  onShowAllChange,
  rows,
  sectionRef,
  showAll,
}: {
  catalogByCode: Map<string, DanhMucDiem>
  group: GroupViewKey | null
  onGroupChange: (group: GroupViewKey | null) => void
  onShowAllChange: (showAll: boolean) => void
  rows: GroupViewRow[]
  sectionRef: { current: HTMLDivElement | null }
  showAll: boolean
}) {
  const selectedLabel = group ? GROUP_OPTIONS.find((item) => item.group === group)?.label || group : 'tất cả nhóm'
  const isStudyGroup = group === 'HT'

  return (
    <section ref={sectionRef} className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Xem theo Nhóm vi phạm</h3>
          <p className="text-sm text-slate-600">
            {group === null
              ? 'Danh sách mặc định không lọc nhóm, sắp xếp theo điểm tổng hợp từ thấp đến cao.'
              : isStudyGroup
              ? 'Sắp xếp điểm học tập từ thấp đến cao trong tuần đang xem.'
              : 'Danh sách học sinh có ghi nhận thuộc nhóm đã chọn, điểm thấp nhất xếp trước.'}
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(event) => onShowAllChange(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          Hiện cả học sinh không vi phạm
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {GROUP_OPTIONS.map((option) => {
          const selected = option.group === group

          return (
            <button
              key={option.group}
              type="button"
              onClick={() => onGroupChange(selected ? null : option.group)}
              className={`rounded-full border px-3 py-2 text-sm font-semibold transition hover:shadow-sm ${getBadgeClassForGroup(option.group)} ${
                selected ? 'ring-2 ring-blue-300' : ''
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">STT</th>
                <th className="px-3 py-3">Học sinh</th>
                <th className="px-3 py-3">
                  {group === null ? 'Điểm tổng hợp' : isStudyGroup ? 'Điểm học tập' : `Điểm ${selectedLabel}`}
                </th>
                <th className="px-3 py-3">{isStudyGroup ? 'Số điểm đã ghi' : 'Số ghi nhận'}</th>
                <th className="px-3 py-3">{isStudyGroup ? 'Điểm môn' : 'Mã liên quan'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={row.maHs} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">{index + 1}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Link to={`/hs/${row.token}`} className="font-semibold text-blue-700 hover:text-blue-800">
                      {row.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-900">
                    {row.score === null ? 'Chưa có dữ liệu' : row.score}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{row.recordCount}</td>
                  <td className="min-w-72 px-3 py-3">
                    {row.records.length ? (
                      <div className="flex flex-wrap gap-2">
                        {row.records.map((record, index) => (
                          <CatalogCodeBadge
                            key={record.ma_ghi_nhan || `${row.maHs}-${record.ngay}-${index}`}
                            catalogItem={record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined}
                            code={record.ma_danh_muc || record.loai}
                            label={
                              isStudyGroup
                                ? `${record.mon_hoc || 'Điểm'}: ${record.diem_so_mon}`
                                : record.ma_danh_muc || record.loai
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">Không có ghi nhận</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? (
          <div className="border-t border-slate-100 p-4 text-sm text-slate-600">
            Không có học sinh nào trong {selectedLabel.toLowerCase()} theo bộ lọc hiện tại.
          </div>
        ) : null}
      </div>
    </section>
  )
}

function TeamInfoPanel({
  banCanSu,
  catalog,
  records,
  students,
  teamNumber,
}: {
  banCanSu: BanCanSu[]
  catalog: DanhMucDiem[]
  records: GhiNhan[]
  students: HocSinh[]
  teamNumber: number | null
}) {
  if (!teamNumber) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Sự kiện tổ trực này chưa có số tổ liên quan.
      </div>
    )
  }

  const members = students
    .filter((student) => resolveStudentGroup(student) === teamNumber)
    .sort((a, b) => a.tt - b.tt)
  const leader = findTeamLeader(teamNumber, banCanSu, students)
  const history = getTeamEventHistory(teamNumber, records, catalog)

  return (
    <section className="rounded-md border border-blue-100 bg-blue-50 p-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_1.5fr]">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Thông tin Tổ {teamNumber}</h4>
          <p className="mt-1 text-sm text-slate-700">
            Tổ trưởng: <span className="font-semibold">{leader || 'Chưa có dữ liệu'}</span>
          </p>
          <p className="text-sm text-slate-700">Sĩ số tổ: {members.length} học sinh</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {members.map((student) => (
              <Link
                key={student.ma_hs}
                to={`/hs/${student.token_ho_so}`}
                className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
              >
                {student.ho} {student.ten}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h5 className="text-sm font-bold text-slate-900">Lịch sử sự kiện tổ trực gần đây</h5>
          {history.length ? (
            <div className="mt-2 space-y-2">
              {history.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-md bg-white p-2 text-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-semibold text-slate-900">
                      <CatalogCodeBadge catalogItem={item.catalogItem} code={item.code} />{' '}
                      Tuần {item.week}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{formatDate(item.date)}</span>
                  </div>
                  <p className="mt-1 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Chưa có lịch sử sự kiện tổ trực.</p>
          )}
        </div>
      </div>
    </section>
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
    return students.filter((student) => resolveStudentGroup(student) === record.to_lien_quan)
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

function resolveStudentGroup(student: HocSinh): number | null {
  return student.to || getStudentGroup(student.ma_hs)
}

function buildOverviewStats({
  catalog,
  collectiveEventsCount,
  currentScores,
  previousScores,
  records,
  selectedWeek,
  students,
  tuanSo,
}: {
  catalog: DanhMucDiem[]
  collectiveEventsCount: number
  currentScores: WeeklyStudentScore[]
  previousScores: Map<string, WeeklyStudentScore>
  records: GhiNhan[]
  selectedWeek?: CauHinhTuan
  students: HocSinh[]
  tuanSo: number
}): OverviewStatGroups {
  const catalogByCode = new Map(catalog.map((item) => [item.ma_danh_muc, item]))
  const studentById = new Map(students.map((student) => [student.ma_hs, student]))
  const activeStudents = students.filter(isActiveStudent)
  const weekRecords = records.filter((record) => record.tuan_so === tuanSo)
  const personalWeekRecords = weekRecords.filter((record) => record.ma_hs)
  const studentsWithRecords = new Set(personalWeekRecords.map((record) => record.ma_hs))
  const cleanStudents = activeStudents.filter((student) => !studentsWithRecords.has(student.ma_hs))
  const attentionScores = currentScores.filter(needsAttention)
  const severeRecords = weekRecords.filter((record) => {
    const item = record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined
    return Boolean(item?.nghiem_trong)
  })
  const topViolations = getTopViolations(weekRecords, catalogByCode)
  const topViolationCode = topViolations[0]?.code
  const topViolationRecords = topViolationCode
    ? weekRecords.filter((record) => record.ma_danh_muc === topViolationCode)
    : []
  const componentAverages = averageComponents(currentScores)
  const previousComponentAverages = averageComponents(Array.from(previousScores.values()))
  const trendItems = buildTrendItems(componentAverages, previousComponentAverages)
  const currentAverage = average(currentScores.map((score) => score.diem_xep_loai_thi_dua))
  const hasPreviousWeek = tuanSo > 1
  const previousAverage = average(Array.from(previousScores.values()).map((score) => score.diem_xep_loai_thi_dua))
  const trend = hasPreviousWeek ? roundNumber(currentAverage - previousAverage) : null
  const recordDates = Array.from(new Set(weekRecords.map((record) => record.ngay))).sort()
  const latestDate = recordDates.at(-1)
  const weekDayCount = selectedWeek ? datesBetween(selectedWeek.tu_ngay, selectedWeek.den_ngay).length : recordDates.length
  const tk07: OverviewStat[] =
    trend === null
      ? []
      : [
          {
            code: 'TK07',
            tone: 'neutral',
            label: 'Xu hướng tuần trước',
            value: `${trend > 0 ? '+' : ''}${trend}`,
            detail: `${trend >= 0 ? 'Tăng' : 'Giảm'} so với tuần liền trước`,
            drillDown: {
              kind: 'trend',
              items: trendItems,
            },
          },
        ]

  return {
    action: [
      {
        code: 'TK02',
        tone: attentionScores.length ? 'action' : 'good',
        label: 'Học sinh cần chú ý',
        value: attentionScores.length ? `${attentionScores.length} HS` : 'Ổn',
        detail:
          attentionScores.slice(0, 3).map((score) => getStudentName(students, score.ma_hs)).join(', ') ||
          'Không có học sinh nào cần chú ý tuần này',
        drillDown: {
          kind: 'attention',
          items: attentionScores.map((score) => toAttentionDrillDownItem(score, studentById)),
        },
      },
      {
        code: 'TK03',
        tone: severeRecords.length ? 'action' : 'good',
        label: 'Vi phạm nghiêm trọng',
        value: severeRecords.length ? String(severeRecords.length) : '0',
        detail:
          severeRecords.slice(0, 2).map((record) => describeRecord(record, students)).join(' · ') ||
          'Không có vi phạm nghiêm trọng trong tuần',
        drillDown: {
          kind: 'records',
          emptyText: 'Không có vi phạm nghiêm trọng trong tuần.',
          items: severeRecords.map((record, index) =>
            toRecordDrillDownItem(record, index, studentById, catalogByCode),
          ),
        },
      },
      {
        code: 'TK04',
        tone: collectiveEventsCount ? 'action' : 'good',
        label: 'Sự kiện chờ xử lý',
        value: collectiveEventsCount ? String(collectiveEventsCount) : '0',
        detail: collectiveEventsCount ? 'Cần xử lý tập thể/tổ trực' : 'Không có sự kiện tập thể/tổ trực đang chờ',
        drillDown: {
          kind: 'events',
          emptyText: 'Không có sự kiện tập thể/tổ trực đang chờ.',
          items: getCollectiveEvents(weekRecords, catalog, tuanSo).map(({ catalogItem, record }, index) =>
            toEventDrillDownItem(record, catalogItem, index),
          ),
        },
      },
    ],
    observation: [
      {
        code: 'TK01',
        tone: 'neutral',
        label: 'Sĩ số & học sinh sạch',
        value: `${activeStudents.length} HS`,
        detail: `${cleanStudents.length} em không có ghi nhận tuần này`,
        drillDown: {
          kind: 'students',
          emptyText: 'Không có học sinh sạch trong tuần đang xem.',
          items: cleanStudents.map((student) => ({
            maHs: student.ma_hs,
            name: `${student.ho} ${student.ten}`,
            token: student.token_ho_so,
          })),
        },
      },
      {
        code: 'TK05',
        tone: 'neutral',
        label: 'Vi phạm phổ biến',
        value: topViolations[0]?.count ? String(topViolations[0].count) : '0',
        detail: topViolations.map((item) => `${item.label}: ${item.count}`).join(' · ') || 'Chưa có vi phạm trong tuần',
        drillDown: {
          kind: 'records',
          emptyText: 'Chưa có vi phạm phổ biến trong tuần.',
          items: topViolationRecords.map((record, index) =>
            toRecordDrillDownItem(record, index, studentById, catalogByCode),
          ),
        },
      },
      {
        code: 'TK06',
        tone: 'neutral',
        label: 'Trung bình nhóm điểm',
        value: roundNumber(currentAverage).toFixed(1),
        detail: `CC ${componentAverages.CC} · VS ${componentAverages.VS} · NN ${componentAverages.NN} · KL ${componentAverages.KL}`,
        groupTarget: 'KL',
      },
      ...tk07,
      {
        code: 'TK08',
        tone: 'neutral',
        label: 'Nhịp độ ghi nhận',
        value: `${recordDates.length}/${Math.max(weekDayCount, 1)} ngày`,
        detail: latestDate ? `Ghi nhận gần nhất: ${formatDate(latestDate)}` : 'Chưa có ghi nhận trong tuần',
        dateTarget: latestDate,
      },
    ],
  }
}

function isActiveStudent(student: HocSinh): boolean {
  const today = new Date()
  const joined = student.ngay_nhap_hoc ? new Date(student.ngay_nhap_hoc) : null
  const left = student.ngay_roi_lop ? new Date(student.ngay_roi_lop) : null

  return (!joined || joined <= today) && (!left || left > today)
}

function getTopViolations(
  records: GhiNhan[],
  catalogByCode: Map<string, DanhMucDiem>,
): Array<{ code: string; label: string; count: number }> {
  const counts = new Map<string, number>()

  records.forEach((record) => {
    if (!record.ma_danh_muc) {
      return
    }

    counts.set(record.ma_danh_muc, (counts.get(record.ma_danh_muc) || 0) + (record.so_lan || 1))
  })

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([code, count]) => ({
      code,
      label: catalogByCode.get(code)?.ten_muc || code,
      count,
    }))
}

function buildGroupViewRows({
  catalog,
  group,
  records,
  scores,
  showAll,
  students,
  tuanSo,
}: {
  catalog: DanhMucDiem[]
  group: GroupViewKey | null
  records: GhiNhan[]
  scores: WeeklyStudentScore[]
  showAll: boolean
  students: HocSinh[]
  tuanSo: number
}): GroupViewRow[] {
  const catalogByCode = new Map(catalog.map((item) => [item.ma_danh_muc, item]))
  const scoreByStudent = new Map(scores.map((score) => [score.ma_hs, score]))

  return students
    .map((student) => {
      const score = scoreByStudent.get(student.ma_hs)
      const studentRecords = records.filter((record) => {
        if (record.ma_hs !== student.ma_hs || record.tuan_so !== tuanSo) {
          return false
        }

        if (group === null) {
          return true
        }

        if (group === 'HT') {
          return typeof record.diem_so_mon === 'number'
        }

        const catalogItem = record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined
        return catalogItem?.nhom === group && catalogItem.pham_vi === 'ca_nhan'
      })

      return {
        maHs: student.ma_hs,
        name: `${student.ho} ${student.ten}`,
        token: student.token_ho_so,
        score: score ? getScoreForGroup(score, group) : null,
        recordCount: studentRecords.reduce((sum, record) => sum + (record.so_lan || 1), 0),
        records: studentRecords,
      }
    })
    .filter((row) => group === null || showAll || row.records.length > 0)
    .sort((left, right) => {
      const leftScore = left.score === null ? Number.POSITIVE_INFINITY : left.score
      const rightScore = right.score === null ? Number.POSITIVE_INFINITY : right.score
      if (leftScore !== rightScore) {
        return leftScore - rightScore
      }

      if (right.recordCount !== left.recordCount) {
        return right.recordCount - left.recordCount
      }

      return left.name.localeCompare(right.name, 'vi')
    })
}

function getScoreForGroup(score: WeeklyStudentScore, group: GroupViewKey | null): number | null {
  if (group === null) {
    return score.diem_xep_loai_thi_dua
  }

  if (group === 'CC') {
    return score.diem_chuyen_can
  }

  if (group === 'VS') {
    return score.diem_ve_sinh
  }

  if (group === 'NN') {
    return score.diem_ne_nep
  }

  if (group === 'KL') {
    return score.diem_ky_luat
  }

  return score.diem_hoc_tap
}

function toAttentionDrillDownItem(
  score: WeeklyStudentScore,
  studentById: Map<string, HocSinh>,
): AttentionDrillDownItem {
  const student = studentById.get(score.ma_hs)
  const components = [
    { label: 'CC', value: score.diem_chuyen_can },
    { label: 'VS', value: score.diem_ve_sinh },
    { label: 'NN', value: score.diem_ne_nep },
    { label: 'KL', value: score.diem_ky_luat },
  ].sort((left, right) => left.value - right.value)
  const lowest = components[0]

  return {
    maHs: score.ma_hs,
    name: student ? `${student.ho} ${student.ten}` : score.ma_hs,
    token: student?.token_ho_so || '',
    lowestComponent: lowest.label,
    lowestScore: lowest.value,
    totalScore: score.diem_xep_loai_thi_dua,
  }
}

function toRecordDrillDownItem(
  record: GhiNhan,
  index: number,
  studentById: Map<string, HocSinh>,
  catalogByCode: Map<string, DanhMucDiem>,
): RecordDrillDownItem {
  const student = record.ma_hs ? studentById.get(record.ma_hs) : undefined
  const catalogItem = record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined

  return {
    badgeClass: getBadgeClassForRecord(record, catalogByCode),
    catalogItem,
    id: record.ma_ghi_nhan || `${record.ngay}-${record.ma_hs || record.ma_danh_muc}-${index}`,
    code: record.ma_danh_muc || record.loai,
    date: record.ngay,
    description: record.noi_dung || record.ly_do || 'Không có mô tả',
    name: student
      ? `${student.ho} ${student.ten}`
      : record.ma_hs || `Tổ ${record.to_lien_quan || 'tập thể'}`,
    status: record.da_xu_ly ? 'Đã xử lý' : 'Chưa xử lý',
    token: student?.token_ho_so,
  }
}

function toEventDrillDownItem(
  record: GhiNhan,
  catalogItem: DanhMucDiem | undefined,
  index: number,
): EventDrillDownItem {
  const scope =
    catalogItem?.pham_vi === 'to_truc'
      ? `Tổ ${record.to_lien_quan || '-'}`
      : 'Tập thể'

  return {
    badgeClass: getBadgeClassForCatalog(catalogItem),
    catalogItem,
    id: record.ma_ghi_nhan || `${record.ngay}-${record.ma_danh_muc || 'event'}-${index}`,
    code: record.ma_danh_muc || record.loai,
    date: record.ngay,
    description: record.noi_dung || record.ly_do || catalogItem?.ten_muc || 'Không có mô tả',
    scope,
  }
}

function findTeamLeader(
  teamNumber: number,
  banCanSu: BanCanSu[],
  students: HocSinh[],
): string | null {
  const leaderRole = banCanSu.find(
    (role) => role.to === teamNumber && normalizeText(role.chuc_vu).includes('to truong'),
  )
  const leader = leaderRole ? students.find((student) => student.ma_hs === leaderRole.ma_hs) : null

  return leader ? `${leader.ho} ${leader.ten}` : null
}

function getTeamEventHistory(
  teamNumber: number,
  records: GhiNhan[],
  catalog: DanhMucDiem[],
): Array<{ badgeClass: string; catalogItem?: DanhMucDiem; code: string; date: string; description: string; id: string; week: number }> {
  const catalogByCode = new Map(catalog.map((item) => [item.ma_danh_muc, item]))

  return records
    .filter((record) => {
      const catalogItem = record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined
      return catalogItem?.pham_vi === 'to_truc' && record.to_lien_quan === teamNumber
    })
    .sort((a, b) => new Date(b.ngay).getTime() - new Date(a.ngay).getTime())
    .map((record, index) => {
      const catalogItem = record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined

      return {
        badgeClass: getBadgeClassForRecord(record, catalogByCode),
        catalogItem,
        code: record.ma_danh_muc || record.loai,
        date: record.ngay,
        description: record.noi_dung || record.ly_do || 'Không có mô tả',
        id: record.ma_ghi_nhan || `${record.ngay}-${record.ma_danh_muc || 'team'}-${index}`,
        week: record.tuan_so,
      }
    })
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function averageComponents(scores: WeeklyStudentScore[]): Record<'CC' | 'VS' | 'NN' | 'KL', string> {
  return {
    CC: roundNumber(average(scores.map((score) => score.diem_chuyen_can))).toFixed(1),
    VS: roundNumber(average(scores.map((score) => score.diem_ve_sinh))).toFixed(1),
    NN: roundNumber(average(scores.map((score) => score.diem_ne_nep))).toFixed(1),
    KL: roundNumber(average(scores.map((score) => score.diem_ky_luat))).toFixed(1),
  }
}

function buildTrendItems(
  current: Record<'CC' | 'VS' | 'NN' | 'KL', string>,
  previous: Record<'CC' | 'VS' | 'NN' | 'KL', string>,
): TrendDrillDownItem[] {
  const groups: Array<{ key: 'CC' | 'VS' | 'NN' | 'KL'; label: string }> = [
    { key: 'CC', label: 'Chuyên cần' },
    { key: 'VS', label: 'Vệ sinh' },
    { key: 'NN', label: 'Nề nếp' },
    { key: 'KL', label: 'Kỷ luật' },
  ]

  return groups.map((item) => {
    const currentValue = Number(current[item.key])
    const previousValue = Number(previous[item.key])
    const delta = roundNumber(currentValue - previousValue)

    return {
      group: item.label,
      current: current[item.key],
      previous: previous[item.key],
      delta: `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`,
    }
  })
}

function average(values: number[]): number {
  if (!values.length) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function roundNumber(value: number): number {
  return Math.round(value * 10) / 10
}

function getStudentName(students: HocSinh[], maHs: string): string {
  const student = students.find((item) => item.ma_hs === maHs)
  return student ? `${student.ho} ${student.ten}` : maHs
}

function describeRecord(record: GhiNhan, students: HocSinh[]): string {
  const subject = record.ma_hs ? getStudentName(students, record.ma_hs) : `Tổ ${record.to_lien_quan || 'tập thể'}`
  return `${subject}: ${record.ma_danh_muc || record.loai}`
}

function buildDailyLogs(
  records: GhiNhan[],
  weekConfig: CauHinhTuan[],
  tuanSo: number,
  selectedDate = '',
) {
  const week = weekConfig.find((item) => item.tuan_so === tuanSo)
  const dates = selectedDate
    ? [selectedDate]
    : week
      ? datesBetween(week.tu_ngay, week.den_ngay)
      : uniqueRecordDates(records, tuanSo)

  return dates.map((date) => {
    const dayRecords = records.filter((record) => record.tuan_so === tuanSo && record.ngay === date)
    return {
      date,
      records: dayRecords,
      summary: summarizeRecords(dayRecords),
    }
  })
}

function datesBetween(start: string, end: string): string[] {
  const dates: string[] = []
  const current = new Date(start)
  const last = new Date(end)

  while (!Number.isNaN(current.getTime()) && current <= last) {
    dates.push(toIsoDate(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

function uniqueRecordDates(records: GhiNhan[], tuanSo: number): string[] {
  return Array.from(
    new Set(records.filter((record) => record.tuan_so === tuanSo).map((record) => record.ngay)),
  ).sort()
}

function summarizeRecords(records: GhiNhan[]) {
  const labels: Record<GhiNhan['loai'], string> = {
    chuyen_can: 'CC',
    ve_sinh: 'VS',
    ne_nep: 'NN',
    trat_tu_ky_luat: 'KL',
    hoc_tap: 'HT',
    khen_thuong: 'KT',
  }
  const counts = new Map<string, number>()
  records.forEach((record) => {
    const label = labels[record.loai]
    counts.set(label, (counts.get(label) || 0) + 1)
  })

  return Array.from(counts.entries()).map(([label, count]) => ({ label, count }))
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function getStudentRecords(records: GhiNhan[], maHs: string, weeks: number[]): GhiNhan[] {
  return records.filter((record) => record.ma_hs === maHs && weeks.includes(record.tuan_so))
}

function formatStudyScore(score: number | null): string {
  return score === null ? 'Chưa có dữ liệu' : String(score)
}

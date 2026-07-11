import { useEffect, useMemo, useState } from 'react'
import { dataSource } from '../../data/client'
import type { CauHinhTuan, DanhMucDiem, GhiNhan, HocSinh } from '../../data/types'
import { calculateClassWeeklyScores, type WeeklyStudentScore } from '../scoring/scoring'

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
    const collectiveEvents = getCollectiveEvents(state.records, state.catalog, state.tuanSo)

    return {
      collectiveEvents,
      sortedScores,
      studentById,
    }
  }, [state])

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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {body.sortedScores.map((score) => {
                    const student = body.studentById.get(score.ma_hs)
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
                        <td className="px-3 py-3">{score.diem_hoc_tap}</td>
                        <td className="px-3 py-3 font-bold text-slate-900">
                          {score.diem_xep_loai_thi_dua}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {score.xep_loai}
                          </span>
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
                  <article key={record.ma_ghi_nhan || `${record.ngay}-${record.ma_danh_muc}`} className="p-4">
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
    .filter((record) => record.tuan_so === tuanSo)
    .map((record) => ({
      catalogItem: record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined,
      record,
    }))
    .filter(({ catalogItem }) => catalogItem?.pham_vi === 'tap_the' || catalogItem?.pham_vi === 'to_truc')
}

function getLatestWeek(records: GhiNhan[], weekConfig: CauHinhTuan[]): number {
  const latestRecordWeek = Math.max(0, ...records.map((record) => record.tuan_so || 0))
  if (latestRecordWeek > 0) {
    return latestRecordWeek
  }

  return Math.max(1, ...weekConfig.map((week) => week.tuan_so || 0))
}

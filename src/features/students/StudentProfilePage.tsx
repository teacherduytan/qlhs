import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type { BanCanSu, CauHinhTuan, GhiNhan, HocSinh } from '../../data/types'
import { calculateWeeklyStudentScore, type WeeklyStudentScore } from '../scoring/scoring'

type ProfileState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | {
      status: 'success'
      records: GhiNhan[]
      score: WeeklyStudentScore
      student: HocSinh
      role: string
    }

export function StudentProfilePage() {
  const { token } = useParams()
  const [state, setState] = useState<ProfileState>({ status: 'loading' })

  useEffect(() => {
    let active = true

    if (!token) {
      setState({ status: 'not_found' })
      return
    }

    Promise.all([
      dataSource.getStudentByToken(token),
      dataSource.getBanCanSu(),
      dataSource.getPointCatalog(),
      dataSource.getWeekConfig(),
    ])
      .then(async ([student, banCanSu, catalog, weekConfig]) => {
        if (!active) {
          return
        }

        if (!student) {
          setState({ status: 'not_found' })
          return
        }

        const records = await dataSource.getRecords(student.ma_hs)
        if (!active) {
          return
        }

        const tuanSo = getLatestWeek(records, weekConfig)
        setState({
          status: 'success',
          records,
          score: calculateWeeklyStudentScore({
            catalog,
            records,
            student,
            tuanSo,
          }),
          student,
          role: getStudentRole(student.ma_hs, banCanSu),
        })
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Không tải được hồ sơ học sinh.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [token])

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <section className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600">QLHS 11C5</p>
            <h1 className="text-xl font-bold text-slate-900">Hồ sơ học sinh</h1>
          </div>
          <Link
            to="/"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Về trang chính
          </Link>
        </div>

        {state.status === 'loading' ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Đang tải hồ sơ...
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {state.message}
          </div>
        ) : null}

        {state.status === 'not_found' ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">Không tìm thấy hồ sơ</h2>
            <p className="mt-2 text-sm text-slate-600">
              Link hồ sơ không hợp lệ hoặc token đã được thay đổi.
            </p>
          </div>
        ) : null}

        {state.status === 'success' ? (
          <>
            <ProfileCard student={state.student} role={state.role} />
            <TodayRecords records={state.records} />
            <ScoreSummary score={state.score} />
            <RecordHistory records={state.records} />
          </>
        ) : null}
      </section>
    </main>
  )
}

function TodayRecords({ records }: { records: GhiNhan[] }) {
  const today = getTodayIsoDate()
  const todayRecords = records.filter((record) => record.ngay === today)

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Hôm nay</h2>
          <p className="text-sm text-slate-600">{formatDate(today)}</p>
        </div>
        <p className="text-sm font-semibold text-blue-700">{todayRecords.length} ghi nhận</p>
      </div>

      {todayRecords.length ? (
        <div className="mt-3 space-y-2">
          {todayRecords.map((record, index) => (
            <article
              key={record.ma_ghi_nhan || `${record.ngay}-${record.ma_danh_muc}-${index}`}
              className="rounded-md border border-blue-100 bg-white p-3"
            >
              <p className="text-sm font-semibold text-slate-900">
                {record.ma_danh_muc || labelRecordType(record.loai)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {record.noi_dung || record.ly_do || 'Không có mô tả'}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">Chưa có ghi nhận nào trong hôm nay.</p>
      )}
    </div>
  )
}

function ScoreSummary({ score }: { score: WeeklyStudentScore }) {
  const scoreItems = [
    { label: 'Chuyên cần', value: score.diem_chuyen_can },
    { label: 'Vệ sinh', value: score.diem_ve_sinh },
    { label: 'Nề nếp', value: score.diem_ne_nep },
    { label: 'Kỷ luật', value: score.diem_ky_luat },
    { label: 'Học tập', value: score.diem_hoc_tap },
  ]

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Điểm thi đua tuần {score.tuan_so}</h2>
          <p className="text-sm text-slate-600">Tính theo quy chế thi đua của trường</p>
        </div>
        <div className="rounded-md bg-blue-600 px-4 py-3 text-white">
          <p className="text-xs font-semibold uppercase">Xếp loại</p>
          <p className="text-xl font-bold">
            {score.diem_xep_loai_thi_dua} · {score.xep_loai}
          </p>
        </div>
      </div>

      <div className="grid gap-px bg-slate-200 sm:grid-cols-5">
        {scoreItems.map((item) => (
          <div key={item.label} className="bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {item.value === null ? 'Chưa có dữ liệu' : item.value}
            </p>
          </div>
        ))}
      </div>

      {score.can_canh_bao_ngay ? (
        <div className="border-t border-red-100 bg-red-50 p-4 text-sm font-medium text-red-800">
          Có ghi nhận nghiêm trọng, cần xử lý ngay.
        </div>
      ) : null}
    </div>
  )
}

function RecordHistory({ records }: { records: GhiNhan[] }) {
  const groupedRecords = groupRecordsByWeek(records)

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-lg font-bold text-slate-900">Lịch sử ghi nhận</h2>
        <p className="text-sm text-slate-600">
          {records.length ? `${records.length} dòng ghi nhận` : 'Chưa có ghi nhận nào'}
        </p>
      </div>

      {groupedRecords.length ? (
        <div className="divide-y divide-slate-200">
          {groupedRecords.map(({ records: weekRecords, tuanSo }) => (
            <section key={tuanSo} className="p-4">
              <h3 className="text-sm font-bold text-blue-700">Tuần {tuanSo}</h3>
              <div className="mt-3 space-y-3">
                {weekRecords.map((record, index) => (
                  <article
                    key={record.ma_ghi_nhan || `${record.ngay}-${record.ma_danh_muc}-${index}`}
                    className="rounded-md border border-slate-200 p-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {record.ma_danh_muc || labelRecordType(record.loai)}
                        </p>
                        <p className="text-sm text-slate-600">
                          {record.noi_dung || record.ly_do || 'Không có mô tả'}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-slate-500">
                        {formatDate(record.ngay)}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                      <Badge>{labelRecordType(record.loai)}</Badge>
                      {record.tiet ? <Badge>{`Tiết ${record.tiet}`}</Badge> : null}
                      {record.mon_hoc ? <Badge>{record.mon_hoc}</Badge> : null}
                      {typeof record.diem_cong_tru === 'number' ? (
                        <Badge>{`${record.diem_cong_tru} điểm`}</Badge>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="p-4 text-sm text-slate-600">Hồ sơ này chưa có lịch sử ghi nhận.</div>
      )}
    </div>
  )
}

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
      {children}
    </span>
  )
}

function ProfileCard({ role, student }: { role: string; student: HocSinh }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-blue-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
            {student.ten.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-700">{role}</p>
            <h2 className="text-2xl font-bold text-slate-950">
              {student.ho} {student.ten}
            </h2>
            <p className="text-sm text-slate-600">Mã học sinh: {student.ma_hs}</p>
          </div>
        </div>
      </div>

      <dl className="grid gap-px bg-slate-200 sm:grid-cols-2">
        <InfoItem label="Số thứ tự" value={String(student.tt)} />
        <InfoItem label="Diện" value={student.dien} />
        <InfoItem label="Giới tính" value={student.nu ? 'Nữ' : 'Nam'} />
        <InfoItem label="Dân tộc" value={student.dan_toc || '-'} />
        <InfoItem label="Ngày sinh" value={formatDate(student.ngay_sinh)} />
        <InfoItem label="Cờ đỏ" value={student.la_co_do ? 'Có' : 'Không'} />
        <InfoItem label="Ngày nhập học" value={formatDate(student.ngay_nhap_hoc)} />
        <InfoItem label="Trạng thái" value={student.ngay_roi_lop ? 'Đã rời lớp' : 'Đang học'} />
      </dl>

      {student.ghi_chu ? (
        <div className="border-t border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700">Ghi chú</p>
          <p className="mt-1 text-sm text-slate-600">{student.ghi_chu}</p>
        </div>
      ) : null}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value || '-'}</dd>
    </div>
  )
}

function getStudentRole(maHs: string, banCanSu: BanCanSu[]): string {
  const role = banCanSu.find((item) => item.ma_hs === maHs)
  return role?.chuc_vu || 'Học sinh'
}

function formatDate(value: string | null): string {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN').format(date)
}

function getLatestWeek(records: GhiNhan[], weekConfig: CauHinhTuan[]): number {
  const latestRecordWeek = Math.max(0, ...records.map((record) => record.tuan_so || 0))
  if (latestRecordWeek > 0) {
    return latestRecordWeek
  }

  return Math.max(1, ...weekConfig.map((week) => week.tuan_so || 0))
}

function groupRecordsByWeek(records: GhiNhan[]): Array<{ tuanSo: number; records: GhiNhan[] }> {
  const sortedRecords = [...records].sort((a, b) => {
    const byDate = new Date(b.ngay).getTime() - new Date(a.ngay).getTime()
    if (byDate !== 0) {
      return byDate
    }

    return b.tuan_so - a.tuan_so
  })

  return sortedRecords.reduce<Array<{ tuanSo: number; records: GhiNhan[] }>>((groups, record) => {
    const currentGroup = groups.find((group) => group.tuanSo === record.tuan_so)
    if (currentGroup) {
      currentGroup.records.push(record)
    } else {
      groups.push({ tuanSo: record.tuan_so, records: [record] })
    }

    return groups
  }, [])
}

function labelRecordType(loai: GhiNhan['loai']): string {
  const labels: Record<GhiNhan['loai'], string> = {
    chuyen_can: 'Chuyên cần',
    ve_sinh: 'Vệ sinh',
    ne_nep: 'Nề nếp',
    trat_tu_ky_luat: 'Trật tự - kỷ luật',
    hoc_tap: 'Học tập',
    khen_thuong: 'Khen thưởng',
  }

  return labels[loai]
}

function getTodayIsoDate(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

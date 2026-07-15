import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type { BanCanSu, CauHinhTuan, DanhMucDiem, GhiNhan, HocSinh } from '../../data/types'
import { CatalogCodeBadge } from '../scoring/CatalogCodeBadge'
import { getRecordInsight, getRecordPolarity, summarizeRecordImpacts } from '../records/recordInsights'
import { calculateWeeklyStudentScore, type WeeklyStudentScore } from '../scoring/scoring'
import { getBadgeClassForRecord } from '../scoring/scoreStyles'
import { findWeek, selectDefaultWeek, WeekDatePicker, WeekSelector } from '../time/WeekSelector'
import { getStudentGroup } from './studentGroups'

type ProfileState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | {
      status: 'success'
      catalog: DanhMucDiem[]
      records: GhiNhan[]
      student: HocSinh
      role: string
      tuanSo: number
      weekConfig: CauHinhTuan[]
    }

type ProfileTab = 'records' | 'score' | 'info'

type ProfileSectionKey = 'summary' | 'featured' | 'records' | 'score' | 'info'

const PROFILE_SECTIONS: Array<{ id: ProfileSectionKey; label: string; tab?: ProfileTab }> = [
  { id: 'summary', label: 'Tóm tắt' },
  { id: 'featured', label: 'Ghi nhận' },
  { id: 'records', label: 'Lịch sử', tab: 'records' },
  { id: 'score', label: 'Điểm tuần', tab: 'score' },
  { id: 'info', label: 'Cá nhân', tab: 'info' },
]

const INITIAL_PROFILE_COLLAPSED: Record<ProfileSectionKey, boolean> = {
  featured: false,
  info: false,
  records: false,
  score: false,
  summary: false,
}

export function StudentProfilePage() {
  const { token } = useParams()
  const [state, setState] = useState<ProfileState>({ status: 'loading' })
  const [activeTab, setActiveTab] = useState<ProfileTab>('records')
  const [collapsedSections, setCollapsedSections] =
    useState<Record<ProfileSectionKey, boolean>>(INITIAL_PROFILE_COLLAPSED)

  const score = useMemo(() => {
    if (state.status !== 'success') {
      return null
    }

    return calculateWeeklyStudentScore({
      catalog: state.catalog,
      records: state.records,
      student: state.student,
      tuanSo: state.tuanSo,
    })
  }, [state])

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

        const tuanSo = selectDefaultWeek(weekConfig, records)
        setState({
          status: 'success',
          catalog,
          records,
          student,
          role: getStudentRole(student.ma_hs, banCanSu),
          tuanSo,
          weekConfig,
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

  function toggleSection(section: ProfileSectionKey) {
    setCollapsedSections((current) => ({ ...current, [section]: !current[section] }))
  }

  function openSection(section: ProfileSectionKey) {
    const target = PROFILE_SECTIONS.find((item) => item.id === section)
    if (target?.tab) {
      setActiveTab(target.tab)
    }
    setCollapsedSections((current) => ({ ...current, [section]: false }))
    window.setTimeout(() => {
      document.getElementById(`profile-${section}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <section className="mx-auto max-w-3xl space-y-4">
        <div>
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600">QLHS 11C5</p>
            <h1 className="text-xl font-bold text-slate-900">Hồ sơ học sinh</h1>
          </div>
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

        {state.status === 'success' && score ? (
          <>
            <ProfileSectionNav
              collapsedSections={collapsedSections}
              items={PROFILE_SECTIONS}
              onSelect={openSection}
            />

            <section id="profile-summary" className="scroll-mt-4 space-y-3">
              <ProfileSectionHeader
                collapsed={collapsedSections.summary}
                title="Tóm tắt hồ sơ"
                onToggle={() => toggleSection('summary')}
              />
              {!collapsedSections.summary ? (
                <StudentProfileHeader
                  recordCount={state.records.length}
                  role={state.role}
                  student={state.student}
                />
              ) : null}
            </section>

            <section id="profile-featured" className="scroll-mt-4 space-y-3">
              <ProfileSectionHeader
                collapsed={collapsedSections.featured}
                title="Ghi nhận mới nhất"
                onToggle={() => toggleSection('featured')}
              />
              {!collapsedSections.featured ? (
                <FeaturedRecords catalog={state.catalog} records={state.records} />
              ) : null}
            </section>

            <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'records' ? (
              <section id="profile-records" className="scroll-mt-4 space-y-3">
                <ProfileSectionHeader
                  collapsed={collapsedSections.records}
                  title="Lịch sử ghi nhận"
                  onToggle={() => toggleSection('records')}
                />
                {!collapsedSections.records ? (
                  <RecordHistory
                    catalog={state.catalog}
                    records={state.records}
                    selectedWeek={findWeek(state.weekConfig, state.tuanSo)}
                    tuanSo={state.tuanSo}
                  />
                ) : null}
              </section>
            ) : null}

            {activeTab === 'score' ? (
              <section id="profile-score" className="scroll-mt-4 space-y-3">
                <ProfileSectionHeader
                  collapsed={collapsedSections.score}
                  title="Điểm tuần"
                  onToggle={() => toggleSection('score')}
                />
                {!collapsedSections.score ? (
                  <>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
                  <div className="max-w-xs">
                    <WeekSelector
                      label="Tuần tính điểm"
                      value={state.tuanSo}
                      weeks={state.weekConfig}
                      onChange={(tuanSo) =>
                        setState((current) =>
                          current.status === 'success' ? { ...current, tuanSo } : current,
                        )
                      }
                    />
                  </div>
                </div>
                <ScoreSummary score={score} />
                  </>
                ) : null}
              </section>
            ) : null}

            {activeTab === 'info' ? (
              <section id="profile-info" className="scroll-mt-4 space-y-3">
                <ProfileSectionHeader
                  collapsed={collapsedSections.info}
                  title="Thông tin cá nhân"
                  onToggle={() => toggleSection('info')}
                />
                {!collapsedSections.info ? (
                  <ProfileCard student={state.student} role={state.role} />
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  )
}

function StudentProfileHeader({
  recordCount,
  role,
  student,
}: {
  recordCount: number
  role: string
  student: HocSinh
}) {
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
          {student.ten.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase text-blue-600">{role}</p>
          <h2 className="truncate text-2xl font-bold text-slate-950">
            {student.ho} {student.ten}
          </h2>
        </div>
        <div className="rounded-md bg-white px-3 py-2 text-center ring-1 ring-sky-100">
          <p className="text-lg font-bold text-slate-900">{recordCount}</p>
          <p className="text-xs font-semibold text-slate-500">ghi nhận</p>
        </div>
      </div>
    </div>
  )
}

function ProfileSectionNav({
  collapsedSections,
  items,
  onSelect,
}: {
  collapsedSections: Record<ProfileSectionKey, boolean>
  items: Array<{ id: ProfileSectionKey; label: string }>
  onSelect: (id: ProfileSectionKey) => void
}) {
  return (
    <nav className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            {item.label}
            {collapsedSections[item.id] ? ' (đang gọn)' : ''}
          </button>
        ))}
      </div>
    </nav>
  )
}

function ProfileSectionHeader({
  collapsed,
  onToggle,
  title,
}: {
  collapsed: boolean
  onToggle: () => void
  title: string
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        {collapsed ? 'Mở rộng' : 'Thu gọn'}
      </button>
    </div>
  )
}

function FeaturedRecords({ catalog, records }: { catalog: DanhMucDiem[]; records: GhiNhan[] }) {
  const latestRecords = sortRecordsNewest(records).slice(0, 4)
  const catalogByCode = new Map(catalog.map((item) => [item.ma_danh_muc, item]))
  const summary = summarizeRecordImpacts(records, catalogByCode)

  return (
    <div className="rounded-lg border border-blue-300 bg-blue-50 shadow-sm">
      <div className="border-b border-blue-200 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-700">Ghi nhận của em</p>
            <h2 className="text-xl font-bold text-slate-950">Ghi nhận tích cực và cần lưu ý trên lớp</h2>
            <p className="mt-1 text-sm text-slate-600">
              Các dòng thầy/cô đã nhập từ phiếu ghi nhận vào hệ thống.
            </p>
          </div>
          <ImpactSummary negative={summary.negative} positive={summary.positive} />
        </div>
      </div>

      {latestRecords.length ? (
        <div className="space-y-2 p-4">
          {latestRecords.map((record, index) => (
            <article
              key={record.ma_ghi_nhan || `${record.ngay}-${record.ma_danh_muc}-${index}`}
              className="rounded-md border border-blue-100 bg-white p-3 shadow-sm"
            >
              <RecordSummary
                allRecords={records}
                record={record}
                catalogByCode={catalogByCode}
                featured
              />
            </article>
          ))}
        </div>
      ) : (
        <div className="p-4 text-sm text-slate-600">
          Chưa có ghi nhận nào được nhập cho hồ sơ này.
        </div>
      )}
    </div>
  )
}

function ProfileTabs({
  activeTab,
  onChange,
}: {
  activeTab: ProfileTab
  onChange: (tab: ProfileTab) => void
}) {
  const tabs: Array<{ id: ProfileTab; label: string }> = [
    { id: 'records', label: 'Tất cả ghi nhận' },
    { id: 'score', label: 'Điểm tuần' },
    { id: 'info', label: 'Thông tin cá nhân' },
  ]

  return (
    <div className="rounded-lg border border-slate-300 bg-slate-100 p-1 shadow-sm">
      <div className="grid grid-cols-3 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`min-h-11 rounded-md px-2 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
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
    <div className="rounded-lg border border-amber-200 bg-amber-50 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-amber-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Điểm thi đua tuần {score.tuan_so}</h2>
          <p className="text-sm text-slate-600">Tính theo quy chế thi đua của trường</p>
          <p className="mt-1 text-xs text-slate-500">
            Điểm xếp loại chỉ so sánh được giữa các học sinh có cùng trạng thái đã/chưa có điểm học
            tập trong tuần.
          </p>
        </div>
        <div className="rounded-md bg-blue-600 px-4 py-3 text-white">
          <p className="text-xs font-semibold uppercase">Xếp loại</p>
          <p className="text-xl font-bold">
            {score.diem_xep_loai_thi_dua} · {score.xep_loai}
          </p>
        </div>
      </div>

      <div className="grid gap-px bg-amber-200 sm:grid-cols-5">
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

function RecordHistory({
  catalog,
  records,
  selectedWeek,
  tuanSo,
}: {
  catalog: DanhMucDiem[]
  records: GhiNhan[]
  selectedWeek?: CauHinhTuan
  tuanSo: number
}) {
  const [filterMode, setFilterMode] = useState<'all' | 'week'>('all')
  const [selectedDate, setSelectedDate] = useState('')
  const filteredRecords = filterHistoryRecords(records, filterMode, tuanSo, selectedDate)
  const groupedRecords = groupRecordsByWeek(filteredRecords)
  const catalogByCode = new Map(catalog.map((item) => [item.ma_danh_muc, item]))
  const summary = summarizeRecordImpacts(filteredRecords, catalogByCode)

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm">
      <div className="space-y-3 border-b border-emerald-200 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Lịch sử ghi nhận</h2>
            <p className="text-sm text-slate-600">
              {filteredRecords.length
                ? `${filteredRecords.length}/${records.length} dòng ghi nhận`
                : 'Không có ghi nhận trong bộ lọc hiện tại'}
            </p>
          </div>
          <ImpactSummary negative={summary.negative} positive={summary.positive} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Phạm vi lịch sử
            <select
              value={filterMode}
              onChange={(event) => {
                setFilterMode(event.target.value as 'all' | 'week')
                setSelectedDate('')
              }}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Toàn bộ lịch sử</option>
              <option value="week">Tuần đang chọn</option>
            </select>
          </label>
          <WeekDatePicker
            disabled={filterMode !== 'week'}
            selectedWeek={selectedWeek}
            value={selectedDate}
            onChange={(date) => {
              setFilterMode('week')
              setSelectedDate(date)
            }}
          />
        </div>
      </div>

      {groupedRecords.length ? (
        <div className="divide-y divide-emerald-200 bg-white/70">
          {groupedRecords.map(({ records: weekRecords, tuanSo }) => (
            <section key={tuanSo} className="p-4">
              <h3 className="text-sm font-bold text-blue-700">Tuần {tuanSo}</h3>
              <div className="mt-3 space-y-3">
                {weekRecords.map((record, index) => (
                  <article
                    key={record.ma_ghi_nhan || `${record.ngay}-${record.ma_danh_muc}-${index}`}
                    className="rounded-md border border-emerald-200 bg-white p-3"
                  >
                    <RecordSummary
                      allRecords={records}
                      record={record}
                      catalogByCode={catalogByCode}
                    />
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="p-4 text-sm text-slate-600">Không có lịch sử ghi nhận phù hợp.</div>
      )}
    </div>
  )
}

function RecordSummary({
  allRecords,
  catalogByCode,
  featured = false,
  record,
}: {
  allRecords: GhiNhan[]
  catalogByCode: Map<string, DanhMucDiem>
  featured?: boolean
  record: GhiNhan
}) {
  const pointText = getRecordPointText(record)
  const insight = getRecordInsight(record, allRecords, catalogByCode)
  const catalogItem = record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            <CatalogCodeBadge
              catalogItem={record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined}
              code={record.ma_danh_muc || record.loai}
              label={record.ma_danh_muc || labelRecordType(record.loai)}
            />
          </p>
          <p className={`${featured ? 'mt-2 text-base font-semibold text-slate-900' : 'text-sm text-slate-600'}`}>
            {record.noi_dung || record.ly_do || 'Không có mô tả'}
          </p>
        </div>
        <p className="whitespace-nowrap text-sm font-medium text-slate-500">{formatDate(record.ngay)}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
        <ImpactBadge insight={insight} />
        <Badge className={getBadgeClassForRecord(record, catalogByCode)}>
          {labelRecordDisplay(record, catalogItem)}
        </Badge>
        {record.tiet ? <Badge>{`Tiết ${record.tiet}`}</Badge> : null}
        {record.mon_hoc ? <Badge>{record.mon_hoc}</Badge> : null}
        {pointText ? <Badge>{pointText}</Badge> : null}
        {insight.polarity === 'negative' && insight.duplicateCount ? (
          <Badge className="border-red-200 bg-red-50 text-red-700">
            {`Lần ${insight.duplicateCount}`}
          </Badge>
        ) : null}
      </div>
      {insight.polarity === 'negative' && insight.intervention ? (
        <div className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800">
          <p className="font-bold">{insight.intervention.label}</p>
          <p className="mt-1">{insight.intervention.action}</p>
        </div>
      ) : null}
    </>
  )
}

function ImpactSummary({ negative, positive }: { negative: number; positive: number }) {
  return (
    <div className="grid min-w-48 grid-cols-2 overflow-hidden rounded-md border border-white/80 bg-white text-center shadow-sm">
      <div className="border-r border-slate-100 px-3 py-2">
        <p className="text-xs font-semibold uppercase text-emerald-700">Tích cực</p>
        <p className="text-lg font-bold text-emerald-700">+{positive}</p>
      </div>
      <div className="px-3 py-2">
        <p className="text-xs font-semibold uppercase text-red-700">Vi phạm</p>
        <p className="text-lg font-bold text-red-700">-{negative}</p>
      </div>
    </div>
  )
}

function ImpactBadge({ insight }: { insight: ReturnType<typeof getRecordInsight> }) {
  if (insight.impactValue === 1) {
    return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">+1 tích cực</Badge>
  }

  if (insight.impactValue === -1) {
    return <Badge className="border-red-200 bg-red-50 text-red-700">-1 vi phạm</Badge>
  }

  return <Badge className="border-slate-200 bg-slate-50 text-slate-600">0 theo dõi</Badge>
}

function Badge({ children, className = 'bg-slate-100 text-slate-700 border-slate-200' }: { children: string; className?: string }) {
  return (
    <span className={`rounded-full border px-2 py-1 ${className}`}>
      {children}
    </span>
  )
}

function ProfileCard({ role, student }: { role: string; student: HocSinh }) {
  return (
    <div className="overflow-hidden rounded-lg border border-violet-200 bg-violet-50 shadow-sm">
      <div className="border-b border-violet-200 bg-violet-100 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
            {student.ten.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-violet-700">{role}</p>
            <h2 className="text-2xl font-bold text-slate-950">
              {student.ho} {student.ten}
            </h2>
            <p className="text-sm text-slate-600">Mã học sinh: {student.ma_hs}</p>
          </div>
        </div>
      </div>

      <dl className="grid gap-px bg-violet-200 sm:grid-cols-2">
        <InfoItem label="Số thứ tự" value={String(student.tt)} />
        <InfoItem label="Diện" value={student.dien} />
        <InfoItem label="Tổ" value={String(resolveStudentGroup(student) || '-')} />
        <InfoItem label="Giới tính" value={student.nu ? 'Nữ' : 'Nam'} />
        <InfoItem label="Dân tộc" value={student.dan_toc || '-'} />
        <InfoItem label="Ngày sinh" value={formatDate(student.ngay_sinh)} />
        <InfoItem label="Cờ đỏ" value={student.la_co_do ? 'Có' : 'Không'} />
        <InfoItem label="Ngày nhập học" value={formatDate(student.ngay_nhap_hoc)} />
        <InfoItem label="Trạng thái" value={student.ngay_roi_lop ? 'Đã rời lớp' : 'Đang học'} />
      </dl>

      {student.ghi_chu ? (
        <div className="border-t border-violet-200 bg-white/70 p-4">
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

function resolveStudentGroup(student: HocSinh): number | null {
  return student.to || getStudentGroup(student.ma_hs)
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

function groupRecordsByWeek(records: GhiNhan[]): Array<{ tuanSo: number; records: GhiNhan[] }> {
  const sortedRecords = sortRecordsNewest(records)

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

function sortRecordsNewest(records: GhiNhan[]): GhiNhan[] {
  return [...records].sort((a, b) => {
    const byDate = new Date(b.ngay).getTime() - new Date(a.ngay).getTime()
    if (byDate !== 0) {
      return byDate
    }

    return b.tuan_so - a.tuan_so
  })
}

function filterHistoryRecords(
  records: GhiNhan[],
  filterMode: 'all' | 'week',
  tuanSo: number,
  selectedDate: string,
): GhiNhan[] {
  if (selectedDate) {
    return records.filter((record) => record.ngay === selectedDate)
  }

  if (filterMode === 'week') {
    return records.filter((record) => record.tuan_so === tuanSo)
  }

  return records
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

function labelRecordDisplay(record: GhiNhan, catalogItem?: DanhMucDiem): string {
  const catalogByCode = catalogItem ? new Map([[catalogItem.ma_danh_muc, catalogItem]]) : new Map<string, DanhMucDiem>()
  const polarity = getRecordPolarity(record, catalogByCode)

  if (polarity === 'positive') {
    return 'Tích cực / thành tích'
  }

  if (polarity === 'negative') {
    return 'Vi phạm'
  }

  return labelRecordType(record.loai)
}

function getRecordPointText(record: GhiNhan): string | null {
  if (record.loai === 'hoc_tap' && typeof record.diem_so_mon === 'number') {
    return `Điểm môn: ${record.diem_so_mon}`
  }

  if (typeof record.diem_cong_tru === 'number') {
    return `${record.diem_cong_tru > 0 ? '+' : ''}${record.diem_cong_tru} điểm`
  }

  return null
}

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { dataSource } from '../../data/client'
import type {
  BanCanSu,
  CauHinhTuan,
  DanhMucDiem,
  DeXuatGhiNhan,
  GhiNhan,
  HocSinh,
  LopTruongData,
  NhomDiem,
} from '../../data/types'
import { CatalogCodeBadge } from '../scoring/CatalogCodeBadge'
import { getRecordInsight, getRecordPolarity, summarizeRecordImpacts } from '../records/recordInsights'
import { calculateWeeklyStudentScore, type WeeklyStudentScore } from '../scoring/scoring'
import { getBadgeClassForRecord } from '../scoring/scoreStyles'
import { findWeek, selectDefaultWeek, WeekDatePicker, WeekSelector } from '../time/WeekSelector'
import { getStudentGroup } from './studentGroups'
import { Pagination, usePagination } from '../../components/Pagination'
import { PullToRefresh } from '../../components/PullToRefresh'

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

type WizardStep = 'students' | 'catalog' | 'details' | 'review'

const WIZARD_STEPS: Array<{ key: WizardStep; label: string }> = [
  { key: 'students', label: '1. Học sinh' },
  { key: 'catalog', label: '2. Danh mục' },
  { key: 'details', label: '3. Thông tin' },
  { key: 'review', label: '4. Xác nhận' },
]

type ProfileSectionKey = 'summary' | 'featured' | 'records' | 'score' | 'info'

const PROFILE_SECTIONS: Array<{ id: ProfileSectionKey; label: string; icon: string; tab?: ProfileTab }> = [
  { id: 'summary', label: 'Tóm tắt', icon: '🧾' },
  { id: 'featured', label: 'Ghi nhận', icon: '⭐' },
  { id: 'records', label: 'Lịch sử', icon: '🕘', tab: 'records' },
  { id: 'score', label: 'Điểm tuần', icon: '📊', tab: 'score' },
  { id: 'info', label: 'Cá nhân', icon: '👤', tab: 'info' },
]

const LOP_TRUONG_ROLE = 'Lớp trưởng'
const NEW_CATEGORY_VALUE = '__new__'
const NHOM_OPTIONS: Array<{ label: string; value: NhomDiem }> = [
  { label: 'Chuyên cần', value: 'CC' },
  { label: 'Vệ sinh', value: 'VS' },
  { label: 'Nề nếp', value: 'NN' },
  { label: 'Kỷ luật', value: 'KL' },
  { label: 'Tích cực', value: 'KT' },
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [menuOpen])

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

    dataSource
      .getPublicStudentProfile(token)
      .then((profile) => {
        if (!active) {
          return
        }

        if (!profile) {
          setState({ status: 'not_found' })
          return
        }

        const tuanSo = selectDefaultWeek(profile.weekConfig, profile.records)
        setState({
          status: 'success',
          catalog: profile.catalog,
          records: profile.records,
          student: profile.student,
          role: getStudentRole(profile.student.ma_hs, profile.banCanSu),
          tuanSo,
          weekConfig: profile.weekConfig,
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
    setMenuOpen(false)
    window.setTimeout(() => {
      document.getElementById(`profile-${section}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  return (
    <main className="min-h-screen bg-slate-200 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-40 border-b border-slate-300 bg-slate-100 pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600">QLHS 11C5</p>
            <h1 className="text-xl font-bold text-slate-900">Hồ sơ học sinh</h1>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg hover:bg-slate-100"
              aria-expanded={menuOpen}
              aria-label="Menu mục hồ sơ"
            >
              <span aria-hidden="true">☰</span>
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-12 z-50 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                {PROFILE_SECTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openSection(item.id)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                    {collapsedSections[item.id] ? (
                      <span className="ml-auto text-xs text-slate-400">(gọn)</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <PullToRefresh>
      <section className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        {state.status === 'loading' ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Đang tải hồ sơ...
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className="rounded-lg border border-amber-200 bg-amber-100 p-4 text-sm text-amber-900">
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

            {state.role === LOP_TRUONG_ROLE && token ? (
              <section id="profile-lop-truong" className="scroll-mt-4">
                <LopTruongPanel token={token} />
              </section>
            ) : null}

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
                <div className="rounded-lg border border-amber-200 bg-amber-100 p-4 shadow-sm">
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
      </PullToRefresh>

      {state.status === 'success' && score ? (
        <nav
          aria-label="Điều hướng nhanh hồ sơ"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-300 bg-slate-100 shadow-[0_-2px_6px_rgba(0,0,0,0.08)] md:hidden"
        >
          <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-1 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            {PROFILE_SECTIONS.map((item) => {
              const active = item.tab ? item.tab === activeTab : false
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openSection(item.id)}
                  className={`flex min-w-16 shrink-0 flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-center ${
                    active ? 'text-blue-700' : 'text-slate-500'
                  }`}
                >
                  <span className="text-lg leading-none" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className={`text-[11px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>
      ) : null}
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
    <div className="rounded-lg border border-sky-200 bg-sky-100 p-4 shadow-sm">
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
        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
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
    <div className="rounded-lg border border-blue-300 bg-blue-100 shadow-sm">
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
              className={`rounded-md border p-3 shadow-sm ${getRecordCardClass(
                record,
                record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined,
              )}`}
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
    <div className="rounded-lg border border-amber-200 bg-amber-100 shadow-sm">
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
        <div className="border-t border-red-100 bg-red-100 p-4 text-sm font-medium text-red-800">
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
  const groupedRecordsPage = usePagination(groupedRecords)
  const catalogByCode = new Map(catalog.map((item) => [item.ma_danh_muc, item]))
  const summary = summarizeRecordImpacts(filteredRecords, catalogByCode)

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-100 shadow-sm">
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
          {groupedRecordsPage.pageItems.map(({ records: weekRecords, tuanSo }) => (
            <section key={tuanSo} className="p-4">
              <h3 className="text-sm font-bold text-blue-700">Tuần {tuanSo}</h3>
              <div className="mt-3 space-y-3">
                {weekRecords.map((record, index) => (
                  <article
                    key={record.ma_ghi_nhan || `${record.ngay}-${record.ma_danh_muc}-${index}`}
                    className={`rounded-md border p-3 ${getRecordCardClass(
                      record,
                      record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined,
                    )}`}
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
      {groupedRecords.length ? (
        <div className="border-t border-emerald-200 p-4">
          <Pagination
            onChange={groupedRecordsPage.setPage}
            page={groupedRecordsPage.page}
            totalPages={groupedRecordsPage.totalPages}
          />
        </div>
      ) : null}
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
          <Badge className="border-red-200 bg-red-100 text-red-700">
            {`Lần ${insight.duplicateCount}`}
          </Badge>
        ) : null}
      </div>
      {insight.polarity === 'negative' && insight.intervention ? (
        <div className="mt-3 rounded-md border border-red-100 bg-red-100 px-3 py-2 text-xs text-red-800">
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
    return <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">+1 tích cực</Badge>
  }

  if (insight.impactValue === -1) {
    return <Badge className="border-red-200 bg-red-100 text-red-700">-1 vi phạm</Badge>
  }

  return <Badge className="border-slate-200 bg-slate-100 text-slate-600">0 theo dõi</Badge>
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
    <div className="overflow-hidden rounded-lg border border-violet-200 bg-violet-100 shadow-sm">
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

function LopTruongPanel({ token }: { token: string }) {
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null)
  const [roster, setRoster] = useState<LopTruongData | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)

  const [step, setStep] = useState<WizardStep>('students')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectedCatalogCodes, setSelectedCatalogCodes] = useState<string[]>([])
  const [includeNewCategory, setIncludeNewCategory] = useState(false)
  const [deXuatNhom, setDeXuatNhom] = useState<NhomDiem>('NN')
  const [noiDung, setNoiDung] = useState('')
  const [ngay, setNgay] = useState(todayIso())
  const [tiet, setTiet] = useState('')
  const [monHoc, setMonHoc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [submitProgress, setSubmitProgress] = useState<{ done: number; total: number } | null>(null)

  const [history, setHistory] = useState<DeXuatGhiNhan[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const historyPage = usePagination(history)

  const totalCombos = selectedStudents.length * (selectedCatalogCodes.length + (includeNewCategory ? 1 : 0))

  async function loadHistory(pinValue: string) {
    setHistoryLoading(true)
    try {
      const rows = await dataSource.getLichSuDeXuatLopTruong(token, pinValue)
      setHistory(rows)
    } catch {
      // bo qua loi tai lich su, khong chan luong nhap moi
    } finally {
      setHistoryLoading(false)
    }
  }

  async function submitPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setVerifying(true)
    setPinError(null)

    try {
      const data = await dataSource.getLopTruongData(token, pin.trim())
      if (!data) {
        setPinError('Mã PIN không đúng. Hỏi lại giáo viên nếu quên PIN.')
        return
      }
      setRoster(data)
      setVerifiedPin(pin.trim())
      void loadHistory(pin.trim())
    } catch (error) {
      setPinError(error instanceof Error ? error.message : 'Không xác thực được PIN.')
    } finally {
      setVerifying(false)
    }
  }

  function toggleStudent(maHs: string) {
    setSelectedStudents((current) =>
      current.includes(maHs) ? current.filter((id) => id !== maHs) : [...current, maHs],
    )
  }

  function toggleCatalog(code: string) {
    setSelectedCatalogCodes((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    )
  }

  function goNext() {
    setSubmitError(null)
    if (step === 'students') {
      if (selectedStudents.length === 0) {
        setSubmitError('Chọn ít nhất 1 học sinh.')
        return
      }
      setStep('catalog')
    } else if (step === 'catalog') {
      if (selectedCatalogCodes.length === 0 && !includeNewCategory) {
        setSubmitError('Chọn ít nhất 1 danh mục, hoặc bật đề xuất danh mục mới.')
        return
      }
      setStep('details')
    } else if (step === 'details') {
      if (includeNewCategory && !noiDung.trim()) {
        setSubmitError('Cần mô tả nội dung cho danh mục đề xuất mới.')
        return
      }
      setStep('review')
    }
  }

  function goBack() {
    setSubmitError(null)
    if (step === 'catalog') setStep('students')
    else if (step === 'details') setStep('catalog')
    else if (step === 'review') setStep('details')
  }

  async function submitAll() {
    if (!verifiedPin || totalCombos === 0) return

    setSubmitting(true)
    setSubmitError(null)
    setSubmitMessage(null)

    const categoryEntries: Array<{ ma_danh_muc: string | null; de_xuat_nhom: NhomDiem | null }> = [
      ...selectedCatalogCodes.map((code) => ({ ma_danh_muc: code, de_xuat_nhom: null })),
      ...(includeNewCategory ? [{ ma_danh_muc: null, de_xuat_nhom: deXuatNhom }] : []),
    ]
    const combos = selectedStudents.flatMap((maHs) =>
      categoryEntries.map((entry) => ({ maHs, ...entry })),
    )

    setSubmitProgress({ done: 0, total: combos.length })
    let failCount = 0

    for (const combo of combos) {
      try {
        await dataSource.submitDeXuatGhiNhan({
          token,
          pin: verifiedPin,
          ma_hs: combo.maHs,
          ma_danh_muc: combo.ma_danh_muc,
          noi_dung: noiDung,
          de_xuat_nhom: combo.de_xuat_nhom,
          ngay,
          tiet: tiet.trim() || null,
          mon_hoc: monHoc.trim() || null,
        })
      } catch {
        failCount += 1
      }
      setSubmitProgress((current) => (current ? { ...current, done: current.done + 1 } : current))
    }

    setSubmitting(false)
    setSubmitProgress(null)

    if (failCount === 0) {
      setSubmitMessage(`Đã gửi ${combos.length} đề xuất, chờ giáo viên duyệt.`)
    } else {
      setSubmitError(`Gửi được ${combos.length - failCount}/${combos.length} đề xuất, ${failCount} đề xuất bị lỗi.`)
    }

    setSelectedStudents([])
    setSelectedCatalogCodes([])
    setIncludeNewCategory(false)
    setNoiDung('')
    setNgay(todayIso())
    setTiet('')
    setMonHoc('')
    setStep('students')
    void loadHistory(verifiedPin)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-teal-300 bg-teal-100 p-4 text-left shadow-sm hover:bg-teal-100"
      >
        <p className="text-xs font-semibold uppercase text-teal-700">Dành cho lớp trưởng</p>
        <p className="mt-1 font-bold text-slate-900">Nhập đề xuất ghi nhận cho lớp</p>
        <p className="mt-1 text-sm text-slate-600">Gõ mã PIN riêng để mở form, giáo viên sẽ duyệt trước khi tính điểm.</p>
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-teal-300 bg-teal-100 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-teal-700">Dành cho lớp trưởng</p>
      <h3 className="text-lg font-bold text-slate-950">Nhập đề xuất ghi nhận cho lớp</h3>
      <p className="mt-1 text-sm text-slate-600">
        Chọn bạn, chọn danh mục, ghi rõ nội dung. Đề xuất chỉ tính điểm sau khi giáo viên duyệt.
      </p>

      {!roster ? (
        <form onSubmit={submitPin} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="Nhập mã PIN"
            className="h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={verifying || !pin.trim()}
            className="h-10 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {verifying ? 'Đang kiểm tra...' : 'Xác nhận'}
          </button>
        </form>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-1">
            {WIZARD_STEPS.map((item, index) => (
              <div key={item.key} className="flex flex-1 items-center gap-1">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    item.key === step
                      ? 'bg-teal-700 text-white'
                      : WIZARD_STEPS.findIndex((s) => s.key === step) > index
                        ? 'bg-teal-200 text-teal-800'
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {index + 1}
                </span>
                {index < WIZARD_STEPS.length - 1 ? <span className="h-0.5 flex-1 bg-slate-200" /> : null}
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold uppercase text-teal-700">
            {WIZARD_STEPS.find((item) => item.key === step)?.label}
          </p>

          {step === 'students' ? (
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
              {roster.students.map((item) => (
                <label
                  key={item.ma_hs}
                  className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-slate-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(item.ma_hs)}
                    onChange={() => toggleStudent(item.ma_hs)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  {item.tt}. {item.ho} {item.ten}
                </label>
              ))}
            </div>
          ) : null}

          {step === 'catalog' ? (
            <div className="space-y-2">
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
                {roster.catalog.map((item) => (
                  <label
                    key={item.ma_danh_muc}
                    className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-slate-100"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCatalogCodes.includes(item.ma_danh_muc)}
                      onChange={() => toggleCatalog(item.ma_danh_muc)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    {item.ma_danh_muc} · {item.ten_muc} ({item.diem > 0 ? `+${item.diem}` : item.diem})
                  </label>
                ))}
                <label className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={includeNewCategory}
                    onChange={(event) => setIncludeNewCategory(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  ➕ Không có, đề xuất danh mục mới
                </label>
              </div>
              {includeNewCategory ? (
                <select
                  value={deXuatNhom}
                  onChange={(event) => setDeXuatNhom(event.target.value as NhomDiem)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {NHOM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}
              <p className="text-xs text-slate-500">
                Đã chọn {selectedStudents.length} học sinh × {selectedCatalogCodes.length + (includeNewCategory ? 1 : 0)}{' '}
                danh mục = {totalCombos} đề xuất sẽ tạo.
              </p>
            </div>
          ) : null}

          {step === 'details' ? (
            <div className="space-y-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                Ngày xảy ra (có thể chọn Thứ Bảy/Chủ Nhật nếu gửi bù)
                <input
                  type="date"
                  value={ngay}
                  max={todayIso()}
                  onChange={(event) => setNgay(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                  Tiết (không bắt buộc)
                  <input
                    value={tiet}
                    onChange={(event) => setTiet(event.target.value)}
                    placeholder="VD: 2"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                  Môn (không bắt buộc)
                  <input
                    value={monHoc}
                    onChange={(event) => setMonHoc(event.target.value)}
                    placeholder="VD: Toán"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <p className="text-xs text-slate-500">
                Người ghi sẽ tự động ghi theo chức vụ của bạn (Lớp trưởng), không cần chọn.
              </p>

              <textarea
                value={noiDung}
                onChange={(event) => setNoiDung(event.target.value)}
                placeholder={
                  includeNewCategory
                    ? 'Mô tả nội dung đề xuất (bắt buộc, vd: nói chuyện riêng nhiều lần trong giờ Sinh)'
                    : 'Nội dung cụ thể (không bắt buộc, ví dụ: không mang tập Toán tiết 3) — áp dụng chung cho tất cả đề xuất'
                }
                className="min-h-16 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          ) : null}

          {step === 'review' ? (
            <div className="space-y-2 rounded-md border border-teal-200 bg-white p-3 text-sm">
              <p>
                <strong>{selectedStudents.length}</strong> học sinh ×{' '}
                <strong>{selectedCatalogCodes.length + (includeNewCategory ? 1 : 0)}</strong> danh mục ={' '}
                <strong>{totalCombos}</strong> đề xuất sẽ được gửi.
              </p>
              <p className="text-slate-600">
                {roster.students
                  .filter((item) => selectedStudents.includes(item.ma_hs))
                  .map((item) => `${item.ho} ${item.ten}`)
                  .join(', ')}
              </p>
              <p className="text-slate-600">
                {[
                  ...roster.catalog
                    .filter((item) => selectedCatalogCodes.includes(item.ma_danh_muc))
                    .map((item) => item.ma_danh_muc),
                  ...(includeNewCategory ? ['➕ Danh mục mới'] : []),
                ].join(', ')}
              </p>
              <p className="text-xs text-slate-500">
                Ngày {formatDate(ngay)}
                {tiet.trim() ? ` · Tiết ${tiet.trim()}` : ''}
                {monHoc.trim() ? ` · ${monHoc.trim()}` : ''}
              </p>
              {submitProgress ? (
                <p className="text-xs font-semibold text-teal-700">
                  Đang gửi {submitProgress.done}/{submitProgress.total}...
                </p>
              ) : null}
            </div>
          ) : null}

          {submitError ? <p className="text-sm font-semibold text-red-700">{submitError}</p> : null}
          {submitMessage ? <p className="text-sm font-semibold text-emerald-700">{submitMessage}</p> : null}

          <div className="flex gap-2">
            {step !== 'students' ? (
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="h-10 flex-1 rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                ← Quay lại
              </button>
            ) : null}
            {step === 'review' ? (
              <button
                type="button"
                onClick={() => void submitAll()}
                disabled={submitting || totalCombos === 0}
                className="h-10 flex-1 rounded-md bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {submitting ? 'Đang gửi...' : `Gửi ${totalCombos} đề xuất`}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="h-10 flex-1 rounded-md bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Tiếp theo →
              </button>
            )}
          </div>
        </div>
      )}

      {pinError ? <p className="mt-2 text-sm font-semibold text-red-700">{pinError}</p> : null}

      {roster && verifiedPin ? (
        <div className="mt-4 border-t border-teal-200 pt-3">
          <p className="text-xs font-semibold uppercase text-teal-700">
            Lịch sử đề xuất của tôi {historyLoading ? '· đang tải...' : `· ${history.length}`}
          </p>
          <div className="mt-2 space-y-2">
            {history.length === 0 && !historyLoading ? (
              <p className="rounded-md border border-teal-100 bg-white p-2 text-sm text-slate-600">
                Chưa gửi đề xuất nào.
              </p>
            ) : (
              historyPage.pageItems.map((item) => (
                <ProposalHistoryItem
                  key={item.id}
                  item={item}
                  roster={roster}
                  token={token}
                  verifiedPin={verifiedPin}
                  onChanged={() => void loadHistory(verifiedPin)}
                />
              ))
            )}
            <Pagination onChange={historyPage.setPage} page={historyPage.page} totalPages={historyPage.totalPages} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ProposalHistoryItem({
  item,
  onChanged,
  roster,
  token,
  verifiedPin,
}: {
  item: DeXuatGhiNhan
  onChanged: () => void
  roster: LopTruongData
  token: string
  verifiedPin: string
}) {
  const [editing, setEditing] = useState(false)
  const [selectedMaHs, setSelectedMaHs] = useState(item.ma_hs)
  const [selectedCatalog, setSelectedCatalog] = useState(item.ma_danh_muc || NEW_CATEGORY_VALUE)
  const [deXuatNhom, setDeXuatNhom] = useState<NhomDiem>(item.de_xuat_nhom || 'NN')
  const [noiDung, setNoiDung] = useState(item.noi_dung || '')
  const [ngay, setNgay] = useState(item.ngay)
  const [tiet, setTiet] = useState(item.tiet || '')
  const [monHoc, setMonHoc] = useState(item.mon_hoc || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const student = roster.students.find((entry) => entry.ma_hs === item.ma_hs)
  const isNewCategory = selectedCatalog === NEW_CATEGORY_VALUE
  const canEdit = item.trang_thai === 'cho_duyet'

  const statusLabel =
    item.trang_thai === 'da_duyet' ? 'Đã duyệt' : item.trang_thai === 'tu_choi' ? 'Bị từ chối' : 'Chờ duyệt'
  const statusClass =
    item.trang_thai === 'da_duyet'
      ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
      : item.trang_thai === 'tu_choi'
        ? 'border-rose-300 bg-rose-100 text-rose-800'
        : 'border-amber-300 bg-amber-100 text-amber-800'

  async function saveEdit() {
    if (!selectedMaHs || !selectedCatalog) return
    if (isNewCategory && !noiDung.trim()) {
      setError('Cần mô tả nội dung cho đề xuất danh mục mới.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await dataSource.updateDeXuatGhiNhanByLopTruong({
        token,
        pin: verifiedPin,
        id: item.id,
        ma_hs: selectedMaHs,
        ma_danh_muc: isNewCategory ? null : selectedCatalog,
        noi_dung: noiDung,
        de_xuat_nhom: isNewCategory ? deXuatNhom : null,
        ngay,
        tiet: tiet.trim() || null,
        mon_hoc: monHoc.trim() || null,
      })
      setEditing(false)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không sửa được đề xuất.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    const ok = window.confirm('Xoá đề xuất này? Không thể hoàn tác.')
    if (!ok) return

    setBusy(true)
    setError(null)
    try {
      await dataSource.deleteDeXuatGhiNhanByLopTruong(token, verifiedPin, item.id)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xoá được đề xuất.')
      setBusy(false)
    }
  }

  return (
    <div className="rounded-md border border-teal-100 bg-white p-2">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {student ? `${student.tt}. ${student.ho} ${student.ten}` : item.ma_hs}
          </p>
          <p className="text-xs text-slate-500">
            {formatDate(item.ngay)} · {item.ma_danh_muc || `Đề xuất mới (${item.de_xuat_nhom || '?'})`}
            {item.tiet ? ` · Tiết ${item.tiet}` : ''}
            {item.mon_hoc ? ` · ${item.mon_hoc}` : ''}
          </p>
          {item.noi_dung ? <p className="mt-1 text-sm text-slate-700">{item.noi_dung}</p> : null}
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      {canEdit ? (
        editing ? (
          <div className="mt-2 space-y-2 rounded-md border border-teal-100 bg-teal-100/50 p-2">
            <select
              value={selectedMaHs}
              onChange={(event) => setSelectedMaHs(event.target.value)}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {roster.students.map((entry) => (
                <option key={entry.ma_hs} value={entry.ma_hs}>
                  {entry.tt}. {entry.ho} {entry.ten}
                </option>
              ))}
            </select>
            <select
              value={selectedCatalog}
              onChange={(event) => setSelectedCatalog(event.target.value)}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {roster.catalog.map((entry) => (
                <option key={entry.ma_danh_muc} value={entry.ma_danh_muc}>
                  {entry.ma_danh_muc} · {entry.ten_muc}
                </option>
              ))}
              <option value={NEW_CATEGORY_VALUE}>➕ Không có, đề xuất danh mục mới</option>
            </select>
            {isNewCategory ? (
              <select
                value={deXuatNhom}
                onChange={(event) => setDeXuatNhom(event.target.value as NhomDiem)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {NHOM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : null}
            <input
              type="date"
              value={ngay}
              max={todayIso()}
              onChange={(event) => setNgay(event.target.value)}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={tiet}
                onChange={(event) => setTiet(event.target.value)}
                placeholder="Tiết (VD: 2)"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <input
                value={monHoc}
                onChange={(event) => setMonHoc(event.target.value)}
                placeholder="Môn (VD: Toán)"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <textarea
              value={noiDung}
              onChange={(event) => setNoiDung(event.target.value)}
              className="min-h-14 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveEdit()}
                className="h-8 rounded-md bg-teal-700 px-3 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {busy ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Sửa
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="h-8 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {busy ? 'Đang xoá...' : 'Xoá'}
            </button>
          </div>
        )
      ) : null}

      {error && !editing ? <p className="mt-1 text-xs font-semibold text-red-700">{error}</p> : null}
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

function todayIso(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

function getRecordCardClass(record: GhiNhan, catalogItem?: DanhMucDiem): string {
  const catalogByCode = catalogItem ? new Map([[catalogItem.ma_danh_muc, catalogItem]]) : new Map<string, DanhMucDiem>()
  const polarity = getRecordPolarity(record, catalogByCode)

  if (polarity === 'positive') {
    return 'border-emerald-200 bg-emerald-100'
  }

  if (polarity === 'negative') {
    return 'border-red-200 bg-red-100'
  }

  return 'border-slate-200 bg-white'
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

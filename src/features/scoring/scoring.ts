import type { DanhMucDiem, GhiNhan, HocSinh, NhomDiem } from '../../data/types'

export type ScoreComponent = 'CC' | 'VS' | 'NN' | 'KL'

export type XepLoai = 'Tốt' | 'Khá' | 'Trung bình' | 'Yếu'

export interface WeeklyStudentScore {
  ma_hs: string
  tuan_so: number
  diem_chuyen_can: number
  diem_ve_sinh: number
  diem_ne_nep: number
  diem_ky_luat: number
  diem_hoc_tap: number | null
  diem_xep_loai_thi_dua: number
  xep_loai: XepLoai
  can_canh_bao_ngay: boolean
}

const SCORE_COMPONENTS: ScoreComponent[] = ['CC', 'VS', 'NN', 'KL']

export function calculateWeeklyStudentScore({
  catalog,
  records,
  student,
  tuanSo,
}: {
  catalog: DanhMucDiem[]
  records: GhiNhan[]
  student: HocSinh
  tuanSo: number
}): WeeklyStudentScore {
  const studentRecords = records.filter(
    (record) => record.ma_hs === student.ma_hs && record.tuan_so === tuanSo,
  )
  const catalogByCode = new Map(catalog.map((item) => [item.ma_danh_muc, item]))
  const components = Object.fromEntries(
    SCORE_COMPONENTS.map((component) => [
      component,
      calculateComponentScore(studentRecords, catalogByCode, component, student.la_co_do),
    ]),
  ) as Record<ScoreComponent, number>
  const diemHocTap = calculateStudyScore(studentRecords)
  const diemTongHop =
    diemHocTap === null
      ? (components.CC + components.VS + components.NN + components.KL) / 4
      : (components.CC + components.VS + components.NN + components.KL + diemHocTap) / 6

  return {
    ma_hs: student.ma_hs,
    tuan_so: tuanSo,
    diem_chuyen_can: components.CC,
    diem_ve_sinh: components.VS,
    diem_ne_nep: components.NN,
    diem_ky_luat: components.KL,
    diem_hoc_tap: diemHocTap === null ? null : roundScore(diemHocTap),
    diem_xep_loai_thi_dua: roundScore(diemTongHop),
    xep_loai: classifyScore(diemTongHop),
    can_canh_bao_ngay: hasSeverePersonalRecord(studentRecords, catalogByCode),
  }
}

export function calculateClassWeeklyScores({
  catalog,
  records,
  students,
  tuanSo,
}: {
  catalog: DanhMucDiem[]
  records: GhiNhan[]
  students: HocSinh[]
  tuanSo: number
}): WeeklyStudentScore[] {
  return students.map((student) =>
    calculateWeeklyStudentScore({
      catalog,
      records,
      student,
      tuanSo,
    }),
  )
}

function calculateComponentScore(
  records: GhiNhan[],
  catalogByCode: Map<string, DanhMucDiem>,
  component: ScoreComponent,
  laCoDo: boolean,
): number {
  const delta = records.reduce((sum, record) => {
    const catalogItem = getCatalogItem(record, catalogByCode)
    if (!catalogItem || catalogItem.nhom !== component || catalogItem.pham_vi !== 'ca_nhan') {
      return sum
    }

    return sum + scoreDelta(record, catalogItem, laCoDo)
  }, 0)

  return clamp(100 + delta, 0, 100)
}

function calculateStudyScore(records: GhiNhan[]): number | null {
  const studyScores = records
    .map((record) => record.diem_so_mon)
    .filter((score): score is number => typeof score === 'number')

  if (studyScores.length === 0) {
    return null
  }

  const total = studyScores.reduce((sum, score) => sum + score, 0)
  return (total / studyScores.length) * 2
}

function hasSeverePersonalRecord(
  records: GhiNhan[],
  catalogByCode: Map<string, DanhMucDiem>,
): boolean {
  return records.some((record) => {
    const catalogItem = getCatalogItem(record, catalogByCode)
    return Boolean(catalogItem?.nghiem_trong && catalogItem.pham_vi === 'ca_nhan')
  })
}

function getCatalogItem(
  record: GhiNhan,
  catalogByCode: Map<string, DanhMucDiem>,
): DanhMucDiem | null {
  return record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) || null : null
}

function scoreDelta(record: GhiNhan, catalogItem: DanhMucDiem, laCoDo: boolean): number {
  const baseScore = typeof record.diem_cong_tru === 'number' ? record.diem_cong_tru : catalogItem.diem
  const occurrenceCount = Math.max(1, record.so_lan || 1)
  const multiplier = laCoDo && baseScore < 0 ? 2 : 1

  return baseScore * occurrenceCount * multiplier
}

function classifyScore(score: number): XepLoai {
  if (score >= 90) {
    return 'Tốt'
  }

  if (score >= 70) {
    return 'Khá'
  }

  if (score >= 50) {
    return 'Trung bình'
  }

  return 'Yếu'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, roundScore(value)))
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100
}

export function isScoreComponent(nhom: NhomDiem): nhom is ScoreComponent {
  return SCORE_COMPONENTS.includes(nhom as ScoreComponent)
}

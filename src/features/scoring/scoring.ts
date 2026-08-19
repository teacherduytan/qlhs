import type {
  DanhMucDiem,
  DiemCauHinhHeSoDieuKien,
  DiemCauHinhThanhPhan,
  DiemNguongXepLoai,
  GhiNhan,
  HocSinh,
  NhomDiem,
} from '../../data/types'

export type ScoreComponent = 'CC' | 'VS' | 'NN' | 'KL'

export type XepLoai = string

const SCORE_COMPONENTS: ScoreComponent[] = ['CC', 'VS', 'NN', 'KL']

// Fallback khi chua tai duoc cau hinh tu CSDL (offline/mat mang) - gia tri that
// luon doc tu diem_cau_hinh_thanh_phan/diem_cau_hinh_he_so_dieu_kien/diem_nguong_xep_loai
// qua dataSource, xem docs/13-cau-hinh-hoa-cong-thuc-diem-ren-luyen.md. Day cung la
// cong thuc CHINH THUC hien tai cua Lac Hong (trong so 1-1-1-1-2, da sua lo hong
// thang do 4 vs 6 mau so cua ban cu).
export const DEFAULT_THANH_PHAN_CONFIG: DiemCauHinhThanhPhan[] = [
  { ma_thanh_phan: 'CC', ten_hien_thi: 'Chuyên cần', loai_tinh: 'tich_luy_danh_muc', nhom_diem_lien_ket: 'CC', thang_goc_min: 0, thang_goc_max: 100, he_so_chuan_hoa: 1, trong_so: 1, bat_buoc: true, dang_bat: true, thu_tu: 1 },
  { ma_thanh_phan: 'VS', ten_hien_thi: 'Vệ sinh', loai_tinh: 'tich_luy_danh_muc', nhom_diem_lien_ket: 'VS', thang_goc_min: 0, thang_goc_max: 100, he_so_chuan_hoa: 1, trong_so: 1, bat_buoc: true, dang_bat: true, thu_tu: 2 },
  { ma_thanh_phan: 'NN', ten_hien_thi: 'Nề nếp, tác phong', loai_tinh: 'tich_luy_danh_muc', nhom_diem_lien_ket: 'NN', thang_goc_min: 0, thang_goc_max: 100, he_so_chuan_hoa: 1, trong_so: 1, bat_buoc: true, dang_bat: true, thu_tu: 3 },
  { ma_thanh_phan: 'KL', ten_hien_thi: 'Trật tự, kỷ luật', loai_tinh: 'tich_luy_danh_muc', nhom_diem_lien_ket: 'KL', thang_goc_min: 0, thang_goc_max: 100, he_so_chuan_hoa: 1, trong_so: 1, bat_buoc: true, dang_bat: true, thu_tu: 4 },
  { ma_thanh_phan: 'HT', ten_hien_thi: 'Học tập', loai_tinh: 'trung_binh_diem_so', nhom_diem_lien_ket: null, thang_goc_min: 0, thang_goc_max: 10, he_so_chuan_hoa: 10, trong_so: 2, bat_buoc: false, dang_bat: true, thu_tu: 5 },
]

export const DEFAULT_HE_SO_DIEU_KIEN_CONFIG: DiemCauHinhHeSoDieuKien[] = [
  { ma_dieu_kien: 'co_do_nhan_doi_loi', ten_hien_thi: 'Cờ đỏ vi phạm bị trừ điểm gấp đôi', ma_thanh_phan: null, dieu_kien_hoc_sinh: 'la_co_do', chi_ap_dung_khi_am: true, he_so: 2, dang_bat: true },
]

export const DEFAULT_NGUONG_XEP_LOAI_CONFIG: DiemNguongXepLoai[] = [
  { ma_xep_loai: 'yeu', ten_hien_thi: 'Yếu', diem_toi_thieu: 0, thu_tu: 1 },
  { ma_xep_loai: 'trung_binh', ten_hien_thi: 'Trung bình', diem_toi_thieu: 50, thu_tu: 2 },
  { ma_xep_loai: 'kha', ten_hien_thi: 'Khá', diem_toi_thieu: 70, thu_tu: 3 },
  { ma_xep_loai: 'tot', ten_hien_thi: 'Tốt', diem_toi_thieu: 90, thu_tu: 4 },
]

export const DEFAULT_SO_THAP_PHAN_LAM_TRON = 2

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
  /** Bag tổng quát mọi thành phần đang bật, key = ma_thanh_phan, giá trị đã chuẩn hoá 0-100 (xem §3). */
  thanh_phan: Record<string, number>
}

export function calculateWeeklyStudentScore({
  catalog,
  records,
  student,
  tuanSo,
  thanhPhanCauHinh = DEFAULT_THANH_PHAN_CONFIG,
  heSoDieuKienCauHinh = DEFAULT_HE_SO_DIEU_KIEN_CONFIG,
  nguongXepLoai = DEFAULT_NGUONG_XEP_LOAI_CONFIG,
  soThapPhanLamTron = DEFAULT_SO_THAP_PHAN_LAM_TRON,
}: {
  catalog: DanhMucDiem[]
  records: GhiNhan[]
  student: HocSinh
  tuanSo: number
  thanhPhanCauHinh?: DiemCauHinhThanhPhan[]
  heSoDieuKienCauHinh?: DiemCauHinhHeSoDieuKien[]
  nguongXepLoai?: DiemNguongXepLoai[]
  soThapPhanLamTron?: number
}): WeeklyStudentScore {
  const studentRecords = records.filter(
    (record) => record.ma_hs === student.ma_hs && record.tuan_so === tuanSo,
  )
  const catalogByCode = new Map(catalog.map((item) => [item.ma_danh_muc, item]))

  const thanhPhan: Record<string, number> = {}
  let tuSo = 0
  let mauSo = 0

  const thanhPhanSapXep = [...thanhPhanCauHinh]
    .filter((t) => t.dang_bat)
    .sort((a, b) => a.thu_tu - b.thu_tu)

  for (const t of thanhPhanSapXep) {
    const { raw, coDuLieu } = tinhGiaTriTho(t, studentRecords, catalogByCode, student, heSoDieuKienCauHinh)
    if (!t.bat_buoc && !coDuLieu) {
      continue
    }

    const chuanHoa = roundScore((raw ?? 0) * t.he_so_chuan_hoa)
    thanhPhan[t.ma_thanh_phan] = chuanHoa
    tuSo += t.trong_so * chuanHoa
    mauSo += t.trong_so
  }

  const diemTongHop = mauSo > 0 ? tuSo / mauSo : 0
  const diemHocTap = calculateStudyScoreDisplay(studentRecords)

  return {
    ma_hs: student.ma_hs,
    tuan_so: tuanSo,
    diem_chuyen_can: thanhPhan.CC ?? 0,
    diem_ve_sinh: thanhPhan.VS ?? 0,
    diem_ne_nep: thanhPhan.NN ?? 0,
    diem_ky_luat: thanhPhan.KL ?? 0,
    diem_hoc_tap: diemHocTap,
    diem_xep_loai_thi_dua: roundScore(diemTongHop, soThapPhanLamTron),
    xep_loai: classifyScore(diemTongHop, nguongXepLoai),
    can_canh_bao_ngay: hasSeverePersonalRecord(studentRecords, catalogByCode),
    thanh_phan: thanhPhan,
  }
}

export function calculateClassWeeklyScores({
  catalog,
  records,
  students,
  tuanSo,
  thanhPhanCauHinh,
  heSoDieuKienCauHinh,
  nguongXepLoai,
  soThapPhanLamTron,
}: {
  catalog: DanhMucDiem[]
  records: GhiNhan[]
  students: HocSinh[]
  tuanSo: number
  thanhPhanCauHinh?: DiemCauHinhThanhPhan[]
  heSoDieuKienCauHinh?: DiemCauHinhHeSoDieuKien[]
  nguongXepLoai?: DiemNguongXepLoai[]
  soThapPhanLamTron?: number
}): WeeklyStudentScore[] {
  return students.map((student) =>
    calculateWeeklyStudentScore({
      catalog,
      records,
      student,
      tuanSo,
      thanhPhanCauHinh,
      heSoDieuKienCauHinh,
      nguongXepLoai,
      soThapPhanLamTron,
    }),
  )
}

/** Tính giá trị thô (thang gốc của thành phần) + có/không có dữ liệu tuần đó. */
function tinhGiaTriTho(
  t: DiemCauHinhThanhPhan,
  records: GhiNhan[],
  catalogByCode: Map<string, DanhMucDiem>,
  student: HocSinh,
  heSoDieuKienCauHinh: DiemCauHinhHeSoDieuKien[],
): { raw: number | null; coDuLieu: boolean } {
  if (t.loai_tinh === 'tich_luy_danh_muc') {
    const delta = records.reduce((sum, record) => {
      const catalogItem = getCatalogItem(record, catalogByCode)
      if (!catalogItem || catalogItem.nhom !== t.nhom_diem_lien_ket || catalogItem.pham_vi !== 'ca_nhan') {
        return sum
      }

      return sum + scoreDelta(record, catalogItem, t.ma_thanh_phan, student, heSoDieuKienCauHinh)
    }, 0)

    return { raw: clamp(t.thang_goc_max + delta, t.thang_goc_min, t.thang_goc_max), coDuLieu: true }
  }

  const studyScores = records
    .filter((record) => record.loai === 'hoc_tap')
    .map((record) => record.diem_so_mon)
    .filter((score): score is number => typeof score === 'number')

  if (studyScores.length === 0) {
    return { raw: null, coDuLieu: false }
  }

  const trungBinh = studyScores.reduce((sum, score) => sum + score, 0) / studyScores.length
  return { raw: clamp(trungBinh, t.thang_goc_min, t.thang_goc_max), coDuLieu: true }
}

/** Điểm học tập hiển thị cho giáo viên: trung bình môn × 2 (thang 0-20, quen thuộc, tách khỏi giá trị chuẩn hoá dùng nội bộ công thức). */
function calculateStudyScoreDisplay(records: GhiNhan[]): number | null {
  const studyScores = records
    .filter((record) => record.loai === 'hoc_tap')
    .map((record) => record.diem_so_mon)
    .filter((score): score is number => typeof score === 'number')

  if (studyScores.length === 0) {
    return null
  }

  const total = studyScores.reduce((sum, score) => sum + score, 0)
  return roundScore((total / studyScores.length) * 2)
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

function scoreDelta(
  record: GhiNhan,
  catalogItem: DanhMucDiem,
  maThanhPhan: string,
  student: HocSinh,
  heSoDieuKienCauHinh: DiemCauHinhHeSoDieuKien[],
): number {
  const baseScore = typeof record.diem_cong_tru === 'number' ? record.diem_cong_tru : catalogItem.diem
  const occurrenceCount = Math.max(1, record.so_lan || 1)
  const multiplier = heSoDieuKienNhanDoi(baseScore, maThanhPhan, student, heSoDieuKienCauHinh)

  return baseScore * occurrenceCount * multiplier
}

function heSoDieuKienNhanDoi(
  baseScore: number,
  maThanhPhan: string,
  student: HocSinh,
  heSoDieuKienCauHinh: DiemCauHinhHeSoDieuKien[],
): number {
  const studentRow = student as unknown as Record<string, unknown>

  return heSoDieuKienCauHinh.reduce((multiplier, dk) => {
    if (!dk.dang_bat) return multiplier
    if (dk.ma_thanh_phan !== null && dk.ma_thanh_phan !== maThanhPhan) return multiplier
    if (dk.chi_ap_dung_khi_am && !(baseScore < 0)) return multiplier
    if (studentRow[dk.dieu_kien_hoc_sinh] !== true) return multiplier

    return multiplier * dk.he_so
  }, 1)
}

function classifyScore(score: number, nguongXepLoai: DiemNguongXepLoai[]): XepLoai {
  const sapXep = [...nguongXepLoai].sort((a, b) => b.diem_toi_thieu - a.diem_toi_thieu)
  const dat = sapXep.find((nguong) => score >= nguong.diem_toi_thieu)
  return dat?.ten_hien_thi ?? sapXep[sapXep.length - 1]?.ten_hien_thi ?? 'Yếu'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, roundScore(value)))
}

function roundScore(value: number, soThapPhan = 2): number {
  const he_so = 10 ** soThapPhan
  return Math.round(value * he_so) / he_so
}

export function isScoreComponent(nhom: NhomDiem): nhom is ScoreComponent {
  return SCORE_COMPONENTS.includes(nhom as ScoreComponent)
}

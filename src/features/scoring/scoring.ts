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
  // thang_goc_max=100 (khong phai 10), he_so_chuan_hoa=1 (khong nhan 10) - diem_so_mon
  // da o thang 0-100 san (doi chieu file Excel that ngay 23/08/2026, xem docs/03).
  // bat_buoc=true (khong phai false) - khi khong co du lieu tuan do, van tinh vao
  // mau so 6 voi gia tri mac dinh = thang_goc_max (100), khong con roi mau so ve 4 nua.
  { ma_thanh_phan: 'HT', ten_hien_thi: 'Học tập', loai_tinh: 'trung_binh_diem_so', nhom_diem_lien_ket: null, thang_goc_min: 0, thang_goc_max: 100, he_so_chuan_hoa: 1, trong_so: 2, bat_buoc: true, dang_bat: true, thu_tu: 5 },
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
  thanhPhanCauHinh,
  heSoDieuKienCauHinh,
  nguongXepLoai,
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
  // Mac dinh khong dung tham so default cua destructuring (chi kich hoat khi gia
  // tri la undefined) vi cac trang goi ham nay deu truyen thang ket qua tra ve tu
  // dataSource.getDiemCauHinh...() - neu bang cau hinh chua duoc seed tren Supabase
  // (con rong), ket qua la MANG RONG [] (khong phai undefined), se lam mau so
  // cong thuc = 0 va diem xep loai tinh ra 0 cho MOI hoc sinh thay vi dung fallback.
  // dungHoacDefault() coi mang rong tuong duong "chua co cau hinh" de rot ve default.
  const thanhPhanEffective = dungHoacDefault(thanhPhanCauHinh, DEFAULT_THANH_PHAN_CONFIG)
  const heSoDieuKienEffective = dungHoacDefault(heSoDieuKienCauHinh, DEFAULT_HE_SO_DIEU_KIEN_CONFIG)
  const nguongXepLoaiEffective = dungHoacDefault(nguongXepLoai, DEFAULT_NGUONG_XEP_LOAI_CONFIG)

  const studentRecords = records.filter(
    (record) => record.ma_hs === student.ma_hs && record.tuan_so === tuanSo,
  )
  const catalogByCode = new Map(catalog.map((item) => [item.ma_danh_muc, item]))

  const thanhPhan: Record<string, number> = {}
  let tuSo = 0
  let mauSo = 0

  const thanhPhanSapXep = [...thanhPhanEffective]
    .filter((t) => t.dang_bat)
    .sort((a, b) => a.thu_tu - b.thu_tu)

  for (const t of thanhPhanSapXep) {
    const { raw, coDuLieu } = tinhGiaTriTho(t, studentRecords, catalogByCode, student, heSoDieuKienEffective)
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
    xep_loai: classifyScore(diemTongHop, nguongXepLoaiEffective),
    can_canh_bao_ngay: hasSeverePersonalRecord(studentRecords, catalogByCode),
    thanh_phan: thanhPhan,
  }
}

function dungHoacDefault<T>(value: T[] | undefined, fallback: T[]): T[] {
  return value && value.length > 0 ? value : fallback
}

export interface ClassComponentBreakdownItem {
  ma_hs: string | null
  ten: string | null
  ma_danh_muc: string
  mo_ta: string
  diem_cong_tru: number
  ngay: string
  ghi_chu: string | null
}

export interface WeeklyClassScore {
  tuan_so: number
  diem_tap_the: Record<ScoreComponent, number>
  chi_tiet: Record<ScoreComponent, ClassComponentBreakdownItem[]>
  diem_hoc_tap_lop: number
  diem_xep_loai_tap_the: number
  xep_loai_tap_the: XepLoai
}

// Diem tap the cua lop (docs/03-he-thong-diem-ren-luyen.md muc 2d/7) - khac han
// calculateClassWeeklyScores() ben duoi (danh sach diem CA NHAN cua tung hoc sinh).
// Day la 1 CON SO DUY NHAT moi nhom CC/VS/NN/KL cho CA LOP, dung de so sanh voi
// cac lop khac toan truong - cong don MOI GhiNhan trong tuan (khong phan biet ca
// nhan hay tap_the/to_truc), CHI loc theo su_kien_goc IS NULL de tranh tru trung
// khi 1 su kien tap the duoc "Ap dung cho tat ca" sinh ra nhieu dong ca nhan phai
// sinh (cac dong phai sinh co su_kien_goc tro ve dong goc nen bi loai o day).
//
// KHONG nhan he so dieu kien (co do x2) - dung nguyen diem_cong_tru da luu, vi
// "gap doi" la trach nhiem CA NHAN cua hoc sinh co do, khong lam su kien do "nang"
// hon doi voi diem chung ca lop (dung 1 su kien = tru diem lop dung 1 lan).
export function calculateClassCollectiveScore({
  catalog,
  records,
  students,
  tuanSo,
  diemHocTapLop = 100,
  nguongXepLoai,
  soThapPhanLamTron = DEFAULT_SO_THAP_PHAN_LAM_TRON,
}: {
  catalog: DanhMucDiem[]
  records: GhiNhan[]
  students: HocSinh[]
  tuanSo: number
  diemHocTapLop?: number
  nguongXepLoai?: DiemNguongXepLoai[]
  soThapPhanLamTron?: number
}): WeeklyClassScore {
  const nguongXepLoaiEffective = dungHoacDefault(nguongXepLoai, DEFAULT_NGUONG_XEP_LOAI_CONFIG)
  const catalogByCode = new Map(catalog.map((item) => [item.ma_danh_muc, item]))
  const studentByMaHs = new Map(students.map((student) => [student.ma_hs, student]))

  const weekRecords = records.filter(
    (record) => record.tuan_so === tuanSo && record.su_kien_goc === null,
  )

  const diemTapThe = {} as Record<ScoreComponent, number>
  const chiTiet = {} as Record<ScoreComponent, ClassComponentBreakdownItem[]>

  for (const component of SCORE_COMPONENTS) {
    let tongDiemTru = 0
    const items: ClassComponentBreakdownItem[] = []

    for (const record of weekRecords) {
      const catalogItem = getCatalogItem(record, catalogByCode)
      if (!catalogItem || catalogItem.nhom !== component) continue

      const baseScore = typeof record.diem_cong_tru === 'number' ? record.diem_cong_tru : catalogItem.diem
      const occurrenceCount = Math.max(1, record.so_lan || 1)
      const diemTru = baseScore * occurrenceCount
      tongDiemTru += diemTru

      const student = record.ma_hs ? studentByMaHs.get(record.ma_hs) : undefined

      items.push({
        ma_hs: record.ma_hs,
        ten: student ? `${student.ho} ${student.ten}` : null,
        ma_danh_muc: catalogItem.ma_danh_muc,
        mo_ta: catalogItem.ten_muc,
        diem_cong_tru: diemTru,
        ngay: record.ngay,
        ghi_chu: record.noi_dung,
      })
    }

    diemTapThe[component] = clamp(100 + tongDiemTru, 0, 100)
    chiTiet[component] = items
  }

  const tuSo =
    diemTapThe.CC + diemTapThe.VS + diemTapThe.NN + diemTapThe.KL + diemHocTapLop * 2
  const diemXepLoaiTapThe = roundScore(tuSo / 6, soThapPhanLamTron)

  return {
    tuan_so: tuanSo,
    diem_tap_the: diemTapThe,
    chi_tiet: chiTiet,
    diem_hoc_tap_lop: diemHocTapLop,
    diem_xep_loai_tap_the: diemXepLoaiTapThe,
    xep_loai_tap_the: classifyScore(diemXepLoaiTapThe, nguongXepLoaiEffective),
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
    // Khong loc theo catalogItem.pham_vi nua (bug da sua 23/08/2026, xem docs/03 muc 7):
    // 1 su kien tap_the/to_truc duoc "Gan cho 1 hoc sinh cu the" (muc 2b) tao ra dong
    // GhiNhan CO ma_hs nhung ma_danh_muc goc van pham_vi='tap_the'/'to_truc' - loc theo
    // pham_vi se bo sot dong nay. `records` truyen vao day da duoc loc theo dung
    // ma_hs = student.ma_hs tu calculateWeeklyStudentScore() nen khong can dieu kien
    // pham_vi nua - dong nao chua duoc gan cho ai thi ma_hs la NULL nen tu dong khong
    // lot vao (calculateWeeklyStudentScore chi truyen records co ma_hs khop).
    const delta = records.reduce((sum, record) => {
      const catalogItem = getCatalogItem(record, catalogByCode)
      if (!catalogItem || catalogItem.nhom !== t.nhom_diem_lien_ket) {
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
    // Mac dinh = thang_goc_max (100) khi chua co diem so nao trong tuan (quyet dinh
    // 23/08/2026, xem docs/03 muc 3/4) - coDuLieu=false van duoc tra ve de giao dien
    // hien chu thich "chua co du lieu, dang tinh mac dinh 100" (xem calculateStudyScoreDisplay).
    return { raw: t.thang_goc_max, coDuLieu: false }
  }

  const trungBinh = studyScores.reduce((sum, score) => sum + score, 0) / studyScores.length
  return { raw: clamp(trungBinh, t.thang_goc_min, t.thang_goc_max), coDuLieu: true }
}

// Diem hoc tap hien thi cho giao vien: trung binh mon, thang 0-100 (khop dung thang
// da luu trong diem_so_mon - khong con nhan 2 nhu ban cu gia dinh sai thang 0-10, xem
// docs/03 muc 3 sua 23/08/2026). Tra ve null khi tuan chua co du lieu diem so nao -
// giao dien dung tin hieu nay de hien chu thich "dang tinh mac dinh 100" (gia tri
// mac dinh that su chi ap dung trong cong thuc tong hop qua tinhGiaTriTho(), khong
// hien o day de khong nham lan voi "diem that").
function calculateStudyScoreDisplay(records: GhiNhan[]): number | null {
  const studyScores = records
    .filter((record) => record.loai === 'hoc_tap')
    .map((record) => record.diem_so_mon)
    .filter((score): score is number => typeof score === 'number')

  if (studyScores.length === 0) {
    return null
  }

  const total = studyScores.reduce((sum, score) => sum + score, 0)
  return roundScore(total / studyScores.length)
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

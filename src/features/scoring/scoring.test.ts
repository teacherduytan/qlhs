import { describe, expect, it } from 'vitest'
import type { DanhMucDiem, GhiNhan, HocSinh } from '../../data/types'
import { calculateClassCollectiveScore, calculateWeeklyStudentScore } from './scoring'

function makeStudent(overrides: Partial<HocSinh> = {}): HocSinh {
  return {
    ma_hs: 'HS01',
    tt: 1,
    ho: 'Nguyễn Văn',
    ten: 'A',
    dien: 'BT',
    nu: false,
    dan_toc: 'Kinh',
    ngay_sinh: null,
    sdt_1: null,
    sdt_2: null,
    ngay_nhap_hoc: null,
    ngay_roi_lop: null,
    to: 1,
    token_ho_so: 'token',
    la_co_do: false,
    anh_dai_dien: null,
    ghi_chu: null,
    ...overrides,
  }
}

function makeRecord(overrides: Partial<GhiNhan> = {}): GhiNhan {
  return {
    ma_ghi_nhan: 'GN01',
    ma_hs: 'HS01',
    to_lien_quan: null,
    ngay: '2026-08-03',
    tuan_so: 1,
    dien_tai_thoi_diem: null,
    tiet: null,
    mon_hoc: null,
    loai: 'ne_nep',
    ma_danh_muc: null,
    noi_dung: null,
    so_lan: 1,
    ly_do: null,
    da_xu_ly: false,
    hinh_thuc_xu_ly: null,
    goi_phu_huynh: false,
    ghi_so_dau_bai: null,
    diem_so_mon: null,
    diem_cong_tru: null,
    nguoi_ghi: null,
    nguon: null,
    ma_log_import: null,
    trang_thai_xu_ly_tap_the: '',
    su_kien_goc: null,
    ...overrides,
  }
}

const CATALOG: DanhMucDiem[] = [
  { ma_danh_muc: 'KL06', nhom: 'KL', ten_muc: 'Vi phạm nghiêm trọng', diem: -20, nghiem_trong: true, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'NN01', nhom: 'NN', ten_muc: 'Nói chuyện riêng', diem: -5, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'CC01', nhom: 'CC', ten_muc: 'Vắng không phép', diem: -10, nghiem_trong: false, pham_vi: 'ca_nhan' },
  { ma_danh_muc: 'KL_TT', nhom: 'KL', ten_muc: 'Lớp mất trật tự', diem: -5, nghiem_trong: false, pham_vi: 'tap_the' },
]

describe('calculateWeeklyStudentScore', () => {
  it('học sinh hoàn hảo, có điểm học tập trung bình 100 (thang 0-100) → 100 điểm', () => {
    const student = makeStudent()
    const records: GhiNhan[] = [
      makeRecord({ ma_ghi_nhan: 'GN-HT', loai: 'hoc_tap', ma_danh_muc: null, diem_so_mon: 100 }),
    ]

    const score = calculateWeeklyStudentScore({ catalog: CATALOG, records, student, tuanSo: 1 })

    expect(score.diem_xep_loai_thi_dua).toBe(100)
    expect(score.xep_loai).toBe('Tốt')
    expect(score.diem_hoc_tap).toBe(100)
  })

  it('học sinh hoàn hảo, KHÔNG có điểm học tập → vẫn 100 điểm (mặc định HT=100, mẫu số luôn là 6)', () => {
    const student = makeStudent()
    const score = calculateWeeklyStudentScore({ catalog: CATALOG, records: [], student, tuanSo: 1 })

    expect(score.diem_xep_loai_thi_dua).toBe(100)
    expect(score.xep_loai).toBe('Tốt')
    expect(score.diem_hoc_tap).toBeNull()
  })

  it('truyen mang cau hinh RONG (bang Supabase chua seed) → van dung fallback mac dinh, khong tinh ra 0', () => {
    // Bug thuc te: cac trang goi ham nay truyen thang ket qua dataSource.getDiemCauHinh...()
    // - neu bang do con rong tren Supabase, ket qua la [] (khong phai undefined), nen
    // default parameter cua destructuring KHONG kich hoat. Neu khong xu ly rieng, hoc
    // sinh hoan hao se ra diem 0 thay vi 100.
    const student = makeStudent()
    const score = calculateWeeklyStudentScore({
      catalog: CATALOG,
      records: [],
      student,
      tuanSo: 1,
      thanhPhanCauHinh: [],
      heSoDieuKienCauHinh: [],
      nguongXepLoai: [],
    })

    expect(score.diem_xep_loai_thi_dua).toBe(100)
    expect(score.xep_loai).toBe('Tốt')
  })

  it('CC=90,VS=100,NN=85,KL=100, HT tb=80 (thang 0-100) → 89.17, Khá', () => {
    const student = makeStudent()
    const records: GhiNhan[] = [
      makeRecord({ ma_ghi_nhan: 'GN-CC', loai: 'chuyen_can', ma_danh_muc: 'CC01', diem_cong_tru: -10 }),
      makeRecord({ ma_ghi_nhan: 'GN-NN', loai: 'ne_nep', ma_danh_muc: 'NN01', diem_cong_tru: -15 }),
      makeRecord({ ma_ghi_nhan: 'GN-HT', loai: 'hoc_tap', ma_danh_muc: null, diem_so_mon: 80 }),
    ]

    const score = calculateWeeklyStudentScore({ catalog: CATALOG, records, student, tuanSo: 1 })

    expect(score.diem_chuyen_can).toBe(90)
    expect(score.diem_ve_sinh).toBe(100)
    expect(score.diem_ne_nep).toBe(85)
    expect(score.diem_ky_luat).toBe(100)
    expect(score.diem_hoc_tap).toBe(80)
    expect(score.diem_xep_loai_thi_dua).toBe(89.17)
    expect(score.xep_loai).toBe('Khá')
  })

  it('sự kiện tập thể đã "Gán cho 1 học sinh cụ thể" (có ma_hs, danh mục vẫn pham_vi=tap_the) vẫn trừ điểm cá nhân em đó', () => {
    const student = makeStudent()
    const records: GhiNhan[] = [
      makeRecord({
        ma_ghi_nhan: 'GN-TT-GAN',
        ma_hs: student.ma_hs,
        loai: 'trat_tu_ky_luat',
        ma_danh_muc: 'KL_TT',
        diem_cong_tru: -5,
        su_kien_goc: 'GN-TT-GOC',
      }),
    ]

    const score = calculateWeeklyStudentScore({ catalog: CATALOG, records, student, tuanSo: 1 })

    expect(score.diem_ky_luat).toBe(95)
  })

  it('cờ đỏ vi phạm bị trừ điểm gấp đôi, nhưng điểm thưởng thì không', () => {
    const coDo = makeStudent({ la_co_do: true })
    const records: GhiNhan[] = [
      makeRecord({ ma_ghi_nhan: 'GN-NN', loai: 'ne_nep', ma_danh_muc: 'NN01', diem_cong_tru: -5 }),
    ]

    const score = calculateWeeklyStudentScore({ catalog: CATALOG, records, student: coDo, tuanSo: 1 })

    expect(score.diem_ne_nep).toBe(90)
  })

  it('bản ghi phạm vi tập thể (tap_the) không trừ vào điểm cá nhân', () => {
    const student = makeStudent()
    const records: GhiNhan[] = [
      makeRecord({
        ma_ghi_nhan: 'GN-TT',
        ma_hs: null,
        to_lien_quan: 1,
        loai: 'trat_tu_ky_luat',
        ma_danh_muc: 'KL_TT',
        diem_cong_tru: -5,
        trang_thai_xu_ly_tap_the: 'chua_xu_ly',
      }),
    ]

    const score = calculateWeeklyStudentScore({ catalog: CATALOG, records, student, tuanSo: 1 })

    expect(score.diem_ky_luat).toBe(100)
  })

  it('vi phạm nghiêm trọng (nghiem_trong=true, cá nhân) bật cờ cảnh báo ngay', () => {
    const student = makeStudent()
    const records: GhiNhan[] = [
      makeRecord({ ma_ghi_nhan: 'GN-KL06', loai: 'trat_tu_ky_luat', ma_danh_muc: 'KL06', diem_cong_tru: -20 }),
    ]

    const score = calculateWeeklyStudentScore({ catalog: CATALOG, records, student, tuanSo: 1 })

    expect(score.can_canh_bao_ngay).toBe(true)
  })
})

describe('calculateClassCollectiveScore', () => {
  it('2 học sinh khác nhau, mỗi em tự đi trễ riêng (2 sự kiện gốc độc lập) → lớp trừ 2 lần, cộng dồn', () => {
    const students = [makeStudent({ ma_hs: 'HS01' }), makeStudent({ ma_hs: 'HS02' })]
    const records: GhiNhan[] = [
      makeRecord({ ma_ghi_nhan: 'GN-A', ma_hs: 'HS01', ma_danh_muc: 'CC01', diem_cong_tru: -2, loai: 'chuyen_can' }),
      makeRecord({ ma_ghi_nhan: 'GN-B', ma_hs: 'HS02', ma_danh_muc: 'CC01', diem_cong_tru: -2, loai: 'chuyen_can' }),
    ]

    const classScore = calculateClassCollectiveScore({ catalog: CATALOG, records, students, tuanSo: 1 })

    expect(classScore.diem_tap_the.CC).toBe(96)
    expect(classScore.chi_tiet.CC).toHaveLength(2)
  })

  it('1 sự kiện tập thể được "Áp dụng cho tất cả" cho 5 học sinh → lớp chỉ trừ 1 lần theo dòng gốc, không nhân theo 5 em', () => {
    const students = Array.from({ length: 5 }, (_, i) => makeStudent({ ma_hs: `HS0${i + 1}` }))
    const records: GhiNhan[] = [
      makeRecord({
        ma_ghi_nhan: 'GN-GOC',
        ma_hs: null,
        ma_danh_muc: 'KL_TT',
        diem_cong_tru: -10,
        loai: 'trat_tu_ky_luat',
        su_kien_goc: null,
      }),
      ...students.map((student, index) =>
        makeRecord({
          ma_ghi_nhan: `GN-PS-${index}`,
          ma_hs: student.ma_hs,
          ma_danh_muc: 'KL_TT',
          diem_cong_tru: -10,
          loai: 'trat_tu_ky_luat',
          su_kien_goc: 'GN-GOC',
        }),
      ),
    ]

    const classScore = calculateClassCollectiveScore({ catalog: CATALOG, records, students, tuanSo: 1 })

    expect(classScore.diem_tap_the.KL).toBe(90)
    expect(classScore.chi_tiet.KL).toHaveLength(1)
    expect(classScore.chi_tiet.KL[0].ten).toBeNull()
  })

  it('điểm xếp loại tập thể = (CC+VS+NN+KL+diem_hoc_tap_lop×2)/6, mặc định diem_hoc_tap_lop=100', () => {
    const students = [makeStudent()]
    const classScore = calculateClassCollectiveScore({ catalog: CATALOG, records: [], students, tuanSo: 1 })

    expect(classScore.diem_xep_loai_tap_the).toBe(100)
    expect(classScore.xep_loai_tap_the).toBe('Tốt')
  })
})

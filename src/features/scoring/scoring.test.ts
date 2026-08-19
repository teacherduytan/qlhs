import { describe, expect, it } from 'vitest'
import type { DanhMucDiem, GhiNhan, HocSinh } from '../../data/types'
import { calculateWeeklyStudentScore } from './scoring'

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
  it('học sinh hoàn hảo, có điểm học tập trung bình 10 → 100 điểm (không còn trần ~70)', () => {
    const student = makeStudent()
    const records: GhiNhan[] = [
      makeRecord({ ma_ghi_nhan: 'GN-HT', loai: 'hoc_tap', ma_danh_muc: null, diem_so_mon: 10 }),
    ]

    const score = calculateWeeklyStudentScore({ catalog: CATALOG, records, student, tuanSo: 1 })

    expect(score.diem_xep_loai_thi_dua).toBe(100)
    expect(score.xep_loai).toBe('Tốt')
    expect(score.diem_hoc_tap).toBe(20)
  })

  it('học sinh hoàn hảo, KHÔNG có điểm học tập → vẫn 100 điểm (mẫu số tự rơi về 4)', () => {
    const student = makeStudent()
    const score = calculateWeeklyStudentScore({ catalog: CATALOG, records: [], student, tuanSo: 1 })

    expect(score.diem_xep_loai_thi_dua).toBe(100)
    expect(score.xep_loai).toBe('Tốt')
    expect(score.diem_hoc_tap).toBeNull()
  })

  it('ví dụ minh hoạ ở đặc tả §5: CC=90,VS=100,NN=85,KL=100, HT tb=8 → 89.17, Khá', () => {
    const student = makeStudent()
    const records: GhiNhan[] = [
      makeRecord({ ma_ghi_nhan: 'GN-CC', loai: 'chuyen_can', ma_danh_muc: 'CC01', diem_cong_tru: -10 }),
      makeRecord({ ma_ghi_nhan: 'GN-NN', loai: 'ne_nep', ma_danh_muc: 'NN01', diem_cong_tru: -15 }),
      makeRecord({ ma_ghi_nhan: 'GN-HT', loai: 'hoc_tap', ma_danh_muc: null, diem_so_mon: 8 }),
    ]

    const score = calculateWeeklyStudentScore({ catalog: CATALOG, records, student, tuanSo: 1 })

    expect(score.diem_chuyen_can).toBe(90)
    expect(score.diem_ve_sinh).toBe(100)
    expect(score.diem_ne_nep).toBe(85)
    expect(score.diem_ky_luat).toBe(100)
    expect(score.diem_xep_loai_thi_dua).toBe(89.17)
    expect(score.xep_loai).toBe('Khá')
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

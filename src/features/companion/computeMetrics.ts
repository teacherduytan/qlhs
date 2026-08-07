import type { ChiSoTuan, DanhMucDiem, DongHanhDiemDanh, GhiNhan } from '../../data/types'
import { isPositiveRecord, isViolationRecord } from '../dashboard/DashboardPage'

// Lop tinh chi so chuan hoa cho He thong Dong hanh (docs/11-dac-ta-he-thong-dong-hanh.md).
// Day la noi DUY NHAT chua logic tinh toan — luat trong CSDL chi tro toi ten 1 chi so,
// 1 phep so sanh, 1 nguong (xem applyRules.ts). Them chi so moi = them 1 field o day +
// 1 dong trong bang dong_hanh_chi_so, khong dung gi toi luat.
export function tinhChiSoTuan({
  attendance,
  catalog,
  maHs,
  records,
  tuanSo,
  tuanSoTruoc,
}: {
  attendance: DongHanhDiemDanh[]
  catalog: DanhMucDiem[]
  maHs: string
  records: GhiNhan[]
  tuanSo: number
  tuanSoTruoc: number | null
}): ChiSoTuan {
  const catalogByCode = new Map(catalog.map((item) => [item.ma_danh_muc, item]))
  const attendanceTuanNay = attendance.filter((entry) => entry.ma_hs === maHs && entry.tuan_so === tuanSo)
  const recordsTuanNay = records.filter((record) => record.ma_hs === maHs && record.tuan_so === tuanSo)
  const recordsTuanTruoc =
    tuanSoTruoc === null ? [] : records.filter((record) => record.ma_hs === maHs && record.tuan_so === tuanSoTruoc)

  const vangKhongPhep = attendanceTuanNay.filter((entry) => entry.trang_thai === 'vang_khong_phep').length
  const vangCoPhep = attendanceTuanNay.filter((entry) => entry.trang_thai === 'vang_co_phep').length
  const diTre = attendanceTuanNay.filter((entry) => entry.trang_thai === 'tre').length

  const soLanTheoMa: Record<string, number> = {}
  recordsTuanNay.forEach((record) => {
    if (!record.ma_danh_muc) return
    soLanTheoMa[record.ma_danh_muc] = (soLanTheoMa[record.ma_danh_muc] || 0) + Math.max(1, record.so_lan || 1)
  })

  const recordNghiemTrong = recordsTuanNay.find((record) => {
    const catalogItem = record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined
    return Boolean(catalogItem?.nghiem_trong)
  })

  const soLoiTuanNay = recordsTuanNay.filter((record) => isViolationRecord(record, catalogByCode)).length
  const soLoiTuanTruoc = recordsTuanTruoc.filter((record) => isViolationRecord(record, catalogByCode)).length

  const coGhiNhanTichCuc = recordsTuanNay.some((record) => isPositiveRecord(record, catalogByCode))
  const coViPhamNeNep = recordsTuanNay.some((record) => {
    const catalogItem = record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined
    return catalogItem?.nhom === 'NN' && isViolationRecord(record, catalogByCode)
  })

  return {
    vang_khong_phep: vangKhongPhep,
    vang_co_phep: vangCoPhep,
    di_tre: diTre,
    so_lan_theo_ma: soLanTheoMa,
    co_nghiem_trong: Boolean(recordNghiemTrong),
    ma_nghiem_trong: recordNghiemTrong?.ma_danh_muc || null,
    so_loi_tuan_nay: soLoiTuanNay,
    so_loi_tuan_truoc: soLoiTuanTruoc,
    xu_huong_loi: soLoiTuanNay - soLoiTuanTruoc,
    co_ghi_nhan_tich_cuc: coGhiNhanTichCuc,
    co_vi_pham_ne_nep: coViPhamNeNep,
  }
}

import type { BacTinhTu, KetQuaRank } from '../../data/types'

// Fallback khi chua tai duoc du lieu tu CSDL (dung khi mat mang/offline) -
// gia tri that luon doc tu bang rank_bac_tinh_tu/dong_hanh_cau_hinh qua
// dataSource, xem docs/thethanghang/12-dac-ta-rank-tinh-tu.md.
export const THANG_TINH_TU_MAC_DINH: BacTinhTu[] = [
  { bac: 1, ma: 'sao_bang', ten: 'Sao Băng', icon: '☄️', diem_toi_thieu: 0, mo_ta: 'Vừa xuất hiện — khởi đầu của mọi hành trình.', dang_bat: true },
  { bac: 2, ma: 'sao_nho', ten: 'Sao Nhỏ', icon: '⭐', diem_toi_thieu: 50, mo_ta: 'Bắt đầu toả sáng đều đặn.', dang_bat: true },
  { bac: 3, ma: 'hanh_tinh', ten: 'Hành Tinh', icon: '🪐', diem_toi_thieu: 65, mo_ta: 'Đã có quỹ đạo ổn định, vững vàng.', dang_bat: true },
  { bac: 4, ma: 'mat_trang', ten: 'Mặt Trăng', icon: '🌙', diem_toi_thieu: 75, mo_ta: 'Sáng rõ, ai nhìn vào cũng thấy được.', dang_bat: true },
  { bac: 5, ma: 'mat_troi', ten: 'Mặt Trời', icon: '☀️', diem_toi_thieu: 85, mo_ta: 'Tự toả năng lượng, lan toả tích cực quanh mình.', dang_bat: true },
  { bac: 6, ma: 'chom_sao', ten: 'Chòm Sao', icon: '✨', diem_toi_thieu: 95, mo_ta: 'Nhiều điểm sáng hợp lại — mẫu mực nhiều mặt.', dang_bat: true },
  { bac: 7, ma: 'thien_ha', ten: 'Thiên Hà', icon: '🌌', diem_toi_thieu: 105, mo_ta: 'Bậc cao nhất — rực rỡ toàn diện.', dang_bat: true },
]

export const DIEM_THUONG_MOI_HUY_HIEU_MAC_DINH = 4

/**
 * Tinh bac tinh tu cua 1 hoc sinh trong 1 tuan.
 * @param diemRenLuyen diem ren luyen tuan (0..100) - lay tu scoring.ts
 * @param soHuyHieu so huy hieu dat trong tuan
 * @param thangBac danh sach bac dang_bat=true, doc tu CSDL (fallback THANG_TINH_TU_MAC_DINH)
 * @param diemThuongMoiHuyHieu doc tu dong_hanh_cau_hinh (fallback DIEM_THUONG_MOI_HUY_HIEU_MAC_DINH)
 */
export function tinhRankTuan(
  diemRenLuyen: number,
  soHuyHieu: number,
  thangBac: BacTinhTu[] = THANG_TINH_TU_MAC_DINH,
  diemThuongMoiHuyHieu: number = DIEM_THUONG_MOI_HUY_HIEU_MAC_DINH,
): KetQuaRank {
  const thang = thangBac.length > 0 ? thangBac : THANG_TINH_TU_MAC_DINH
  const diemThuong = soHuyHieu * diemThuongMoiHuyHieu
  const diemTuan = Math.round(diemRenLuyen + diemThuong)

  const sapXep = [...thang].sort((a, b) => a.diem_toi_thieu - b.diem_toi_thieu)
  let bacHienTai = sapXep[0]
  for (const b of sapXep) {
    if (diemTuan >= b.diem_toi_thieu) bacHienTai = b
  }

  const idx = sapXep.findIndex((b) => b.ma === bacHienTai.ma)
  const bacKeTiep = idx < sapXep.length - 1 ? sapXep[idx + 1] : null

  let conThieu = 0
  let phanTramToiKeTiep = 100
  if (bacKeTiep) {
    conThieu = Math.max(0, bacKeTiep.diem_toi_thieu - diemTuan)
    const khoang = bacKeTiep.diem_toi_thieu - bacHienTai.diem_toi_thieu
    const daDi = diemTuan - bacHienTai.diem_toi_thieu
    phanTramToiKeTiep = khoang > 0 ? Math.min(100, Math.round((daDi / khoang) * 100)) : 100
  }

  return { diemRenLuyen, diemThuong, diemTuan, bacHienTai, bacKeTiep, conThieu, phanTramToiKeTiep }
}

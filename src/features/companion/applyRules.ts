import type {
  CauDinhHuongDongHanh,
  ChiSoTuan,
  DieuKienHuyHieu,
  HuyHieuDongHanh,
  LuatDongHanh,
  LuatKhop,
  PhepSoSanh,
} from '../../data/types'

function getGiaTriChiSo(chiSo: ChiSoTuan, maChiSo: string, maDanhMucApDung: string | null): number | boolean {
  if (maChiSo === 'so_lan_theo_ma') {
    return chiSo.so_lan_theo_ma[maDanhMucApDung || ''] || 0
  }

  const value = (chiSo as unknown as Record<string, number | boolean | Record<string, number> | string | null>)[
    maChiSo
  ]
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  return 0
}

function soSanh(giaTri: number | boolean, phep: PhepSoSanh, nguong: number | null): boolean {
  const trai = typeof giaTri === 'boolean' ? (giaTri ? 1 : 0) : giaTri
  const phai = nguong ?? 0

  switch (phep) {
    case '>=':
      return trai >= phai
    case '>':
      return trai > phai
    case '=':
      return trai === phai
    case '<':
      return trai < phai
    case '<=':
      return trai <= phai
    default:
      return false
  }
}

function thayPlaceholder(cauMau: string, chiSo: ChiSoTuan, luat: LuatDongHanh): string {
  const giaTri = getGiaTriChiSo(chiSo, luat.ma_chi_so, luat.ma_danh_muc_ap_dung)
  const n = typeof giaTri === 'boolean' ? (giaTri ? 1 : 0) : giaTri
  const ma = luat.ma_danh_muc_ap_dung || chiSo.ma_nghiem_trong || ''
  const ngay = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(),
  )

  return cauMau.replace(/\{n\}/g, String(n)).replace(/\{ma\}/g, ma).replace(/\{ngay\}/g, ngay)
}

// Chay tung luat dang_bat, so chi_so voi nguong theo phep_so_sanh, tra ve cac luat
// khop kem cau da thay placeholder. Ap dung nhom_che + uu_tien: trong cung 1 nhom_che,
// chi giu luat uu_tien nho nhat (cao nhat) — xem muc 4 dac ta.
export function apDungLuat(chiSo: ChiSoTuan, danhSachLuat: LuatDongHanh[]): LuatKhop[] {
  const khop = danhSachLuat
    .filter((luat) => luat.dang_bat)
    .filter((luat) => soSanh(getGiaTriChiSo(chiSo, luat.ma_chi_so, luat.ma_danh_muc_ap_dung), luat.phep_so_sanh, luat.nguong))
    .sort((left, right) => left.uu_tien - right.uu_tien)

  const daChonNhomChe = new Set<string>()
  const ketQua: LuatKhop[] = []

  for (const luat of khop) {
    if (luat.nhom_che) {
      if (daChonNhomChe.has(luat.nhom_che)) continue
      daChonNhomChe.add(luat.nhom_che)
    }
    ketQua.push({ luat, cauHienThi: thayPlaceholder(luat.cau_hien_thi, chiSo, luat) })
  }

  return ketQua
}

function khopDieuKien(chiSo: ChiSoTuan, dieuKien: DieuKienHuyHieu): boolean {
  return soSanh(getGiaTriChiSo(chiSo, dieuKien.ma_chi_so, null), dieuKien.phep, dieuKien.nguong)
}

// Huy hieu = AND tat ca dieu kien trong mang dieu_kien. Khong can duyet — tu dong hien.
export function apDungHuyHieu(chiSo: ChiSoTuan, danhSachHuyHieu: HuyHieuDongHanh[]): HuyHieuDongHanh[] {
  return danhSachHuyHieu
    .filter((huyHieu) => huyHieu.dang_bat)
    .filter((huyHieu) => huyHieu.dieu_kien.every((dieuKien) => khopDieuKien(chiSo, dieuKien)))
}

// KN: dac ta khong noi ro thuat toan chon "cau huong cai thien" — chi mo ta cot
// gan_voi tro toi 1 khoa (ten ma/nhom_che/'mac_dinh_tot'). Cach chon duoi day la
// tu quyet cua AI trien khai, da ghi vao [KN-04] cuoi docs/11-dac-ta-he-thong-dong-hanh.md:
// uu tien nhom_che cua luat canh bao co uu_tien cao nhat da khop; neu khong co luat
// nao khop (hoc sinh khong dinh gi) thi dung cau gan_voi='mac_dinh_tot'.
export function chonCauDinhHuong(
  luatKhop: LuatKhop[],
  danhSachCau: CauDinhHuongDongHanh[],
): CauDinhHuongDongHanh | null {
  const cauDangBat = danhSachCau.filter((cau) => cau.dang_bat)

  for (const { luat } of luatKhop) {
    const khoa = luat.nhom_che || luat.muc_do
    const cauKhop = cauDangBat.find((cau) => cau.gan_voi === khoa)
    if (cauKhop) return cauKhop
  }

  return cauDangBat.find((cau) => cau.gan_voi === 'mac_dinh_tot') || null
}

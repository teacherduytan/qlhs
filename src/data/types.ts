/** Kiểu dữ liệu theo tài liệu 02 */

export type DienHocSinh = '2B' | 'BT' | 'NT'

export type LoaiGhiNhan =
  | 'chuyen_can'
  | 've_sinh'
  | 'ne_nep'
  | 'trat_tu_ky_luat'
  | 'hoc_tap'
  | 'khen_thuong'

export type PhamViDanhMuc = 'ca_nhan' | 'tap_the' | 'to_truc'

export type NhomDiem = 'CC' | 'VS' | 'NN' | 'KL' | 'KT'

export type LoaiDuLieuImport = 'hoc_sinh' | 'ghi_nhan' | 'phu_huynh' | 'ban_can_su'

export type TrangThaiImport = 'thanh_cong' | 'loi_mot_phan' | 'that_bai' | 'da_xoa'

export type LoaiTuan = 'hoc_binh_thuong' | 'nghi_le'

export type TrangThaiXuLyTapThe =
  | 'chua_xu_ly'
  | 'da_gan_ca_nhan'
  | 'da_ap_dung_ca_lop'
  | 'bo_qua'
  | ''

export interface HocSinh {
  ma_hs: string
  tt: number
  ho: string
  ten: string
  dien: DienHocSinh
  nu: boolean
  dan_toc: string
  ngay_sinh: string | null
  sdt_1: string | null
  sdt_2: string | null
  ngay_nhap_hoc: string | null
  ngay_roi_lop: string | null
  to: number | null
  token_ho_so: string
  la_co_do: boolean
  anh_dai_dien: string | null
  ghi_chu: string | null
}

export interface PhuHuynh {
  ma_hs: string
  ho_ten_ph: string
  quan_he: string
  sdt: string
  uu_tien_lien_he: boolean
}

export interface BanCanSu {
  ma_hs: string
  chuc_vu: string
  to: number | null
  ngay_bat_dau: string | null
}

export interface DanhMucDiem {
  ma_danh_muc: string
  nhom: NhomDiem
  ten_muc: string
  diem: number
  nghiem_trong: boolean
  pham_vi: PhamViDanhMuc
  mo_ta?: string | null
  de_xuat_xu_ly?: string | null
  ma_xu_ly_de_xuat?: string | null
}

export interface DanhMucXuLy {
  ma_xu_ly: string
  ten_xu_ly: string
  noi_dung_xu_ly: string
  muc_do: 'nhe' | 'vua' | 'nang' | 'tich_cuc'
  ghi_chu?: string | null
}

export interface CauHinhTuan {
  tuan_so: number
  tu_ngay: string
  den_ngay: string
  so_ngay: number
  loai_tuan?: LoaiTuan
}

export interface GhiNhan {
  ma_ghi_nhan?: string
  ma_hs: string | null
  to_lien_quan: number | null
  ngay: string
  tuan_so: number
  dien_tai_thoi_diem: string | null
  tiet: string | null
  mon_hoc: string | null
  loai: LoaiGhiNhan
  ma_danh_muc: string | null
  noi_dung: string | null
  so_lan: number
  ly_do: string | null
  da_xu_ly: boolean
  hinh_thuc_xu_ly: string | null
  goi_phu_huynh: boolean
  ghi_so_dau_bai: string | null
  diem_so_mon: number | null
  diem_cong_tru: number | null
  nguoi_ghi: string | null
  nguon: string | null
  ma_log_import: string | null
  trang_thai_xu_ly_tap_the: TrangThaiXuLyTapThe
  su_kien_goc: string | null
}

export interface NhatKyImport {
  ma_log: string
  thoi_gian: string
  loai_du_lieu: LoaiDuLieuImport
  so_dong: number
  nguoi_thuc_hien: string | null
  trang_thai: TrangThaiImport
  duong_dan_file_goc: string | null
  ghi_chu: string | null
}

export interface ImportResult {
  ma_log: string
  trang_thai: TrangThaiImport
  so_dong_thanh_cong: number
  so_dong_loi: number
  ghi_chu: string | null
}

export interface DeleteImportResult {
  ma_log: string
  so_dong_da_xoa: number
  trang_thai: TrangThaiImport
  ghi_chu: string | null
}

export type BuoiHoc = 'SANG' | 'CHIEU'

export type BuoiDiemDanh = 'sang' | 'chieu'

export type TrangThaiDiemDanh = 'vang_co_phep' | 'vang_khong_phep' | 'tre'

export type LuaChonDiemDanh = TrangThaiDiemDanh | 'co_mat'

export type HinhThucLienLacPhuHuynh = 'dien_thoai' | 'goi_zalo' | 'nhan_tin_zalo' | 'sms'

export interface DiemDanh {
  id: string
  ma_nhom: 'CHINH_KHOA' | 'AN_TRUA' | 'NGU_TRUA'
  ma_hs: string | null
  ma_hs_ngoai: string | null
  ngay: string
  tuan_so: number
  buoi: BuoiDiemDanh | 'ca_ngay'
  trang_thai: TrangThaiDiemDanh | 'vang_co_phep_sang' | 'vang_khong_phep_sang'
  ghi_chu: string | null
  nguoi_ghi: string | null
  created_at: string | null
}

export interface DiemDanhHocSinh extends DiemDanh {
  ho: string
  ten: string
  dien: DienHocSinh
  tt: number
}

export interface DiemDanhCanLienLac extends DiemDanhHocSinh {
  da_lien_lac: boolean
}

export interface CapNhatDiemDanhInput {
  ma_hs: string
  ngay: string
  tuan_so: number
  buoi: BuoiDiemDanh
  trang_thai: LuaChonDiemDanh | null
}

export interface ThemLienLacPhuHuynhInput {
  diem_danh_id: string
  hinh_thuc: HinhThucLienLacPhuHuynh
  noi_dung: string | null
}

export type AttendanceMealKey =
  | 'mon_chinh_1'
  | 'mon_chinh_2'
  | 'mon_phu_1'
  | 'mon_phu_2'
  | 'mon_chinh_1_ngay_mai'
  | 'mon_chinh_2_ngay_mai'
  | 'mon_phu_1_ngay_mai'
  | 'mon_phu_2_ngay_mai'

export type AttendanceByDien = Record<DienHocSinh, number>

export interface AttendanceReport {
  ngay: string
  buoi: BuoiHoc
  tuan_so: number
  sheet_name: string
  tre_tinh_co_mat: boolean
  co_mat: AttendanceByDien
  tong: AttendanceByDien
  vang: string[]
  generated_at: string
}

export interface AttendanceFormPayload {
  ngay: string
  buoi: BuoiHoc
  co_mat: AttendanceByDien
  vang: string[]
  so_mon: Record<AttendanceMealKey, string>
}

export interface AttendanceFormUrlResult {
  url: string
}

export interface PublicStudentProfile {
  banCanSu: BanCanSu[]
  catalog: DanhMucDiem[]
  records: GhiNhan[]
  student: HocSinh
  weekConfig: CauHinhTuan[]
}

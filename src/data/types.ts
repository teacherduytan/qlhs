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

export type TrangThaiImport = 'thanh_cong' | 'loi_mot_phan' | 'that_bai'

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
}

export interface CauHinhTuan {
  tuan_so: number
  tu_ngay: string
  den_ngay: string
  so_ngay: number
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

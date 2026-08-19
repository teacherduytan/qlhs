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

export type LoaiDuLieuImport = 'hoc_sinh' | 'ghi_nhan' | 'phu_huynh' | 'ban_can_su' | 'tin_nhan_phu_huynh'

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
  ma_pin?: string | null
  duoc_de_xuat_ghi_nhan: boolean
}

export type TrangThaiDeXuatGhiNhan = 'cho_duyet' | 'da_duyet' | 'tu_choi'

export interface DeXuatGhiNhan {
  id: string
  ma_hs: string
  ma_danh_muc: string | null
  noi_dung: string | null
  nguoi_de_xuat: string
  ma_hs_de_xuat: string
  trang_thai: TrangThaiDeXuatGhiNhan
  ghi_chu_giao_vien: string | null
  ma_ghi_nhan: string | null
  thoi_gian: string | null
  de_xuat_nhom: NhomDiem | null
  ngay: string
  tiet: string | null
  mon_hoc: string | null
}

export interface GuiDeXuatGhiNhanInput {
  token: string
  pin: string
  ma_hs: string
  ma_danh_muc: string | null
  noi_dung: string
  de_xuat_nhom?: NhomDiem | null
  ngay: string
  tiet?: string | null
  mon_hoc?: string | null
}

export interface SuaDeXuatGhiNhanInput {
  token: string
  pin: string
  id: string
  ma_hs: string
  ma_danh_muc: string | null
  noi_dung: string
  de_xuat_nhom?: NhomDiem | null
  ngay: string
  tiet?: string | null
  mon_hoc?: string | null
}

export interface ApproveDeXuatGhiNhanOverrides {
  maDanhMuc?: string
  noiDung?: string
}

export interface LopTruongRosterStudent {
  ma_hs: string
  ho: string
  ten: string
  tt: number
}

export interface LopTruongData {
  students: LopTruongRosterStudent[]
  catalog: DanhMucDiem[]
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
  sdt_1: string | null
  sdt_2: string | null
}

export interface LienLacPhuHuynh {
  id: string
  diem_danh_id: string | null
  hinh_thuc: HinhThucLienLacPhuHuynh | null
  noi_dung: string | null
  nguoi_lien_lac: string | null
  thoi_gian: string | null
  ma_hs: string | null
  ho_ten: string | null
  ngay: string | null
  buoi: BuoiDiemDanh | 'ca_ngay' | null
}

export type NguonTinNhan = 'nhap_tay' | 'tu_dong'

export interface NoiDungTinNhan {
  id: string
  ma_hs: string
  noi_dung: string
  ghi_chu: string | null
  nguon: NguonTinNhan
  da_duyet: boolean
  nguon_import: string | null
  created_by: string | null
  created_at: string
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
  ma_hs: string
  ho_ten: string
  ngay: string
  buoi: BuoiDiemDanh | 'ca_ngay'
}

export interface SuaLienLacPhuHuynhInput {
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
  attendance: DongHanhDiemDanh[]
  huyHieu: HuyHieuDongHanh[]
  duyet: DongHanhDuyet[]
  rankBac: BacTinhTu[]
  rankLichSu: RankLichSuTuan[]
  dongHanhCauHinh: Record<string, string>
}

// ===== He thong Dong hanh (xem docs/11-dac-ta-he-thong-dong-hanh.md) =====

export type KieuChiSoDongHanh = 'so' | 'so_theo_ma' | 'boolean'

export interface ChiSoDongHanh {
  ma_chi_so: string
  ten_hien_thi: string
  kieu: KieuChiSoDongHanh
  mo_ta: string | null
  thu_tu: number
}

export type PhepSoSanh = '>=' | '>' | '=' | '<' | '<='

export type MucDoCanhBao = 'khan' | 'canh_bao' | 'nhac_som' | 'nhac_nhe'

export interface LuatDongHanh {
  ma_luat: string
  ten_luat: string
  ma_chi_so: string
  phep_so_sanh: PhepSoSanh
  nguong: number | null
  ma_danh_muc_ap_dung: string | null
  muc_do: MucDoCanhBao
  cau_hien_thi: string
  uu_tien: number
  nhom_che: string | null
  can_duyet: boolean
  dang_bat: boolean
  thu_tu: number
}

export interface DieuKienHuyHieu {
  ma_chi_so: string
  phep: PhepSoSanh
  nguong: number
}

export interface HuyHieuDongHanh {
  ma_huy_hieu: string
  ten_huy_hieu: string
  icon: string | null
  dieu_kien: DieuKienHuyHieu[]
  mo_ta: string | null
  tu_dong: boolean
  dang_bat: boolean
  thu_tu: number
}

export interface CauDinhHuongDongHanh {
  ma_cau: string
  gan_voi: string
  cau: string
  dang_bat: boolean
  thu_tu: number
}

export type TrangThaiDuyetDongHanh = 'cho_duyet' | 'da_duyet' | 'da_an'

export type LoaiDuyetDongHanh = 'canh_bao' | 'dinh_huong'

export interface DongHanhDuyet {
  id: number
  ma_hs: string
  tuan_so: number
  loai: LoaiDuyetDongHanh
  ma_luat: string | null
  noi_dung_da_duyet: string | null
  trang_thai: TrangThaiDuyetDongHanh
  nguoi_duyet: string | null
  thoi_diem: string
}

export interface DongHanhDiemDanh {
  id: string
  ma_hs: string | null
  ngay: string
  tuan_so: number
  buoi: BuoiDiemDanh | 'ca_ngay'
  trang_thai: TrangThaiDiemDanh | 'vang_co_phep_sang' | 'vang_khong_phep_sang'
}

export interface ChiSoTuan {
  vang_khong_phep: number
  vang_co_phep: number
  di_tre: number
  so_lan_theo_ma: Record<string, number>
  co_nghiem_trong: boolean
  ma_nghiem_trong: string | null
  so_loi_tuan_nay: number
  so_loi_tuan_truoc: number
  xu_huong_loi: number
  co_ghi_nhan_tich_cuc: boolean
  co_vi_pham_ne_nep: boolean
}

export interface LuatKhop {
  luat: LuatDongHanh
  cauHienThi: string
}

// ===== He thong Rank "Tinh tu" (xem docs/thethanghang/12-dac-ta-rank-tinh-tu.md) =====

export interface BacTinhTu {
  bac: number
  ma: string
  ten: string
  icon: string
  diem_toi_thieu: number
  mo_ta: string | null
  dang_bat: boolean
}

export interface RankLichSuTuan {
  id?: number
  ma_hs: string
  tuan_so: number
  diem_ren_luyen: number
  so_huy_hieu: number
  diem_thuong: number
  diem_tuan: number
  bac_dat: number
  thoi_diem_chot?: string
}

export interface KetQuaRank {
  diemRenLuyen: number
  diemThuong: number
  diemTuan: number
  bacHienTai: BacTinhTu
  bacKeTiep: BacTinhTu | null
  conThieu: number
  phanTramToiKeTiep: number
}

// ===== Cau hinh hoa cong thuc diem ren luyen (xem docs/13-cau-hinh-hoa-cong-thuc-diem-ren-luyen.md) =====

export type LoaiTinhThanhPhanDiem = 'tich_luy_danh_muc' | 'trung_binh_diem_so'

export interface DiemCauHinhThanhPhan {
  ma_thanh_phan: string
  ten_hien_thi: string
  loai_tinh: LoaiTinhThanhPhanDiem
  nhom_diem_lien_ket: NhomDiem | null
  thang_goc_min: number
  thang_goc_max: number
  he_so_chuan_hoa: number
  trong_so: number
  bat_buoc: boolean
  dang_bat: boolean
  thu_tu: number
}

export interface DiemCauHinhHeSoDieuKien {
  id?: number
  ma_dieu_kien: string
  ten_hien_thi: string
  ma_thanh_phan: string | null
  dieu_kien_hoc_sinh: string
  chi_ap_dung_khi_am: boolean
  he_so: number
  dang_bat: boolean
}

export interface DiemNguongXepLoai {
  ma_xep_loai: string
  ten_hien_thi: string
  diem_toi_thieu: number
  thu_tu: number
}

// ===== Thu vien tai lieu hoc sinh (xem docs/11-thu-vien-tai-lieu-hoc-sinh.md) =====

export interface DanhMucTaiLieu {
  id: string
  ten: string
  thu_tu: number
  tinh_la_cam_ket: boolean
  active: boolean
}

export interface TaiLieu {
  id: string
  danh_muc_tai_lieu_id: string
  ghi_nhan_id: string | null
  ngay_viet: string | null
  ghi_chu: string | null
  nguoi_tai_len: string | null
  thoi_gian_tai_len: string
}

/** 1 trang/anh cu the cua 1 tai_lieu — vd 2 to giay chup thanh 2 anh nhung cung 1 ban tuong trinh. */
export interface TaiLieuTrang {
  id: string
  tai_lieu_id: string
  thu_tu: number
  duong_dan_luu_tru: string
  ten_file_goc: string | null
  loai_tep: string | null
  kich_thuoc_byte: number | null
}

export interface TaiLieuHocSinhTom {
  ma_hs: string
  ho: string
  ten: string
}

export interface TaiLieuChiTiet extends TaiLieu {
  danh_muc: DanhMucTaiLieu | null
  hoc_sinh: TaiLieuHocSinhTom[]
  trang: TaiLieuTrang[]
}

export interface TaiLieuUploadInput {
  files: File[]
  danhMucTaiLieuId: string
  ngayViet: string
  maHsList: string[]
  ghiNhanId?: string | null
  ghiChu?: string | null
}

export interface TaiLieuCapNhatInput {
  danhMucTaiLieuId?: string
  ngayViet?: string | null
  ghiNhanId?: string | null
  ghiChu?: string | null
  maHsList?: string[]
}

export interface TaiLieuBoLoc {
  maHs?: string
  danhMucId?: string
  tuNgay?: string
  denNgay?: string
}

import type {
  ApproveDeXuatGhiNhanOverrides,
  BanCanSu,
  CauHinhTuan,
  DeleteImportResult,
  DanhMucDiem,
  DanhMucXuLy,
  DeXuatGhiNhan,
  GhiNhan,
  GuiDeXuatGhiNhanInput,
  HocSinh,
  LopTruongData,
  SuaDeXuatGhiNhanInput,
  AttendanceFormPayload,
  AttendanceFormUrlResult,
  AttendanceReport,
  BuoiHoc,
  CapNhatDiemDanhInput,
  ImportResult,
  LoaiDuLieuImport,
  NhatKyImport,
  PhuHuynh,
  PublicStudentProfile,
  DiemDanh,
  DiemDanhCanLienLac,
  LienLacPhuHuynh,
  NoiDungTinNhan,
  SuaLienLacPhuHuynhInput,
  ThemLienLacPhuHuynhInput,
  ChiSoDongHanh,
  LuatDongHanh,
  HuyHieuDongHanh,
  CauDinhHuongDongHanh,
  DongHanhDuyet,
  TrangThaiDuyetDongHanh,
  LoaiDuyetDongHanh,
  BacTinhTu,
  RankLichSuTuan,
  DiemCauHinhThanhPhan,
  DiemCauHinhHeSoDieuKien,
  DiemNguongXepLoai,
  DanhMucTaiLieu,
  TaiLieuChiTiet,
  TaiLieuUploadInput,
  TaiLieuCapNhatInput,
  TaiLieuBoLoc,
} from './types'

/** Lớp trung gian dữ liệu — mọi UI chỉ gọi qua interface này (tài liệu 01) */
export interface DataSource {
  getStudents(): Promise<HocSinh[]>
  getPublicStudentProfile(token: string, sdt: string, matKhau: string): Promise<PublicStudentProfile | null>
  getPublicStudentProfileByPhone(sdt: string, matKhau: string): Promise<PublicStudentProfile | null>
  addStudent(student: HocSinh): Promise<HocSinh>
  updateStudent(maHs: string, student: Partial<HocSinh>): Promise<HocSinh>
  deleteStudent(maHs: string): Promise<void>

  getRecords(maHs?: string): Promise<GhiNhan[]>
  addRecord(record: GhiNhan): Promise<GhiNhan>
  addRecords(records: GhiNhan[]): Promise<GhiNhan[]>
  deleteRecord(maGhiNhan: string): Promise<void>
  processCollectiveEvent(
    sourceRecordId: string,
    status: GhiNhan['trang_thai_xu_ly_tap_the'],
    generatedRecords: GhiNhan[],
  ): Promise<GhiNhan[]>

  getPointCatalog(): Promise<DanhMucDiem[]>
  addPointCatalogItem(item: DanhMucDiem): Promise<DanhMucDiem>
  updatePointCatalogItem(
    maDanhMuc: string,
    item: Partial<DanhMucDiem>,
  ): Promise<DanhMucDiem>
  deletePointCatalogItem(maDanhMuc: string): Promise<void>
  syncCatalogPointToRecords(maDanhMuc: string, diem: number): Promise<number>
  getHandlingCatalog(): Promise<DanhMucXuLy[]>
  addHandlingCatalogItem(item: DanhMucXuLy): Promise<DanhMucXuLy>
  updateHandlingCatalogItem(maXuLy: string, item: Partial<DanhMucXuLy>): Promise<DanhMucXuLy>
  deleteHandlingCatalogItem(maXuLy: string): Promise<void>
  getWeekConfig(): Promise<CauHinhTuan[]>
  getBanCanSu(): Promise<BanCanSu[]>
  addBanCanSu(item: BanCanSu): Promise<BanCanSu>
  updateBanCanSu(maHs: string, chucVu: string, patch: Partial<BanCanSu>): Promise<BanCanSu>
  deleteBanCanSu(maHs: string, chucVu: string): Promise<void>
  getPhuHuynh(maHs?: string): Promise<PhuHuynh[]>
  getImportLogs(): Promise<NhatKyImport[]>

  importJson(
    loai: LoaiDuLieuImport,
    jsonData: unknown[],
    nguoiThucHien?: string,
  ): Promise<ImportResult>
  deleteImport(maLog: string): Promise<DeleteImportResult>

  calculateAttendanceReport(
    ngay: string,
    buoi: BuoiHoc,
    treTinhCoMat?: boolean,
  ): Promise<AttendanceReport>
  buildAttendanceFormUrl(payload: AttendanceFormPayload): Promise<AttendanceFormUrlResult>
  getAttendanceEntries(options?: {
    tuanSo?: number
    ngayFrom?: string
    ngayTo?: string
  }): Promise<DiemDanh[]>
  getPendingParentContacts(): Promise<DiemDanhCanLienLac[]>
  upsertAttendanceEntry(input: CapNhatDiemDanhInput): Promise<string | null>
  addParentContact(input: ThemLienLacPhuHuynhInput): Promise<void>
  getParentContactHistory(options?: { maHs?: string }): Promise<LienLacPhuHuynh[]>
  updateParentContact(id: string, patch: SuaLienLacPhuHuynhInput): Promise<void>
  deleteParentContact(id: string): Promise<void>

  getMessageContents(maHs?: string): Promise<NoiDungTinNhan[]>
  updateMessageContent(id: string, noiDung: string): Promise<NoiDungTinNhan>
  deleteMessageContent(id: string): Promise<void>

  verifyLopTruongPin(token: string, pin: string): Promise<boolean>
  getLopTruongData(token: string, pin: string): Promise<LopTruongData | null>
  submitDeXuatGhiNhan(input: GuiDeXuatGhiNhanInput): Promise<string>
  getDeXuatGhiNhan(options?: { maHs?: string }): Promise<DeXuatGhiNhan[]>
  approveDeXuatGhiNhan(id: string, overrides?: ApproveDeXuatGhiNhanOverrides): Promise<void>
  rejectDeXuatGhiNhan(id: string, ghiChu?: string): Promise<void>
  getLichSuDeXuatLopTruong(token: string, pin: string): Promise<DeXuatGhiNhan[]>
  updateDeXuatGhiNhanByLopTruong(input: SuaDeXuatGhiNhanInput): Promise<void>
  deleteDeXuatGhiNhanByLopTruong(token: string, pin: string, id: string): Promise<void>
  updateDeXuatGhiNhanByTeacher(
    id: string,
    patch: Partial<
      Pick<DeXuatGhiNhan, 'ma_danh_muc' | 'noi_dung' | 'de_xuat_nhom' | 'ngay' | 'tiet' | 'mon_hoc'>
    >
  ): Promise<void>
  deleteDeXuatGhiNhanByTeacher(id: string): Promise<void>

  getDongHanhChiSo(): Promise<ChiSoDongHanh[]>

  getDongHanhLuat(): Promise<LuatDongHanh[]>
  addDongHanhLuat(item: LuatDongHanh): Promise<LuatDongHanh>
  updateDongHanhLuat(maLuat: string, patch: Partial<LuatDongHanh>): Promise<LuatDongHanh>
  deleteDongHanhLuat(maLuat: string): Promise<void>

  getDongHanhHuyHieu(): Promise<HuyHieuDongHanh[]>
  addDongHanhHuyHieu(item: HuyHieuDongHanh): Promise<HuyHieuDongHanh>
  updateDongHanhHuyHieu(maHuyHieu: string, patch: Partial<HuyHieuDongHanh>): Promise<HuyHieuDongHanh>
  deleteDongHanhHuyHieu(maHuyHieu: string): Promise<void>

  getDongHanhCauDinhHuong(): Promise<CauDinhHuongDongHanh[]>
  addDongHanhCauDinhHuong(item: CauDinhHuongDongHanh): Promise<CauDinhHuongDongHanh>
  updateDongHanhCauDinhHuong(
    maCau: string,
    patch: Partial<CauDinhHuongDongHanh>,
  ): Promise<CauDinhHuongDongHanh>
  deleteDongHanhCauDinhHuong(maCau: string): Promise<void>

  getDongHanhDuyet(maHs?: string): Promise<DongHanhDuyet[]>
  duyetDongHanh(input: {
    ma_hs: string
    tuan_so: number
    loai: LoaiDuyetDongHanh
    ma_luat: string | null
    noi_dung_da_duyet: string
    trang_thai: TrangThaiDuyetDongHanh
  }): Promise<DongHanhDuyet>

  getRankBacTinhTu(): Promise<BacTinhTu[]>
  addRankBacTinhTu(item: BacTinhTu): Promise<BacTinhTu>
  updateRankBacTinhTu(bac: number, patch: Partial<BacTinhTu>): Promise<BacTinhTu>
  deleteRankBacTinhTu(bac: number): Promise<void>

  getDongHanhCauHinh(): Promise<Record<string, string>>
  updateDongHanhCauHinh(khoa: string, giaTri: string): Promise<void>

  getRankLichSuTuan(maHs?: string): Promise<RankLichSuTuan[]>
  upsertRankLichSuTuan(input: RankLichSuTuan): Promise<RankLichSuTuan>
  chotRankTuanCongKhai(input: {
    token: string
    sdt: string
    matKhau: string
    tuanSo: number
    diemRenLuyen: number
    soHuyHieu: number
    diemThuong: number
    diemTuan: number
    bacDat: number
  }): Promise<void>

  getDiemCauHinhThanhPhan(): Promise<DiemCauHinhThanhPhan[]>
  addDiemCauHinhThanhPhan(item: DiemCauHinhThanhPhan): Promise<DiemCauHinhThanhPhan>
  updateDiemCauHinhThanhPhan(
    maThanhPhan: string,
    patch: Partial<DiemCauHinhThanhPhan>,
  ): Promise<DiemCauHinhThanhPhan>
  deleteDiemCauHinhThanhPhan(maThanhPhan: string): Promise<void>

  getDiemCauHinhHeSoDieuKien(): Promise<DiemCauHinhHeSoDieuKien[]>
  addDiemCauHinhHeSoDieuKien(item: DiemCauHinhHeSoDieuKien): Promise<DiemCauHinhHeSoDieuKien>
  updateDiemCauHinhHeSoDieuKien(
    id: number,
    patch: Partial<DiemCauHinhHeSoDieuKien>,
  ): Promise<DiemCauHinhHeSoDieuKien>
  deleteDiemCauHinhHeSoDieuKien(id: number): Promise<void>

  getDiemNguongXepLoai(): Promise<DiemNguongXepLoai[]>
  addDiemNguongXepLoai(item: DiemNguongXepLoai): Promise<DiemNguongXepLoai>
  updateDiemNguongXepLoai(maXepLoai: string, patch: Partial<DiemNguongXepLoai>): Promise<DiemNguongXepLoai>
  deleteDiemNguongXepLoai(maXepLoai: string): Promise<void>

  getDiemCauHinhChung(): Promise<Record<string, string>>
  updateDiemCauHinhChung(khoa: string, giaTri: string): Promise<void>

  getDanhMucTaiLieu(): Promise<DanhMucTaiLieu[]>
  addDanhMucTaiLieu(item: { ten: string; tinh_la_cam_ket: boolean }): Promise<DanhMucTaiLieu>

  getTaiLieu(filter?: TaiLieuBoLoc): Promise<TaiLieuChiTiet[]>
  uploadTaiLieu(input: TaiLieuUploadInput): Promise<TaiLieuChiTiet>
  updateTaiLieu(id: string, patch: TaiLieuCapNhatInput): Promise<TaiLieuChiTiet>
  deleteTaiLieu(id: string): Promise<void>
  getTaiLieuUrl(duongDanLuuTru: string): Promise<string>
}

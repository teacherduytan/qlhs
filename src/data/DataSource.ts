import type {
  BanCanSu,
  CauHinhTuan,
  DeleteImportResult,
  DanhMucDiem,
  DanhMucXuLy,
  GhiNhan,
  HocSinh,
  AttendanceFormPayload,
  AttendanceFormUrlResult,
  AttendanceReport,
  BuoiHoc,
  ImportResult,
  LoaiDuLieuImport,
  NhatKyImport,
  PhuHuynh,
} from './types'

/** Lớp trung gian dữ liệu — mọi UI chỉ gọi qua interface này (tài liệu 01) */
export interface DataSource {
  getStudents(): Promise<HocSinh[]>
  getStudentByToken(token: string): Promise<HocSinh | null>
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
  getHandlingCatalog(): Promise<DanhMucXuLy[]>
  addHandlingCatalogItem(item: DanhMucXuLy): Promise<DanhMucXuLy>
  updateHandlingCatalogItem(maXuLy: string, item: Partial<DanhMucXuLy>): Promise<DanhMucXuLy>
  deleteHandlingCatalogItem(maXuLy: string): Promise<void>
  getWeekConfig(): Promise<CauHinhTuan[]>
  getBanCanSu(): Promise<BanCanSu[]>
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
}

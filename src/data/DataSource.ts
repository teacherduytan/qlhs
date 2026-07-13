import type {
  BanCanSu,
  CauHinhTuan,
  DeleteImportResult,
  DanhMucDiem,
  GhiNhan,
  HocSinh,
  ImportResult,
  LoaiDuLieuImport,
  NhatKyImport,
  PhuHuynh,
} from './types'

export type TeacherLoginResult = {
  token: string
  expires_in_seconds: number
}

/** Lớp trung gian dữ liệu — mọi UI chỉ gọi qua interface này (tài liệu 01) */
export interface DataSource {
  loginTeacher(password: string): Promise<TeacherLoginResult>
  verifyTeacherSession(token: string): Promise<boolean>

  getStudents(): Promise<HocSinh[]>
  getStudentByToken(token: string): Promise<HocSinh | null>
  addStudent(student: HocSinh): Promise<HocSinh>
  updateStudent(maHs: string, student: Partial<HocSinh>): Promise<HocSinh>
  deleteStudent(maHs: string): Promise<void>

  getRecords(maHs?: string): Promise<GhiNhan[]>
  addRecord(record: GhiNhan): Promise<GhiNhan>
  processCollectiveEvent(
    sourceRecordId: string,
    status: GhiNhan['trang_thai_xu_ly_tap_the'],
    generatedRecords: GhiNhan[],
  ): Promise<GhiNhan[]>

  getPointCatalog(): Promise<DanhMucDiem[]>
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
}

import type { DataSource, TeacherLoginResult } from './DataSource'
import { getTeacherSessionToken } from './teacherSession'
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

type ApiResponse<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: string
    }

type QueryValue = string | number | boolean | null | undefined

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined

export class GoogleSheetsDataSource implements DataSource {
  private readonly apiUrl: string | undefined

  constructor(apiUrl = APPS_SCRIPT_URL) {
    this.apiUrl = apiUrl?.trim()
  }

  loginTeacher(password: string): Promise<TeacherLoginResult> {
    return this.post<TeacherLoginResult>(
      { action: 'teacher_login', password },
      { requireSession: false },
    )
  }

  async verifyTeacherSession(token: string): Promise<boolean> {
    const result = await this.post<{ valid: boolean }>(
      { action: 'verify_teacher_session', teacher_session_token: token },
      { requireSession: false },
    )

    return result.valid
  }

  getStudents(): Promise<HocSinh[]> {
    return this.get<HocSinh[]>('students')
  }

  getStudentByToken(token: string): Promise<HocSinh | null> {
    return this.get<HocSinh | null>('student_by_token', { token })
  }

  addStudent(student: HocSinh): Promise<HocSinh> {
    return this.post<HocSinh>({ action: 'add_student', student })
  }

  updateStudent(maHs: string, student: Partial<HocSinh>): Promise<HocSinh> {
    return this.post<HocSinh>({ action: 'update_student', ma_hs: maHs, student })
  }

  async deleteStudent(maHs: string): Promise<void> {
    await this.post<null>({ action: 'delete_student', ma_hs: maHs })
  }

  getRecords(maHs?: string): Promise<GhiNhan[]> {
    return this.get<GhiNhan[]>('records', { ma_hs: maHs })
  }

  addRecord(record: GhiNhan): Promise<GhiNhan> {
    return this.post<GhiNhan>({ tab: 'GhiNhan', row: record })
  }

  addRecords(records: GhiNhan[]): Promise<GhiNhan[]> {
    return this.post<GhiNhan[]>({ action: 'add_records', records })
  }

  async deleteRecord(maGhiNhan: string): Promise<void> {
    try {
      await this.post<null>({ action: 'delete_record', ma_ghi_nhan: maGhiNhan })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.includes('Invalid POST body')) {
        throw new Error(
          'Apps Script trả Invalid POST body khi xoá ghi nhận. Hãy mở URL Apps Script với ?action=api_health để kiểm tra backend đã là bản C077 trở lên chưa; nếu chưa có api_health/delete_record thì cần deploy lại apps-script/Code.gs.',
        )
      }
      throw error
    }
  }

  processCollectiveEvent(
    sourceRecordId: string,
    status: GhiNhan['trang_thai_xu_ly_tap_the'],
    generatedRecords: GhiNhan[],
  ): Promise<GhiNhan[]> {
    return this.post<GhiNhan[]>({
      action: 'process_collective_event',
      source_record_id: sourceRecordId,
      status,
      generated_records: generatedRecords,
    })
  }

  getPointCatalog(): Promise<DanhMucDiem[]> {
    return this.get<DanhMucDiem[]>('danh_muc_diem')
  }

  addPointCatalogItem(item: DanhMucDiem): Promise<DanhMucDiem> {
    return this.post<DanhMucDiem>({ action: 'add_point_catalog_item', item })
  }

  updatePointCatalogItem(
    maDanhMuc: string,
    item: Partial<DanhMucDiem>,
  ): Promise<DanhMucDiem> {
    return this.post<DanhMucDiem>({
      action: 'update_point_catalog_item',
      ma_danh_muc: maDanhMuc,
      item,
    })
  }

  async deletePointCatalogItem(maDanhMuc: string): Promise<void> {
    await this.post<null>({
      action: 'delete_point_catalog_item',
      ma_danh_muc: maDanhMuc,
    })
  }

  getWeekConfig(): Promise<CauHinhTuan[]> {
    return this.get<CauHinhTuan[]>('cau_hinh_tuan')
  }

  getBanCanSu(): Promise<BanCanSu[]> {
    return this.get<BanCanSu[]>('ban_can_su')
  }

  getPhuHuynh(maHs?: string): Promise<PhuHuynh[]> {
    return this.get<PhuHuynh[]>('phu_huynh', { ma_hs: maHs })
  }

  getImportLogs(): Promise<NhatKyImport[]> {
    return this.get<NhatKyImport[]>('nhat_ky_import')
  }

  importJson(
    loai: LoaiDuLieuImport,
    jsonData: unknown[],
    nguoiThucHien?: string,
  ): Promise<ImportResult> {
    return this.post<ImportResult>({
      import: true,
      loai,
      rows: jsonData,
      nguoi_thuc_hien: nguoiThucHien,
    })
  }

  deleteImport(maLog: string): Promise<DeleteImportResult> {
    return this.post<DeleteImportResult>({
      action: 'delete_import',
      ma_log: maLog,
    })
  }

  private async get<T>(action: string, params: Record<string, QueryValue> = {}): Promise<T> {
    const url = this.buildUrl(action, params)
    const response = await fetch(url)
    return readApiResponse<T>(response)
  }

  private async post<T>(
    body: unknown,
    options: { requireSession?: boolean } = {},
  ): Promise<T> {
    const requireSession = options.requireSession !== false
    const sessionToken = requireSession ? getTeacherSessionToken()?.trim() : null

    if (requireSession && !sessionToken) {
      throw new Error('Phiên đăng nhập giáo viên đã hết hạn. Vui lòng đăng nhập lại.')
    }

    const response = await fetch(this.requireApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        ...(isRecord(body) ? body : {}),
        ...(sessionToken ? { teacher_session_token: sessionToken } : {}),
      }),
    })

    return readApiResponse<T>(response)
  }

  private buildUrl(action: string, params: Record<string, QueryValue>): string {
    const url = new URL(this.requireApiUrl())
    url.searchParams.set('action', action)

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })

    return url.toString()
  }

  private requireApiUrl(): string {
    if (!this.apiUrl) {
      throw new Error('Thiếu VITE_APPS_SCRIPT_URL. Hãy tạo file .env từ .env.example.')
    }

    return this.apiUrl
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function readApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Apps Script trả HTTP ${response.status}`)
  }

  const payload = (await response.json()) as ApiResponse<T>

  if (!payload.ok) {
    throw new Error(payload.error || 'Apps Script trả về lỗi không rõ nguyên nhân.')
  }

  return payload.data
}

import type { DataSource } from './DataSource'
import type {
  BanCanSu,
  CauHinhTuan,
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

  getPointCatalog(): Promise<DanhMucDiem[]> {
    return this.get<DanhMucDiem[]>('danh_muc_diem')
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

  private async get<T>(action: string, params: Record<string, QueryValue> = {}): Promise<T> {
    const url = this.buildUrl(action, params)
    const response = await fetch(url)
    return readApiResponse<T>(response)
  }

  private async post<T>(body: unknown): Promise<T> {
    const response = await fetch(this.requireApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(body),
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

import type { DataSource } from './DataSource'
import { GoogleSheetsDataSource } from './GoogleSheetsDataSource'
import { getSupabaseAccessToken, getSupabaseClient, hasSupabaseConfig } from '../lib/supabaseClient'
import type {
  AttendanceFormPayload,
  AttendanceFormUrlResult,
  AttendanceReport,
  BanCanSu,
  BuoiHoc,
  CauHinhTuan,
  DanhMucDiem,
  DanhMucXuLy,
  DeleteImportResult,
  GhiNhan,
  HocSinh,
  ImportResult,
  LoaiDuLieuImport,
  LoaiGhiNhan,
  NhatKyImport,
  PhuHuynh,
  TrangThaiImport,
  TrangThaiXuLyTapThe,
} from './types'

type AnyRow = Record<string, unknown>

const GHI_NHAN_COLUMNS = [
  'ma_ghi_nhan',
  'ma_hs',
  'to_lien_quan',
  'ngay',
  'tuan_so',
  'dien_tai_thoi_diem',
  'tiet',
  'mon_hoc',
  'loai',
  'ma_danh_muc',
  'noi_dung',
  'so_lan',
  'ly_do',
  'da_xu_ly',
  'hinh_thuc_xu_ly',
  'goi_phu_huynh',
  'ghi_so_dau_bai',
  'diem_so_mon',
  'diem_cong_tru',
  'nguoi_ghi',
  'nguon',
  'ma_log_import',
  'trang_thai_xu_ly_tap_the',
  'su_kien_goc',
] as const

const TABLE_COLUMNS: Record<LoaiDuLieuImport, readonly string[]> = {
  hoc_sinh: [
    'ma_hs',
    'tt',
    'ho',
    'ten',
    'dien',
    'nu',
    'dan_toc',
    'ngay_sinh',
    'sdt_1',
    'sdt_2',
    'ngay_nhap_hoc',
    'ngay_roi_lop',
    'to',
    'token_ho_so',
    'la_co_do',
    'anh_dai_dien',
    'ghi_chu',
  ],
  ghi_nhan: GHI_NHAN_COLUMNS,
  phu_huynh: ['ma_hs', 'ho_ten_ph', 'quan_he', 'sdt', 'uu_tien_lien_he'],
  ban_can_su: ['ma_hs', 'chuc_vu', 'to', 'ngay_bat_dau'],
}

const RECORD_TYPE_BY_GROUP: Record<DanhMucDiem['nhom'], LoaiGhiNhan> = {
  CC: 'chuyen_can',
  VS: 've_sinh',
  NN: 'ne_nep',
  KL: 'trat_tu_ky_luat',
  KT: 'khen_thuong',
}

export class SupabaseDataSource implements DataSource {
  private readonly fallback: GoogleSheetsDataSource

  constructor(fallback = new GoogleSheetsDataSource()) {
    this.fallback = fallback
  }

  async getStudents(): Promise<HocSinh[]> {
    if (await this.shouldUseFallbackRead()) return this.fallback.getStudents()

    const { data, error } = await getSupabaseClient().from('hoc_sinh').select('*').order('tt')
    assertNoError(error, 'Khong doc duoc HocSinh tu Supabase')
    return (data || []) as HocSinh[]
  }

  getStudentByToken(token: string): Promise<HocSinh | null> {
    return this.fallback.getStudentByToken(token)
  }

  async addStudent(student: HocSinh): Promise<HocSinh> {
    const { data, error } = await getSupabaseClient()
      .from('hoc_sinh')
      .insert(pickColumns(student as unknown as AnyRow, TABLE_COLUMNS.hoc_sinh))
      .select()
      .single()
    assertNoError(error, 'Khong tao duoc HocSinh tren Supabase')
    return data as HocSinh
  }

  async updateStudent(maHs: string, student: Partial<HocSinh>): Promise<HocSinh> {
    const { data, error } = await getSupabaseClient()
      .from('hoc_sinh')
      .update(pickColumns(student as AnyRow, TABLE_COLUMNS.hoc_sinh))
      .eq('ma_hs', maHs)
      .select()
      .single()
    assertNoError(error, 'Khong cap nhat duoc HocSinh tren Supabase')
    return data as HocSinh
  }

  async deleteStudent(maHs: string): Promise<void> {
    const { error } = await getSupabaseClient().from('hoc_sinh').delete().eq('ma_hs', maHs)
    assertNoError(error, 'Khong xoa duoc HocSinh tren Supabase')
  }

  async getRecords(maHs?: string): Promise<GhiNhan[]> {
    if (await this.shouldUseFallbackRead()) return this.fallback.getRecords(maHs)

    let query = getSupabaseClient().from('ghi_nhan').select('*').order('ngay', { ascending: false })
    if (maHs) query = query.eq('ma_hs', maHs)

    const { data, error } = await query
    assertNoError(error, 'Khong doc duoc GhiNhan tu Supabase')
    return (data || []) as GhiNhan[]
  }

  async addRecord(record: GhiNhan): Promise<GhiNhan> {
    const created = await this.addRecords([record])
    return created[0]
  }

  async addRecords(records: GhiNhan[]): Promise<GhiNhan[]> {
    if (records.length === 0) return []

    const ids = await this.nextPrefixedIds('ghi_nhan', 'ma_ghi_nhan', 'GN', 6, records.length)
    const rows = records.map((record, index) =>
      pickColumns(
        stripUndefined({
          ...record,
          ma_ghi_nhan: record.ma_ghi_nhan || ids[index],
          so_lan: record.so_lan || 1,
          da_xu_ly: record.da_xu_ly ?? false,
          goi_phu_huynh: record.goi_phu_huynh ?? false,
          trang_thai_xu_ly_tap_the: record.trang_thai_xu_ly_tap_the ?? '',
          su_kien_goc: record.su_kien_goc ?? null,
        }),
        GHI_NHAN_COLUMNS,
      ),
    )

    const { data, error } = await getSupabaseClient().from('ghi_nhan').insert(rows).select()
    assertNoError(error, 'Khong tao duoc GhiNhan tren Supabase')
    return (data || []) as GhiNhan[]
  }

  async deleteRecord(maGhiNhan: string): Promise<void> {
    const { error } = await getSupabaseClient().from('ghi_nhan').delete().eq('ma_ghi_nhan', maGhiNhan)
    assertNoError(error, 'Khong xoa duoc GhiNhan tren Supabase')
  }

  async processCollectiveEvent(
    sourceRecordId: string,
    status: GhiNhan['trang_thai_xu_ly_tap_the'],
    generatedRecords: GhiNhan[],
  ): Promise<GhiNhan[]> {
    const { error } = await getSupabaseClient()
      .from('ghi_nhan')
      .update({ trang_thai_xu_ly_tap_the: status })
      .eq('ma_ghi_nhan', sourceRecordId)
    assertNoError(error, 'Khong cap nhat trang thai su kien tap the tren Supabase')

    const rows = generatedRecords.map((record) => ({
      ...record,
      trang_thai_xu_ly_tap_the: '' as TrangThaiXuLyTapThe,
      su_kien_goc: record.su_kien_goc || sourceRecordId,
    }))
    return this.addRecords(rows)
  }

  async getPointCatalog(): Promise<DanhMucDiem[]> {
    if (await this.shouldUseFallbackRead()) return this.fallback.getPointCatalog()

    const { data, error } = await getSupabaseClient()
      .from('danh_muc_diem')
      .select('*')
      .order('nhom')
      .order('ma_danh_muc')
    assertNoError(error, 'Khong doc duoc DanhMucDiem tu Supabase')
    return (data || []) as DanhMucDiem[]
  }

  async addPointCatalogItem(item: DanhMucDiem): Promise<DanhMucDiem> {
    const { data, error } = await getSupabaseClient()
      .from('danh_muc_diem')
      .insert(stripUndefined(item as unknown as AnyRow))
      .select()
      .single()
    assertNoError(error, 'Khong tao duoc DanhMucDiem tren Supabase')
    return data as DanhMucDiem
  }

  async updatePointCatalogItem(maDanhMuc: string, item: Partial<DanhMucDiem>): Promise<DanhMucDiem> {
    const { data, error } = await getSupabaseClient()
      .from('danh_muc_diem')
      .update(stripUndefined(item as AnyRow))
      .eq('ma_danh_muc', maDanhMuc)
      .select()
      .single()
    assertNoError(error, 'Khong cap nhat duoc DanhMucDiem tren Supabase')
    return data as DanhMucDiem
  }

  async deletePointCatalogItem(maDanhMuc: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('danh_muc_diem')
      .delete()
      .eq('ma_danh_muc', maDanhMuc)
    assertNoError(error, 'Khong xoa duoc DanhMucDiem tren Supabase')
  }

  async getHandlingCatalog(): Promise<DanhMucXuLy[]> {
    if (await this.shouldUseFallbackRead()) return this.fallback.getHandlingCatalog()

    const { data, error } = await getSupabaseClient()
      .from('danh_muc_xu_ly')
      .select('*')
      .order('ma_xu_ly')
    assertNoError(error, 'Khong doc duoc DanhMucXuLy tu Supabase')
    return (data || []) as DanhMucXuLy[]
  }

  async addHandlingCatalogItem(item: DanhMucXuLy): Promise<DanhMucXuLy> {
    const { data, error } = await getSupabaseClient()
      .from('danh_muc_xu_ly')
      .insert(stripUndefined(item as unknown as AnyRow))
      .select()
      .single()
    assertNoError(error, 'Khong tao duoc DanhMucXuLy tren Supabase')
    return data as DanhMucXuLy
  }

  async updateHandlingCatalogItem(maXuLy: string, item: Partial<DanhMucXuLy>): Promise<DanhMucXuLy> {
    const { data, error } = await getSupabaseClient()
      .from('danh_muc_xu_ly')
      .update(stripUndefined(item as AnyRow))
      .eq('ma_xu_ly', maXuLy)
      .select()
      .single()
    assertNoError(error, 'Khong cap nhat duoc DanhMucXuLy tren Supabase')
    return data as DanhMucXuLy
  }

  async deleteHandlingCatalogItem(maXuLy: string): Promise<void> {
    const { error } = await getSupabaseClient().from('danh_muc_xu_ly').delete().eq('ma_xu_ly', maXuLy)
    assertNoError(error, 'Khong xoa duoc DanhMucXuLy tren Supabase')
  }

  async getWeekConfig(): Promise<CauHinhTuan[]> {
    if (await this.shouldUseFallbackRead()) return this.fallback.getWeekConfig()
    return this.ensureWeekConfigCoversDate(formatIsoDate(new Date()))
  }

  async getBanCanSu(): Promise<BanCanSu[]> {
    if (await this.shouldUseFallbackRead()) return this.fallback.getBanCanSu()

    const { data, error } = await getSupabaseClient().from('ban_can_su').select('*').order('to')
    assertNoError(error, 'Khong doc duoc BanCanSu tu Supabase')
    return (data || []) as BanCanSu[]
  }

  async getPhuHuynh(maHs?: string): Promise<PhuHuynh[]> {
    if (await this.shouldUseFallbackRead()) return this.fallback.getPhuHuynh(maHs)

    let query = getSupabaseClient().from('phu_huynh').select('*').order('ma_hs')
    if (maHs) query = query.eq('ma_hs', maHs)

    const { data, error } = await query
    assertNoError(error, 'Khong doc duoc PhuHuynh tu Supabase')
    return (data || []) as PhuHuynh[]
  }

  async getImportLogs(): Promise<NhatKyImport[]> {
    if (await this.shouldUseFallbackRead()) return this.fallback.getImportLogs()

    const { data, error } = await getSupabaseClient()
      .from('nhat_ky_import')
      .select('*')
      .order('thoi_gian', { ascending: false })
    assertNoError(error, 'Khong doc duoc NhatKyImport tu Supabase')
    return (data || []) as NhatKyImport[]
  }

  async importJson(
    loai: LoaiDuLieuImport,
    jsonData: unknown[],
    nguoiThucHien?: string,
  ): Promise<ImportResult> {
    const maLog = (await this.nextPrefixedIds('nhat_ky_import', 'ma_log', 'LOG', 6, 1))[0]
    const logBase: NhatKyImport = {
      ma_log: maLog,
      thoi_gian: new Date().toISOString(),
      loai_du_lieu: loai,
      so_dong: 0,
      nguoi_thuc_hien: nguoiThucHien || null,
      trang_thai: 'that_bai',
      duong_dan_file_goc: null,
      ghi_chu: null,
    }

    const { error: logError } = await getSupabaseClient().from('nhat_ky_import').insert(logBase)
    assertNoError(logError, 'Khong tao duoc log import tren Supabase')

    const errors: string[] = []
    const rows: AnyRow[] = []
    const generatedRecordIds =
      loai === 'ghi_nhan'
        ? await this.nextPrefixedIds('ghi_nhan', 'ma_ghi_nhan', 'GN', 6, jsonData.length)
        : []

    for (let index = 0; index < jsonData.length; index += 1) {
      try {
        rows.push(await this.prepareImportRow(loai, asRecord(jsonData[index]), maLog, generatedRecordIds[index]))
      } catch (error) {
        errors.push(`Dong ${index + 1}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    try {
      if (rows.length > 0) {
        const tableName = tableNameForImport(loai)
        const { error } = await getSupabaseClient().from(tableName).insert(rows)
        assertNoError(error, `Khong ghi duoc ${tableName} tren Supabase`)
      }

      const status: TrangThaiImport =
        errors.length === 0 ? 'thanh_cong' : rows.length > 0 ? 'loi_mot_phan' : 'that_bai'
      const note = errors.length > 0 ? errors.join('; ') : null
      await this.updateImportLog(maLog, {
        so_dong: rows.length,
        trang_thai: status,
        ghi_chu: note,
      })

      return {
        ma_log: maLog,
        trang_thai: status,
        so_dong_thanh_cong: rows.length,
        so_dong_loi: errors.length,
        ghi_chu: note,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this.updateImportLog(maLog, {
        so_dong: rows.length,
        trang_thai: 'that_bai',
        ghi_chu: message,
      })
      throw error
    }
  }

  async deleteImport(maLog: string): Promise<DeleteImportResult> {
    const { data: log, error: logError } = await getSupabaseClient()
      .from('nhat_ky_import')
      .select('*')
      .eq('ma_log', maLog)
      .single()
    assertNoError(logError, 'Khong tim thay log import tren Supabase')

    if ((log as NhatKyImport).loai_du_lieu !== 'ghi_nhan') {
      throw new Error(`Chi ho tro xoa du lieu import GhiNhan: ${maLog}`)
    }

    const { data, error } = await getSupabaseClient()
      .from('ghi_nhan')
      .delete()
      .eq('ma_log_import', maLog)
      .select('ma_ghi_nhan')
    assertNoError(error, 'Khong xoa duoc GhiNhan cua lan import tren Supabase')

    const deletedCount = data?.length || 0
    const note = `Da xoa ${deletedCount} dong GhiNhan lien quan.`
    await this.updateImportLog(maLog, {
      trang_thai: 'da_xoa',
      ghi_chu: note,
    })

    return {
      ma_log: maLog,
      so_dong_da_xoa: deletedCount,
      trang_thai: 'da_xoa',
      ghi_chu: note,
    }
  }

  calculateAttendanceReport(
    ngay: string,
    buoi: BuoiHoc,
    treTinhCoMat = true,
  ): Promise<AttendanceReport> {
    return this.fallback.calculateAttendanceReport(ngay, buoi, treTinhCoMat)
  }

  buildAttendanceFormUrl(payload: AttendanceFormPayload): Promise<AttendanceFormUrlResult> {
    return this.fallback.buildAttendanceFormUrl(payload)
  }

  private async shouldUseFallbackRead(): Promise<boolean> {
    if (!hasSupabaseConfig()) return true
    return !(await getSupabaseAccessToken())
  }

  private async prepareImportRow(
    loai: LoaiDuLieuImport,
    row: AnyRow,
    maLog: string,
    generatedRecordId?: string,
  ): Promise<AnyRow> {
    const clean = stripPrivateKeys(row)

    if (loai !== 'ghi_nhan') {
      return pickColumns(clean, TABLE_COLUMNS[loai])
    }

    return this.prepareGhiNhanImportRow(clean, maLog, generatedRecordId)
  }

  private async prepareGhiNhanImportRow(row: AnyRow, maLog: string, generatedRecordId?: string): Promise<AnyRow> {
    const [catalog, students, weekConfig] = await Promise.all([
      this.getPointCatalog(),
      this.getStudents(),
      this.ensureWeekConfigCoversDate(stringOrToday(row.ngay)),
    ])
    const catalogCode = stringOrNull(row.ma_danh_muc)?.toUpperCase() || null
    const catalogItem = catalogCode ? catalog.find((item) => item.ma_danh_muc === catalogCode) || null : null

    if (catalogCode && !catalogItem) {
      throw new Error(`ma_danh_muc khong ton tai trong DanhMucDiem: ${catalogCode}`)
    }

    let maHs = stringOrNull(row.ma_hs)
    let student = maHs ? students.find((item) => item.ma_hs === maHs) || null : null

    if (!maHs && row.ho_ten) {
      const matches = students.filter((item) => normalizeText(`${item.ho} ${item.ten}`) === normalizeText(row.ho_ten))
      if (matches.length === 0) throw new Error(`Khong khop hoc sinh: ${String(row.ho_ten)}`)
      if (matches.length > 1) throw new Error(`Trung ten hoc sinh: ${String(row.ho_ten)}`)
      student = matches[0]
      maHs = student.ma_hs
    }

    if (maHs && !student) {
      throw new Error(`Khong tim thay ma_hs: ${maHs}`)
    }

    const initialLoai = (stringOrNull(row.loai) || 'ne_nep') as LoaiGhiNhan
    let loai: LoaiGhiNhan = catalogItem ? RECORD_TYPE_BY_GROUP[catalogItem.nhom] : initialLoai
    let maDanhMuc = catalogItem?.ma_danh_muc || null
    let diemCongTru = numberOrNull(row.diem_cong_tru)

    if (!catalogItem && loai !== 'hoc_tap') {
      throw new Error('GhiNhan import can ma_danh_muc hop le trong DanhMucDiem, tru dong loai=hoc_tap.')
    }

    if (loai === 'hoc_tap') {
      maDanhMuc = null
      diemCongTru = null
    } else if (catalogItem) {
      diemCongTru = Number(catalogItem.diem)
    }

    let trangThaiTapThe: TrangThaiXuLyTapThe = asCollectiveStatus(row.trang_thai_xu_ly_tap_the)
    if (catalogItem && catalogItem.pham_vi !== 'ca_nhan') {
      maHs = null
      trangThaiTapThe = trangThaiTapThe || 'chua_xu_ly'
    } else if (!maHs) {
      throw new Error('GhiNhan ca nhan can ma_hs hop le.')
    }

    const ngay = stringOrToday(row.ngay)
    const tuanSo = numberOrNull(row.tuan_so) || resolveWeekNumber(weekConfig, ngay)
    if (!tuanSo) {
      throw new Error(`Khong xac dinh duoc tuan_so cho ngay ${ngay}`)
    }

    const prepared: GhiNhan = {
      ma_ghi_nhan: stringOrNull(row.ma_ghi_nhan) || generatedRecordId,
      ma_hs: maHs,
      to_lien_quan: numberOrNull(row.to_lien_quan) ?? student?.to ?? null,
      ngay,
      tuan_so: tuanSo,
      dien_tai_thoi_diem: stringOrNull(row.dien_tai_thoi_diem) || student?.dien || null,
      tiet: stringOrNull(row.tiet),
      mon_hoc: stringOrNull(row.mon_hoc),
      loai,
      ma_danh_muc: maDanhMuc,
      noi_dung: stringOrNull(row.noi_dung) || catalogItem?.ten_muc || null,
      so_lan: numberOrNull(row.so_lan) || 1,
      ly_do: stringOrNull(row.ly_do),
      da_xu_ly: booleanOrFalse(row.da_xu_ly),
      hinh_thuc_xu_ly: stringOrNull(row.hinh_thuc_xu_ly),
      goi_phu_huynh: booleanOrFalse(row.goi_phu_huynh),
      ghi_so_dau_bai: stringOrNull(row.ghi_so_dau_bai),
      diem_so_mon: loai === 'hoc_tap' ? numberOrNull(row.diem_so_mon) : null,
      diem_cong_tru: diemCongTru,
      nguoi_ghi: stringOrNull(row.nguoi_ghi),
      nguon: stringOrNull(row.nguon) || 'phieu_giay',
      ma_log_import: maLog,
      trang_thai_xu_ly_tap_the: trangThaiTapThe,
      su_kien_goc: stringOrNull(row.su_kien_goc),
    }

    return pickColumns(stripUndefined(prepared as unknown as AnyRow), GHI_NHAN_COLUMNS)
  }

  private async ensureWeekConfigCoversDate(isoDate: string): Promise<CauHinhTuan[]> {
    let weeks = await this.readWeekConfigDirect()
    if (weeks.length === 0) return weeks

    weeks = sortWeeks(weeks)
    let latest = weeks[weeks.length - 1]
    const rowsToInsert: CauHinhTuan[] = []

    while (latest.den_ngay < isoDate) {
      const nextStart = addDays(latest.tu_ngay, 7)
      const nextEnd = addDays(nextStart, 4)
      const nextWeek: CauHinhTuan = {
        tuan_so: latest.tuan_so + 1,
        tu_ngay: nextStart,
        den_ngay: nextEnd,
        so_ngay: 5,
        loai_tuan: 'hoc_binh_thuong',
      }
      rowsToInsert.push(nextWeek)
      weeks.push(nextWeek)
      latest = nextWeek
    }

    if (rowsToInsert.length > 0) {
      const { error } = await getSupabaseClient().from('cau_hinh_tuan').insert(rowsToInsert)
      assertNoError(error, 'Khong tu dong bo sung duoc CauHinhTuan tren Supabase')
    }

    return sortWeeks(weeks)
  }

  private async readWeekConfigDirect(): Promise<CauHinhTuan[]> {
    const { data, error } = await getSupabaseClient()
      .from('cau_hinh_tuan')
      .select('*')
      .order('tuan_so')
    assertNoError(error, 'Khong doc duoc CauHinhTuan tu Supabase')
    return (data || []) as CauHinhTuan[]
  }

  private async updateImportLog(maLog: string, patch: Partial<NhatKyImport>): Promise<void> {
    const { error } = await getSupabaseClient().from('nhat_ky_import').update(patch).eq('ma_log', maLog)
    assertNoError(error, 'Khong cap nhat duoc NhatKyImport tren Supabase')
  }

  private async nextPrefixedIds(
    tableName: string,
    keyColumn: string,
    prefix: string,
    width: number,
    count: number,
  ): Promise<string[]> {
    const { data, error } = await getSupabaseClient()
      .from(tableName)
      .select(keyColumn)
      .like(keyColumn, `${prefix}%`)
      .order(keyColumn, { ascending: false })
      .limit(1)
    assertNoError(error, `Khong sinh duoc ma ${prefix}`)

    const firstRow = Array.isArray(data) && data[0] ? (data[0] as unknown as AnyRow) : null
    const lastValue = firstRow ? String(firstRow[keyColumn] || '') : ''
    const start = parsePrefixedNumber(lastValue, prefix) + 1
    return Array.from({ length: count }, (_, index) => `${prefix}${String(start + index).padStart(width, '0')}`)
  }
}

function tableNameForImport(loai: LoaiDuLieuImport): string {
  if (loai === 'hoc_sinh') return 'hoc_sinh'
  if (loai === 'ghi_nhan') return 'ghi_nhan'
  if (loai === 'phu_huynh') return 'phu_huynh'
  return 'ban_can_su'
}

function assertNoError(error: { message?: string } | null, prefix: string): void {
  if (error) throw new Error(`${prefix}: ${error.message || 'loi khong ro'}`)
}

function asRecord(value: unknown): AnyRow {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as AnyRow
  }
  throw new Error('Dong import phai la object.')
}

function stripPrivateKeys(row: AnyRow): AnyRow {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !key.startsWith('_')))
}

function stripUndefined(row: AnyRow): AnyRow {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined))
}

function pickColumns(row: AnyRow, columns: readonly string[]): AnyRow {
  const allowed = new Set(columns)
  return Object.fromEntries(
    Object.entries(row).filter(([key, value]) => allowed.has(key) && !key.startsWith('_') && value !== undefined),
  )
}

function parsePrefixedNumber(value: string, prefix: string): number {
  const match = value.match(new RegExp(`^${prefix}(\\d+)$`))
  return match ? Number(match[1]) || 0 : 0
}

function stringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text ? text : null
}

function stringOrToday(value: unknown): string {
  return stringOrNull(value) || formatIsoDate(new Date())
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function booleanOrFalse(value: unknown): boolean {
  if (value === true) return true
  if (value === false || value === null || value === undefined || value === '') return false
  const text = String(value).trim().toLowerCase()
  return text === 'true' || text === '1' || text === 'yes' || text === 'x'
}

function asCollectiveStatus(value: unknown): TrangThaiXuLyTapThe {
  const text = value === null || value === undefined ? '' : String(value).trim()
  if (
    text === '' ||
    text === 'chua_xu_ly' ||
    text === 'da_gan_ca_nhan' ||
    text === 'da_ap_dung_ca_lop' ||
    text === 'bo_qua'
  ) {
    return text
  }
  return ''
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function sortWeeks(weeks: CauHinhTuan[]): CauHinhTuan[] {
  return [...weeks].sort((left, right) => left.tuan_so - right.tuan_so)
}

function resolveWeekNumber(weeks: CauHinhTuan[], isoDate: string): number | null {
  return weeks.find((week) => week.tu_ngay <= isoDate && week.den_ngay >= isoDate)?.tuan_so || null
}

function formatIsoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

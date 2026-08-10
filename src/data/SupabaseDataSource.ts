import type { DataSource } from './DataSource'
import { getSupabaseClient } from '../lib/supabaseClient'
import type {
  ApproveDeXuatGhiNhanOverrides,
  AttendanceFormPayload,
  AttendanceFormUrlResult,
  AttendanceReport,
  BanCanSu,
  BuoiHoc,
  CapNhatDiemDanhInput,
  CauHinhTuan,
  DanhMucDiem,
  DanhMucXuLy,
  DeleteImportResult,
  DeXuatGhiNhan,
  DiemDanh,
  DiemDanhCanLienLac,
  GhiNhan,
  GuiDeXuatGhiNhanInput,
  HocSinh,
  ImportResult,
  LopTruongData,
  LienLacPhuHuynh,
  LoaiDuLieuImport,
  LoaiGhiNhan,
  NhatKyImport,
  NoiDungTinNhan,
  PhuHuynh,
  PublicStudentProfile,
  SuaDeXuatGhiNhanInput,
  SuaLienLacPhuHuynhInput,
  ThemLienLacPhuHuynhInput,
  TrangThaiImport,
  TrangThaiXuLyTapThe,
  ChiSoDongHanh,
  LuatDongHanh,
  HuyHieuDongHanh,
  CauDinhHuongDongHanh,
  DongHanhDuyet,
  DongHanhDiemDanh,
  TrangThaiDuyetDongHanh,
  LoaiDuyetDongHanh,
  BacTinhTu,
  RankLichSuTuan,
} from './types'

type AnyRow = Record<string, unknown>

interface PublicProfileRpcRow {
  ban_can_su: BanCanSu[] | null
  catalog: DanhMucDiem[] | null
  records: GhiNhan[] | null
  student: HocSinh | null
  week_config: CauHinhTuan[] | null
  attendance: DongHanhDiemDanh[] | null
  huy_hieu: HuyHieuDongHanh[] | null
  duyet: DongHanhDuyet[] | null
  rank_bac: BacTinhTu[] | null
  rank_lich_su: RankLichSuTuan[] | null
  dong_hanh_cau_hinh: Record<string, string> | null
}

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
  tin_nhan_phu_huynh: ['ma_hs', 'noi_dung', 'ghi_chu', 'nguon', 'da_duyet', 'nguon_import', 'created_by'],
}

const RECORD_TYPE_BY_GROUP: Record<DanhMucDiem['nhom'], LoaiGhiNhan> = {
  CC: 'chuyen_can',
  VS: 've_sinh',
  NN: 'ne_nep',
  KL: 'trat_tu_ky_luat',
  KT: 'khen_thuong',
}

export class SupabaseDataSource implements DataSource {
  async getStudents(): Promise<HocSinh[]> {
    const { data, error } = await getSupabaseClient().from('hoc_sinh').select('*').order('tt')
    assertNoError(error, 'Khong doc duoc HocSinh tu Supabase')
    return (data || []) as HocSinh[]
  }

  async getPublicStudentProfile(
    token: string,
    sdt: string,
    matKhau: string,
  ): Promise<PublicStudentProfile | null> {
    const { data, error } = await getSupabaseClient().rpc('lay_ho_so_cong_khai', {
      p_token: token,
      p_sdt: sdt,
      p_mat_khau: matKhau,
    })
    assertNoError(error, 'Khong doc duoc ho so cong khai tu Supabase')
    return mapPublicProfileRpcRow(data)
  }

  async getPublicStudentProfileByPhone(sdt: string, matKhau: string): Promise<PublicStudentProfile | null> {
    const { data, error } = await getSupabaseClient().rpc('lay_ho_so_cong_khai_theo_sdt', {
      p_sdt: sdt,
      p_mat_khau: matKhau,
    })
    assertNoError(error, 'Khong doc duoc ho so cong khai theo SDT tu Supabase')
    return mapPublicProfileRpcRow(data)
  }

  async addStudent(student: HocSinh): Promise<HocSinh> {
    const { data, error } = await getSupabaseClient()
      .from('hoc_sinh')
      .insert(pickColumns(student as unknown as AnyRow, TABLE_COLUMNS.hoc_sinh))
      .select()
      .single()
    assertNoError(error, 'Khong tao duoc HocSinh tren Supabase')
    const created = data as HocSinh

    // Hoc sinh moi phai duoc them vao dung nhom diem danh giong het quy tac
    // seed ban dau (migration 20260723000500), neu khong se bi loai hoan toan
    // khoi bao cao si so (tinh_bao_cao_si_so chi lay theo thanh_vien_nhom_diem_danh,
    // khong tu suy ra tu bang hoc_sinh) va khong the diem danh an/ngu trua.
    const groups = ['CHINH_KHOA']
    if (created.dien === 'BT' || created.dien === 'NT') {
      groups.push('AN_TRUA')
      if (!created.nu) groups.push('NGU_TRUA')
    }
    const { error: groupError } = await getSupabaseClient()
      .from('thanh_vien_nhom_diem_danh')
      .insert(groups.map((maNhom) => ({ ma_nhom: maNhom, ma_hs: created.ma_hs })))
    assertNoError(groupError, 'Khong them duoc hoc sinh vao nhom diem danh tren Supabase')

    return created
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
    if (error?.code === '23503') {
      // foreign_key_violation - hoc sinh da co du lieu tham chieu (GhiNhan...),
      // FK ghi_nhan.ma_hs dat "on delete restrict" nen chan xoa de giu nguyen
      // ven lich su (xem migration 20260808000600). Doi voi hoc sinh chuyen
      // truong, dung "Ngay roi lop" thay vi xoa that.
      throw new Error(
        'Không xoá được: học sinh này đã có dữ liệu Ghi nhận/điểm danh gắn với mình. ' +
          'Nếu học sinh chuyển trường, hãy sửa hồ sơ và điền "Ngày rời lớp" thay vì xoá, để không mất lịch sử.',
      )
    }
    assertNoError(error, 'Khong xoa duoc HocSinh tren Supabase')
  }

  async getRecords(maHs?: string): Promise<GhiNhan[]> {
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

  async syncCatalogPointToRecords(maDanhMuc: string, diem: number): Promise<number> {
    const { data, error } = await getSupabaseClient()
      .from('ghi_nhan')
      .update({ diem_cong_tru: diem })
      .eq('ma_danh_muc', maDanhMuc)
      .select('ma_ghi_nhan')
    assertNoError(error, 'Khong cap nhat diem cho GhiNhan da co cua danh muc nay')
    return (data || []).length
  }

  async getHandlingCatalog(): Promise<DanhMucXuLy[]> {
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
    return this.ensureWeekConfigCoversDate(formatIsoDate(new Date()))
  }

  async getBanCanSu(): Promise<BanCanSu[]> {
    const { data, error } = await getSupabaseClient().from('ban_can_su').select('*').order('to')
    assertNoError(error, 'Khong doc duoc BanCanSu tu Supabase')
    return (data || []) as BanCanSu[]
  }

  async addBanCanSu(item: BanCanSu): Promise<BanCanSu> {
    const { data, error } = await getSupabaseClient()
      .from('ban_can_su')
      .insert(stripUndefined(item as unknown as AnyRow))
      .select()
      .single()
    assertNoError(error, 'Khong tao duoc BanCanSu tren Supabase')
    return data as BanCanSu
  }

  async updateBanCanSu(maHs: string, chucVu: string, patch: Partial<BanCanSu>): Promise<BanCanSu> {
    const { data, error } = await getSupabaseClient()
      .from('ban_can_su')
      .update(stripUndefined(patch as AnyRow))
      .eq('ma_hs', maHs)
      .eq('chuc_vu', chucVu)
      .select()
      .single()
    assertNoError(error, 'Khong cap nhat duoc BanCanSu tren Supabase')
    return data as BanCanSu
  }

  async deleteBanCanSu(maHs: string, chucVu: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('ban_can_su')
      .delete()
      .eq('ma_hs', maHs)
      .eq('chuc_vu', chucVu)
    assertNoError(error, 'Khong xoa duoc BanCanSu tren Supabase')
  }

  async getPhuHuynh(maHs?: string): Promise<PhuHuynh[]> {
    let query = getSupabaseClient().from('phu_huynh').select('*').order('ma_hs')
    if (maHs) query = query.eq('ma_hs', maHs)

    const { data, error } = await query
    assertNoError(error, 'Khong doc duoc PhuHuynh tu Supabase')
    return (data || []) as PhuHuynh[]
  }

  async getImportLogs(): Promise<NhatKyImport[]> {
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

        if (loai === 'hoc_sinh') {
          const groupRows = rows.flatMap((row) => {
            const maHs = row.ma_hs as string
            const groups = ['CHINH_KHOA']
            if (row.dien === 'BT' || row.dien === 'NT') {
              groups.push('AN_TRUA')
              if (!row.nu) groups.push('NGU_TRUA')
            }
            return groups.map((maNhom) => ({ ma_nhom: maNhom, ma_hs: maHs }))
          })
          const { error: groupError } = await getSupabaseClient()
            .from('thanh_vien_nhom_diem_danh')
            .insert(groupRows)
          assertNoError(groupError, 'Khong them duoc hoc sinh vao nhom diem danh tren Supabase')
        }
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

    const loaiDuLieu = (log as NhatKyImport).loai_du_lieu

    if (loaiDuLieu !== 'ghi_nhan' && loaiDuLieu !== 'tin_nhan_phu_huynh') {
      throw new Error(`Chi ho tro xoa du lieu import GhiNhan hoac Tin nhan phu huynh: ${maLog}`)
    }

    const isTinNhan = loaiDuLieu === 'tin_nhan_phu_huynh'
    const { data, error } = await getSupabaseClient()
      .from(isTinNhan ? 'noi_dung_tin_nhan' : 'ghi_nhan')
      .delete()
      .eq(isTinNhan ? 'nguon_import' : 'ma_log_import', maLog)
      .select(isTinNhan ? 'id' : 'ma_ghi_nhan')
    assertNoError(error, `Khong xoa duoc ${isTinNhan ? 'noi dung tin nhan' : 'GhiNhan'} cua lan import tren Supabase`)

    const deletedCount = data?.length || 0
    const note = `Da xoa ${deletedCount} dong ${isTinNhan ? 'noi dung tin nhan' : 'GhiNhan'} lien quan.`
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

  async calculateAttendanceReport(
    ngay: string,
    buoi: BuoiHoc,
    treTinhCoMat = true,
  ): Promise<AttendanceReport> {
    const { data, error } = await getSupabaseClient().rpc('tinh_bao_cao_si_so', {
      p_buoi: buoi === 'SANG' ? 'sang' : 'chieu',
      p_ngay: ngay,
      p_tre_tinh_co_mat: treTinhCoMat,
    })
    assertNoError(error, 'Khong tinh duoc bao cao si so tu Supabase')
    return data as AttendanceReport
  }

  async buildAttendanceFormUrl(payload: AttendanceFormPayload): Promise<AttendanceFormUrlResult> {
    const { data, error } = await getSupabaseClient().rpc('tao_link_form_diem_danh', {
      p_payload: payload,
    })
    assertNoError(error, 'Khong tao duoc link Google Form tu Supabase')
    return { url: data as string }
  }

  async getAttendanceEntries(options: {
    tuanSo?: number
    ngayFrom?: string
    ngayTo?: string
  } = {}): Promise<DiemDanh[]> {
    let query = getSupabaseClient()
      .from('diem_danh')
      .select('*')
      .eq('ma_nhom', 'CHINH_KHOA')
      .order('ngay')
      .order('buoi')

    if (options.tuanSo !== undefined) query = query.eq('tuan_so', options.tuanSo)
    if (options.ngayFrom) query = query.gte('ngay', options.ngayFrom)
    if (options.ngayTo) query = query.lte('ngay', options.ngayTo)

    const { data, error } = await query
    assertNoError(error, 'Khong doc duoc DiemDanh tu Supabase')
    return (data || []) as DiemDanh[]
  }

  async getPendingParentContacts(): Promise<DiemDanhCanLienLac[]> {
    const [{ data: attendanceRows, error: attendanceError }, { data: contactRows, error: contactError }, students] =
      await Promise.all([
        getSupabaseClient()
          .from('diem_danh')
          .select('*')
          .eq('ma_nhom', 'CHINH_KHOA')
          .in('trang_thai', ['vang_co_phep', 'vang_khong_phep'])
          .order('ngay', { ascending: false })
          .order('buoi'),
        getSupabaseClient().from('lien_lac_phu_huynh').select('diem_danh_id'),
        this.getStudents(),
      ])

    assertNoError(attendanceError, 'Khong doc duoc danh sach can lien lac tu Supabase')
    assertNoError(contactError, 'Khong doc duoc lien lac phu huynh tu Supabase')

    const contactedIds = new Set((contactRows || []).map((row) => String(row.diem_danh_id)))
    const studentById = new Map(students.map((student) => [student.ma_hs, student]))

    return ((attendanceRows || []) as DiemDanh[])
      .filter((row) => row.ma_hs && !contactedIds.has(row.id))
      .map((row) => {
        const student = studentById.get(row.ma_hs || '')
        return {
          ...row,
          da_lien_lac: false,
          dien: student?.dien || '2B',
          ho: student?.ho || '',
          sdt_1: student?.sdt_1 || null,
          sdt_2: student?.sdt_2 || null,
          ten: student?.ten || row.ma_hs || '',
          tt: student?.tt || 0,
        }
      })
  }

  async upsertAttendanceEntry(input: CapNhatDiemDanhInput): Promise<string | null> {
    const { data, error } = await getSupabaseClient().rpc('upsert_diem_danh', {
      p_buoi: input.buoi,
      p_ma_hs: input.ma_hs,
      p_ngay: input.ngay,
      p_trang_thai: input.trang_thai,
      p_tuan_so: input.tuan_so,
    })
    assertNoError(error, 'Khong cap nhat duoc diem danh tren Supabase')
    return (data as string | null) || null
  }

  async addParentContact(input: ThemLienLacPhuHuynhInput): Promise<void> {
    const {
      data: { session },
      error: sessionError,
    } = await getSupabaseClient().auth.getSession()
    assertNoError(sessionError, 'Khong doc duoc phien dang nhap Supabase')

    const { error } = await getSupabaseClient().from('lien_lac_phu_huynh').insert({
      diem_danh_id: input.diem_danh_id,
      hinh_thuc: input.hinh_thuc,
      noi_dung: input.noi_dung?.trim() || null,
      nguoi_lien_lac: session?.user.email || null,
      ma_hs: input.ma_hs,
      ho_ten: input.ho_ten,
      ngay: input.ngay,
      buoi: input.buoi,
    })
    assertNoError(error, 'Khong ghi duoc lien lac phu huynh tren Supabase')
  }

  async getMessageContents(maHs?: string): Promise<NoiDungTinNhan[]> {
    let query = getSupabaseClient()
      .from('noi_dung_tin_nhan')
      .select('*')
      .order('created_at', { ascending: false })
    if (maHs) query = query.eq('ma_hs', maHs)

    const { data, error } = await query
    assertNoError(error, 'Khong doc duoc noi dung tin nhan tu Supabase')
    return (data || []) as NoiDungTinNhan[]
  }

  async updateMessageContent(id: string, noiDung: string): Promise<NoiDungTinNhan> {
    const { data, error } = await getSupabaseClient()
      .from('noi_dung_tin_nhan')
      .update({ noi_dung: noiDung.trim() })
      .eq('id', id)
      .select()
      .single()
    assertNoError(error, 'Khong sua duoc noi dung tin nhan tren Supabase')
    return data as NoiDungTinNhan
  }

  async deleteMessageContent(id: string): Promise<void> {
    const { error } = await getSupabaseClient().from('noi_dung_tin_nhan').delete().eq('id', id)
    assertNoError(error, 'Khong xoa duoc noi dung tin nhan tren Supabase')
  }

  async getParentContactHistory(options: { maHs?: string } = {}): Promise<LienLacPhuHuynh[]> {
    let query = getSupabaseClient()
      .from('lien_lac_phu_huynh')
      .select('*')
      .order('thoi_gian', { ascending: false })
    if (options.maHs) query = query.eq('ma_hs', options.maHs)

    const { data, error } = await query
    assertNoError(error, 'Khong doc duoc lich su lien lac phu huynh tu Supabase')
    return (data || []) as LienLacPhuHuynh[]
  }

  async updateParentContact(id: string, patch: SuaLienLacPhuHuynhInput): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('lien_lac_phu_huynh')
      .update({
        hinh_thuc: patch.hinh_thuc,
        noi_dung: patch.noi_dung?.trim() || null,
      })
      .eq('id', id)
    assertNoError(error, 'Khong sua duoc lien lac phu huynh tren Supabase')
  }

  async deleteParentContact(id: string): Promise<void> {
    const { error } = await getSupabaseClient().from('lien_lac_phu_huynh').delete().eq('id', id)
    assertNoError(error, 'Khong xoa duoc lien lac phu huynh tren Supabase')
  }

  async verifyLopTruongPin(token: string, pin: string): Promise<boolean> {
    const { data, error } = await getSupabaseClient().rpc('xac_thuc_pin_lop_truong', {
      p_token: token,
      p_pin: pin,
    })
    assertNoError(error, 'Khong xac thuc duoc ma PIN lop truong')
    return Boolean(data)
  }

  async getLopTruongData(token: string, pin: string): Promise<LopTruongData | null> {
    const { data, error } = await getSupabaseClient().rpc('lay_du_lieu_lop_truong', {
      p_token: token,
      p_pin: pin,
    })
    assertNoError(error, 'Khong lay duoc du lieu lop truong tu Supabase')
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null
    if (!row) return null
    return {
      students: (row.students || []) as LopTruongData['students'],
      catalog: (row.catalog || []) as DanhMucDiem[],
    }
  }

  async submitDeXuatGhiNhan(input: GuiDeXuatGhiNhanInput): Promise<string> {
    const { data, error } = await getSupabaseClient().rpc('gui_de_xuat_ghi_nhan', {
      p_token: input.token,
      p_pin: input.pin,
      p_ma_hs: input.ma_hs,
      p_ma_danh_muc: input.ma_danh_muc,
      p_noi_dung: input.noi_dung,
      p_de_xuat_nhom: input.de_xuat_nhom || null,
      p_ngay: input.ngay,
      p_tiet: input.tiet || null,
      p_mon_hoc: input.mon_hoc || null,
    })
    assertNoError(error, 'Khong gui duoc de xuat ghi nhan')
    return data as string
  }

  async getLichSuDeXuatLopTruong(token: string, pin: string): Promise<DeXuatGhiNhan[]> {
    const { data, error } = await getSupabaseClient().rpc('lay_lich_su_de_xuat_lop_truong', {
      p_token: token,
      p_pin: pin,
    })
    assertNoError(error, 'Khong lay duoc lich su de xuat')
    return (data || []) as DeXuatGhiNhan[]
  }

  async updateDeXuatGhiNhanByLopTruong(input: SuaDeXuatGhiNhanInput): Promise<void> {
    const { error } = await getSupabaseClient().rpc('sua_de_xuat_ghi_nhan', {
      p_token: input.token,
      p_pin: input.pin,
      p_id: input.id,
      p_ma_hs: input.ma_hs,
      p_ma_danh_muc: input.ma_danh_muc,
      p_noi_dung: input.noi_dung,
      p_de_xuat_nhom: input.de_xuat_nhom || null,
      p_ngay: input.ngay,
      p_tiet: input.tiet || null,
      p_mon_hoc: input.mon_hoc || null,
    })
    assertNoError(error, 'Khong sua duoc de xuat')
  }

  async deleteDeXuatGhiNhanByLopTruong(token: string, pin: string, id: string): Promise<void> {
    const { error } = await getSupabaseClient().rpc('xoa_de_xuat_ghi_nhan', {
      p_token: token,
      p_pin: pin,
      p_id: id,
    })
    assertNoError(error, 'Khong xoa duoc de xuat')
  }

  async updateDeXuatGhiNhanByTeacher(
    id: string,
    patch: Partial<
      Pick<DeXuatGhiNhan, 'ma_danh_muc' | 'noi_dung' | 'de_xuat_nhom' | 'ngay' | 'tiet' | 'mon_hoc'>
    >
  ): Promise<void> {
    const { error } = await getSupabaseClient().from('de_xuat_ghi_nhan').update(patch).eq('id', id)
    assertNoError(error, 'Khong cap nhat duoc de xuat')
  }

  async deleteDeXuatGhiNhanByTeacher(id: string): Promise<void> {
    const { error } = await getSupabaseClient().from('de_xuat_ghi_nhan').delete().eq('id', id)
    assertNoError(error, 'Khong xoa duoc de xuat')
  }

  async getDeXuatGhiNhan(options: { maHs?: string } = {}): Promise<DeXuatGhiNhan[]> {
    let query = getSupabaseClient().from('de_xuat_ghi_nhan').select('*').order('thoi_gian', { ascending: false })
    if (options.maHs) query = query.eq('ma_hs', options.maHs)
    const { data, error } = await query
    assertNoError(error, 'Khong doc duoc de xuat ghi nhan tu Supabase')
    return (data || []) as DeXuatGhiNhan[]
  }

  async approveDeXuatGhiNhan(id: string, overrides: ApproveDeXuatGhiNhanOverrides = {}): Promise<void> {
    const { data: proposalRow, error: proposalError } = await getSupabaseClient()
      .from('de_xuat_ghi_nhan')
      .select('*')
      .eq('id', id)
      .single()
    assertNoError(proposalError, 'Khong tim thay de xuat ghi nhan')
    const proposal = proposalRow as DeXuatGhiNhan
    if (proposal.trang_thai !== 'cho_duyet') {
      throw new Error('De xuat nay da duoc xu ly.')
    }

    const maDanhMuc = overrides.maDanhMuc || proposal.ma_danh_muc
    if (!maDanhMuc) {
      throw new Error('De xuat nay chua co danh muc — hay chon danh muc co san hoac tao moi truoc khi duyet.')
    }

    const [catalog, students, banCanSu] = await Promise.all([
      this.getPointCatalog(),
      this.getStudents(),
      this.getBanCanSu(),
    ])
    const catalogItem = catalog.find((item) => item.ma_danh_muc === maDanhMuc)
    if (!catalogItem) throw new Error('Danh muc duoc chon khong con ton tai.')
    const student = students.find((item) => item.ma_hs === proposal.ma_hs)
    if (!student) throw new Error('Hoc sinh trong de xuat khong con ton tai.')
    const chucVuNguoiDeXuat =
      banCanSu.find((item) => item.ma_hs === proposal.ma_hs_de_xuat)?.chuc_vu || 'Lớp trưởng'

    const ngay = proposal.ngay || formatIsoDate(new Date())
    const weekConfig = await this.ensureWeekConfigCoversDate(ngay)
    const tuanSo = resolveWeekNumber(weekConfig, ngay)
    if (!tuanSo) throw new Error(`Khong xac dinh duoc tuan_so cho ngay ${ngay}.`)

    const noiDung = (overrides.noiDung ?? proposal.noi_dung ?? '').trim() || catalogItem.ten_muc

    const created = await this.addRecords([
      {
        ma_hs: proposal.ma_hs,
        to_lien_quan: student.to,
        ngay,
        tuan_so: tuanSo,
        dien_tai_thoi_diem: student.dien,
        tiet: proposal.tiet || null,
        mon_hoc: proposal.mon_hoc || null,
        loai: RECORD_TYPE_BY_GROUP[catalogItem.nhom],
        ma_danh_muc: catalogItem.ma_danh_muc,
        noi_dung: noiDung,
        so_lan: 1,
        ly_do: null,
        da_xu_ly: false,
        hinh_thuc_xu_ly: null,
        goi_phu_huynh: false,
        ghi_so_dau_bai: null,
        diem_so_mon: null,
        diem_cong_tru: Number(catalogItem.diem),
        nguoi_ghi: `${chucVuNguoiDeXuat} ${proposal.nguoi_de_xuat} (đã duyệt)`,
        nguon: 'de_xuat_lop_truong',
        ma_log_import: null,
        trang_thai_xu_ly_tap_the: '',
        su_kien_goc: null,
      },
    ])

    const { error: updateError } = await getSupabaseClient()
      .from('de_xuat_ghi_nhan')
      .update({
        trang_thai: 'da_duyet',
        ma_ghi_nhan: created[0]?.ma_ghi_nhan || null,
        ma_danh_muc: catalogItem.ma_danh_muc,
        noi_dung: noiDung,
      })
      .eq('id', id)
    assertNoError(updateError, 'Khong cap nhat duoc trang thai de xuat')
  }

  async rejectDeXuatGhiNhan(id: string, ghiChu?: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('de_xuat_ghi_nhan')
      .update({ trang_thai: 'tu_choi', ghi_chu_giao_vien: ghiChu?.trim() || null })
      .eq('id', id)
    assertNoError(error, 'Khong tu choi duoc de xuat')
  }

  private async prepareImportRow(
    loai: LoaiDuLieuImport,
    row: AnyRow,
    maLog: string,
    generatedRecordId?: string,
  ): Promise<AnyRow> {
    const clean = stripPrivateKeys(row)

    if (loai === 'ghi_nhan') {
      return this.prepareGhiNhanImportRow(clean, maLog, generatedRecordId)
    }

    if (loai === 'tin_nhan_phu_huynh') {
      return this.prepareTinNhanImportRow(clean, maLog)
    }

    return pickColumns(clean, TABLE_COLUMNS[loai])
  }

  private async prepareTinNhanImportRow(row: AnyRow, maLog: string): Promise<AnyRow> {
    const students = await this.getStudents()

    const maHs = stringOrNull(row.ma_hs)
    if (!maHs) throw new Error('tin_nhan_phu_huynh can ma_hs.')
    if (!students.some((student) => student.ma_hs === maHs)) {
      throw new Error(`Khong tim thay ma_hs trong danh sach hoc sinh: ${maHs}`)
    }

    const noiDung = stringOrNull(row.noi_dung)
    if (!noiDung) throw new Error('noi_dung khong duoc de trong.')

    const {
      data: { user },
    } = await getSupabaseClient().auth.getUser()

    return pickColumns(
      stripUndefined({
        ma_hs: maHs,
        noi_dung: noiDung,
        ghi_chu: stringOrNull(row.ghi_chu),
        nguon: 'nhap_tay',
        da_duyet: true,
        nguon_import: maLog,
        created_by: user?.id || null,
      }),
      TABLE_COLUMNS.tin_nhan_phu_huynh,
    )
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

  async getDongHanhChiSo(): Promise<ChiSoDongHanh[]> {
    const { data, error } = await getSupabaseClient()
      .from('dong_hanh_chi_so')
      .select('*')
      .order('thu_tu')
    assertNoError(error, 'Khong doc duoc ChiSoDongHanh tu Supabase')
    return (data || []) as ChiSoDongHanh[]
  }

  async getDongHanhLuat(): Promise<LuatDongHanh[]> {
    const { data, error } = await getSupabaseClient()
      .from('dong_hanh_luat')
      .select('*')
      .order('thu_tu')
    assertNoError(error, 'Khong doc duoc LuatDongHanh tu Supabase')
    return (data || []) as LuatDongHanh[]
  }

  async addDongHanhLuat(item: LuatDongHanh): Promise<LuatDongHanh> {
    const { data, error } = await getSupabaseClient()
      .from('dong_hanh_luat')
      .insert(stripUndefined(item as unknown as AnyRow))
      .select()
      .single()
    assertNoError(error, 'Khong tao duoc LuatDongHanh tren Supabase')
    return data as LuatDongHanh
  }

  async updateDongHanhLuat(maLuat: string, patch: Partial<LuatDongHanh>): Promise<LuatDongHanh> {
    const { data, error } = await getSupabaseClient()
      .from('dong_hanh_luat')
      .update(stripUndefined(patch as AnyRow))
      .eq('ma_luat', maLuat)
      .select()
      .single()
    assertNoError(error, 'Khong cap nhat duoc LuatDongHanh tren Supabase')
    return data as LuatDongHanh
  }

  async deleteDongHanhLuat(maLuat: string): Promise<void> {
    const { error } = await getSupabaseClient().from('dong_hanh_luat').delete().eq('ma_luat', maLuat)
    assertNoError(error, 'Khong xoa duoc LuatDongHanh tren Supabase')
  }

  async getDongHanhHuyHieu(): Promise<HuyHieuDongHanh[]> {
    const { data, error } = await getSupabaseClient()
      .from('dong_hanh_huy_hieu')
      .select('*')
      .order('thu_tu')
    assertNoError(error, 'Khong doc duoc HuyHieuDongHanh tu Supabase')
    return (data || []) as HuyHieuDongHanh[]
  }

  async addDongHanhHuyHieu(item: HuyHieuDongHanh): Promise<HuyHieuDongHanh> {
    const { data, error } = await getSupabaseClient()
      .from('dong_hanh_huy_hieu')
      .insert(stripUndefined(item as unknown as AnyRow))
      .select()
      .single()
    assertNoError(error, 'Khong tao duoc HuyHieuDongHanh tren Supabase')
    return data as HuyHieuDongHanh
  }

  async updateDongHanhHuyHieu(
    maHuyHieu: string,
    patch: Partial<HuyHieuDongHanh>,
  ): Promise<HuyHieuDongHanh> {
    const { data, error } = await getSupabaseClient()
      .from('dong_hanh_huy_hieu')
      .update(stripUndefined(patch as AnyRow))
      .eq('ma_huy_hieu', maHuyHieu)
      .select()
      .single()
    assertNoError(error, 'Khong cap nhat duoc HuyHieuDongHanh tren Supabase')
    return data as HuyHieuDongHanh
  }

  async deleteDongHanhHuyHieu(maHuyHieu: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('dong_hanh_huy_hieu')
      .delete()
      .eq('ma_huy_hieu', maHuyHieu)
    assertNoError(error, 'Khong xoa duoc HuyHieuDongHanh tren Supabase')
  }

  async getDongHanhCauDinhHuong(): Promise<CauDinhHuongDongHanh[]> {
    const { data, error } = await getSupabaseClient()
      .from('dong_hanh_cau_dinh_huong')
      .select('*')
      .order('thu_tu')
    assertNoError(error, 'Khong doc duoc CauDinhHuongDongHanh tu Supabase')
    return (data || []) as CauDinhHuongDongHanh[]
  }

  async addDongHanhCauDinhHuong(item: CauDinhHuongDongHanh): Promise<CauDinhHuongDongHanh> {
    const { data, error } = await getSupabaseClient()
      .from('dong_hanh_cau_dinh_huong')
      .insert(stripUndefined(item as unknown as AnyRow))
      .select()
      .single()
    assertNoError(error, 'Khong tao duoc CauDinhHuongDongHanh tren Supabase')
    return data as CauDinhHuongDongHanh
  }

  async updateDongHanhCauDinhHuong(
    maCau: string,
    patch: Partial<CauDinhHuongDongHanh>,
  ): Promise<CauDinhHuongDongHanh> {
    const { data, error } = await getSupabaseClient()
      .from('dong_hanh_cau_dinh_huong')
      .update(stripUndefined(patch as AnyRow))
      .eq('ma_cau', maCau)
      .select()
      .single()
    assertNoError(error, 'Khong cap nhat duoc CauDinhHuongDongHanh tren Supabase')
    return data as CauDinhHuongDongHanh
  }

  async deleteDongHanhCauDinhHuong(maCau: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('dong_hanh_cau_dinh_huong')
      .delete()
      .eq('ma_cau', maCau)
    assertNoError(error, 'Khong xoa duoc CauDinhHuongDongHanh tren Supabase')
  }

  async getDongHanhDuyet(maHs?: string): Promise<DongHanhDuyet[]> {
    let query = getSupabaseClient().from('dong_hanh_duyet').select('*').order('thoi_diem', { ascending: false })
    if (maHs) query = query.eq('ma_hs', maHs)

    const { data, error } = await query
    assertNoError(error, 'Khong doc duoc DongHanhDuyet tu Supabase')
    return (data || []) as DongHanhDuyet[]
  }

  async duyetDongHanh(input: {
    ma_hs: string
    tuan_so: number
    loai: LoaiDuyetDongHanh
    ma_luat: string | null
    noi_dung_da_duyet: string
    trang_thai: TrangThaiDuyetDongHanh
  }): Promise<DongHanhDuyet> {
    const {
      data: { session },
    } = await getSupabaseClient().auth.getSession()

    const { data, error } = await getSupabaseClient()
      .from('dong_hanh_duyet')
      .upsert(
        {
          ma_hs: input.ma_hs,
          tuan_so: input.tuan_so,
          loai: input.loai,
          ma_luat: input.ma_luat,
          noi_dung_da_duyet: input.noi_dung_da_duyet,
          trang_thai: input.trang_thai,
          nguoi_duyet: session?.user.email || null,
          thoi_diem: new Date().toISOString(),
        },
        { onConflict: 'ma_hs,tuan_so,loai,ma_luat' },
      )
      .select()
      .single()
    assertNoError(error, 'Khong luu duoc trang thai duyet Dong hanh tren Supabase')
    return data as DongHanhDuyet
  }

  async getRankBacTinhTu(): Promise<BacTinhTu[]> {
    const { data, error } = await getSupabaseClient().from('rank_bac_tinh_tu').select('*').order('bac')
    assertNoError(error, 'Khong doc duoc RankBacTinhTu tu Supabase')
    return (data || []) as BacTinhTu[]
  }

  async addRankBacTinhTu(item: BacTinhTu): Promise<BacTinhTu> {
    const { data, error } = await getSupabaseClient()
      .from('rank_bac_tinh_tu')
      .insert(stripUndefined(item as unknown as AnyRow))
      .select()
      .single()
    assertNoError(error, 'Khong tao duoc RankBacTinhTu tren Supabase')
    return data as BacTinhTu
  }

  async updateRankBacTinhTu(bac: number, patch: Partial<BacTinhTu>): Promise<BacTinhTu> {
    const { data, error } = await getSupabaseClient()
      .from('rank_bac_tinh_tu')
      .update(stripUndefined(patch as AnyRow))
      .eq('bac', bac)
      .select()
      .single()
    assertNoError(error, 'Khong cap nhat duoc RankBacTinhTu tren Supabase')
    return data as BacTinhTu
  }

  async deleteRankBacTinhTu(bac: number): Promise<void> {
    const { error } = await getSupabaseClient().from('rank_bac_tinh_tu').delete().eq('bac', bac)
    assertNoError(error, 'Khong xoa duoc RankBacTinhTu tren Supabase')
  }

  async getDongHanhCauHinh(): Promise<Record<string, string>> {
    const { data, error } = await getSupabaseClient().from('dong_hanh_cau_hinh').select('khoa, gia_tri')
    assertNoError(error, 'Khong doc duoc cau hinh Dong hanh tu Supabase')
    const result: Record<string, string> = {}
    for (const row of (data || []) as Array<{ khoa: string; gia_tri: string }>) {
      result[row.khoa] = row.gia_tri
    }
    return result
  }

  async updateDongHanhCauHinh(khoa: string, giaTri: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('dong_hanh_cau_hinh')
      .upsert({ khoa, gia_tri: giaTri }, { onConflict: 'khoa' })
    assertNoError(error, 'Khong luu duoc cau hinh Dong hanh tren Supabase')
  }

  async getRankLichSuTuan(maHs?: string): Promise<RankLichSuTuan[]> {
    let query = getSupabaseClient().from('rank_lich_su_tuan').select('*').order('tuan_so', { ascending: false })
    if (maHs) query = query.eq('ma_hs', maHs)

    const { data, error } = await query
    assertNoError(error, 'Khong doc duoc RankLichSuTuan tu Supabase')
    return (data || []) as RankLichSuTuan[]
  }

  async upsertRankLichSuTuan(input: RankLichSuTuan): Promise<RankLichSuTuan> {
    const { data, error } = await getSupabaseClient()
      .from('rank_lich_su_tuan')
      .upsert(
        {
          ma_hs: input.ma_hs,
          tuan_so: input.tuan_so,
          diem_ren_luyen: input.diem_ren_luyen,
          so_huy_hieu: input.so_huy_hieu,
          diem_thuong: input.diem_thuong,
          diem_tuan: input.diem_tuan,
          bac_dat: input.bac_dat,
          thoi_diem_chot: new Date().toISOString(),
        },
        { onConflict: 'ma_hs,tuan_so' },
      )
      .select()
      .single()
    assertNoError(error, 'Khong luu duoc RankLichSuTuan tren Supabase')
    return data as RankLichSuTuan
  }

  async chotRankTuanCongKhai(input: {
    token: string
    sdt: string
    matKhau: string
    tuanSo: number
    diemRenLuyen: number
    soHuyHieu: number
    diemThuong: number
    diemTuan: number
    bacDat: number
  }): Promise<void> {
    const { error } = await getSupabaseClient().rpc('chot_rank_tuan_cong_khai', {
      p_token: input.token,
      p_sdt: input.sdt,
      p_mat_khau: input.matKhau,
      p_tuan_so: input.tuanSo,
      p_diem_ren_luyen: input.diemRenLuyen,
      p_so_huy_hieu: input.soHuyHieu,
      p_diem_thuong: input.diemThuong,
      p_diem_tuan: input.diemTuan,
      p_bac_dat: input.bacDat,
    })
    assertNoError(error, 'Khong chot duoc rank tuan tren Supabase')
  }
}

function tableNameForImport(loai: LoaiDuLieuImport): string {
  if (loai === 'hoc_sinh') return 'hoc_sinh'
  if (loai === 'ghi_nhan') return 'ghi_nhan'
  if (loai === 'phu_huynh') return 'phu_huynh'
  if (loai === 'tin_nhan_phu_huynh') return 'noi_dung_tin_nhan'
  return 'ban_can_su'
}

function assertNoError(error: { message?: string } | null, prefix: string): void {
  if (error) throw new Error(`${prefix}: ${error.message || 'loi khong ro'}`)
}

function mapPublicProfileRpcRow(data: unknown): PublicStudentProfile | null {
  const row = Array.isArray(data) && data.length > 0 ? (data[0] as PublicProfileRpcRow) : null
  if (!row?.student) {
    return null
  }

  return {
    banCanSu: row.ban_can_su || [],
    catalog: row.catalog || [],
    records: row.records || [],
    student: row.student,
    weekConfig: row.week_config || [],
    attendance: row.attendance || [],
    huyHieu: row.huy_hieu || [],
    duyet: row.duyet || [],
    rankBac: row.rank_bac || [],
    rankLichSu: row.rank_lich_su || [],
    dongHanhCauHinh: row.dong_hanh_cau_hinh || {},
  }
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

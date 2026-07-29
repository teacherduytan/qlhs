import type {
  DanhMucDiem,
  DiemDanh,
  GhiNhan,
  HocSinh,
  LienLacPhuHuynh,
  TrangThaiDiemDanh,
} from '../../data/types'
import { getRecordTypeLabel, isPositiveRecord, isViolationRecord } from '../dashboard/DashboardPage'

export interface ReportAttendanceRow {
  maHs: string
  hoTen: string
  tt: number
  ngay: string
  trangThai: TrangThaiDiemDanh
  chiTietBuoi: string | null
  daLienLac: boolean
}

export interface ReportAttendanceData {
  soHocSinhNghi: number
  soLuotVangCoPhep: number
  soLuotVangKhongPhep: number
  soLuotDiTre: number
  rows: ReportAttendanceRow[]
}

export interface ReportPersonName {
  hoTen: string
  soLan: number
}

export interface ReportViolationGroupRow {
  loai: string
  nhanLoai: string
  soLuot: number
  soHocSinh: number
}

export interface ReportViolationDetailRow {
  loai: string
  nhanLoai: string
  maDanhMuc: string | null
  tenViPham: string
  soLuot: number
  hocSinh: ReportPersonName[]
}

export interface ReportViolationData {
  soHocSinhViPham: number
  tongSoLuot: number
  soViPhamNghiemTrong: number
  suKienTapThe: { tongSo: number; daXuLy: number }
  theoNhom: ReportViolationGroupRow[]
  chiTiet: ReportViolationDetailRow[]
}

export interface ReportPositiveRow {
  maDanhMuc: string | null
  noiDung: string
  soLuot: number
  hocSinh: ReportPersonName[]
}

export interface ReportPositiveData {
  soHocSinh: number
  tongSoLuot: number
  rows: ReportPositiveRow[]
}

export interface ReportData {
  tuNgay: string
  denNgay: string
  attendance: ReportAttendanceData
  violation: ReportViolationData
  positive: ReportPositiveData
}

export interface BuildReportDataInput {
  tuNgay: string
  denNgay: string
  students: HocSinh[]
  attendanceEntries: DiemDanh[]
  records: GhiNhan[]
  catalog: DanhMucDiem[]
  contactHistory: LienLacPhuHuynh[]
}

// Thu tu nang -> nhe theo dung yeu cau dac ta muc 3 Phan 1: gop 2 buoi/ngay
// thanh 1 trang thai, uu tien trang thai nang nhat.
const STATUS_PRIORITY: Record<TrangThaiDiemDanh, number> = {
  vang_khong_phep: 3,
  vang_co_phep: 2,
  tre: 1,
}

const STATUS_LABELS: Record<TrangThaiDiemDanh, string> = {
  vang_khong_phep: 'Vắng không phép',
  vang_co_phep: 'Vắng có phép',
  tre: 'Trễ',
}

// Thu tu nhom lon co dinh de bao cao luon hien thi nhat quan giua cac lan
// xem/xuat file, khong phu thuoc thu tu du lieu tra ve tu Supabase.
const LOAI_ORDER = ['chuyen_can', 've_sinh', 'ne_nep', 'trat_tu_ky_luat', 'hoc_tap', 'khen_thuong']

export function buildReportData(input: BuildReportDataInput): ReportData {
  const { tuNgay, denNgay, students, attendanceEntries, records, catalog, contactHistory } = input
  const studentByMaHs = new Map(students.map((student) => [student.ma_hs, student]))
  const catalogByCode = new Map(catalog.map((item) => [item.ma_danh_muc, item]))

  const inRange = (ngay: string) => ngay >= tuNgay && ngay <= denNgay
  const recordsInRange = records.filter((record) => inRange(record.ngay))

  return {
    tuNgay,
    denNgay,
    attendance: buildAttendanceData(
      attendanceEntries.filter((entry) => inRange(entry.ngay)),
      studentByMaHs,
      contactHistory,
    ),
    violation: buildViolationData(recordsInRange, catalogByCode, studentByMaHs),
    positive: buildPositiveData(recordsInRange, catalogByCode, studentByMaHs),
  }
}

function normalizeStatus(status: string): TrangThaiDiemDanh {
  if (status.startsWith('vang_khong_phep')) return 'vang_khong_phep'
  if (status.startsWith('vang_co_phep')) return 'vang_co_phep'
  return 'tre'
}

function priorityOf(status: string): number {
  return STATUS_PRIORITY[normalizeStatus(status)] ?? 0
}

function buildAttendanceData(
  entries: DiemDanh[],
  studentByMaHs: Map<string, HocSinh>,
  contactHistory: LienLacPhuHuynh[],
): ReportAttendanceData {
  const groups = new Map<string, DiemDanh[]>()
  for (const entry of entries) {
    if (!entry.ma_hs) continue
    const key = `${entry.ma_hs}|${entry.ngay}`
    const list = groups.get(key) || []
    list.push(entry)
    groups.set(key, list)
  }

  const rows: ReportAttendanceRow[] = []
  const absentStudents = new Set<string>()
  let soLuotVangCoPhep = 0
  let soLuotVangKhongPhep = 0
  let soLuotDiTre = 0

  for (const [key, dayEntries] of groups) {
    const [maHs, ngay] = key.split('|')
    const student = studentByMaHs.get(maHs)

    let winner = dayEntries[0]
    for (const entry of dayEntries) {
      if (priorityOf(entry.trang_thai) > priorityOf(winner.trang_thai)) winner = entry
    }
    const trangThai = normalizeStatus(winner.trang_thai)

    if (trangThai === 'vang_co_phep') soLuotVangCoPhep += 1
    else if (trangThai === 'vang_khong_phep') soLuotVangKhongPhep += 1
    else soLuotDiTre += 1

    if (trangThai === 'vang_co_phep' || trangThai === 'vang_khong_phep') {
      absentStudents.add(maHs)
    }

    let chiTietBuoi: string | null = null
    const uniqueStatuses = new Set(dayEntries.map((entry) => normalizeStatus(entry.trang_thai)))
    if (dayEntries.length > 1 && uniqueStatuses.size > 1) {
      const sang = dayEntries.find((entry) => entry.buoi === 'sang')
      const chieu = dayEntries.find((entry) => entry.buoi === 'chieu')
      chiTietBuoi = `Sáng: ${sang ? STATUS_LABELS[normalizeStatus(sang.trang_thai)] : 'Có mặt'} / Chiều: ${
        chieu ? STATUS_LABELS[normalizeStatus(chieu.trang_thai)] : 'Có mặt'
      }`
    }

    const daLienLac = dayEntries.some((entry) =>
      contactHistory.some(
        (contact) =>
          contact.diem_danh_id === entry.id ||
          (contact.diem_danh_id === null &&
            contact.ma_hs === entry.ma_hs &&
            contact.ngay === entry.ngay &&
            contact.buoi === entry.buoi),
      ),
    )

    rows.push({
      maHs,
      hoTen: student ? `${student.ho} ${student.ten}` : maHs,
      tt: student?.tt ?? 0,
      ngay,
      trangThai,
      chiTietBuoi,
      daLienLac,
    })
  }

  rows.sort((left, right) => (left.ngay === right.ngay ? left.tt - right.tt : left.ngay < right.ngay ? -1 : 1))

  return {
    soHocSinhNghi: absentStudents.size,
    soLuotVangCoPhep,
    soLuotVangKhongPhep,
    soLuotDiTre,
    rows,
  }
}

function buildViolationData(
  recordsInRange: GhiNhan[],
  catalogByCode: Map<string, DanhMucDiem>,
  studentByMaHs: Map<string, HocSinh>,
): ReportViolationData {
  const personal = recordsInRange.filter(
    (record) => record.ma_hs !== null && isViolationRecord(record, catalogByCode),
  )
  const collective = recordsInRange.filter((record) => record.ma_hs === null)

  const soHocSinhViPham = new Set(personal.map((record) => record.ma_hs as string)).size
  const tongSoLuot = personal.reduce((sum, record) => sum + (record.so_lan || 1), 0)
  const soViPhamNghiemTrong = personal.reduce((sum, record) => {
    const item = record.ma_danh_muc ? catalogByCode.get(record.ma_danh_muc) : undefined
    return sum + (item?.nghiem_trong ? record.so_lan || 1 : 0)
  }, 0)

  const daXuLy = collective.filter(
    (record) => record.trang_thai_xu_ly_tap_the !== '' && record.trang_thai_xu_ly_tap_the !== 'chua_xu_ly',
  ).length

  const byLoai = new Map<string, GhiNhan[]>()
  for (const record of personal) {
    const list = byLoai.get(record.loai) || []
    list.push(record)
    byLoai.set(record.loai, list)
  }

  const sortedLoai = [...byLoai.keys()].sort(
    (left, right) => loaiOrderIndex(left) - loaiOrderIndex(right),
  )

  const theoNhom: ReportViolationGroupRow[] = []
  const chiTiet: ReportViolationDetailRow[] = []

  for (const loai of sortedLoai) {
    const list = byLoai.get(loai) as GhiNhan[]
    const soLuotNhom = list.reduce((sum, record) => sum + (record.so_lan || 1), 0)
    const soHocSinhNhom = new Set(list.map((record) => record.ma_hs as string)).size
    theoNhom.push({ loai, nhanLoai: getRecordTypeLabel(loai), soLuot: soLuotNhom, soHocSinh: soHocSinhNhom })

    const byMa = new Map<string | null, GhiNhan[]>()
    for (const record of list) {
      const key = record.ma_danh_muc
      const arr = byMa.get(key) || []
      arr.push(record)
      byMa.set(key, arr)
    }

    const detailRows = [...byMa.entries()]
      .map(([maDanhMuc, items]) => {
        const soLuot = items.reduce((sum, record) => sum + (record.so_lan || 1), 0)
        const tenViPham = maDanhMuc
          ? catalogByCode.get(maDanhMuc)?.ten_muc || maDanhMuc
          : 'Chưa phân loại mã cụ thể'
        return {
          loai,
          nhanLoai: getRecordTypeLabel(loai),
          maDanhMuc,
          tenViPham,
          soLuot,
          hocSinh: summarizeStudents(items, studentByMaHs),
        }
      })
      // Dong "Chua phan loai ma cu the" (ma_danh_muc = null) luon o cuoi nhom,
      // con lai sap theo so luot giam dan (dung yeu cau muc 3 Phan 2).
      .sort((left, right) => {
        if (left.maDanhMuc === null) return 1
        if (right.maDanhMuc === null) return -1
        return right.soLuot - left.soLuot
      })

    chiTiet.push(...detailRows)
  }

  return {
    soHocSinhViPham,
    tongSoLuot,
    soViPhamNghiemTrong,
    suKienTapThe: { tongSo: collective.length, daXuLy },
    theoNhom,
    chiTiet,
  }
}

function buildPositiveData(
  recordsInRange: GhiNhan[],
  catalogByCode: Map<string, DanhMucDiem>,
  studentByMaHs: Map<string, HocSinh>,
): ReportPositiveData {
  const positive = recordsInRange.filter((record) => isPositiveRecord(record, catalogByCode))
  const soHocSinh = new Set(
    positive.filter((record) => record.ma_hs).map((record) => record.ma_hs as string),
  ).size
  const tongSoLuot = positive.reduce((sum, record) => sum + (record.so_lan || 1), 0)

  const byMa = new Map<string | null, GhiNhan[]>()
  for (const record of positive) {
    const key = record.ma_danh_muc
    const arr = byMa.get(key) || []
    arr.push(record)
    byMa.set(key, arr)
  }

  const rows: ReportPositiveRow[] = [...byMa.entries()]
    .map(([maDanhMuc, items]) => {
      const soLuot = items.reduce((sum, record) => sum + (record.so_lan || 1), 0)
      const noiDung = maDanhMuc
        ? catalogByCode.get(maDanhMuc)?.ten_muc || maDanhMuc
        : items[0]?.noi_dung || 'Ghi nhận khen thưởng'
      return { maDanhMuc, noiDung, soLuot, hocSinh: summarizeStudents(items, studentByMaHs) }
    })
    .sort((left, right) => right.soLuot - left.soLuot)

  return { soHocSinh, tongSoLuot, rows }
}

function summarizeStudents(items: GhiNhan[], studentByMaHs: Map<string, HocSinh>): ReportPersonName[] {
  const counts = new Map<string, number>()
  for (const record of items) {
    if (!record.ma_hs) continue
    counts.set(record.ma_hs, (counts.get(record.ma_hs) || 0) + (record.so_lan || 1))
  }

  return [...counts.entries()]
    .map(([maHs, soLan]) => ({ hoTen: nameOf(studentByMaHs, maHs), soLan }))
    .sort((left, right) => right.soLan - left.soLan)
}

function nameOf(studentByMaHs: Map<string, HocSinh>, maHs: string): string {
  const student = studentByMaHs.get(maHs)
  return student ? `${student.ho} ${student.ten}` : maHs
}

function loaiOrderIndex(loai: string): number {
  const index = LOAI_ORDER.indexOf(loai)
  return index === -1 ? LOAI_ORDER.length : index
}

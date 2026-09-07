// Danh sach cot co the tuy chon khi xuat Excel danh sach hoc sinh CS2 - STT,
// Ma HS, Ho va ten LUON duoc xuat (khong tinh la "tuy chon"), giong dung quy
// uoc da co o studentExportColumns.ts (xuat danh sach 11C5).
import type { Cs2ExportRow } from './exportCs2StudentsExcel'

export type Cs2ExportColumnKey = 'lop' | 'email' | 'dia_chi' | 'cccd' | 'trang_thai' | 'so_lan_sua' | 'cap_nhat'

export interface Cs2ExportColumnDef {
  key: Cs2ExportColumnKey
  label: string
  width: number
}

export const CS2_EXPORT_COLUMNS: Cs2ExportColumnDef[] = [
  { key: 'lop', label: 'Lớp', width: 12 },
  { key: 'email', label: 'Email', width: 26 },
  { key: 'dia_chi', label: 'Địa chỉ', width: 36 },
  { key: 'cccd', label: 'CCCD', width: 16 },
  { key: 'trang_thai', label: 'Trạng thái', width: 14 },
  { key: 'so_lan_sua', label: 'Số lần sửa', width: 12 },
  { key: 'cap_nhat', label: 'Cập nhật gần nhất', width: 18 },
]

// Mac dinh chon het (giong het bo cot da xuat truoc khi co tinh nang tuy
// chon nay) - tranh doi hanh vi bat ngo cho ai da quen voi file xuat cu.
export const DEFAULT_CS2_EXPORT_COLUMNS: Cs2ExportColumnKey[] = CS2_EXPORT_COLUMNS.map((column) => column.key)

function isDaDien(row: Cs2ExportRow): boolean {
  return Boolean(row.email && row.dia_chi_hien_tai && row.cccd)
}

export function getCs2ExportCellValue(row: Cs2ExportRow, key: Cs2ExportColumnKey): string | number {
  switch (key) {
    case 'lop':
      return row.lop || ''
    case 'email':
      return row.email || ''
    case 'dia_chi':
      return row.dia_chi_hien_tai || ''
    case 'cccd':
      return row.cccd || ''
    case 'trang_thai':
      return isDaDien(row) ? 'Đã điền' : 'Chưa điền'
    case 'so_lan_sua':
      return row.so_lan_sua_lienlac
    case 'cap_nhat':
      return row.ngay_cap_nhat_lienlac ? new Date(row.ngay_cap_nhat_lienlac).toLocaleString('vi-VN') : ''
  }
}

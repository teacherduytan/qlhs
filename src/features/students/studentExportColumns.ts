import type { DienHocSinh, HocSinh } from '../../data/types'
import { formatDateCompact, isActiveStudent } from '../dashboard/DashboardPage'

export type StudentExportColumnKey =
  | 'to'
  | 'dien'
  | 'nu'
  | 'ngay_sinh'
  | 'dan_toc'
  | 'sdt_1'
  | 'sdt_2'
  | 'ngay_nhap_hoc'
  | 'ngay_roi_lop'
  | 'la_co_do'
  | 'ghi_chu'
  | 'trang_thai'

export const STUDENT_EXPORT_COLUMNS: Array<{ key: StudentExportColumnKey; label: string; width: number }> = [
  { key: 'trang_thai', label: 'Trạng thái', width: 14 },
  { key: 'to', label: 'Tổ', width: 8 },
  { key: 'dien', label: 'Diện', width: 12 },
  { key: 'nu', label: 'Giới tính', width: 10 },
  { key: 'ngay_sinh', label: 'Ngày sinh', width: 13 },
  { key: 'dan_toc', label: 'Dân tộc', width: 12 },
  { key: 'sdt_1', label: 'SĐT 1', width: 14 },
  { key: 'sdt_2', label: 'SĐT 2', width: 14 },
  { key: 'ngay_nhap_hoc', label: 'Ngày nhập học', width: 14 },
  { key: 'ngay_roi_lop', label: 'Ngày rời lớp', width: 14 },
  { key: 'la_co_do', label: 'Cờ đỏ', width: 10 },
  { key: 'ghi_chu', label: 'Ghi chú', width: 24 },
]

const DIEN_LABELS: Record<DienHocSinh, string> = {
  NT: 'Nội trú',
  BT: 'Bán trú',
  '2B': 'Hai buổi',
}

export function getStudentExportCellValue(
  student: HocSinh,
  key: StudentExportColumnKey,
  referenceDate: Date,
): string {
  switch (key) {
    case 'trang_thai':
      return isActiveStudent(student, referenceDate) ? 'Đang học' : 'Đã nghỉ học'
    case 'to':
      return student.to ? `Tổ ${student.to}` : ''
    case 'dien':
      return DIEN_LABELS[student.dien] || student.dien
    case 'nu':
      return student.nu ? 'Nữ' : 'Nam'
    case 'ngay_sinh':
      return student.ngay_sinh ? formatDateCompact(student.ngay_sinh) : ''
    case 'dan_toc':
      return student.dan_toc || ''
    case 'sdt_1':
      return student.sdt_1 || ''
    case 'sdt_2':
      return student.sdt_2 || ''
    case 'ngay_nhap_hoc':
      return student.ngay_nhap_hoc ? formatDateCompact(student.ngay_nhap_hoc) : ''
    case 'ngay_roi_lop':
      return student.ngay_roi_lop ? formatDateCompact(student.ngay_roi_lop) : ''
    case 'la_co_do':
      return student.la_co_do ? 'Có' : ''
    case 'ghi_chu':
      return student.ghi_chu || ''
  }
}

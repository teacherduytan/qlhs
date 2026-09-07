import ExcelJS from 'exceljs'
import { shareOrDownloadFile } from '../reports/shareFile'

const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export interface Cs2ExportRow {
  ma_hs: string
  ho: string
  ten: string
  lop: string | null
  email: string | null
  dia_chi_hien_tai: string | null
  cccd: string | null
  so_lan_sua_lienlac: number
  ngay_cap_nhat_lienlac: string | null
}

function isDaDien(row: Cs2ExportRow): boolean {
  return Boolean(row.email && row.dia_chi_hien_tai && row.cccd)
}

// Xuat DUNG danh sach dang hien thi tren man hinh (da qua bo loc Co so + Lop)
// - STT tu 1..N theo dung thu tu cua danh sach nay, giong het cot STT tren
// man hinh: chon "Tat ca" thi STT chay lien tuc ca truong, chon 1 lop thi
// STT tu bat dau lai tu 1 cho dung lop do.
export async function exportCs2StudentsToExcel(
  rows: Cs2ExportRow[],
  meta: { coSo: string; lop: string },
  fileBaseName: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Danh sách học sinh')

  const totalColumns = 9

  sheet.columns = [
    { key: 'stt', width: 6 },
    { key: 'ma_hs', width: 12 },
    { key: 'ho_ten', width: 26 },
    { key: 'lop', width: 12 },
    { key: 'email', width: 26 },
    { key: 'dia_chi', width: 36 },
    { key: 'cccd', width: 16 },
    { key: 'trang_thai', width: 14 },
    { key: 'cap_nhat', width: 18 },
  ]

  function mergedRow(text: string, bold: boolean, size?: number) {
    const row = sheet.addRow([text])
    sheet.mergeCells(row.number, 1, row.number, totalColumns)
    const cell = row.getCell(1)
    cell.font = { bold, size: size || 11 }
    cell.alignment = { horizontal: 'center' }
    return row
  }

  const tieuDe = meta.lop ? `DANH SÁCH HỌC SINH LỚP ${meta.lop}` : `DANH SÁCH HỌC SINH TOÀN TRƯỜNG (CƠ SỞ ${meta.coSo})`
  mergedRow(tieuDe, true, 15)
  mergedRow(`Tổng số: ${rows.length} học sinh — Xuất ngày ${new Date().toLocaleDateString('vi-VN')}`, false)
  sheet.addRow([])

  const headerRow = sheet.addRow(['STT', 'Mã HS', 'Họ và tên', 'Lớp', 'Email', 'Địa chỉ', 'CCCD', 'Trạng thái', 'Cập nhật gần nhất'])
  headerRow.eachCell((cell) => {
    cell.font = { bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
  })

  rows.forEach((row, index) => {
    const dataRow = sheet.addRow([
      index + 1,
      row.ma_hs,
      `${row.ho} ${row.ten}`.trim(),
      row.lop || '',
      row.email || '',
      row.dia_chi_hien_tai || '',
      row.cccd || '',
      isDaDien(row) ? 'Đã điền' : 'Chưa điền',
      row.ngay_cap_nhat_lienlac ? new Date(row.ngay_cap_nhat_lienlac).toLocaleString('vi-VN') : '',
    ])
    dataRow.eachCell((cell) => {
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: EXCEL_MIME_TYPE })
  await shareOrDownloadFile(blob, `${fileBaseName}.xlsx`, EXCEL_MIME_TYPE, tieuDe)
}

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

// Ten sheet Excel: toi da 31 ky tu, khong duoc chua : \ / ? * [ ] - cat bot
// va bo ky tu cam de tranh loi khi ghi file (vd ten lop qua dai hoac co ky
// tu dac biet la truong hop hiem nhung van nen phong).
function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, ' ').trim()
  return (cleaned || 'Lop').slice(0, 31)
}

// Dung chung cho ca xuat 1 sheet don le (exportCs2StudentsToExcel) va xuat
// nhieu sheet trong cung 1 workbook (exportCs2StudentsMultiSheetToExcel) -
// STT luon tu 1..N theo DUNG danh sach `rows` truyen vao sheet nay, khong
// phu thuoc cac sheet khac trong cung workbook.
function addStudentSheet(workbook: ExcelJS.Workbook, sheetName: string, rows: Cs2ExportRow[], title: string) {
  const sheet = workbook.addWorksheet(sanitizeSheetName(sheetName))
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

  mergedRow(title, true, 15)
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
  const title = meta.lop ? `DANH SÁCH HỌC SINH LỚP ${meta.lop}` : `DANH SÁCH HỌC SINH TOÀN TRƯỜNG (CƠ SỞ ${meta.coSo})`
  addStudentSheet(workbook, 'Danh sách học sinh', rows, title)

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: EXCEL_MIME_TYPE })
  await shareOrDownloadFile(blob, `${fileBaseName}.xlsx`, EXCEL_MIME_TYPE, title)
}

// Xuat toan truong nhung MOI LOP 1 SHEET RIENG trong CUNG 1 file - khac voi
// exportCs2StudentsToExcel (1 sheet gop chung) va voi cach xuat rieng N file
// (moi lop 1 file .xlsx doc lap) - o day chi co 1 file duy nhat, mo ra thay
// ngay tung tab/sheet ung voi tung lop, STT rieng tu 1 cho tung sheet.
export async function exportCs2StudentsMultiSheetToExcel(
  groups: { lop: string; rows: Cs2ExportRow[] }[],
  coSo: string,
  fileBaseName: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const usedNames = new Set<string>()

  for (const group of groups) {
    let sheetName = sanitizeSheetName(group.lop)
    // Excel khong cho 2 sheet trung ten - neu ten lop sau khi rut gon bi
    // trung (hiem, vd 2 ten lop khac nhau nhung cung bi cat con giong nhau),
    // them so thu tu vao cuoi de phan biet.
    let suffix = 2
    while (usedNames.has(sheetName)) {
      sheetName = `${sanitizeSheetName(group.lop).slice(0, 28)} (${suffix})`
      suffix += 1
    }
    usedNames.add(sheetName)
    addStudentSheet(workbook, sheetName, group.rows, `DANH SÁCH HỌC SINH LỚP ${group.lop}`)
  }

  const title = `DANH SÁCH HỌC SINH TOÀN TRƯỜNG (CƠ SỞ ${coSo}) — MỖI LỚP 1 SHEET`
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: EXCEL_MIME_TYPE })
  await shareOrDownloadFile(blob, `${fileBaseName}.xlsx`, EXCEL_MIME_TYPE, title)
}

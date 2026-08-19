import ExcelJS from 'exceljs'
import type { HocSinh } from '../../data/types'
import { REPORT_CONFIG } from '../reports/reportConfig'
import { shareOrDownloadFile } from '../reports/shareFile'
import { getStudentExportCellValue, STUDENT_EXPORT_COLUMNS, type StudentExportColumnKey } from './studentExportColumns'

const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function exportStudentsToExcel(
  students: HocSinh[],
  columns: StudentExportColumnKey[],
  fileBaseName: string,
): Promise<void> {
  const referenceDate = new Date()
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Danh sách học sinh')

  const columnDefs = STUDENT_EXPORT_COLUMNS.filter((column) => columns.includes(column.key))
  const totalColumns = 3 + columnDefs.length // STT, Mã HS, Họ và tên + cac cot tuy chon

  sheet.columns = [
    { key: 'stt', width: 6 },
    { key: 'ma_hs', width: 10 },
    { key: 'ho_ten', width: 24 },
    ...columnDefs.map((column) => ({ key: column.key, width: column.width })),
  ]

  function mergedRow(text: string, bold: boolean, size?: number) {
    const row = sheet.addRow([text])
    sheet.mergeCells(row.number, 1, row.number, totalColumns)
    const cell = row.getCell(1)
    cell.font = { bold, size: size || 11 }
    cell.alignment = { horizontal: 'center' }
    return row
  }

  mergedRow(REPORT_CONFIG.tenTruong.toUpperCase(), true, 13)
  mergedRow(`Lớp: ${REPORT_CONFIG.tenLop}   —   GVCN: ${REPORT_CONFIG.tenGvcn}   —   Năm học: ${REPORT_CONFIG.namHoc}`, false)
  mergedRow('DANH SÁCH HỌC SINH', true, 15)
  sheet.addRow([])

  const headerRow = sheet.addRow(['STT', 'Mã HS', 'Họ và tên', ...columnDefs.map((column) => column.label)])
  headerRow.eachCell((cell) => {
    cell.font = { bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  })

  students.forEach((student, index) => {
    const row = sheet.addRow([
      index + 1,
      student.ma_hs,
      `${student.ho} ${student.ten}`,
      ...columnDefs.map((column) => getStudentExportCellValue(student, column.key, referenceDate)),
    ])
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: EXCEL_MIME_TYPE })
  await shareOrDownloadFile(blob, `${fileBaseName}.xlsx`, EXCEL_MIME_TYPE, 'Danh sách học sinh')
}

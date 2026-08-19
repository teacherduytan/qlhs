import type { HocSinh } from '../../data/types'
import { REPORT_CONFIG } from '../reports/reportConfig'
import { shareOrDownloadFile } from '../reports/shareFile'
import { getStudentExportCellValue, STUDENT_EXPORT_COLUMNS, type StudentExportColumnKey } from './studentExportColumns'

const MARKDOWN_MIME_TYPE = 'text/markdown'

function escapeMdCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

export async function exportStudentsToMarkdown(
  students: HocSinh[],
  columns: StudentExportColumnKey[],
  fileBaseName: string,
): Promise<void> {
  const referenceDate = new Date()
  const columnDefs = STUDENT_EXPORT_COLUMNS.filter((column) => columns.includes(column.key))
  const headers = ['STT', 'Mã HS', 'Họ và tên', ...columnDefs.map((column) => column.label)]

  const lines = [
    `# ${REPORT_CONFIG.tenTruong}`,
    '',
    `Lớp: ${REPORT_CONFIG.tenLop} — GVCN: ${REPORT_CONFIG.tenGvcn} — Năm học: ${REPORT_CONFIG.namHoc}`,
    '',
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...students.map((student, index) => {
      const cells = [
        String(index + 1),
        student.ma_hs,
        `${student.ho} ${student.ten}`,
        ...columnDefs.map((column) => getStudentExportCellValue(student, column.key, referenceDate)),
      ].map(escapeMdCell)
      return `| ${cells.join(' | ')} |`
    }),
    '',
  ]

  const blob = new Blob([lines.join('\n')], { type: MARKDOWN_MIME_TYPE })
  await shareOrDownloadFile(blob, `${fileBaseName}.md`, MARKDOWN_MIME_TYPE, 'Danh sách học sinh')
}

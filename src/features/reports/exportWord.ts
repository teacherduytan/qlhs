import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ITableBordersOptions,
} from 'docx'
import { formatDate } from '../dashboard/DashboardPage'
import { REPORT_CONFIG, type ReportPresentationMeta } from './reportConfig'
import type { ReportData } from './reportData'
import { shareOrDownloadFile } from './shareFile'

const WORD_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  vang_khong_phep: 'Vắng không phép',
  vang_co_phep: 'Vắng có phép',
  tre: 'Trễ',
}

const TABLE_BORDER = { style: BorderStyle.SINGLE, size: 4, color: '999999' }
const TABLE_BORDERS: ITableBordersOptions = {
  top: TABLE_BORDER,
  bottom: TABLE_BORDER,
  left: TABLE_BORDER,
  right: TABLE_BORDER,
  insideHorizontal: TABLE_BORDER,
  insideVertical: TABLE_BORDER,
}

export async function exportReportToWord(
  data: ReportData,
  meta: ReportPresentationMeta,
  fileBaseName: string,
): Promise<void> {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 26 },
          paragraph: { spacing: { line: 276, lineRule: 'auto' } },
        },
      },
    },
    sections: [
      {
        children: [
          ...buildLetterhead(meta),
          ...buildAttendanceSection(data),
          ...buildViolationSection(data),
          ...buildPositiveSection(data),
          ...buildSignatureBlock(),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  await shareOrDownloadFile(blob, `${fileBaseName}.docx`, WORD_MIME_TYPE, meta.title)
}

function buildLetterhead(meta: ReportPresentationMeta): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Độc lập - Tự do - Hạnh phúc', bold: true })],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('──────────')] }),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [new TextRun({ text: REPORT_CONFIG.tenTruong, bold: true })] }),
    new Paragraph({
      children: [
        new TextRun(
          `Lớp: ${REPORT_CONFIG.tenLop}          Sĩ số: ${meta.soHocSinh} học sinh          Năm học: ${REPORT_CONFIG.namHoc}`,
        ),
      ],
    }),
    new Paragraph({ children: [new TextRun(`GVCN: ${REPORT_CONFIG.tenGvcn}`)] }),
    new Paragraph({ children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: meta.title.toUpperCase(), bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: meta.subtitle, italics: true, size: 22 })],
    }),
    new Paragraph({ children: [] }),
  ]
}

function buildSignatureBlock(): Paragraph[] {
  const now = new Date()
  const ngayLap = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`

  return [
    new Paragraph({ children: [] }),
    new Paragraph({ children: [] }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun(`${REPORT_CONFIG.diaDiemKy}, ${ngayLap}`)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: 'GIÁO VIÊN CHỦ NHIỆM', bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: '(Ký và ghi rõ họ tên)', italics: true })],
    }),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [] }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: REPORT_CONFIG.tenGvcn, bold: true })],
    }),
  ]
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 28 })],
  })
}

function summaryParagraph(items: Array<{ label: string; value: string | number; color?: string }>): Paragraph {
  const children: TextRun[] = []
  items.forEach((item, index) => {
    if (index > 0) children.push(new TextRun(' · '))
    children.push(new TextRun(`${item.label}: `))
    children.push(new TextRun({ text: String(item.value), bold: true, color: item.color }))
  })
  return new Paragraph({ children })
}

function buildAttendanceSection(data: ReportData) {
  const { attendance } = data
  const centerCols = [0, 2, 3, 5]
  const rows = [
    headerRow(['STT', 'Họ tên', 'Ngày', 'Trạng thái', 'Chi tiết buổi', 'Đã liên lạc PH?'], centerCols),
    ...attendance.rows.map((row, index) =>
      dataRow(
        [
          String(index + 1),
          row.hoTen,
          formatDate(row.ngay),
          ATTENDANCE_STATUS_LABELS[row.trangThai] || row.trangThai,
          row.chiTietBuoi || '—',
          row.daLienLac ? 'Đã liên lạc' : 'Chưa liên lạc',
        ],
        centerCols,
      ),
    ),
  ]

  return [
    sectionHeading('Phần 1 — Chuyên cần'),
    summaryParagraph([
      { label: 'Học sinh nghỉ học', value: attendance.soHocSinhNghi },
      { label: 'Vắng có phép', value: attendance.soLuotVangCoPhep },
      { label: 'Vắng không phép', value: attendance.soLuotVangKhongPhep },
      { label: 'Đi trễ', value: attendance.soLuotDiTre },
    ]),
    attendance.rows.length === 0
      ? new Paragraph({ children: [new TextRun('Không có học sinh vắng/trễ trong kỳ báo cáo này.')] })
      : new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: TABLE_BORDERS, rows }),
  ]
}

function buildViolationSection(data: ReportData) {
  const { violation } = data
  const groupRows = [
    headerRow(['Nhóm', 'Số lượt', 'Số học sinh liên quan'], [1, 2]),
    ...violation.theoNhom.map((row) => dataRow([row.nhanLoai, String(row.soLuot), String(row.soHocSinh)], [1, 2])),
  ]
  const detailRows = [
    headerRow(['Nhóm', 'Mã', 'Tên vi phạm', 'Số lượt', 'Học sinh (số lần)'], [1, 3]),
    ...violation.chiTiet.map((row) =>
      dataRow(
        [
          row.nhanLoai,
          row.maDanhMuc || '—',
          row.tenViPham,
          String(row.soLuot),
          row.hocSinh.map((student) => `${student.hoTen} (${student.soLan})`).join(', '),
        ],
        [1, 3],
      ),
    ),
  ]

  return [
    sectionHeading('Phần 2 — Vi phạm nề nếp'),
    summaryParagraph([
      { label: 'Học sinh vi phạm', value: violation.soHocSinhViPham },
      { label: 'Tổng lượt vi phạm', value: violation.tongSoLuot },
      { label: 'Vi phạm nghiêm trọng', value: violation.soViPhamNghiemTrong, color: 'C00000' },
    ]),
    new Paragraph({
      children: [
        new TextRun(
          `Sự kiện lớp/tổ trong kỳ: ${violation.suKienTapThe.tongSo} sự kiện, đã xử lý ${violation.suKienTapThe.daXuLy}.`,
        ),
      ],
    }),
    violation.theoNhom.length === 0
      ? new Paragraph({ children: [new TextRun('Không có vi phạm cá nhân nào trong kỳ báo cáo này.')] })
      : new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: TABLE_BORDERS, rows: groupRows }),
    ...(violation.chiTiet.length > 0
      ? [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: TABLE_BORDERS, rows: detailRows })]
      : []),
  ]
}

function buildPositiveSection(data: ReportData) {
  const { positive } = data
  const centerCols = [0, 2]
  const rows = [
    headerRow(['Mã', 'Nội dung', 'Số lượt', 'Học sinh (số lần)'], centerCols),
    ...positive.rows.map((row) =>
      dataRow(
        [
          row.maDanhMuc || '—',
          row.noiDung,
          String(row.soLuot),
          row.hocSinh.map((student) => `${student.hoTen} (${student.soLan})`).join(', '),
        ],
        centerCols,
      ),
    ),
  ]

  return [
    sectionHeading('Phần 3 — Ghi nhận tích cực'),
    summaryParagraph([
      { label: 'Học sinh được ghi nhận', value: positive.soHocSinh },
      { label: 'Tổng lượt ghi nhận', value: positive.tongSoLuot },
    ]),
    positive.rows.length === 0
      ? new Paragraph({ children: [new TextRun('Không có ghi nhận tích cực nào trong kỳ báo cáo này.')] })
      : new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: TABLE_BORDERS, rows }),
  ]
}

function headerRow(cells: string[], centerIndexes: number[] = []): TableRow {
  return new TableRow({
    children: cells.map(
      (text, index) =>
        new TableCell({
          shading: { fill: 'F2F2F2', type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              alignment: centerIndexes.includes(index) ? AlignmentType.CENTER : AlignmentType.LEFT,
              children: [new TextRun({ text, bold: true, size: 28 })],
            }),
          ],
        }),
    ),
  })
}

function dataRow(cells: string[], centerIndexes: number[] = []): TableRow {
  return new TableRow({
    children: cells.map(
      (text, index) =>
        new TableCell({
          children: [
            new Paragraph({
              alignment: centerIndexes.includes(index) ? AlignmentType.CENTER : AlignmentType.LEFT,
              children: [new TextRun(text)],
            }),
          ],
        }),
    ),
  })
}

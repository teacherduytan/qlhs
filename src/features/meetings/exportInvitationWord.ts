import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx'
import { formatDate } from '../dashboard/DashboardPage'
import { formatTietLabel } from '../records/recordInsights'
import { REPORT_CONFIG } from '../reports/reportConfig'
import { shareOrDownloadFile } from '../reports/shareFile'
import type { InvitationData } from './invitationTypes'

const WORD_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function exportInvitationToWord(data: InvitationData, fileBaseName: string): Promise<void> {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 26 },
          paragraph: { spacing: { line: 300, lineRule: 'auto' } },
        },
      },
    },
    sections: [{ children: buildInvitationBody(data) }],
  })

  const blob = await Packer.toBlob(doc)
  await shareOrDownloadFile(
    blob,
    `${fileBaseName}.docx`,
    WORD_MIME_TYPE,
    `Thư mời họp phụ huynh - ${data.hoTenHocSinh}`,
  )
}

function buildInvitationBody(data: InvitationData): Paragraph[] {
  const now = new Date()
  const ngayLap = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`
  const [year, month, day] = data.ngayHop ? data.ngayHop.split('-').map(Number) : [null, null, null]
  const ngayHopText = year && month && day ? `ngày ${day} tháng ${month} năm ${year}` : '(chưa chọn ngày)'

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
          `Lớp: ${REPORT_CONFIG.tenLop}          GVCN: ${REPORT_CONFIG.tenGvcn}          Năm học: ${REPORT_CONFIG.namHoc}`,
        ),
      ],
    }),
    new Paragraph({ children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'THƯ MỜI HỌP PHỤ HUYNH HỌC SINH', bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `V/v: Trao đổi tình hình ${data.lyDoHop} của học sinh`, italics: true, size: 22 })],
    }),
    new Paragraph({ children: [] }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Kính gửi: Quý phụ huynh em ${data.hoTenHocSinh}${data.to ? ` — Tổ ${data.to}` : ''}, học sinh lớp ${REPORT_CONFIG.tenLop}`,
          bold: true,
        }),
      ],
    }),
    new Paragraph({ children: [] }),
    new Paragraph({
      children: [
        new TextRun(
          `${REPORT_CONFIG.tenTruong} trân trọng kính mời quý phụ huynh em ${data.hoTenHocSinh} thu xếp thời gian đến trường để trao đổi trực tiếp về tình hình ${data.lyDoHop} của em trong thời gian gần đây, cụ thể:`,
        ),
      ],
    }),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [new TextRun({ text: `Thời gian: vào lúc ${data.gioHop || '(chưa chọn giờ)'} ${ngayHopText}` })] }),
    new Paragraph({ children: [new TextRun({ text: `Địa điểm: ${data.diaDiemHop || '(chưa chọn địa điểm)'}` })] }),
    new Paragraph({ children: [] }),
    ...buildViolationParagraphs(data),
    ...(data.noiDungKhac.trim()
      ? [
          new Paragraph({ children: [new TextRun({ text: 'Nội dung khác cần trao đổi thêm:', bold: true })] }),
          new Paragraph({ children: [new TextRun(data.noiDungKhac.trim())] }),
          new Paragraph({ children: [] }),
        ]
      : []),
    new Paragraph({
      children: [
        new TextRun(
          'Rất mong quý phụ huynh sắp xếp thời gian đến dự đầy đủ, đúng giờ để nhà trường và gia đình cùng phối hợp giáo dục học sinh tốt hơn.',
        ),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: 'Trân trọng!', bold: true })] }),
    new Paragraph({ children: [] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(`${REPORT_CONFIG.diaDiemKy}, ${ngayLap}`)] }),
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
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: REPORT_CONFIG.tenGvcn, bold: true })] }),
  ]
}

function buildViolationParagraphs(data: InvitationData): Paragraph[] {
  if (data.violations.length === 0) return []

  const rows = [...data.violations].sort((left, right) => (left.ngay < right.ngay ? -1 : left.ngay > right.ngay ? 1 : 0))

  return [
    new Paragraph({
      children: [
        new TextRun({
          text: `Nội dung cụ thể trong giai đoạn từ ${formatDate(data.tuNgay)} đến ${formatDate(data.denNgay)}:`,
          bold: true,
        }),
      ],
    }),
    ...rows.map(
      (row, index) =>
        new Paragraph({
          children: [
            new TextRun(
              `${index + 1}. ${formatDate(row.ngay)}${row.tiet ? ` - Tiết ${formatTietLabel(row.tiet)}` : ''}${
                row.monHoc ? ` - Môn ${row.monHoc}` : ''
              }: ${row.noiDung}`,
            ),
          ],
        }),
    ),
    new Paragraph({ children: [] }),
  ]
}

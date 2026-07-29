import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { formatDate } from '../dashboard/DashboardPage'
import type { ReportData } from './reportData'

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  vang_khong_phep: 'Vắng không phép',
  vang_co_phep: 'Vắng có phép',
  tre: 'Trễ',
}

export async function exportReportToWord(data: ReportData, title: string, fileBaseName: string): Promise<void> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title)] }),
          new Paragraph({
            children: [new TextRun(`Từ ${formatDate(data.tuNgay)} đến ${formatDate(data.denNgay)}`)],
          }),
          ...buildAttendanceSection(data),
          ...buildViolationSection(data),
          ...buildPositiveSection(data),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, `${fileBaseName}.docx`)
}

function buildAttendanceSection(data: ReportData) {
  const { attendance } = data
  const rows = [
    headerRow(['STT', 'Họ tên', 'Ngày', 'Trạng thái', 'Chi tiết buổi', 'Đã liên lạc PH?']),
    ...attendance.rows.map((row, index) =>
      dataRow([
        String(index + 1),
        row.hoTen,
        formatDate(row.ngay),
        ATTENDANCE_STATUS_LABELS[row.trangThai] || row.trangThai,
        row.chiTietBuoi || '—',
        row.daLienLac ? 'Đã liên lạc' : 'Chưa liên lạc',
      ]),
    ),
  ]

  return [
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Phần 1 — Chuyên cần')] }),
    new Paragraph({
      children: [
        new TextRun(
          `Học sinh nghỉ học: ${attendance.soHocSinhNghi} · Vắng có phép: ${attendance.soLuotVangCoPhep} · ` +
            `Vắng không phép: ${attendance.soLuotVangKhongPhep} · Đi trễ: ${attendance.soLuotDiTre}`,
        ),
      ],
    }),
    attendance.rows.length === 0
      ? new Paragraph({ children: [new TextRun('Không có học sinh vắng/trễ trong kỳ báo cáo này.')] })
      : new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
  ]
}

function buildViolationSection(data: ReportData) {
  const { violation } = data
  const groupRows = [
    headerRow(['Nhóm', 'Số lượt', 'Số học sinh liên quan']),
    ...violation.theoNhom.map((row) => dataRow([row.nhanLoai, String(row.soLuot), String(row.soHocSinh)])),
  ]
  const detailRows = [
    headerRow(['Nhóm', 'Mã', 'Tên vi phạm', 'Số lượt', 'Học sinh (số lần)']),
    ...violation.chiTiet.map((row) =>
      dataRow([
        row.nhanLoai,
        row.maDanhMuc || '—',
        row.tenViPham,
        String(row.soLuot),
        row.hocSinh.map((student) => `${student.hoTen} (${student.soLan})`).join(', '),
      ]),
    ),
  ]

  return [
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Phần 2 — Vi phạm nề nếp')] }),
    new Paragraph({
      children: [
        new TextRun(
          `Học sinh vi phạm: ${violation.soHocSinhViPham} · Tổng lượt vi phạm: ${violation.tongSoLuot} · ` +
            `Vi phạm nghiêm trọng: ${violation.soViPhamNghiemTrong}`,
        ),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun(
          `Sự kiện lớp/tổ trong kỳ: ${violation.suKienTapThe.tongSo} sự kiện, đã xử lý ${violation.suKienTapThe.daXuLy}.`,
        ),
      ],
    }),
    violation.theoNhom.length === 0
      ? new Paragraph({ children: [new TextRun('Không có vi phạm cá nhân nào trong kỳ báo cáo này.')] })
      : new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: groupRows }),
    ...(violation.chiTiet.length > 0
      ? [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: detailRows })]
      : []),
  ]
}

function buildPositiveSection(data: ReportData) {
  const { positive } = data
  const rows = [
    headerRow(['Mã', 'Nội dung', 'Số lượt', 'Học sinh (số lần)']),
    ...positive.rows.map((row) =>
      dataRow([
        row.maDanhMuc || '—',
        row.noiDung,
        String(row.soLuot),
        row.hocSinh.map((student) => `${student.hoTen} (${student.soLan})`).join(', '),
      ]),
    ),
  ]

  return [
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Phần 3 — Ghi nhận tích cực')] }),
    new Paragraph({
      children: [
        new TextRun(`Học sinh được ghi nhận: ${positive.soHocSinh} · Tổng lượt ghi nhận: ${positive.tongSoLuot}`),
      ],
    }),
    positive.rows.length === 0
      ? new Paragraph({ children: [new TextRun('Không có ghi nhận tích cực nào trong kỳ báo cáo này.')] })
      : new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
  ]
}

function headerRow(cells: string[]): TableRow {
  return new TableRow({
    children: cells.map(
      (text) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
        }),
    ),
  })
}

function dataRow(cells: string[]): TableRow {
  return new TableRow({
    children: cells.map((text) => new TableCell({ children: [new Paragraph({ children: [new TextRun(text)] })] })),
  })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

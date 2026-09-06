import { jsPDF } from 'jspdf'
import { formatDate } from '../dashboard/DashboardPage'
import { formatTietLabel } from '../records/recordInsights'
import { REPORT_CONFIG } from '../reports/reportConfig'
import { shareOrDownloadFile } from '../reports/shareFile'
import type { InvitationData } from './invitationTypes'

const PDF_MIME_TYPE = 'application/pdf'

// Cung ky thuat render nhu exportPdf.ts cua bao cao (xem giai thich chi tiet
// o do): jsPDF khong co san font Unicode co dau, nen dung doc.html() de
// render qua html2canvas - ra anh raster nhung dam bao khong mat dau tieng
// Viet. Phai tam ghi de mau nen/chu cua <body> vi container duoc clone thang
// vao <body> that cua app de do dac.
export async function exportInvitationToPdf(data: InvitationData, fileBaseName: string): Promise<void> {
  const hiddenWrapper = document.createElement('div')
  hiddenWrapper.style.position = 'fixed'
  hiddenWrapper.style.left = '-9999px'
  hiddenWrapper.style.top = '0'

  const container = document.createElement('div')
  container.style.width = '794px'
  container.style.fontFamily = '"Times New Roman", Times, serif'
  container.style.color = '#0f172a'
  container.style.fontSize = '13px'
  container.style.background = '#ffffff'
  container.innerHTML = renderInvitationHtml(data)

  hiddenWrapper.appendChild(container)
  document.body.appendChild(hiddenWrapper)

  const previousBodyBackground = document.body.style.backgroundColor
  const previousBodyColor = document.body.style.color
  document.body.style.backgroundColor = '#ffffff'
  document.body.style.color = '#0f172a'

  try {
    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
    const pdfDoc = await new Promise<jsPDF>((resolve, reject) => {
      doc
        .html(container, {
          x: 24,
          y: 24,
          width: 547,
          windowWidth: 794,
          autoPaging: 'slice',
          html2canvas: { scale: 0.75, backgroundColor: '#ffffff' },
          callback: (finishedDoc) => resolve(finishedDoc),
        })
        .catch(reject)
    })

    const blob = pdfDoc.output('blob')
    await shareOrDownloadFile(blob, `${fileBaseName}.pdf`, PDF_MIME_TYPE, `Thư mời họp phụ huynh - ${data.hoTenHocSinh}`)
  } finally {
    document.body.style.backgroundColor = previousBodyBackground
    document.body.style.color = previousBodyColor
    hiddenWrapper.remove()
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderInvitationHtml(data: InvitationData): string {
  const now = new Date()
  const ngayLap = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`
  const [year, month, day] = data.ngayHop ? data.ngayHop.split('-').map(Number) : [null, null, null]
  const ngayHopText = year && month && day ? `ngày ${day} tháng ${month} năm ${year}` : '(chưa chọn ngày)'

  const rows = [...data.violations].sort((left, right) => (left.ngay < right.ngay ? -1 : left.ngay > right.ngay ? 1 : 0))
  const violationsHtml =
    rows.length === 0
      ? ''
      : `
    <p style="margin:0 0 4px;font-weight:bold;">
      Nội dung cụ thể trong giai đoạn từ ${formatDate(data.tuNgay)} đến ${formatDate(data.denNgay)}:
    </p>
    ${rows
      .map(
        (row, index) => `
      <p style="margin:0 0 4px;">
        ${index + 1}. ${formatDate(row.ngay)}${row.tiet ? ` - Tiết ${escapeHtml(formatTietLabel(row.tiet) || '')}` : ''}${
          row.monHoc ? ` - Môn ${escapeHtml(row.monHoc)}` : ''
        }: ${escapeHtml(row.noiDung)}
      </p>`,
      )
      .join('')}
    <div style="height:8px;"></div>
  `

  const noiDungKhacHtml = data.noiDungKhac.trim()
    ? `
    <p style="margin:0 0 4px;font-weight:bold;">Nội dung khác cần trao đổi thêm:</p>
    <p style="margin:0 0 8px;">${escapeHtml(data.noiDungKhac.trim())}</p>
  `
    : ''

  return `
    <p style="margin:0;text-align:center;font-weight:bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
    <p style="margin:0;text-align:center;font-weight:bold;">Độc lập - Tự do - Hạnh phúc</p>
    <p style="margin:2px 0 12px;text-align:center;">──────────</p>
    <p style="margin:0;font-weight:bold;">${escapeHtml(REPORT_CONFIG.tenTruong)}</p>
    <p style="margin:0 0 12px;">
      Lớp: ${escapeHtml(REPORT_CONFIG.tenLop)} &nbsp;&nbsp;&nbsp; GVCN: ${escapeHtml(REPORT_CONFIG.tenGvcn)} &nbsp;&nbsp;&nbsp;
      Năm học: ${escapeHtml(REPORT_CONFIG.namHoc)}
    </p>
    <h1 style="font-size:19px;margin:0 0 4px;text-align:center;text-transform:uppercase;">THƯ MỜI HỌP PHỤ HUYNH HỌC SINH</h1>
    <p style="margin:0 0 16px;text-align:center;font-style:italic;font-size:12px;">
      V/v: Trao đổi tình hình ${escapeHtml(data.lyDoHop)} của học sinh
    </p>
    <p style="margin:0 0 12px;font-weight:bold;">
      Kính gửi: Quý phụ huynh em ${escapeHtml(data.hoTenHocSinh)}${data.to ? ` — Tổ ${data.to}` : ''}, học sinh lớp ${escapeHtml(REPORT_CONFIG.tenLop)}
    </p>
    <p style="margin:0 0 12px;">
      ${escapeHtml(REPORT_CONFIG.tenTruong)} trân trọng kính mời quý phụ huynh em ${escapeHtml(data.hoTenHocSinh)} thu xếp
      thời gian đến trường để trao đổi trực tiếp về tình hình ${escapeHtml(data.lyDoHop)} của em trong thời gian gần đây,
      cụ thể:
    </p>
    <p style="margin:0 0 4px;">Thời gian: vào lúc ${escapeHtml(data.gioHop || '(chưa chọn giờ)')} ${ngayHopText}</p>
    <p style="margin:0 0 12px;">Địa điểm: ${escapeHtml(data.diaDiemHop || '(chưa chọn địa điểm)')}</p>
    ${violationsHtml}
    ${noiDungKhacHtml}
    <p style="margin:0 0 8px;">
      Rất mong quý phụ huynh sắp xếp thời gian đến dự đầy đủ, đúng giờ để nhà trường và gia đình cùng phối hợp giáo dục
      học sinh tốt hơn.
    </p>
    <p style="margin:0 0 16px;font-weight:bold;">Trân trọng!</p>
    <div style="text-align:right;">
      <p style="margin:0;">${escapeHtml(REPORT_CONFIG.diaDiemKy)}, ${ngayLap}</p>
      <p style="margin:0;font-weight:bold;">GIÁO VIÊN CHỦ NHIỆM</p>
      <p style="margin:0;font-style:italic;">(Ký và ghi rõ họ tên)</p>
      <div style="height:60px;"></div>
      <p style="margin:0;font-weight:bold;">${escapeHtml(REPORT_CONFIG.tenGvcn)}</p>
    </div>
  `
}

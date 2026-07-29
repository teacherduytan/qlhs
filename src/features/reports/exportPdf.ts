import { jsPDF } from 'jspdf'
import { formatDate } from '../dashboard/DashboardPage'
import { REPORT_CONFIG, type ReportPresentationMeta } from './reportConfig'
import type { ReportData } from './reportData'
import { shareOrDownloadFile } from './shareFile'

const PDF_MIME_TYPE = 'application/pdf'

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  vang_khong_phep: 'Vắng không phép',
  vang_co_phep: 'Vắng có phép',
  tre: 'Trễ',
}

// jsPDF khong co san font Unicode co dau tieng Viet, va du an khong co san
// file font that (.ttf) de nhung qua addFileToVFS/addFont. Thay vi nhung mot
// font gia/khong hop le (se lam PDF loi hoac mat dau), dung doc.html() de
// jsPDF render DOM qua html2canvas (da co san la optional dependency cua
// jsPDF) - ket qua la anh raster cua dung noi dung tieng Viet trinh duyet da
// hien thi, dam bao khong mat dau, nhung doi lai chu trong PDF la anh, khong
// the bam chon/copy hay tim kiem duoc nhu PDF van ban that.
//
// html2canvas (dung trong doc.html()) khong doc duoc mau CSS kieu oklch().
// Thu dung iframe voi document rong de tach container khoi CSS cua app
// nhung KHONG an toan: doc xem source cua jsPDF (Worker.toContainer) cho
// thay no tu goi `node.cloneNode(false)` (deep-clone thu cong tung node)
// roi APPEND BAN SAO DO THANG VAO document.body CUA TRANG CHINH (khong
// phai vao iframe) de do dac/render - nen container du dung o dau, ban sao
// cuoi cung van nam duoi <body> that cua app va ke thua bg/text-color cua
// no (Tailwind v4 xuat oklch() cho `body { @apply ... bg-slate-200
// text-slate-900 }` trong index.css). Sua tan goc: tam ghi de
// background-color/color cua chinh <body> bang gia tri hex thuong trong
// luc doc.html() chay, roi khoi phuc lai ngay sau do (dung try/finally).
export async function exportReportToPdf(
  data: ReportData,
  meta: ReportPresentationMeta,
  fileBaseName: string,
): Promise<void> {
  const container = buildReportContainer(data, meta)
  document.body.appendChild(container)

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
          width: 547, // A4 (595pt) - 2*24pt margin
          windowWidth: 794, // ~ A4 width tai 96dpi, giup html2canvas do layout dung ty le
          autoPaging: 'slice',
          html2canvas: { scale: 0.75, backgroundColor: '#ffffff' },
          callback: (finishedDoc) => resolve(finishedDoc),
        })
        .catch(reject)
    })

    const blob = pdfDoc.output('blob')
    await shareOrDownloadFile(blob, `${fileBaseName}.pdf`, PDF_MIME_TYPE, meta.title)
  } finally {
    document.body.style.backgroundColor = previousBodyBackground
    document.body.style.color = previousBodyColor
    container.remove()
  }
}

function buildReportContainer(data: ReportData, meta: ReportPresentationMeta): HTMLElement {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '794px'
  container.style.fontFamily = '"Times New Roman", Times, serif'
  container.style.color = '#0f172a'
  container.style.fontSize = '13px'
  container.style.background = '#ffffff'

  container.innerHTML = `
    ${renderLetterhead(meta)}
    ${renderAttendanceSection(data)}
    ${renderViolationSection(data)}
    ${renderPositiveSection(data)}
    ${renderBanCanSuSignatures(meta)}
    ${renderSignatureBlock()}
  `

  return container
}

function renderLetterhead(meta: ReportPresentationMeta): string {
  return `
    <p style="margin:0;text-align:center;font-weight:bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
    <p style="margin:0;text-align:center;font-weight:bold;">Độc lập - Tự do - Hạnh phúc</p>
    <p style="margin:2px 0 12px;text-align:center;">──────────</p>
    <p style="margin:0;font-weight:bold;">${escapeHtml(REPORT_CONFIG.tenTruong)}</p>
    <p style="margin:0;">
      Lớp: ${escapeHtml(REPORT_CONFIG.tenLop)} &nbsp;&nbsp;&nbsp; Sĩ số: ${meta.soHocSinh} học sinh &nbsp;&nbsp;&nbsp;
      Năm học: ${escapeHtml(REPORT_CONFIG.namHoc)}
    </p>
    <p style="margin:0 0 12px;">GVCN: ${escapeHtml(REPORT_CONFIG.tenGvcn)}</p>
    <h1 style="font-size:19px;margin:0 0 4px;text-align:center;text-transform:uppercase;">${escapeHtml(meta.title)}</h1>
    <p style="margin:0 0 16px;text-align:center;font-style:italic;font-size:12px;">${escapeHtml(meta.subtitle)}</p>
  `
}

function renderBanCanSuSignatures(meta: ReportPresentationMeta): string {
  if (meta.banCanSuSignatures.length === 0) return ''

  const columnWidth = Math.floor(100 / meta.banCanSuSignatures.length)
  const cellsHtml = meta.banCanSuSignatures
    .map(
      (item) => `
        <td style="border:none;padding:0 6px;text-align:center;vertical-align:top;width:${columnWidth}%;">
          <p style="margin:0;font-weight:bold;">${escapeHtml(item.chucVu)}</p>
          <p style="margin:0;font-style:italic;font-size:11px;">(Ký, ghi rõ họ tên)</p>
          <div style="height:48px;"></div>
          <p style="margin:0;font-weight:bold;">${escapeHtml(item.hoTen)}</p>
        </td>`,
    )
    .join('')

  return `
    <p style="margin:16px 0 8px;text-align:center;font-weight:bold;">XÁC NHẬN CỦA BAN CÁN SỰ LỚP</p>
    <table style="width:100%;border-collapse:collapse;"><tbody><tr>${cellsHtml}</tr></tbody></table>
  `
}

function renderSignatureBlock(): string {
  const now = new Date()
  const ngayLap = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`

  return `
    <div style="margin-top:24px;text-align:right;">
      <p style="margin:0;">${escapeHtml(REPORT_CONFIG.diaDiemKy)}, ${ngayLap}</p>
      <p style="margin:0;font-weight:bold;">GIÁO VIÊN CHỦ NHIỆM</p>
      <p style="margin:0;font-style:italic;">(Ký và ghi rõ họ tên)</p>
      <div style="height:60px;"></div>
      <p style="margin:0;font-weight:bold;">${escapeHtml(REPORT_CONFIG.tenGvcn)}</p>
    </div>
  `
}

function renderAttendanceSection(data: ReportData): string {
  const { attendance } = data
  const rowsHtml = attendance.rows
    .map(
      (row, index) => `
        <tr>
          <td style="${td} text-align:center;">${index + 1}</td>
          <td style="${td}">${escapeHtml(row.hoTen)}</td>
          <td style="${td} text-align:center;">${formatDate(row.ngay)}</td>
          <td style="${td} text-align:center;">${ATTENDANCE_STATUS_LABELS[row.trangThai] || row.trangThai}</td>
          <td style="${td}">${escapeHtml(row.chiTietBuoi || '—')}</td>
          <td style="${td} text-align:center;">${row.daLienLac ? 'Đã liên lạc' : 'Chưa liên lạc'}</td>
        </tr>`,
    )
    .join('')

  return `
    <h2 style="${h2}">Phần 1 — Chuyên cần</h2>
    <p style="margin:4px 0 8px;">
      Học sinh nghỉ học: <strong>${attendance.soHocSinhNghi}</strong> ·
      Vắng có phép: <strong>${attendance.soLuotVangCoPhep}</strong> ·
      Vắng không phép: <strong>${attendance.soLuotVangKhongPhep}</strong> ·
      Đi trễ: <strong>${attendance.soLuotDiTre}</strong>
    </p>
    ${
      attendance.rows.length === 0
        ? '<p>Không có học sinh vắng/trễ trong kỳ báo cáo này.</p>'
        : `<table style="${table}">
            <thead><tr>
              <th style="${th} text-align:center;">STT</th><th style="${th}">Họ tên</th><th style="${th} text-align:center;">Ngày</th>
              <th style="${th} text-align:center;">Trạng thái</th><th style="${th}">Chi tiết buổi</th><th style="${th} text-align:center;">Đã liên lạc PH?</th>
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>`
    }
  `
}

function renderViolationSection(data: ReportData): string {
  const { violation } = data
  const groupRowsHtml = violation.theoNhom
    .map(
      (row) => `
        <tr>
          <td style="${td}">${escapeHtml(row.nhanLoai)}</td>
          <td style="${td} text-align:center;">${row.soLuot}</td>
          <td style="${td} text-align:center;">${row.soHocSinh}</td>
        </tr>`,
    )
    .join('')

  const detailRowsHtml = violation.chiTiet
    .map(
      (row) => `
        <tr>
          <td style="${td}">${escapeHtml(row.nhanLoai)}</td>
          <td style="${td} text-align:center;">${escapeHtml(row.maDanhMuc || '—')}</td>
          <td style="${td}">${escapeHtml(row.tenViPham)}</td>
          <td style="${td} text-align:center;">${row.soLuot}</td>
          <td style="${td}">${escapeHtml(row.hocSinh.map((student) => `${student.hoTen} (${student.soLan})`).join(', '))}</td>
        </tr>`,
    )
    .join('')

  return `
    <h2 style="${h2}">Phần 2 — Vi phạm nề nếp</h2>
    <p style="margin:4px 0 8px;">
      Học sinh vi phạm: <strong>${violation.soHocSinhViPham}</strong> ·
      Tổng lượt vi phạm: <strong>${violation.tongSoLuot}</strong> ·
      Vi phạm nghiêm trọng: <strong style="color:#c00000;">${violation.soViPhamNghiemTrong}</strong>
    </p>
    <p style="margin:0 0 8px;">
      Sự kiện lớp/tổ trong kỳ: <strong>${violation.suKienTapThe.tongSo}</strong> sự kiện,
      đã xử lý <strong>${violation.suKienTapThe.daXuLy}</strong>.
    </p>
    ${
      violation.theoNhom.length === 0
        ? '<p>Không có vi phạm cá nhân nào trong kỳ báo cáo này.</p>'
        : `<table style="${table}">
            <thead><tr><th style="${th}">Nhóm</th><th style="${th} text-align:center;">Số lượt</th><th style="${th} text-align:center;">Số học sinh liên quan</th></tr></thead>
            <tbody>${groupRowsHtml}</tbody>
          </table>
          <table style="${table}">
            <thead><tr>
              <th style="${th}">Nhóm</th><th style="${th} text-align:center;">Mã</th><th style="${th}">Tên vi phạm</th>
              <th style="${th} text-align:center;">Số lượt</th><th style="${th}">Học sinh (số lần)</th>
            </tr></thead>
            <tbody>${detailRowsHtml}</tbody>
          </table>`
    }
  `
}

function renderPositiveSection(data: ReportData): string {
  const { positive } = data
  const rowsHtml = positive.rows
    .map(
      (row) => `
        <tr>
          <td style="${td} text-align:center;">${escapeHtml(row.maDanhMuc || '—')}</td>
          <td style="${td}">${escapeHtml(row.noiDung)}</td>
          <td style="${td} text-align:center;">${row.soLuot}</td>
          <td style="${td}">${escapeHtml(row.hocSinh.map((student) => `${student.hoTen} (${student.soLan})`).join(', '))}</td>
        </tr>`,
    )
    .join('')

  return `
    <h2 style="${h2}">Phần 3 — Ghi nhận tích cực</h2>
    <p style="margin:4px 0 8px;">
      Học sinh được ghi nhận: <strong>${positive.soHocSinh}</strong> ·
      Tổng lượt ghi nhận: <strong>${positive.tongSoLuot}</strong>
    </p>
    ${
      positive.rows.length === 0
        ? '<p>Không có ghi nhận tích cực nào trong kỳ báo cáo này.</p>'
        : `<table style="${table}">
            <thead><tr><th style="${th} text-align:center;">Mã</th><th style="${th}">Nội dung</th><th style="${th} text-align:center;">Số lượt</th><th style="${th}">Học sinh (số lần)</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>`
    }
  `
}

const h2 = 'font-size:14px;font-weight:bold;margin:16px 0 4px;color:#0f172a;'
const table = 'width:100%;border-collapse:collapse;margin-bottom:12px;'
const th = 'border:1px solid #333333;background:#f2f2f2;padding:4px 6px;text-align:left;font-size:12px;font-weight:bold;vertical-align:middle;'
const td = 'border:1px solid #333333;padding:4px 6px;font-size:12px;vertical-align:top;'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
